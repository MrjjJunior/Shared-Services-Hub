package com.ssh.dto.response;

import com.ssh.entity.LedgerEntry;

import java.time.LocalDateTime;

public record LedgerEntryResponse(
    Long id,
    Long sequence,
    Long experienceId,
    Long taskId,
    Long youthId,
    Double rating,
    String feedback,
    String reference,
    String confirmedSkills,
    Integer chainVersion,
    LocalDateTime verifiedAt,
    String previousHash,
    String hash
) {

    public static LedgerEntryResponse from(LedgerEntry entry) {
        return new LedgerEntryResponse(
            entry.getId(),
            entry.getSequence(),
            entry.getExperienceId(),
            entry.getTaskId(),
            entry.getYouthId(),
            entry.getRating(),
            entry.getFeedback(),
            entry.getReference(),
            entry.getConfirmedSkills(),
            entry.getChainVersion(),
            entry.getVerifiedAt(),
            entry.getPreviousHash(),
            entry.getHash()
        );
    }

    /**
     * POPIA-safe public shape used by the anonymous ledger endpoints.
     *
     * The evidence reference is operational material and is never published
     * without authentication. The SME feedback quote is published only when
     * the youth opted in (share_feedback_publicly). Withheld fields arrive as
     * null so clients can render a "protected" hint.
     */
    public static LedgerEntryResponse publicFrom(LedgerEntry entry, boolean feedbackShared) {
        return new LedgerEntryResponse(
            entry.getId(),
            entry.getSequence(),
            entry.getExperienceId(),
            entry.getTaskId(),
            entry.getYouthId(),
            entry.getRating(),
            feedbackShared ? entry.getFeedback() : null,
            null,
            entry.getConfirmedSkills(),
            entry.getChainVersion(),
            entry.getVerifiedAt(),
            entry.getPreviousHash(),
            entry.getHash()
        );
    }
}
