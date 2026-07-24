package com.ailms.service;

import com.ailms.request.CreateReviewRequest;
import com.ailms.request.ReviewSearchRequest;
import com.ailms.response.PageResponse;
import com.ailms.response.ReviewResponse;

import java.util.List;

/**
 * Service quản lý đánh giá, nhận xét khóa học của học viên.
 */
public interface IReviewService {

    /**
     * Học viên tạo đánh giá, nhận xét cho một khóa học.
     *
     * @param userId ID của người dùng (User)
     * @param courseId ID của khóa học
     * @param request Đối tượng DTO chứa thông tin yêu cầu
     * @return đối tượng chứa thông tin chi tiết kết quả
     */
    ReviewResponse createReview(Long userId, Long courseId, CreateReviewRequest request);

    /**
     * Quản trị viên phê duyệt hoặc từ chối hiển thị nhận xét đánh giá.
     *
     * @param reviewId ID của đánh giá khóa học
     * @param approve true nếu đồng ý phê duyệt, false nếu từ chối
     * @param rejectionReason Lý do từ chối phê duyệt
     * @return đối tượng chứa thông tin chi tiết kết quả
     */
    ReviewResponse approveReview(Long reviewId, boolean approve, String rejectionReason);

    /**
     * Lấy danh sách các đánh giá của khóa học.
     *
     * @param courseId ID của khóa học
     * @return danh sách các đối tượng phù hợp
     */
    List<ReviewResponse> getReviewsByCourseId(Long courseId);

    /**
     * Xóa đánh giá của khóa học theo ID.
     *
     * @param reviewId ID của đánh giá khóa học
     */
    void deleteReview(Long reviewId);

    /**
     * Tìm kiếm và phân trang danh sách đánh giá dựa trên các tiêu chí lọc.
     *
     * @param request Đối tượng DTO chứa thông tin yêu cầu
     * @return trang kết quả chứa danh sách đã được phân trang
     */
    PageResponse<ReviewResponse> search(ReviewSearchRequest request);
}
