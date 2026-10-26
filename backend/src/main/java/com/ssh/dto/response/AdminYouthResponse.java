package com.ssh.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;

import java.time.LocalDateTime;

/**
 * One row of the admin youth-outcomes table: who is in the hub, what their
 * verified tier is, and whether they have exited into permanent placement.
 */
public record AdminYouthResponse(
    @Schema(description = "Youth-table ID (not users.id)", example = "4")
    Long id,

    @Schema(example = "Thabo Mokoena")
    String userName,

    @Schema(example = "TIER_1")
    String tier,

    @Schema(example = "2")
    Long verifiedExperiences,

    @Schema(example = "false")
    boolean isAlumni,

    @Schema(example = "2026-02-18T09:30:00")
    LocalDateTime alumniDate
) {
}
