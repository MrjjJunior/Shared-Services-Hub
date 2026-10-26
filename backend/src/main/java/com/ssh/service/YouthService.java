package com.ssh.service;

import com.ssh.dto.request.YouthProfileRequest;
import com.ssh.dto.response.YouthResponse;
import com.ssh.entity.Youth;
import com.ssh.repository.YouthRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Youth profile reads and edits used by the dashboard and onboarding.
 */
@Service
public class YouthService {

    private final UserAccountService userAccountService;
    private final YouthRepository youthRepository;

    public YouthService(UserAccountService userAccountService,
                        YouthRepository youthRepository) {
        this.userAccountService = userAccountService;
        this.youthRepository = youthRepository;
    }

    /**
     * The logged-in youth's profile, including the youth-table ID that the
     * experience and assignment APIs use.
     */
    public YouthResponse getMyProfile(String email) {
        return toResponse(userAccountService.requireYouth(email));
    }

    /**
     * Updates the fields a youth owns. Null means "leave unchanged"; an empty
     * string clears the field.
     */
    @Transactional
    public YouthResponse updateMyProfile(String email, YouthProfileRequest request) {
        Youth youth = userAccountService.requireYouth(email);

        if (request.getEducation() != null) youth.setEducation(request.getEducation().trim());
        if (request.getSkills() != null) youth.setSkills(request.getSkills().trim());
        if (request.getPortfolio() != null) youth.setPortfolio(request.getPortfolio().trim());
        if (request.getBio() != null) youth.setBio(request.getBio().trim());
        if (request.getLocation() != null) youth.setLocation(request.getLocation().trim());
        if (request.getAvailability() != null) youth.setAvailability(request.getAvailability().trim());
        if (request.getShareFeedbackPublicly() != null) {
            youth.setShareFeedbackPublicly(request.getShareFeedbackPublicly());
        }

        return toResponse(youthRepository.save(youth));
    }

    private YouthResponse toResponse(Youth youth) {
        YouthResponse response = new YouthResponse();
        response.setId(youth.getId());
        response.setUserId(youth.getUser().getId());
        response.setUserName(youth.getUser().getName());
        response.setEducation(youth.getEducation());
        response.setSkills(youth.getSkills());
        response.setPortfolio(youth.getPortfolio());
        response.setBio(youth.getBio());
        response.setLocation(youth.getLocation());
        response.setAvailability(youth.getAvailability());
        response.setAlumni(youth.isAlumni());
        response.setAlumniDate(youth.getAlumniDate());
        response.setShareFeedbackPublicly(youth.isShareFeedbackPublicly());
        response.setCreatedAt(youth.getCreatedAt());
        response.setUpdatedAt(youth.getUpdatedAt());
        return response;
    }
}
