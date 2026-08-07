package com.ailms.service;

import com.ailms.request.AssignInterestsRequest;
import com.ailms.request.CreateStudentProfileRequest;
import com.ailms.request.UpdateHasGoalRequest;
import com.ailms.request.UpdateIsMinorRequest;
import com.ailms.request.OnboardingRequest;
import com.ailms.request.StudentProfileSearchRequest;
import com.ailms.request.UpdateStudentProfileRequest;
import com.ailms.response.PageResponse;
import com.ailms.response.StudentProfileResponse;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

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

    /**
     * Gán các sở thích cho học viên dựa trên userId.
     *
     * @param userId ID của người dùng (User)
     * @param request Đối tượng DTO chứa danh sách ID sở thích
     */
    void assignInterests(Long userId, AssignInterestsRequest request);

    /**
     * Cập nhật trạng thái hasGoal của học viên.
     *
     * @param id ID của bản ghi cần xử lý
     * @param request Đối tượng DTO chứa thông tin yêu cầu
     * @return đối tượng chứa thông tin chi tiết kết quả
     */
    StudentProfileResponse updateHasGoal(Long id, UpdateHasGoalRequest request);

    /**
     * Cập nhật trạng thái isMinor của học viên.
     *
     * @param id ID của bản ghi cần xử lý
     * @param request Đối tượng DTO chứa thông tin yêu cầu
     * @return đối tượng chứa thông tin chi tiết kết quả
     */
    StudentProfileResponse updateIsMinor(Long id, UpdateIsMinorRequest request);

    /**
     * Lâý ra tổng số lượng học viên
     */
    long countStudents();

    /**
     * Lấy thông tin chi tiết học viên theo ID, trả về null nếu không tìm thấy thay vì quăng exception.
     *
     * @param id ID học viên (userId)
     * @return StudentProfileResponse hoặc null
     */
    StudentProfileResponse findByIdOrNull(Long id);

    /** Lấy thống kê tổng quan học viên. */
    Map<String, Object> getStudentOverviewStats();

    /** Thống kê tiến độ onboarding. */
    Map<String, Long> getStudentOnboardingStats();

    /** Thống kê loại mục tiêu học tập. */
    Map<String, Long> getStudentGoalTypeStats();

    /** Lấy bảng xếp hạng streak. */
    Map<String, Object> getStudentStreakLeaderboard();

    /** Thống kê hoạt động 30 ngày. */
    Map<String, Long> getStudentActivityTrend30Days();

    /** Lấy hoạt động chi tiết theo ngày. */
    List<Map<String, Object>> getStudentActivityDetails(LocalDate date);

    /** Đếm học viên không hoạt động. */
    long getInactiveStudentCount(int days);

    /** Thống kê sở thích phổ biến. */
    Map<String, Long> getTopStudentInterests();

    /** Lấy sở thích của học viên. */
    List<String> getStudentInterestNames(Long userId);
}
