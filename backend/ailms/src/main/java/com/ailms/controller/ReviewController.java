package com.ailms.controller;

import com.ailms.request.CreateReviewRequest;
import com.ailms.request.ReviewSearchRequest;
import com.ailms.response.ApiResponse;
import com.ailms.response.PageResponse;
import com.ailms.response.ReviewResponse;
import com.ailms.service.IReviewService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("${api.prefix}/reviews")
@RequiredArgsConstructor
public class ReviewController {

    private final IReviewService reviewService;

    @PostMapping("/courses/{courseId}/reviews")
    public ResponseEntity<ApiResponse<ReviewResponse>> createReview(
            @PathVariable Long courseId,
            @RequestParam Long userId,
            @Valid @RequestBody CreateReviewRequest request) {
        ReviewResponse response = reviewService.createReview(userId, courseId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.of("Review submitted successfully", response));
    }

    @GetMapping("/courses/{courseId}/reviews")
    public ResponseEntity<ApiResponse<List<ReviewResponse>>> getReviewsByCourseId(@PathVariable Long courseId) {
        List<ReviewResponse> response = reviewService.getReviewsByCourseId(courseId);
        return ResponseEntity.ok(ApiResponse.of("Course reviews retrieved successfully", response));
    }

    @PostMapping("/reviews/{id}/approve")
    public ResponseEntity<ApiResponse<ReviewResponse>> approveReview(
            @PathVariable Long id,
            @RequestParam boolean approve,
            @RequestParam(required = false) String rejectionReason) {
        ReviewResponse response = reviewService.approveReview(id, approve, rejectionReason);
        return ResponseEntity.ok(ApiResponse.of("Review status updated successfully", response));
    }

    @DeleteMapping("/reviews/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteReview(@PathVariable Long id) {
        reviewService.deleteReview(id);
        return ResponseEntity.ok(ApiResponse.message("Review deleted successfully"));
    }

    @GetMapping("/search")
    public ResponseEntity<ApiResponse<PageResponse<ReviewResponse>>> searchReviews(ReviewSearchRequest request) {
        PageResponse<ReviewResponse> response = reviewService.search(request);
        return ResponseEntity.ok(ApiResponse.of("Reviews retrieved successfully", response));
    }
}
