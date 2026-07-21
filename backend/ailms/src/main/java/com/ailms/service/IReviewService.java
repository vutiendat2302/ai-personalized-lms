package com.ailms.service;

import com.ailms.request.CreateReviewRequest;
import com.ailms.response.ReviewResponse;

import java.util.List;

public interface IReviewService {

    ReviewResponse createReview(Long userId, Long courseId, CreateReviewRequest request);

    ReviewResponse approveReview(Long reviewId, boolean approve, String rejectionReason);

    List<ReviewResponse> getReviewsByCourseId(Long courseId);

    void deleteReview(Long reviewId);
}
