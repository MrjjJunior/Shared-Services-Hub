package com.ssh.service;

import com.ssh.dto.response.AdminYouthResponse;
import com.ssh.entity.Task;
import com.ssh.entity.Tier;
import com.ssh.entity.User;
import com.ssh.entity.Youth;
import com.ssh.exception.ResourceNotFoundException;
import com.ssh.repository.ExperienceRepository;
import com.ssh.repository.YouthRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AdminServiceTest {

    @Mock private YouthRepository youthRepository;
    @Mock private ExperienceRepository experienceRepository;
    @Mock private TierEligibilityService tierEligibilityService;

    private AdminService adminService;
    private Youth active;
    private Youth alumni;

    @BeforeEach
    void setUp() {
        adminService = new AdminService(youthRepository, experienceRepository, tierEligibilityService);

        User activeUser = new User("Sipho", "sipho@ssh.co.za", "hash", "YOUTH");
        activeUser.setId(3L);
        active = new Youth(activeUser);
        active.setId(30L);

        User alumniUser = new User("Lindiwe", "lindiwe@ssh.co.za", "hash", "YOUTH");
        alumniUser.setId(5L);
        alumni = new Youth(alumniUser);
        alumni.setId(50L);
        alumni.markAsAlumni();
    }

    @Test
    @DisplayName("The roster lists active youth first, then alumni")
    void shouldListActiveYouthBeforeAlumni() {
        when(youthRepository.findAll()).thenReturn(List.of(alumni, active));
        when(experienceRepository.countByYouthAndIsVerifiedTrue(any())).thenReturn(0L);
        when(tierEligibilityService.resolveTier(any())).thenReturn(Tier.TIER_0);

        List<AdminYouthResponse> roster = adminService.listYouth();

        assertThat(roster).hasSize(2);
        assertThat(roster.get(0).userName()).isEqualTo("Sipho");
        assertThat(roster.get(0).isAlumni()).isFalse();
        assertThat(roster.get(1).userName()).isEqualTo("Lindiwe");
        assertThat(roster.get(1).isAlumni()).isTrue();
        assertThat(roster.get(1).alumniDate()).isNotNull();
    }

    @Test
    @DisplayName("Mark placed flips isAlumni and stamps alumniDate")
    void shouldMarkYouthAsPlaced() {
        when(youthRepository.findById(30L)).thenReturn(Optional.of(active));
        when(experienceRepository.countByYouthAndIsVerifiedTrue(any())).thenReturn(2L);
        when(tierEligibilityService.resolveTier(any())).thenReturn(Tier.TIER_2);

        AdminYouthResponse response = adminService.markPlaced(30L);

        assertThat(active.isAlumni()).isTrue();
        assertThat(active.getAlumniDate()).isNotNull();
        assertThat(response.isAlumni()).isTrue();
        assertThat(response.verifiedExperiences()).isEqualTo(2L);
        assertThat(response.tier()).isEqualTo("TIER_2");
        verify(youthRepository).save(active);
    }

    @Test
    @DisplayName("Marking placed twice keeps the first alumniDate")
    void shouldKeepFirstAlumniDateOnRepeatCall() {
        when(youthRepository.findById(30L)).thenReturn(Optional.of(active));
        when(experienceRepository.countByYouthAndIsVerifiedTrue(any())).thenReturn(2L);
        when(tierEligibilityService.resolveTier(any())).thenReturn(Tier.TIER_2);

        adminService.markPlaced(30L);
        java.time.LocalDateTime firstDate = active.getAlumniDate();
        adminService.markPlaced(30L);

        assertThat(active.getAlumniDate()).isSameAs(firstDate);
        verify(youthRepository).save(active);
    }

    @Test
    @DisplayName("Mark placed on an unknown youth is a 404")
    void shouldRejectMarkPlaced_ForUnknownYouth() {
        when(youthRepository.findById(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> adminService.markPlaced(999L))
            .isInstanceOf(ResourceNotFoundException.class);

        verify(youthRepository, never()).save(any());
    }
}
