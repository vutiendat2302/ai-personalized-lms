package com.ailms.service;

import com.ailms.response.CertificateResponse;

/**
 * Service đánh giá, cấp phát và xác minh chứng chỉ hoàn thành khóa học.
 */
public interface ICertificateService {

    /**
     * Đánh giá điều kiện hoàn thành và tạo chứng chỉ cho học viên.
     *
     * @param enrollmentId ID của lượt đăng ký học
     * @return đối tượng chứa thông tin chi tiết kết quả
     */
    CertificateResponse evaluateAndGenerateCertificate(Long enrollmentId);

    /**
     * Xác minh thông tin chứng chỉ thông qua mã chứng chỉ.
     *
     * @param certificateCode Mã code xác thực chứng chỉ
     * @return đối tượng chứa thông tin chi tiết kết quả
     */
    CertificateResponse verifyCertificate(String certificateCode);

    /**
     * Lấy chứng chỉ của học viên dựa trên ID lượt đăng ký học.
     *
     * @param enrollmentId ID của lượt đăng ký học
     * @return đối tượng chứa thông tin chi tiết kết quả
     */
    CertificateResponse getByEnrollmentId(Long enrollmentId);

    /**
     * Thu hồi chứng chỉ đã cấp kèm theo lý do cụ thể.
     *
     * @param certificateId ID của chứng chỉ
     * @param reason Lý do thực hiện hành động
     * @return đối tượng chứa thông tin chi tiết kết quả
     */
    CertificateResponse revokeCertificate(Long certificateId, String reason);
}
