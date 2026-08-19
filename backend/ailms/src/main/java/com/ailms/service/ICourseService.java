package com.ailms.service;

import com.ailms.request.BaseSearchRequest;
import com.ailms.request.CourseApprovalRequest;
import com.ailms.request.CourseSearchRequest;
import com.ailms.request.CourseStatusRequest;
import com.ailms.request.CreateCourseRequest;
import com.ailms.request.UpdateCourseRequest;
import com.ailms.response.ClassResponse;
import com.ailms.response.CourseResponse;
import com.ailms.response.CourseMetricResponse;
import com.ailms.response.PageResponse;

import java.util.List;

/**
 * Service quản lý khóa học (Course), bao gồm phê duyệt khóa học và phân công giảng dạy.
 */
public interface ICourseService {

    /**
     * Tạo mới bản ghi từ dữ liệu yêu cầu.
     *
     * @param request Đối tượng DTO chứa thông tin yêu cầu
     * @return đối tượng chứa thông tin chi tiết kết quả
     */
    CourseResponse create(CreateCourseRequest request);

    /**
     * Giáo viên tự tạo khóa học đề xuất mới.
     *
     * @param teacherUserId ID của người dùng đóng vai trò giáo viên
     * @param request Đối tượng DTO chứa thông tin yêu cầu
     * @return đối tượng chứa thông tin chi tiết kết quả
     */
    CourseResponse createCourseByTeacher(Long teacherUserId, CreateCourseRequest request);

    /**
     * Cập nhật thông tin bản ghi theo ID.
     *
     * @param id ID của bản ghi cần xử lý
     * @param request Đối tượng DTO chứa thông tin yêu cầu
     * @return đối tượng chứa thông tin chi tiết kết quả
     */
    CourseResponse update(Long id, UpdateCourseRequest request);

    /**
     * Cập nhật trạng thái hoạt động của khóa học.
     *
     * @param id ID của bản ghi cần xử lý
     * @param request Đối tượng DTO chứa thông tin yêu cầu
     * @return đối tượng chứa thông tin chi tiết kết quả
     */
    CourseResponse updateStatus(Long id, CourseStatusRequest request);

    /**
     * Phê duyệt khóa học đề xuất từ giáo viên.
     *
     * @param id ID của bản ghi cần xử lý
     * @param request Đối tượng DTO chứa thông tin yêu cầu
     * @return đối tượng chứa thông tin chi tiết kết quả
     */
    CourseResponse approveCourse(Long id, CourseApprovalRequest request);

    /** Lấy trực tiếp các khóa học đang chờ duyệt từ cơ sở dữ liệu. */
    PageResponse<CourseResponse> getPendingApprovalCourses(BaseSearchRequest request);

    /**
     * Xóa bản ghi khỏi hệ thống theo ID.
     *
     * @param id ID của bản ghi cần xử lý
     */
    void delete(Long id);

    /**
     * Lấy thông tin chi tiết của bản ghi theo ID.
     *
     * @param id ID của bản ghi cần xử lý
     * @return đối tượng chứa thông tin chi tiết kết quả
     */
    CourseResponse getById(Long id);

    /** Lấy các chỉ số tổng quan theo khóa học để hiển thị ở trang chi tiết. */
    CourseMetricResponse getMetrics(Long id);

    /**
     * Lấy danh sách tất cả các bản ghi.
     * @return danh sách các đối tượng phù hợp
     */
    List<CourseResponse> getAll();

    /**
     * Tìm kiếm và phân trang danh sách dựa trên các tiêu chí lọc.
     *
     * @param request Đối tượng DTO chứa thông tin yêu cầu
     * @return trang kết quả chứa danh sách đã được phân trang
     */
    PageResponse<CourseResponse> search(CourseSearchRequest request);

    /**
     * Gợi ý các lớp học phù hợp để giáo viên nhận dạy.
     *
     * @param teacherUserId ID của người dùng đóng vai trò giáo viên
     * @return danh sách các đối tượng phù hợp
     */
    List<ClassResponse> getSuggestedClassesForTeacher(Long teacherUserId);

    /**
     * Giáo viên đăng ký nhận dạy một lớp học đang chờ giáo viên.
     *
     * @param teacherUserId ID của người dùng đóng vai trò giáo viên
     * @param classId ID của lớp học
     * @return đối tượng chứa thông tin chi tiết kết quả
     */
    ClassResponse claimClass(Long teacherUserId, Long classId);

    /**
     * Lấy danh sách khóa học nổi bật có phân trang.
     *
     * @param request Yêu cầu phân trang
     * @return Trang danh sách khóa học nổi bật
     */
    PageResponse<CourseResponse> getOutstandingCourses(BaseSearchRequest request);

    /**
     * Lấy danh sách khóa học thịnh hành có phân trang.
     *
     * @param request Yêu cầu phân trang
     * @return Trang danh sách khóa học thịnh hành
     */
    PageResponse<CourseResponse> getTrendingCourses(BaseSearchRequest request);

    /**
     * Lấy danh sách khóa học mới nhất có phân trang.
     *
     * @param request Yêu cầu phân trang
     * @return Trang danh sách khóa học mới nhất
     */
    PageResponse<CourseResponse> getLatestCourses(BaseSearchRequest request);

    /**
     * Tính toán lại điểm xu hướng và đồng bộ chỉ số cho toàn bộ khóa học.
     */
    void recalculateTrendingScores();

    /**
     * Lấy ra tổng số khóa học đang active
     */
    long countActiveCourses();
}
