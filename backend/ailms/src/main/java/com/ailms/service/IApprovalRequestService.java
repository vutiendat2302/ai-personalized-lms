package com.ailms.service;

import com.ailms.entity.ApprovalRequestEntity;
import com.ailms.request.RefundRequest;
import java.util.List;

/**
 * Service quản lý các yêu cầu phê duyệt trong hệ thống (như chuyển lớp, đổi giáo viên, xin nghỉ phép, v.v.).
 */
public interface IApprovalRequestService {

    /**
     * Tạo một yêu cầu phê duyệt mới cho đối tượng cụ thể.
     *
     * @param targetType Loại đối tượng cần phê duyệt (ví dụ: CLASS_TRANSFER, TEACHER_CHANGE...)
     * @param targetId ID của đối tượng mục tiêu cần phê duyệt
     * @param totalLevels Tổng số cấp/bước phê duyệt yêu cầu
     * @param approverId ID người dùng của người phê duyệt
     * @return đối tượng chứa thông tin chi tiết kết quả
     */
    ApprovalRequestEntity createRequest(String targetType, Long targetId, int totalLevels, Long approverId);

    /** Tạo yêu cầu hoàn tiền chờ HR/Admin duyệt, chưa gọi cổng thanh toán. */
    ApprovalRequestEntity createRefundRequest(Long orderId, RefundRequest request);

    /**
     * Phê duyệt yêu cầu dựa trên ID.
     *
     * @param id ID của bản ghi cần xử lý
     * @param comment Ý kiến, nhận xét hoặc lý do phê duyệt/từ chối
     * @return đối tượng chứa thông tin chi tiết kết quả
     */
    ApprovalRequestEntity approve(Long id, String comment);

    /**
     * Từ chối yêu cầu phê duyệt dựa trên ID kèm theo lý do.
     *
     * @param id ID của bản ghi cần xử lý
     * @param comment Ý kiến, nhận xét hoặc lý do phê duyệt/từ chối
     * @return đối tượng chứa thông tin chi tiết kết quả
     */
    ApprovalRequestEntity reject(Long id, String comment);

    /**
     * Hủy bỏ yêu cầu phê duyệt.
     *
     * @param id ID của bản ghi cần xử lý
     */
    void cancel(Long id);

    /**
     * Kiểm tra xem đối tượng có đang trong quá trình phê duyệt (bị khóa) hay không.
     *
     * @param targetType Loại đối tượng cần phê duyệt (ví dụ: CLASS_TRANSFER, TEACHER_CHANGE...)
     * @param targetId ID của đối tượng mục tiêu cần phê duyệt
     * @return true nếu xử lý thành công hoặc hợp lệ, ngược lại là false
     */
    boolean isLocked(String targetType, Long targetId);

    /**
     * Lấy danh sách các yêu cầu đang chờ phê duyệt của một người kiểm duyệt cụ thể.
     *
     * @param approverId ID người dùng của người phê duyệt
     * @return danh sách các đối tượng phù hợp
     */
    List<ApprovalRequestEntity> getPendingRequestsForApprover(Long approverId);

    List<ApprovalRequestEntity> getRequestedByUser(Long userId);

    List<ApprovalRequestEntity> getAssignedToUser(Long userId);

    List<ApprovalRequestEntity> getAllRequests();

    /** Xóa lịch sử của một yêu cầu đã phê duyệt; không xóa đối tượng nghiệp vụ gốc. */
    void deleteApprovedRequest(Long id);
}
