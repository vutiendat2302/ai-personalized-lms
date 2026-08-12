package com.ailms.controller;

import com.ailms.request.*;
import com.ailms.response.*;
import com.ailms.service.IClassStreamPostService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

/** API thảo luận lớp, mọi endpoint đều kiểm tra membership từ backend. */
@RestController
@Validated
@RequestMapping("${api.prefix}/classes/{classId}/stream-posts")
@RequiredArgsConstructor
public class ClassStreamPostController {
    private final IClassStreamPostService streamPostService;

    /** Cho thành viên ACTIVE tạo câu hỏi/thảo luận và staff tạo thông báo. */
    @PostMapping
    @PreAuthorize("@classAccess.canView(#classId, authentication)")
    public ResponseEntity<ApiResponse<ClassStreamPostResponse>> createPost(
            @PathVariable Long classId, @Valid @RequestBody CreateClassStreamPostRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.of(
                "Tạo bài đăng trong lớp thành công", streamPostService.createPost(classId, request)));
    }

    /** Lấy danh sách bài đăng phân trang của lớp. */
    @GetMapping
    @PreAuthorize("@classAccess.canView(#classId, authentication)")
    public ResponseEntity<ApiResponse<PageResponse<ClassStreamPostResponse>>> getPostsPage(
            @PathVariable Long classId,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "10") @Min(1) @Max(100) int size) {
        return ResponseEntity.ok(ApiResponse.of("Lấy bài đăng trong lớp thành công",
                streamPostService.getPostsPage(classId, page, size)));
    }

    /** Sửa nội dung bài khi là tác giả hoặc staff của lớp. */
    @PutMapping("/{postId}")
    @PreAuthorize("@classAccess.canView(#classId, authentication)")
    public ResponseEntity<ApiResponse<ClassStreamPostResponse>> updatePost(
            @PathVariable Long classId, @PathVariable Long postId,
            @Valid @RequestBody UpdateClassStreamPostRequest request) {
        return ResponseEntity.ok(ApiResponse.of("Cập nhật bài đăng thành công",
                streamPostService.updatePost(classId, postId, request)));
    }

    /** Ghim, khóa bình luận hoặc ẩn bài khi người gọi quản trị đúng lớp. */
    @PatchMapping("/{postId}/moderation")
    @PreAuthorize("@classAccess.canManage(#classId, authentication)")
    public ResponseEntity<ApiResponse<ClassStreamPostResponse>> moderatePost(
            @PathVariable Long classId, @PathVariable Long postId,
            @RequestBody ClassStreamPostModerationRequest request) {
        return ResponseEntity.ok(ApiResponse.of("Cập nhật trạng thái bài đăng thành công",
                streamPostService.moderatePost(classId, postId, request)));
    }

    /** Xóa bài của chính mình hoặc nội dung do staff lớp kiểm duyệt. */
    @DeleteMapping("/{postId}")
    @PreAuthorize("@classAccess.canView(#classId, authentication)")
    public ResponseEntity<ApiResponse<Void>> deletePost(@PathVariable Long classId, @PathVariable Long postId) {
        streamPostService.deletePost(classId, postId);
        return ResponseEntity.ok(ApiResponse.message("Xóa bài đăng thành công"));
    }

    /** Lấy bình luận của một bài theo trang. */
    @GetMapping("/{postId}/comments")
    @PreAuthorize("@classAccess.canView(#classId, authentication)")
    public ResponseEntity<ApiResponse<PageResponse<ClassStreamCommentResponse>>> getComments(
            @PathVariable Long classId, @PathVariable Long postId,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size) {
        return ResponseEntity.ok(ApiResponse.of("Lấy bình luận thành công",
                streamPostService.getComments(classId, postId, page, size)));
    }

    /** Tạo câu trả lời hoặc bình luận cho bài chưa khóa. */
    @PostMapping("/{postId}/comments")
    @PreAuthorize("@classAccess.canView(#classId, authentication)")
    public ResponseEntity<ApiResponse<ClassStreamCommentResponse>> createComment(
            @PathVariable Long classId, @PathVariable Long postId,
            @Valid @RequestBody ClassStreamCommentRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.of("Đăng bình luận thành công",
                streamPostService.createComment(classId, postId, request)));
    }

    /** Sửa bình luận của chính tác giả. */
    @PutMapping("/{postId}/comments/{commentId}")
    @PreAuthorize("@classAccess.canView(#classId, authentication)")
    public ResponseEntity<ApiResponse<ClassStreamCommentResponse>> updateComment(
            @PathVariable Long classId, @PathVariable Long postId, @PathVariable Long commentId,
            @Valid @RequestBody ClassStreamCommentRequest request) {
        return ResponseEntity.ok(ApiResponse.of("Cập nhật bình luận thành công",
                streamPostService.updateComment(classId, postId, commentId, request)));
    }

    /** Xóa bình luận của tác giả hoặc cho phép staff xử lý vi phạm. */
    @DeleteMapping("/{postId}/comments/{commentId}")
    @PreAuthorize("@classAccess.canView(#classId, authentication)")
    public ResponseEntity<ApiResponse<Void>> deleteComment(
            @PathVariable Long classId, @PathVariable Long postId, @PathVariable Long commentId) {
        streamPostService.deleteComment(classId, postId, commentId);
        return ResponseEntity.ok(ApiResponse.message("Xóa bình luận thành công"));
    }
}
