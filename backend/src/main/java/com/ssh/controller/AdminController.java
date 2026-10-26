package com.ssh.controller;

import com.ssh.dto.response.AdminYouthResponse;
import com.ssh.dto.response.ApiResponse;
import com.ssh.service.AdminService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Admin endpoints. Access is enforced by the security filter chain:
 * everything under /api/v1/admin/** requires the ADMIN role.
 */
@RestController
@RequestMapping("/api/v1/admin")
@Tag(name = "Admin", description = "Platform administration: youth outcomes")
public class AdminController {

    private final AdminService adminService;

    public AdminController(AdminService adminService) {
        this.adminService = adminService;
    }

    @GetMapping("/youth")
    @Operation(
        summary = "List the youth roster (ADMIN only)",
        description = "Every youth with their verified tier, verified experience count and "
            + "alumni status — active members first, alumni after."
    )
    public ResponseEntity<ApiResponse<List<AdminYouthResponse>>> youth() {
        return ResponseEntity.ok(ApiResponse.success("Youth roster", adminService.listYouth()));
    }

    @PatchMapping("/youth/{id}/mark-placed")
    @Operation(
        summary = "Mark a youth as permanently placed (ADMIN only)",
        description = "Exits the youth as an SSH Alumni: sets isAlumni and stamps alumniDate. "
            + "Idempotent — calling it twice keeps the first alumniDate."
    )
    public ResponseEntity<ApiResponse<AdminYouthResponse>> markPlaced(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(
            "Youth marked as placed", adminService.markPlaced(id)));
    }
}
