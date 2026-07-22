package com.ailms.service.imp;

import com.ailms.entity.CourseEntity;
import com.ailms.entity.ReviewEntity;
import com.ailms.entity.enums.ReviewStatusEnum;
import com.ailms.event.AuditLogEvent;
import com.ailms.exception.BusinessException;
import com.ailms.exception.DuplicateResourceException;
import com.ailms.exception.ResourceNotFoundException;
import com.ailms.mapper.ReviewMapper;
import com.ailms.repository.CourseRepository;
import com.ailms.repository.EnrollmentRepository;
import com.ailms.repository.ReviewRepository;
import com.ailms.request.CreateReviewRequest;
import com.ailms.response.ReviewResponse;
import com.ailms.service.IReviewService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class ReviewService implements IReviewService {

    private final ReviewRepository reviewRepository;
    private final CourseRepository courseRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final ReviewMapper reviewMapper;
    private final ApplicationEventPublisher applicationEventPublisher;

    private static final String RESOURCE_NAME = "Review";
    private static final Set<String> SPAM_KEYWORDS = Set.of("spam", "scam", "hack", "http://", "https://");

    @Transactional
    @Override
    public ReviewResponse createReview(Long userId, Long courseId, CreateReviewRequest request) {
        log.info("Creating review for course: {}, user: {}", courseId, userId);

        CourseEntity course = courseRepository.findById(courseId)
                .orElseThrow(() -> ResourceNotFoundException.of("Course", courseId));

        // Enforce enrollment check
        boolean isEnrolled = enrollmentRepository.findByUserEntity_IdAndCourseEntity_Id(userId, courseId).isPresent();
        if (!isEnrolled) {
            throw new BusinessException("User must be enrolled in the course to leave a review.");
        }

        // Enforce unique (course_id, user_id)
        if (reviewRepository.existsByCourseIdAndUserId(courseId, userId)) {
            throw new DuplicateResourceException("User " + userId + " has already reviewed course " + courseId);
        }

        // Auto-check spam keywords
        boolean containsSpam = false;
        if (request.getComment() != null) {
            String commentLower = request.getComment().toLowerCase();
            containsSpam = SPAM_KEYWORDS.stream().anyMatch(commentLower::contains);
        }

        ReviewStatusEnum status = containsSpam ? ReviewStatusEnum.PENDING : ReviewStatusEnum.APPROVED;

        ReviewEntity review = ReviewEntity.builder()
                .courseId(courseId)
                .userId(userId)
                .rating(request.getRating())
                .comment(request.getComment())
                .status(status)
                .build();

        ReviewEntity saved = reviewRepository.save(review);

        if (status == ReviewStatusEnum.APPROVED) {
            recalculateCourseRating(course);
        }

        applicationEventPublisher.publishEvent(new AuditLogEvent(this, "CREATE_REVIEW", "REVIEW", saved.getId(), null, saved));
        return reviewMapper.toResponse(saved);
    }

    @Transactional
    @Override
    public ReviewResponse approveReview(Long reviewId, boolean approve, String rejectionReason) {
        log.info("Approving review: {}, approve: {}", reviewId, approve);

        ReviewEntity review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> ResourceNotFoundException.of(RESOURCE_NAME, reviewId));

        if (approve) {
            review.setStatus(ReviewStatusEnum.APPROVED);
            review.setRejectionReason(null);
        } else {
            review.setStatus(ReviewStatusEnum.REJECTED);
            review.setRejectionReason(rejectionReason);
        }

        ReviewEntity saved = reviewRepository.save(review);

        CourseEntity course = courseRepository.findById(review.getCourseId()).orElse(null);
        if (course != null) {
            recalculateCourseRating(course);
        }

        applicationEventPublisher.publishEvent(new AuditLogEvent(this, "APPROVE_REVIEW", "REVIEW", reviewId, null, saved));
        return reviewMapper.toResponse(saved);
    }

    @Override
    public List<ReviewResponse> getReviewsByCourseId(Long courseId) {
        return reviewMapper.toResponseList(reviewRepository.findByCourseIdAndStatus(courseId, ReviewStatusEnum.APPROVED));
    }

    @Transactional
    @Override
    public void deleteReview(Long reviewId) {
        log.info("Deleting review: {}", reviewId);
        ReviewEntity review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> ResourceNotFoundException.of(RESOURCE_NAME, reviewId));

        reviewRepository.delete(review);
        CourseEntity course = courseRepository.findById(review.getCourseId()).orElse(null);
        if (course != null) {
            recalculateCourseRating(course);
        }
        applicationEventPublisher.publishEvent(new AuditLogEvent(this, "DELETE_REVIEW", "REVIEW", reviewId, review, null));
    }

    private void recalculateCourseRating(CourseEntity course) {
        Double avg = reviewRepository.getAverageRatingForCourse(course.getId());
        Long count = reviewRepository.getReviewCountForCourse(course.getId());

        course.setAvgRating(avg != null ? Math.round(avg * 10.0) / 10.0 : 0.0);
        course.setReviewCount(count != null ? count.intValue() : 0);
        courseRepository.save(course);
    }
}
