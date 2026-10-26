package com.ssh.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * Consolidated funder impact report. Every figure derives from verified work
 * only: payments become impact once they are PAID, and experiences count only
 * when the ledger has sealed them.
 */
public record ImpactResponse(
    @Schema(description = "Funder reserve wallet balance (sandbox)", example = "98250.0")
    Double reserveBalance,

    @Schema(description = "Total pledged into the funder reserve wallet", example = "100000.0")
    Double totalPledged,

    @Schema(description = "Total paid out to youth after platform fees", example = "11250.0")
    Double totalDisbursed,

    @Schema(description = "Total platform fees retained", example = "1250.0")
    Double platformFees,

    @Schema(description = "Payments awaiting the admin payout run", example = "2")
    Long pendingPayoutCount,

    @Schema(description = "Value of payments awaiting the admin payout run", example = "900.0")
    Double pendingPayoutValue,

    @Schema(description = "Distinct youth who have received at least one payout", example = "7")
    Long youthImpacted,

    @Schema(description = "Verified experiences in the Experience Ledger", example = "9")
    Long verifiedExperiences,

    @Schema(description = "Entries sealed in the public hash-chained ledger", example = "9")
    Long ledgerSeals,

    @Schema(description = "Tasks verified end-to-end", example = "9")
    Long tasksDelivered,

    @Schema(description = "Average SME rating across verified work", example = "4.6")
    Double averageRating
) {
}
