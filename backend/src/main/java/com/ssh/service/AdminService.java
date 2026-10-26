package com.ssh.service;

import com.ssh.dto.response.AdminYouthResponse;
import com.ssh.entity.Tier;
import com.ssh.entity.Youth;
import com.ssh.exception.ResourceNotFoundException;
import com.ssh.repository.ExperienceRepository;
import com.ssh.repository.YouthRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;

/**
 * Admin-side youth outcome management: the hub roster (active + alumni) and
 * the "mark placed" action that exits a youth as an SSH Alumni once the admin
 * has confirmed permanent employment.
 */
@Service
public class AdminService {

    private final YouthRepository youthRepository;
    private final ExperienceRepository experienceRepository;
    private final TierEligibilityService tierEligibilityService;

    public AdminService(YouthRepository youthRepository,
                        ExperienceRepository experienceRepository,
                        TierEligibilityService tierEligibilityService) {
        this.youthRepository = youthRepository;
        this.experienceRepository = experienceRepository;
        this.tierEligibilityService = tierEligibilityService;
    }

    public List<AdminYouthResponse> listYouth() {
        return youthRepository.findAll().stream()
            .map(this::toResponse)
            .sorted(Comparator.comparing(AdminYouthResponse::isAlumni)
                .thenComparing(AdminYouthResponse::id))
            .toList();
    }

    /**
     * Marks the youth as permanently placed. Personality-safe: alumni rows
     * stay in the roster with their exit date for impact reporting.
     */
    @Transactional
    public AdminYouthResponse markPlaced(Long youthId) {
        Youth youth = youthRepository.findById(youthId)
            .orElseThrow(() -> new ResourceNotFoundException("Youth", youthId));
        if (!youth.isAlumni()) {
            youth.markAsAlumni();
            youthRepository.save(youth);
        }
        return toResponse(youth);
    }

    private AdminYouthResponse toResponse(Youth youth) {
        Tier tier = tierEligibilityService.resolveTier(youth);
        return new AdminYouthResponse(
            youth.getId(),
            youth.getUser() != null ? youth.getUser().getName() : null,
            tier != null ? tier.name() : null,
            experienceRepository.countByYouthAndIsVerifiedTrue(youth),
            youth.isAlumni(),
            youth.getAlumniDate()
        );
    }
}
