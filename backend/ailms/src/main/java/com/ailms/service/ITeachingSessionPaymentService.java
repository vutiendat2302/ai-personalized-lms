package com.ailms.service;

import com.ailms.request.CreateTeachingSessionPaymentRequest;
import com.ailms.request.TeachingSessionPaymentSearchRequest;
import com.ailms.request.UpdateTeachingSessionPaymentRequest;
import com.ailms.response.PageResponse;
import com.ailms.response.TeachingSessionPaymentResponse;

import java.util.List;

/**
 * Service tính toán thù lao buổi học và đánh giá chất lượng giảng dạy của giáo viên.
 */
public interface ITeachingSessionPaymentService {

    /**
     * Tìm kiếm và phân trang danh sách dựa trên các tiêu chí lọc.
     *
     * @param request Đối tượng DTO chứa thông tin yêu cầu
     * @return trang kết quả chứa danh sách đã được phân trang
     */
    PageResponse<TeachingSessionPaymentResponse> search(TeachingSessionPaymentSearchRequest request);

    /**
     * Lấy danh sách tất cả các bản ghi.
     * @return danh sách các đối tượng phù hợp
     */
    List<TeachingSessionPaymentResponse> getAll();

    /**
     * Lấy thông tin chi tiết của bản ghi theo ID.
     *
     * @param id ID của bản ghi cần xử lý
     * @return đối tượng chứa thông tin chi tiết kết quả
     */
    TeachingSessionPaymentResponse getById(Long id);

    /**
     * Lấy danh sách thanh toán buổi học của giáo viên theo ID nhân viên.
     *
     * @param employeeId ID của nhân viên
     * @return danh sách các đối tượng phù hợp
     */
    List<TeachingSessionPaymentResponse> getByEmployeeId(Long employeeId);

    /**
     * Tạo mới bản ghi từ dữ liệu yêu cầu.
     *
     * @param request Đối tượng DTO chứa thông tin yêu cầu
     * @return đối tượng chứa thông tin chi tiết kết quả
     */
    TeachingSessionPaymentResponse create(CreateTeachingSessionPaymentRequest request);

    /**
     * Tạo bản nháp thanh toán cho buổi học trực tuyến.
     *
     * @param classOnlineId ID của buổi học trực tuyến
     * @param employeeId ID của nhân viên
     * @param durationMin Thời lượng giảng dạy tính bằng phút
     * @return đối tượng chứa thông tin chi tiết kết quả
     */
    TeachingSessionPaymentResponse createDraftForSession(Long classOnlineId, Long employeeId, int durationMin);

    /**
     * Gửi đánh giá chuyên môn của Trợ giảng (TA) cho buổi học.
     *
     * @param id ID của bản ghi cần xử lý
     * @param evaluationNote Đánh giá nhận xét của trợ giảng
     * @return đối tượng chứa thông tin chi tiết kết quả
     */
    TeachingSessionPaymentResponse submitTaEvaluation(Long id, String evaluationNote);

    /**
     * Xác nhận thanh toán lương cho buổi học thành công.
     *
     * @param id ID của bản ghi cần xử lý
     * @return đối tượng chứa thông tin chi tiết kết quả
     */
    TeachingSessionPaymentResponse confirmPayment(Long id);

    /**
     * Cập nhật thông tin bản ghi theo ID.
     *
     * @param id ID của bản ghi cần xử lý
     * @param request Đối tượng DTO chứa thông tin yêu cầu
     * @return đối tượng chứa thông tin chi tiết kết quả
     */
    TeachingSessionPaymentResponse update(Long id, UpdateTeachingSessionPaymentRequest request);

    /**
     * Xóa bản ghi khỏi hệ thống theo ID.
     *
     * @param id ID của bản ghi cần xử lý
     */
    void delete(Long id);
}
