package com.ailms.service;

import com.ailms.request.*;
import com.ailms.response.ClassStreamCommentResponse;
import com.ailms.response.ClassStreamPostResponse;
import com.ailms.response.PageResponse;

/** Nghiệp vụ thảo luận, hỏi đáp và kiểm duyệt nội dung trong lớp. */
public interface IClassStreamPostService {
    /** Tạo bài bằng danh tính thành viên hiện tại. */
    ClassStreamPostResponse createPost(Long classId, CreateClassStreamPostRequest request);
    /** Lấy bài đăng phân trang. */
    PageResponse<ClassStreamPostResponse> getPostsPage(Long classId, int page, int size);
    /** Sửa nội dung bài theo quyền tác giả hoặc staff. */
    ClassStreamPostResponse updatePost(Long classId, Long postId, UpdateClassStreamPostRequest request);
    /** Ghim, khóa bình luận hoặc ẩn bài theo quyền staff. */
    ClassStreamPostResponse moderatePost(Long classId, Long postId, ClassStreamPostModerationRequest request);
    /** Xóa bài theo quyền tác giả hoặc staff. */
    void deletePost(Long classId, Long postId);
    /** Lấy bình luận của bài theo trang. */
    PageResponse<ClassStreamCommentResponse> getComments(Long classId, Long postId, int page, int size);
    /** Tạo bình luận cho bài chưa khóa. */
    ClassStreamCommentResponse createComment(Long classId, Long postId, ClassStreamCommentRequest request);
    /** Sửa bình luận của tác giả. */
    ClassStreamCommentResponse updateComment(Long classId, Long postId, Long commentId, ClassStreamCommentRequest request);
    /** Xóa bình luận theo quyền tác giả hoặc staff. */
    void deleteComment(Long classId, Long postId, Long commentId);
}
