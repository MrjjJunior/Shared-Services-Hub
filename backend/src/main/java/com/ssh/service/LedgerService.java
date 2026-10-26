package com.ssh.service;

import com.ssh.dto.response.LedgerEntryResponse;
import com.ssh.entity.Experience;
import com.ssh.entity.LedgerEntry;
import com.ssh.entity.Youth;
import com.ssh.exception.ResourceNotFoundException;
import com.ssh.repository.LedgerEntryRepository;
import com.ssh.repository.YouthRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Clock;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.HexFormat;
import java.util.List;
import java.util.Optional;

/**
 * Hash-chained public ledger.
 *
 * Every verified Experience appends one entry:
 *   v1: hash = SHA-256(sequence | experienceId | taskId | youthId | rating |
 *                       feedback | reference | verifiedAt | previousHash)
 *   v2: v1 payload + | confirmedSkills   (sealed when the SME confirms skills)
 *
 * The first entry chains from the well-known GENESIS hash. Re-walking the
 * chain detects any retroactive edit to an earlier entry. chain_version pins
 * which payload an entry was hashed with, so adding fields never invalidates
 * historical hashes.
 */
@Service
public class LedgerService {

    public static final String GENESIS_HASH = "GENESIS";

    private final LedgerEntryRepository ledgerEntryRepository;
    private final YouthRepository youthRepository;
    private final Clock clock;

    public LedgerService(LedgerEntryRepository ledgerEntryRepository,
                         YouthRepository youthRepository,
                         Clock clock) {
        this.ledgerEntryRepository = ledgerEntryRepository;
        this.youthRepository = youthRepository;
        this.clock = clock;
    }

    /**
     * Append the verification of an experience. Idempotent per experience.
     */
    @Transactional
    public synchronized LedgerEntry append(Experience experience) {
        Optional<LedgerEntry> existing =
            ledgerEntryRepository.findByExperienceId(experience.getId());
        if (existing.isPresent()) {
            return existing.get();
        }

        Optional<LedgerEntry> last = ledgerEntryRepository.findTopByOrderBySequenceDesc();
        long sequence = last.map(entry -> entry.getSequence() + 1).orElse(1L);
        String previousHash = last.map(LedgerEntry::getHash).orElse(GENESIS_HASH);
        // PostgreSQL timestamps have microsecond precision. Hash the exact value
        // that will be stored, otherwise a nanosecond timestamp hashes one value
        // at write time and a different value when the chain is re-walked.
        LocalDateTime verifiedAt = (experience.getVerifiedAt() != null
            ? experience.getVerifiedAt()
            : LocalDateTime.now(clock)).truncatedTo(ChronoUnit.MILLIS);
        experience.setVerifiedAt(verifiedAt);

        LedgerEntry entry = new LedgerEntry(
            sequence,
            experience.getId(),
            experience.getTask().getId(),
            experience.getYouth().getId(),
            experience.getRating(),
            experience.getFeedback(),
            experience.getReference(),
            verifiedAt,
            previousHash,
            experience.getConfirmedSkills(),
            2
        );
        entry.setHash(sha256(canonical(entry)));

        return ledgerEntryRepository.save(entry);
    }

    public List<LedgerEntry> listEntries() {
        return ledgerEntryRepository.findAllByOrderBySequenceAsc();
    }

    /**
     * POPIA-aware response shaping shared by the public ledger endpoints.
     *
     * Unauthenticated readers always get the reference withheld, and get the
     * SME feedback only when the youth opted in. Authenticated readers (any
     * signed-in role) see the full entry.
     */
    public LedgerEntryResponse toShapedResponse(LedgerEntry entry, boolean includeProtectedFields) {
        if (includeProtectedFields) {
            return LedgerEntryResponse.from(entry);
        }
        boolean feedbackShared = youthRepository.findById(entry.getYouthId())
            .map(Youth::isShareFeedbackPublicly)
            .orElse(false);
        return LedgerEntryResponse.publicFrom(entry, feedbackShared);
    }

    public LedgerEntry getEntry(Long id) {
        return ledgerEntryRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("LedgerEntry", id));
    }

    /**
     * Verify the full chain from genesis to the latest entry.
     */
    public ChainVerification verifyChain() {
        List<LedgerEntry> entries = ledgerEntryRepository.findAllByOrderBySequenceAsc();
        String previousHash = GENESIS_HASH;

        int checked = 0;
        for (LedgerEntry entry : entries) {
            checked++;
            if (!previousHash.equals(entry.getPreviousHash())) {
                return new ChainVerification(
                    false, checked, entry.getSequence(),
                    "Entry " + entry.getSequence() + " does not link to the previous hash");
            }
            if (!sha256(canonical(entry)).equals(entry.getHash())) {
                return new ChainVerification(
                    false, checked, entry.getSequence(),
                    "Entry " + entry.getSequence() + " was modified: stored hash does not match");
            }
            previousHash = entry.getHash();
        }
        return new ChainVerification(true, checked, null, "Ledger chain is intact");
    }

    /**
     * Verify the chain up to (and including) one experience's entry.
     */
    public ChainVerification verifyExperience(Long experienceId) {
        LedgerEntry target = ledgerEntryRepository.findByExperienceId(experienceId)
            .orElseThrow(() -> new ResourceNotFoundException(
                "No ledger entry for experience " + experienceId));

        List<LedgerEntry> entries = ledgerEntryRepository.findAllByOrderBySequenceAsc();
        String previousHash = GENESIS_HASH;
        int checked = 0;

        for (LedgerEntry entry : entries) {
            checked++;
            if (!previousHash.equals(entry.getPreviousHash())) {
                return new ChainVerification(
                    false, checked, entry.getSequence(),
                    "Entry " + entry.getSequence() + " does not link to the previous hash");
            }
            if (!sha256(canonical(entry)).equals(entry.getHash())) {
                return new ChainVerification(
                    false, checked, entry.getSequence(),
                    "Entry " + entry.getSequence() + " was modified: stored hash does not match");
            }
            previousHash = entry.getHash();
            if (entry.getSequence() >= target.getSequence()) {
                break;
            }
        }
        return new ChainVerification(true, checked, null,
            "Entry " + target.getSequence() + " is valid and chains back to genesis");
    }

    /**
     * Canonical payload. Null values are represented as an empty string so
     * the hash never depends on to-string implementation details.
     *
     * chain_version dispatch:
     *   v1 (legacy rows, chain_version == null or 1): the original nine fields.
     *   v2: the v1 fields plus | confirmedSkills.
     */
    public static String canonical(LedgerEntry entry) {
        String base = entry.getSequence()
            + "|" + entry.getExperienceId()
            + "|" + entry.getTaskId()
            + "|" + entry.getYouthId()
            + "|" + value(entry.getRating())
            + "|" + value(entry.getFeedback())
            + "|" + value(entry.getReference())
            + "|" + (entry.getVerifiedAt() != null ? entry.getVerifiedAt().toString() : "")
            + "|" + entry.getPreviousHash();
        if (entry.getChainVersion() != null && entry.getChainVersion() >= 2) {
            base = base + "|" + value(entry.getConfirmedSkills());
        }
        return base;
    }

    public static String sha256(String input) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(input.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 is not available", e);
        }
    }

    private static String value(Object value) {
        return value != null ? value.toString() : "";
    }

    public record ChainVerification(
        boolean valid,
        int checkedEntries,
        Long brokenAtSequence,
        String message
    ) {
    }
}
