package com.ssh.service;

import com.ssh.dto.response.ImpactResponse;
import com.ssh.entity.Experience;
import com.ssh.entity.Payment;
import com.ssh.entity.SME;
import com.ssh.entity.Task;
import com.ssh.entity.User;
import com.ssh.entity.Wallet;
import com.ssh.entity.WalletTransaction;
import com.ssh.entity.Youth;
import com.ssh.repository.ExperienceRepository;
import com.ssh.repository.LedgerEntryRepository;
import com.ssh.repository.PaymentRepository;
import com.ssh.repository.TaskRepository;
import com.ssh.repository.WalletTransactionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ImpactServiceTest {

    @Mock private WalletService walletService;
    @Mock private WalletTransactionRepository walletTransactionRepository;
    @Mock private PaymentRepository paymentRepository;
    @Mock private ExperienceRepository experienceRepository;
    @Mock private LedgerEntryRepository ledgerEntryRepository;
    @Mock private TaskRepository taskRepository;

    private ImpactService impactService;

    @BeforeEach
    void setUp() {
        impactService = new ImpactService(
            walletService,
            walletTransactionRepository,
            paymentRepository,
            experienceRepository,
            ledgerEntryRepository,
            taskRepository
        );
    }

    @Test
    @DisplayName("Impact counts only PAID payments and only verified experiences")
    void shouldCountOnlyPaidVerifiedWork() {
        when(walletService.getOrCreateReserveWallet()).thenReturn(new Wallet("RESERVE", 90_000.0));
        when(walletTransactionRepository.findByWalletOrderByCreatedAtDesc(any()))
            .thenReturn(List.of(credit(100_000.0), credit(5_000.0)));

        User smeUser = new User("Thandi", "thandi@ssh.co.za", "hash", "SME");
        SME sme = new SME(smeUser, "Thandi's Accounting");

        User y1 = new User("Sipho", "sipho@ssh.co.za", "hash", "YOUTH"); y1.setId(3L);
        Youth youthOne = new Youth(y1); youthOne.setId(30L);
        User y2 = new User("Naledi", "naledi@ssh.co.za", "hash", "YOUTH"); y2.setId(4L);
        Youth youthTwo = new Youth(y2); youthTwo.setId(40L);

        Task task = new Task("Logo", "Brand", "DESIGN", sme);
        task.setId(100L);

        Payment paidOne = payment(task, youthOne, "PAID");
        Payment paidTwo = payment(task, youthOne, "PAID");
        Payment pendingOne = payment(task, youthTwo, "PENDING");
        Payment processingTwo = payment(task, youthTwo, "PROCESSING");

        when(paymentRepository.findByStatus("PAID")).thenReturn(List.of(paidOne, paidTwo));
        when(paymentRepository.findByStatus("PROCESSING")).thenReturn(List.of(processingTwo));
        when(paymentRepository.findByStatus("PENDING")).thenReturn(List.of(pendingOne));

        Experience rated = new Experience(youthOne, task);
        rated.setRating(4.5);
        when(experienceRepository.findByIsVerifiedTrue()).thenReturn(List.of(rated));
        when(ledgerEntryRepository.count()).thenReturn(1L);
        when(taskRepository.findByStatus("VERIFIED")).thenReturn(List.of(task));

        ImpactResponse impact = impactService.build();

        assertThat(impact.reserveBalance()).isEqualTo(90_000.0);
        assertThat(impact.totalPledged()).isEqualTo(105_000.0);
        assertThat(impact.totalDisbursed()).isEqualTo(1800.0);
        assertThat(impact.platformFees()).isEqualTo(200.0);
        assertThat(impact.pendingPayoutCount()).isEqualTo(2L);
        assertThat(impact.pendingPayoutValue()).isEqualTo(1800.0);
        assertThat(impact.youthImpacted()).isEqualTo(1L);
        assertThat(impact.verifiedExperiences()).isEqualTo(1L);
        assertThat(impact.ledgerSeals()).isEqualTo(1L);
        assertThat(impact.tasksDelivered()).isEqualTo(1L);
        assertThat(impact.averageRating()).isEqualTo(4.5);
    }

    @Test
    @DisplayName("An empty programme reports zeros without touching payment writes")
    void shouldReportZeros_WhenNothingPaidYet() {
        when(walletService.getOrCreateReserveWallet()).thenReturn(new Wallet("RESERVE", 100_000.0));
        when(walletTransactionRepository.findByWalletOrderByCreatedAtDesc(any())).thenReturn(List.of());
        when(paymentRepository.findByStatus("PAID")).thenReturn(List.of());
        when(paymentRepository.findByStatus("PROCESSING")).thenReturn(List.of());
        when(paymentRepository.findByStatus("PENDING")).thenReturn(List.of());
        when(experienceRepository.findByIsVerifiedTrue()).thenReturn(List.of());
        when(ledgerEntryRepository.count()).thenReturn(0L);
        when(taskRepository.findByStatus("VERIFIED")).thenReturn(List.of());

        ImpactResponse impact = impactService.build();

        assertThat(impact.totalDisbursed()).isZero();
        assertThat(impact.youthImpacted()).isZero();
        assertThat(impact.averageRating()).isEqualTo(0.0);
        verify(walletTransactionRepository, never()).save(any());
    }

    private WalletTransaction credit(double amount) {
        return new WalletTransaction(null, "CREDIT", amount, 0.0, "Pledge");
    }

    private Payment payment(Task task, Youth youth, String status) {
        Payment payment = new Payment(task, youth, 1000.0, 10.0);
        payment.setStatus(status);
        return payment;
    }
}
