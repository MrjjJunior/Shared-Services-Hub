package com.ssh.dto.request;

import jakarta.validation.constraints.Size;

/**
 * Editable youth profile fields. Every field is optional so the same payload
 * can be used by the dashboard and the skills-check onboarding step.
 */
public class YouthProfileRequest {

    @Size(max = 255)
    private String education;

    @Size(max = 500)
    private String skills;

    @Size(max = 255)
    private String portfolio;

    @Size(max = 1000)
    private String bio;

    @Size(max = 100)
    private String location;

    @Size(max = 50)
    private String availability;

    public YouthProfileRequest() {
    }

    public YouthProfileRequest(String education, String location) {
        this.education = education;
        this.location = location;
    }

    public String getEducation() {
        return education;
    }

    public void setEducation(String education) {
        this.education = education;
    }

    public String getSkills() {
        return skills;
    }

    public void setSkills(String skills) {
        this.skills = skills;
    }

    public String getPortfolio() {
        return portfolio;
    }

    public void setPortfolio(String portfolio) {
        this.portfolio = portfolio;
    }

    public String getBio() {
        return bio;
    }

    public void setBio(String bio) {
        this.bio = bio;
    }

    public String getLocation() {
        return location;
    }

    public void setLocation(String location) {
        this.location = location;
    }

    public String getAvailability() {
        return availability;
    }

    public void setAvailability(String availability) {
        this.availability = availability;
    }

    @Override
    public String toString() {
        return "YouthProfileRequest{" +
            "education='" + education + '\'' +
            ", skills='" + skills + '\'' +
            ", portfolio='" + portfolio + '\'' +
            ", bio='" + bio + '\'' +
            ", location='" + location + '\'' +
            ", availability='" + availability + '\'' +
            '}';
    }
}
