package com.ailms.service;

import com.ailms.response.CertificateResponse;

public interface ICertificateService {

    CertificateResponse evaluateAndGenerateCertificate(Long enrollmentId);

    CertificateResponse verifyCertificate(String certificateCode);

    CertificateResponse getByEnrollmentId(Long enrollmentId);

    CertificateResponse revokeCertificate(Long certificateId, String reason);
}
