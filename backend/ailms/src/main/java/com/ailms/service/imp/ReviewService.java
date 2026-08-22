package com.ailms.service.imp;

import com.ailms.entity.CourseEntity;
import com.ailms.entity.ReviewEntity;
import com.ailms.entity.StudentProfileEntity;
import com.ailms.entity.enums.ReviewStatusEnum;
import com.ailms.event.AuditLogEvent;
import com.ailms.exception.BusinessException;
import com.ailms.exception.DuplicateResourceException;
import com.ailms.exception.ResourceNotFoundException;
import com.ailms.mapper.ReviewMapper;
import com.ailms.repository.CourseRepository;
import com.ailms.repository.EnrollmentRepository;
import com.ailms.repository.ReviewRepository;
import com.ailms.repository.UserRepository;
import com.ailms.repository.StudentProfileRepository;
import com.ailms.entity.UserEntity;
import com.ailms.entity.EnrollmentEntity;
import com.ailms.entity.ClassMemberEntity;
import com.ailms.entity.CourseTeacherEntity;
import com.ailms.entity.enums.ClassMemberRole;
import com.ailms.entity.enums.ClassMemberStatusEnum;
import com.ailms.entity.enums.CourseTeacherStatusEnum;
import com.ailms.repository.ClassMemberRepository;
import com.ailms.repository.CourseTeacherRepository;
import com.ailms.repository.specification.ReviewSpecification;
import com.ailms.request.CreateReviewRequest;
import com.ailms.request.ReviewSearchRequest;
import com.ailms.response.PageResponse;
import com.ailms.response.ReviewResponse;
import com.ailms.service.IReviewService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.Objects;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class ReviewService implements IReviewService {

    private final ReviewRepository reviewRepository;
    private final CourseRepository courseRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final UserRepository userRepository;
    private final StudentProfileRepository studentProfileRepository;
    private final ClassMemberRepository classMemberRepository;
    private final CourseTeacherRepository courseTeacherRepository;
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

        EnrollmentEntity enrollment = enrollmentRepository.findByUserEntity_IdAndCourseEntity_Id(userId, courseId)
                .orElseThrow(() -> new BusinessException("Bạn cần ghi danh khóa học trước khi đánh giá."));
        if (!Byte.valueOf((byte) 1).equals(enrollment.getStatus()) && enrollment.getCompletedAt() == null) {
            throw new BusinessException("Bạn chỉ có thể đánh giá sau khi hoàn thành khóa học.");
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

        ReviewStatusEnum status = containsSpam ? ReviewStatusEnum.INACTIVE : ReviewStatusEnum.ACTIVE;

        UserEntity user = userRepository.findById(userId)
                .orElseThrow(() -> ResourceNotFoundException.of("User", userId));
        UserEntity teacher = resolveTeacher(enrollment);
        if (request.getTeacherRating() != null && teacher == null) {
            throw new BusinessException("Khóa học chưa có giáo viên chính để nhận đánh giá.");
        }

        ReviewEntity review = ReviewEntity.builder()
                .courseId(courseId)
                .userId(userId)
                .courseEntity(course)
                .userEntity(user)
                .rating(request.getRating())
                .comment(request.getComment())
                .teacherId(teacher != null ? teacher.getId() : null)
                .teacherRating(teacher != null ? request.getTeacherRating() : null)
                .teacherComment(teacher != null ? request.getTeacherComment() : null)
                .status(status)
                .build();

        ReviewEntity saved = reviewRepository.save(review);

        if (status == ReviewStatusEnum.ACTIVE) {
            recalculateCourseRating(course);
        }

        applicationEventPublisher.publishEvent(new AuditLogEvent(this, "CREATE_REVIEW", "REVIEW", saved.getId(), null, saved));
        return populateExtraInfo(reviewMapper.toResponse(saved));
    }

    @Transactional
    @Override
    public ReviewResponse approveReview(Long reviewId, boolean approve, String rejectionReason) {
        log.info("Approving review: {}, approve: {}", reviewId, approve);

        ReviewEntity review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> ResourceNotFoundException.of(RESOURCE_NAME, reviewId));

        if (approve) {
            review.setStatus(ReviewStatusEnum.ACTIVE);
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
        return populateExtraInfo(reviewMapper.toResponse(saved));
    }

    @Override
    public List<ReviewResponse> getReviewsByCourseId(Long courseId) {
        List<ReviewResponse> list = reviewMapper.toResponseList(reviewRepository.findByCourseIdAndStatusWithRelations(courseId, ReviewStatusEnum.ACTIVE));
        return populateExtraInfo(list);
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

    @Override
    public PageResponse<ReviewResponse> search(ReviewSearchRequest request) {
        log.info("Searching reviews with keyword: {}, rating: {}", request.getKeyword(), request.getRating());

        Page<ReviewEntity> page = reviewRepository.findAll(
                ReviewSpecification.filterAndSearch(request),
                request.toPageable()
        );

        PageResponse<ReviewResponse> response = PageResponse.from(page.map(reviewMapper::toResponse));
        populateExtraInfo(response.getContent());
        return response;
    }

    @Override
    public Double getAverageRating() {
        log.info("Calculating average rating of all active reviews");
        Double avg = reviewRepository.getAverageRatingOfActiveReviews();
        return avg != null ? Math.round(avg * 10.0) / 10.0 : 0.0;
    }


    private void recalculateCourseRating(CourseEntity course) {
        Double avg = reviewRepository.getAverageRatingForCourse(course.getId());
        Long count = reviewRepository.getReviewCountForCourse(course.getId());

        course.setAvgRating(avg != null ? Math.round(avg * 10.0) / 10.0 : 0.0);
        course.setReviewCount(count != null ? count.intValue() : 0);
        courseRepository.save(course);
    }

    private ReviewResponse populateExtraInfo(ReviewResponse response) {
        if (response != null && response.getUserId() != null) {
            studentProfileRepository.findById(response.getUserId())
                    .ifPresent(profile -> response.setSchoolName(profile.getSchoolName()));
        }
        if (response != null && response.getTeacherId() != null) {
            userRepository.findById(response.getTeacherId()).ifPresent(teacher -> {
                response.setTeacherName(teacher.getFullName());
                response.setTeacherAvatarUrl(teacher.getAvatarUrl());
            });
        }
        return response;
    }

    private List<ReviewResponse> populateExtraInfo(List<ReviewResponse> responses) {
        if (responses == null || responses.isEmpty()) {
            return responses;
        }
        List<Long> userIds = responses.stream()
                .map(ReviewResponse::getUserId)
                .filter(Objects::nonNull)
                .distinct()
                .collect(Collectors.toList());

        List<StudentProfileEntity> profiles = studentProfileRepository.findAllById(userIds);
        Map<Long, String> userIdToSchoolName = profiles.stream()
                // Collectors.toMap rejects null values. School is optional, so a
                // profile without one must not make the whole review search fail.
                .filter(profile -> profile.getSchoolName() != null)
                .collect(Collectors.toMap(StudentProfileEntity::getUserId, StudentProfileEntity::getSchoolName));

        responses.forEach(r -> {
            if (r.getUserId() != null) {
                r.setSchoolName(userIdToSchoolName.get(r.getUserId()));
            }
        });
        Map<Long, UserEntity> teachers = userRepository.findAllById(responses.stream()
                        .map(ReviewResponse::getTeacherId).filter(Objects::nonNull).distinct().toList())
                .stream().collect(Collectors.toMap(UserEntity::getId, Function.identity()));
        responses.forEach(response -> {
            UserEntity teacher = teachers.get(response.getTeacherId());
            if (teacher != null) {
                response.setTeacherName(teacher.getFullName());
                response.setTeacherAvatarUrl(teacher.getAvatarUrl());
            }
        });
        return responses;
    }

    /** Tìm giáo viên chính của đúng lớp học, sau đó mới fallback sang phân công cấp khóa học. */
    private UserEntity resolveTeacher(EnrollmentEntity enrollment) {
        if (enrollment.getClassEntity() != null) {
            List<ClassMemberEntity> teachers = classMemberRepository
                    .findById_ClassIdAndRoleInClassInAndStatus(enrollment.getClassEntity().getId(),
                            List.of(ClassMemberRole.TEACHER), ClassMemberStatusEnum.ACTIVE);
            if (!teachers.isEmpty()) return teachers.get(0).getUserEntity();
        }
        return courseTeacherRepository.findByCourseEntity_IdAndStatus(
                        enrollment.getCourseEntity().getId(), CourseTeacherStatusEnum.ACTIVE).stream()
                .map(CourseTeacherEntity::getUserEntity).findFirst().orElse(null);
    }
}
