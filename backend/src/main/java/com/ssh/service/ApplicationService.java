package com.ssh.service;

import com.ssh.dto.request.ApplicationRequest;
import com.ssh.dto.response.ApplicationResponse;
import com.ssh.entity.Application;
import com.ssh.entity.ApplicationStatus;
import com.ssh.entity.Experience;
import com.ssh.entity.SME;
import com.ssh.entity.Task;
import com.ssh.entity.TaskStatus;
import com.ssh.entity.Tier;
import com.ssh.entity.Youth;
import com.ssh.exception.BusinessRuleException;
import com.ssh.exception.DuplicateResourceException;
import com.ssh.exception.ResourceNotFoundException;
import com.ssh.repository.ApplicationRepository;
import com.ssh.repository.ExperienceRepository;
import com.ssh.repository.TaskRepository;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Application lifecycle: apply, withdraw, list, and the assignment checks.
 */
@Service
public class ApplicationService {

    private final ApplicationRepository applicationRepository;
    private final TaskRepository taskRepository;
    private final UserAccountService userAccountService;
    private final TierEligibilityService tierEligibilityService;
    private final ExperienceRepository experienceRepository;
    private final Clock clock;

    public ApplicationService(ApplicationRepository applicationRepository,
                              TaskRepository taskRepository,
                              UserAccountService userAccountService,
                              TierEligibilityService tierEligibilityService,
                              ExperienceRepository experienceRepository,
                              Clock clock) {
        this.applicationRepository = applicationRepository;
        this.taskRepository = taskRepository;
        this.userAccountService = userAccountService;
        this.tierEligibilityService = tierEligibilityService;
        this.experienceRepository = experienceRepository;
        this.clock = clock;
    }

    /**
     * A youth applies for an OPEN task.
     *
     * Duplicate behaviour:
     *   - PENDING or ACCEPTED application -> 409 (duplicate)
     *   - REJECTED, WITHDRAWN or EXPIRED -> the same row is reactivated
     *   - task not OPEN -> 409
     *   - tier ceiling reached -> 409
     */
    @Transactional
    public ApplicationResponse apply(Long taskId, ApplicationRequest request, String youthEmail) {
        Youth youth = userAccountService.requireYouth(youthEmail);
        Task task = taskRepository.findById(taskId)
            .orElseThrow(() -> new ResourceNotFoundException("Task", taskId));

        if (!TaskStatus.OPEN.name().equals(task.getStatus())) {
            throw new BusinessRuleException(
                "Task " + taskId + " is not open for applications (status: " + task.getStatus() + ")");
        }

        String coverNote = request != null ? request.coverNote() : null;
        LocalDateTime now = LocalDateTime.now(clock);
        Application existing = applicationRepository.findByTaskAndYouth(task, youth).orElse(null);

        if (existing != null && existing.isPending()) {
            if (existing.isExpired(now)) {
                // The reservation window elapsed but no tier/list call has
                // swept it yet. Expire it and fall through to reactivation.
                existing.expire();
                applicationRepository.save(existing);
            } else {
                throw new DuplicateResourceException(
                    "An application for this task is already pending");
            }
        }
        if (existing != null && existing.isAccepted()) {
            throw new DuplicateResourceException(
                "This task has already been assigned to the youth");
        }

        // Re-check tier AFTER duplicate checks so a repeat request cannot be
        // mistaken for a new reservation.
        tierEligibilityService.assertCanApply(youth);

        LocalDateTime expiresAt = now.plus(TierEligibilityService.RESERVATION_WINDOW);

        Application application;
        if (existing != null) {
            if (!ApplicationStatus.REAPPLICABLE.contains(existing.getStatus())) {
                throw new BusinessRuleException(
                    "Cannot re-apply from application status " + existing.getStatus());
            }
            existing.reactivate(coverNote, expiresAt);
            application = existing;
        } else {
            application = new Application(task, youth, coverNote, expiresAt);
        }

        return toResponse(applicationRepository.save(application));
    }

    /**
     * Returns the PENDING application that authorises an assignment. Expired
     * reservations are marked EXPIRED and rejected with a clear message.
     */
    @Transactional
    public Application requirePendingApplication(Task task, Youth youth) {
        Application application = applicationRepository.findByTaskAndYouth(task, youth)
            .orElseThrow(() -> new BusinessRuleException(
                "Youth " + youth.getId() + " has not applied for task " + task.getId()));

        LocalDateTime now = LocalDateTime.now(clock);
        if (application.isExpired(now)) {
            application.expire();
            applicationRepository.save(application);
            throw new BusinessRuleException(
                "The reservation for this application expired after "
                    + TierEligibilityService.RESERVATION_WINDOW_HOURS + " hours. The youth must re-apply.");
        }
        if (!application.isPending()) {
            throw new BusinessRuleException(
                "Application " + application.getId() + " is " + application.getStatus()
                    + ", not PENDING");
        }
        return application;
    }

    /**
     * Releases every PENDING application on a task so the applicants get
     * their 48-hour reservation slot back. Used when the owning SME cancels
     * the task — the task is no longer available.
     */
    @Transactional
    public void releasePendingApplications(Task task) {
        if (task == null) {
            return;
        }
        for (Application application : applicationRepository.findByTaskOrderByCreatedAtAsc(task)) {
            if (application.isPending()) {
                application.reject();
                applicationRepository.save(application);
            }
        }
    }

    /**
     * Accepts the chosen application and rejects every other pending
     * application for the task.
     */
    @Transactional
    public void accept(Task task, Application accepted) {
        accepted.accept();
        applicationRepository.save(accepted);

        for (Application other : applicationRepository.findByTaskOrderByCreatedAtAsc(task)) {
            if (!other.getId().equals(accepted.getId()) && other.isPending()) {
                other.reject();
                applicationRepository.save(other);
            }
        }
    }

    /**
     * The youth withdraws a pending application, releasing the reservation.
     */
    @Transactional
    public ApplicationResponse withdraw(Long applicationId, String youthEmail) {
        Youth youth = userAccountService.requireYouth(youthEmail);
        Application application = requireApplication(applicationId);

        if (!application.getYouth().getId().equals(youth.getId())) {
            throw new AccessDeniedException("Only the applicant can withdraw this application");
        }
        if (!application.isPending()) {
            throw new BusinessRuleException(
                "Only a PENDING application can be withdrawn (current: "
                    + application.getStatus() + ")");
        }

        application.withdraw();
        return toResponse(applicationRepository.save(application));
    }

    public List<ApplicationResponse> listMine(String youthEmail) {
        Youth youth = userAccountService.requireYouth(youthEmail);
        tierEligibilityService.expireStaleReservations(youth);
        return applicationRepository.findByYouthOrderByCreatedAtDesc(youth)
            .stream()
            .map(this::toResponse)
            .collect(Collectors.toList());
    }

    public List<ApplicationResponse> listForTask(Long taskId, String smeEmail) {
        SME sme = userAccountService.requireSme(smeEmail);
        Task task = taskRepository.findById(taskId)
            .orElseThrow(() -> new ResourceNotFoundException("Task", taskId));

        if (!task.getSme().getId().equals(sme.getId())) {
            throw new AccessDeniedException(
                "Only the SME who owns this task can view its applications");
        }

        LocalDateTime now = LocalDateTime.now(clock);
        return applicationRepository.findByTaskOrderByCreatedAtAsc(task)
            .stream()
            .map(application -> {
                if (application.isExpired(now)) {
                    application.expire();
                    applicationRepository.save(application);
                }
                return toResponse(application);
            })
            .collect(Collectors.toList());
    }

    /**
     * Enriches an application with the applicant summary the SME needs to
     * rank candidates. The data is scoped to the task owner by the controller
     * service methods above.
     */
    private ApplicationResponse toResponse(Application application) {
        Youth youth = application.getYouth();
        Tier tier = tierEligibilityService.resolveTier(youth);
        long verified = experienceRepository.countByYouthAndIsVerifiedTrue(youth);
        List<Experience> experiences = experienceRepository.findByYouth(youth);
        java.util.OptionalDouble ratings = (experiences == null ? List.<Experience>of() : experiences)
            .stream()
            .filter(Experience::isVerified)
            .map(Experience::getRating)
            .filter(rating -> rating != null)
            .mapToDouble(Double::doubleValue)
            .average();
        Double averageRating = ratings.isPresent()
            ? Math.round(ratings.getAsDouble() * 10.0) / 10.0
            : null;

        return ApplicationResponse.from(
            application,
            tier != null ? tier.name() : null,
            verified,
            averageRating,
            youth.getSkills(),
            youth.getEducation(),
            youth.getLocation(),
            youth.getAvailability(),
            youth.getBio(),
            youth.getPortfolio()
        );
    }

    private Application requireApplication(Long applicationId) {
        return applicationRepository.findById(applicationId)
            .orElseThrow(() -> new ResourceNotFoundException("Application", applicationId));
    }
}
