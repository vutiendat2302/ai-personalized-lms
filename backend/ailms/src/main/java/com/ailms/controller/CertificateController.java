package com.ailms.controller;

import com.ailms.response.ApiResponse;
import com.ailms.response.CertificateResponse;
import com.ailms.service.ICertificateService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("${api.prefix}/certificates")
@RequiredArgsConstructor
public class CertificateController {

    private final ICertificateService certificateService;

    @GetMapping("/verify/{certificateCode}")
    public ResponseEntity<ApiResponse<CertificateResponse>> verifyCertificate(@PathVariable String certificateCode) {
        CertificateResponse response = certificateService.verifyCertificate(certificateCode);
        return ResponseEntity.ok(ApiResponse.of("Certificate verification result", response));
    }

    @PostMapping("/evaluate")
    public ResponseEntity<ApiResponse<CertificateResponse>> evaluateAndGenerateCertificate(@RequestParam Long enrollmentId) {
        CertificateResponse response = certificateService.evaluateAndGenerateCertificate(enrollmentId);
        return ResponseEntity.ok(ApiResponse.of("Certificate generated successfully", response));
    }

    @GetMapping("/enrollment/{enrollmentId}")
    public ResponseEntity<ApiResponse<CertificateResponse>> getByEnrollmentId(@PathVariable Long enrollmentId) {
        CertificateResponse response = certificateService.getByEnrollmentId(enrollmentId);
        return ResponseEntity.ok(ApiResponse.of("Certificate retrieved successfully", response));
    }

    @PostMapping("/{id}/revoke")
    public ResponseEntity<ApiResponse<CertificateResponse>> revokeCertificate(
            @PathVariable Long id,
            @RequestParam String reason) {
        CertificateResponse response = certificateService.revokeCertificate(id, reason);
        return ResponseEntity.ok(ApiResponse.of("Certificate revoked successfully", response));
    }
}
