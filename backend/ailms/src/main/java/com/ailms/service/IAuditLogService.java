package com.ailms.service;

import com.ailms.request.AuditLogSearchRequest;
import com.ailms.response.AuditLogResponse;
import org.springframework.data.domain.Page;
import com.ailms.response.PageResponse;

import java.util.List;

/**
 * Service ghi nhận nhật ký hệ thống (Audit Log) theo dõi các hoạt động thay đổi dữ liệu.
 */
public interface IAuditLogService {

    /**
     * Ghi nhận nhật ký thay đổi hệ thống.
     *
     * @param action Tham số action
     * @param entityType Tham số entityType
     * @param entityId Tham số entityId
     * @param oldValue Tham số oldValue
     * @param newValue Tham số newValue
     */
    void log(String action, String entityType, Long entityId, Object oldValue, Object newValue);

    /**
     * Lấy thông tin nhật ký chi tiết theo ID nhật ký.
     *
     * @param logId Tham số logId
     * @return đối tượng chứa thông tin chi tiết kết quả
     */
    AuditLogResponse getByLogId(Long logId);

    /**
     * Tìm kiếm phân trang nhật ký hệ thống.
     *
     * @param request Đối tượng DTO chứa thông tin yêu cầu
     * @return trang kết quả chứa danh sách đã được phân trang
     */
    PageResponse<AuditLogResponse> getAuditLogs(AuditLogSearchRequest request);

    /**
     * Lấy tất cả nhật ký hệ thống.
     * @return danh sách các đối tượng phù hợp
     */
    List<AuditLogResponse> getAllAuditLogs();

    /**
     * Tìm kiếm phân trang nhật ký hệ thống của một người dùng cụ thể.
     *
     * @param userId ID của người dùng (User)
     * @param request Đối tượng DTO chứa thông tin yêu cầu
     * @return trang kết quả chứa danh sách đã được phân trang
     */
    PageResponse<AuditLogResponse> getAuditLogsByUserId(Long userId, AuditLogSearchRequest request);

    PageResponse<AuditLogResponse> getAuditLogsByEntity(String entityType, Long entityId, AuditLogSearchRequest request);
}
