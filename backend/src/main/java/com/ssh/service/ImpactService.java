package com.ssh.service;

import com.ssh.dto.response.ImpactResponse;
import com.ssh.entity.Payment;
import com.ssh.entity.TaskStatus;
import com.ssh.entity.Wallet;
import com.ssh.entity.WalletTransaction;
import com.ssh.repository.ExperienceRepository;
import com.ssh.repository.LedgerEntryRepository;
import com.ssh.repository.PaymentRepository;
import com.ssh.repository.TaskRepository;
import com.ssh.repository.WalletTransactionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Consolidated funder impact reporting for the corporate dashboard.
 *
 * Verified-work-only numbers: impact counts PAID payments, ledger-sealed
 * experiences and VERIFIED tasks, never self-reported activity.
 */
@Service
public class ImpactService {

    private final WalletService walletService;
    private final WalletTransactionRepository walletTransactionRepository;
    private final PaymentRepository paymentRepository;
    private final ExperienceRepository experienceRepository;
    private final LedgerEntryRepository ledgerEntryRepository;
    private final TaskRepository taskRepository;

    public ImpactService(WalletService walletService,
                         WalletTransactionRepository walletTransactionRepository,
                         PaymentRepository paymentRepository,
                         ExperienceRepository experienceRepository,
                         LedgerEntryRepository ledgerEntryRepository,
                         TaskRepository taskRepository) {
        this.walletService = walletService;
        this.walletTransactionRepository = walletTransactionRepository;
        this.paymentRepository = paymentRepository;
        this.experienceRepository = experienceRepository;
        this.ledgerEntryRepository = ledgerEntryRepository;
        this.taskRepository = taskRepository;
    }

    @Transactional
    public ImpactResponse build() {
        Wallet wallet = walletService.getOrCreateReserveWallet();
        double totalPledged = walletTransactionRepository
            .findByWalletOrderByCreatedAtDesc(wallet)
            .stream()
            .filter(transaction -> "CREDIT".equals(transaction.getType()))
            .mapToDouble(WalletTransaction::getAmount)
            .sum();

        List<Payment> paid = paymentRepository.findByStatus("PAID");
        List<Payment> pending = paymentRepository.findByStatus("PROCESSING");
        List<Payment> awaiting = paymentRepository.findByStatus("PENDING");
        List<Payment> pendingAll = new java.util.ArrayList<>(pending);
        pendingAll.addAll(awaiting);

        double totalDisbursed = paid.stream().mapToDouble(Payment::getYouthAmount).sum();
        double platformFees = paid.stream().mapToDouble(Payment::getPlatformFee).sum();
        double pendingValue = round(pendingAll.stream().mapToDouble(Payment::getYouthAmount).sum());

        long youthImpacted = paid.stream().map(payment -> payment.getYouth().getId()).distinct().count();
        long verifiedExperiences = experienceRepository.findByIsVerifiedTrue().size();
        long ledgerSeals = ledgerEntryRepository.count();
        long tasksDelivered = taskRepository.findByStatus(TaskStatus.VERIFIED.name()).size();

        double averageRating = experienceRepository.findByIsVerifiedTrue().stream()
            .map(experience -> experience.getRating())
            .filter(rating -> rating != null)
            .mapToDouble(Double::doubleValue)
            .average()
            .stream()
            .map(avg -> Math.round(avg * 10.0) / 10.0)
            .findFirst()
            .orElse(0.0);

        return new ImpactResponse(
            wallet.getBalance(),
            round(totalPledged),
            round(totalDisbursed),
            round(platformFees),
            (long) pendingAll.size(),
            pendingValue,
            youthImpacted,
            verifiedExperiences,
            ledgerSeals,
            tasksDelivered,
            averageRating
        );
    }

    private static double round(double value) {
        return Math.round(value * 100.0) / 100.0;
    }
}
