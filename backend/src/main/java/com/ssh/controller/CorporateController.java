package com.ssh.controller;

import com.ssh.dto.response.ApiResponse;
import com.ssh.dto.response.ImpactResponse;
import com.ssh.service.ImpactService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Corporate funder endpoints. Access is enforced by the security filter
 * chain: everything under /api/v1/corporate/** requires the CORPORATE role.
 */
@RestController
@RequestMapping("/api/v1/corporate")
@Tag(name = "Corporate", description = "Funder wallet and consolidated impact reporting")
public class CorporateController {

    private final ImpactService impactService;

    public CorporateController(ImpactService impactService) {
        this.impactService = impactService;
    }

    @GetMapping("/impact")
    @Operation(
        summary = "Consolidated funder impact report (CORPORATE only)",
        description = "Verified-work-only numbers: reserve balance, pledged vs disbursed, "
            + "platform fees, pending payout queue, distinct youth impacted, ledger-sealed "
            + "experiences and average SME rating."
    )
    public ResponseEntity<ApiResponse<ImpactResponse>> impact() {
        return ResponseEntity.ok(ApiResponse.success("Funder impact", impactService.build()));
    }
}
