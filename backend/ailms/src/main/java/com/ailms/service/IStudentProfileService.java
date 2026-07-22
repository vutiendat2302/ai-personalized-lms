package com.ailms.service;

import com.ailms.request.CreateStudentProfileRequest;
import com.ailms.request.OnboardingRequest;
import com.ailms.request.StudentProfileSearchRequest;
import com.ailms.request.UpdateStudentProfileRequest;
import com.ailms.response.PageResponse;
import com.ailms.response.StudentProfileResponse;

import java.util.List;

/**
 * Service quản lý thông tin hồ sơ học viên và quy trình khảo sát ban đầu (onboarding).
 */
public interface IStudentProfileService {

    /**
     * Tìm kiếm và phân trang danh sách dựa trên các tiêu chí lọc.
     *
     * @param request Đối tượng DTO chứa thông tin yêu cầu
     * @return trang kết quả chứa danh sách đã được phân trang
     */
    PageResponse<StudentProfileResponse> search(StudentProfileSearchRequest request);

    /**
     * Lấy danh sách tất cả các bản ghi.
     * @return danh sách các đối tượng phù hợp
     */
    List<StudentProfileResponse> getAll();

    /**
     * Lấy thông tin chi tiết của bản ghi theo ID.
     *
     * @param id ID của bản ghi cần xử lý
     * @return đối tượng chứa thông tin chi tiết kết quả
     */
    StudentProfileResponse getById(Long id);

    /**
     * Tạo mới bản ghi từ dữ liệu yêu cầu.
     *
     * @param request Đối tượng DTO chứa thông tin yêu cầu
     * @return đối tượng chứa thông tin chi tiết kết quả
     */
    StudentProfileResponse create(CreateStudentProfileRequest request);

    /**
     * Cập nhật thông tin bản ghi theo ID.
     *
     * @param id ID của bản ghi cần xử lý
     * @param request Đối tượng DTO chứa thông tin yêu cầu
     * @return đối tượng chứa thông tin chi tiết kết quả
     */
    StudentProfileResponse update(Long id, UpdateStudentProfileRequest request);

    /**
     * Xóa bản ghi khỏi hệ thống theo ID.
     *
     * @param id ID của bản ghi cần xử lý
     */
    void delete(Long id);

    /**
     * Hoàn tất quá trình khảo sát khảo sát ban đầu (onboarding) của học viên.
     *
     * @param request Đối tượng DTO chứa thông tin yêu cầu
     * @return đối tượng chứa thông tin chi tiết kết quả
     */
    StudentProfileResponse completeOnboarding(OnboardingRequest request);

    /**
     * Bỏ qua bước khảo sát ban đầu (onboarding).
     *
     * @param userId ID của người dùng (User)
     * @return đối tượng chứa thông tin chi tiết kết quả
     */
    StudentProfileResponse skipOnboarding(Long userId);
}
