package com.ssh.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Size;

/**
 * Optional reason for cancelling a task. Sent in the same transaction to the
 * event log; blank or absent defaults to "Cancelled by the SME".
 */
public record CancelTaskRequest(
    @Size(max = 1000)
    @Schema(
        description = "Optional internal note about why the task was cancelled",
        example = "Campaign budget was paused; no longer needed."
    )
    String reason
) {
}
