package com.ssh.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

 /**
  * Mandatory input for verifying completed work.
  *
  * rating, feedback and reference are required. confirmedSkills is optional:
  * the skills the SME explicitly confirms were demonstrated, sealed into the
  * ledger entry so the youth's verified record carries proof of competence.
  */
public record VerificationRequest(
    @NotNull(message = "Rating is required")
    @DecimalMin(value = "1.0", message = "Rating must be at least 1")
    @DecimalMax(value = "5.0", message = "Rating must be at most 5")
    @Schema(description = "Rating from 1 to 5", example = "5", minimum = "1", maximum = "5")
    Double rating,

    @NotBlank(message = "Feedback is required")
    @Size(max = 1000)
    @Schema(
        description = "What went well and what the youth should keep doing",
        example = "Excellent catalogue work. All 150 products were tagged and the photos are sharp."
    )
    String feedback,

    @NotBlank(message = "Reference is required")
    @Size(max = 255)
    @Schema(
        description = "Evidence the SME checked (URL, delivery note or file reference)",
        example = "https://shop.example.com/collections/all"
    )
    String reference,

    @Size(max = 12, message = "At most 12 skills can be confirmed per task")
    @Schema(
        description = "Skills the SME explicitly confirmed were demonstrated on this task. "
            + "Optional; each skill is sealed into the ledger entry.",
        example = "[\"Product tagging\", \"Photography\"]"
    )
    List<String> confirmedSkills
) {
}

