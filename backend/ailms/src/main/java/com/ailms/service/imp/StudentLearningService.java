package com.ailms.service.imp;

import com.ailms.entity.EnrollmentEntity;
import com.ailms.entity.CourseEntity;
import com.ailms.entity.LessonEntity;
import com.ailms.entity.LessonProgressEntity;
import com.ailms.entity.LearningActivityLogEntity;

import com.ailms.exception.ResourceNotFoundException;
import com.ailms.exception.ForbiddenException;
import com.ailms.exception.BusinessException;
import com.ailms.mapper.LessonProgressMapper;
import com.ailms.repository.EnrollmentRepository;
import com.ailms.repository.CourseRepository;
import com.ailms.repository.CourseTeacherRepository;
import com.ailms.repository.LessonProgressRepository;
import com.ailms.repository.LessonRepository;
import com.ailms.repository.LearningActivityLogRepository;
import com.ailms.request.UpdateProgressRequest;
import com.ailms.response.CourseCurriculumResponse;
import com.ailms.response.LessonProgressResponse;
import com.ailms.response.LessonPreviewResponse;
import com.ailms.service.ICourseAuthoringService;
import com.ailms.service.IStudentLearningService;
import com.ailms.service.IStudyGoalService;
import com.ailms.service.ICertificateService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Objects;
import java.util.function.Function;
import java.util.stream.Collectors;

import com.ailms.entity.CourseProgressEntity;
import com.ailms.repository.CourseProgressRepository;
import com.ailms.repository.EnrollmentPackageRepository;
import com.ailms.entity.enums.PreviewTypeEnum;
import com.ailms.entity.enums.DeliveryModeEnum;
import com.ailms.entity.enums.CourseTeacherStatusEnum;
import org.springframework.security.core.context.SecurityContextHolder;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class StudentLearningService implements IStudentLearningService {

    private static final int VIDEO_COMPLETION_PERCENT = 70;

    private final ICourseAuthoringService courseAuthoringService;
    private final LessonProgressRepository lessonProgressRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final CourseProgressRepository courseProgressRepository;
    private final LessonRepository lessonRepository;
    private final LessonProgressMapper lessonProgressMapper;
    private final EnrollmentPackageRepository enrollmentPackageRepository;
    private final CourseRepository courseRepository;
    private final CourseTeacherRepository courseTeacherRepository;
    private final LearningActivityLogRepository learningActivityLogRepository;
    private final IStudyGoalService studyGoalService;
    private final ICertificateService certificateService;

    @Override
    public CourseCurriculumResponse getCourseTree(Long courseId, Long userId) {
        log.info("Getting student course tree for courseId: {}, userId: {}", courseId, userId);
        CourseEntity course = courseRepository.findById(courseId)
                .orElseThrow(() -> ResourceNotFoundException.of("Course", courseId));
        boolean staffPreviewAccess = hasStaffPreviewAccess(courseId, userId, course.getCreatedBy());
        CourseCurriculumResponse curriculum = staffPreviewAccess
                ? courseAuthoringService.getCurriculum(courseId)
                : courseAuthoringService.getLearningCurriculum(courseId);
        EnrollmentEntity enrollment = userId != null
                ? enrollmentRepository.findByUserEntity_IdAndCourseEntity_Id(userId, courseId).orElse(null)
                : null;
        boolean hasAccess = userId != null && (staffPreviewAccess
                || enrollmentPackageRepository.existsActiveCourseAccess(userId, courseId, LocalDateTime.now()));
        if (!hasAccess && !courseRepository.isPubliclySellable(courseId)) {
            throw ResourceNotFoundException.of("Course", courseId);
        }
        curriculum.setEnrollmentId(hasAccess && enrollment != null ? enrollment.getId() : null);
        curriculum.setStaffPreviewAccess(staffPreviewAccess);
        if (hasAccess && enrollment != null) {
            curriculum.setDeliveryMode(resolveDeliveryMode(enrollment.getId()));
        }

        if (curriculum.getSections() != null) {
            curriculum.getSections().forEach(section -> {
                if (section.getLessons() == null) return;
                section.getLessons().forEach(lesson -> {
                    boolean preview = PreviewTypeEnum.FREE.name().equals(lesson.getPreviewType());
                    boolean accessible = hasAccess || preview;
                    lesson.setTitle(lesson.getName());
                    lesson.setDuration(lesson.getDurationMin());
                    lesson.setPreview(preview);
                    lesson.setAccessible(accessible);
                    lesson.setLocked(!accessible);
                    if (!accessible) {
                        lesson.setContentUrl(null);
                        lesson.setResources(null);
                        lesson.setLinkedQuiz(null);
                        lesson.setLinkedAssignment(null);
                    }
                });
            });
        }

        if (hasAccess && userId != null && curriculum.getSections() != null) {
            List<LessonProgressEntity> progressList = enrollment != null
                    ? lessonProgressRepository.findByEnrollmentId(enrollment.getId())
                    : List.of();
            Map<Long, LessonProgressEntity> progressMap = progressList.stream()
                    .collect(Collectors.toMap(LessonProgressEntity::getLessonId, Function.identity(), (a, b) -> a));

            curriculum.getSections().forEach(section -> {
                if (section.getLessons() != null) {
                    section.getLessons().forEach(lesson -> {
                        LessonProgressEntity progress = progressMap.get(lesson.getId());
                        if (progress != null) {
                            lesson.setCompleted(progress.getCompletedAt() != null || (progress.getStatus() != null && progress.getStatus() == 1));
                            lesson.setProgressPercent(progress.getProgressPercent());
                            lesson.setLastPositionSec(progress.getLastPositionSec());
                            lesson.setPersonalNote(progress.getPersonalNote());
                        } else {
                            lesson.setCompleted(false);
                            lesson.setProgressPercent(0);
                            lesson.setLastPositionSec(0);
                            lesson.setPersonalNote("");
                        }
                    });
                }
            });
        }

        return curriculum;
    }

    /** Xác định hình thức gói đang cấp quyền để giao diện xử lý đúng bài tự luyện hay bài có giảng viên. */
    private DeliveryModeEnum resolveDeliveryMode(Long enrollmentId) {
        return enrollmentPackageRepository.findActiveByEnrollment(enrollmentId, LocalDateTime.now()).stream()
                .map(item -> item.getCoursePackageEntity().getDeliveryMode())
                .filter(Objects::nonNull)
                .sorted((left, right) -> Boolean.compare(left == DeliveryModeEnum.SELF_STUDY, right == DeliveryModeEnum.SELF_STUDY))
                .findFirst()
                .orElse(DeliveryModeEnum.SELF_STUDY);
    }

    /** Kiểm tra và trả nội dung bài học; bài không preview khi chưa mua trả 403. */
    @Override
    public LessonPreviewResponse getAccessibleLesson(Long lessonId, Long userId) {
        LessonEntity lesson = lessonRepository.findById(lessonId)
                .orElseThrow(() -> ResourceNotFoundException.of("Lesson", lessonId));
        Long courseId = lesson.getCourseSectionEntity() != null
                && lesson.getCourseSectionEntity().getCourseEntity() != null
                ? lesson.getCourseSectionEntity().getCourseEntity().getId() : null;
        boolean preview = lesson.getPreviewType() == PreviewTypeEnum.FREE;
        Long createdBy = courseId != null
                ? lesson.getCourseSectionEntity().getCourseEntity().getCreatedBy()
                : null;
        boolean hasAccess = userId != null && courseId != null
                && (hasStaffPreviewAccess(courseId, userId, createdBy)
                || enrollmentPackageRepository.existsActiveCourseAccess(userId, courseId, LocalDateTime.now()));
        if (!hasAccess && (courseId == null || !courseRepository.isPubliclySellable(courseId))) {
            throw ResourceNotFoundException.of("Lesson", lessonId);
        }
        if (!preview && !hasAccess) {
            throw new ForbiddenException("Bạn cần đăng ký khóa học để mở bài học này.");
        }
        return LessonPreviewResponse.builder()
                .id(lesson.getId())
                .name(lesson.getName())
                .contentType(lesson.getContentType())
                .description(lesson.getDescription())
                .durationMin(lesson.getDurationMin())
                .durationSec(lesson.getDurationSec())
                .previewType(preview ? PreviewTypeEnum.FREE.name() : PreviewTypeEnum.LOCKED.name())
                .locked(false)
                .contentUrl(lesson.getContentUrl())
                .build();
    }

    @Override
    @Transactional
    public LessonProgressResponse updateLessonProgress(Long lessonId, Long userId, Long enrollmentId, UpdateProgressRequest request) {
        log.info("Updating lesson progress: lessonId={}, userId={}, enrollmentId={}", lessonId, userId, enrollmentId);

        EnrollmentEntity enrollment = enrollmentRepository.findById(enrollmentId)
                .filter(item -> item.getUserEntity() != null && userId.equals(item.getUserEntity().getId()))
                .orElseThrow(() -> ResourceNotFoundException.of("Enrollment", enrollmentId));
        if (!enrollmentPackageRepository.existsActiveCourseAccess(
                userId, enrollment.getCourseEntity().getId(), LocalDateTime.now())) {
            throw new ForbiddenException("Gói học của bạn không còn hiệu lực.");
        }
        LessonEntity lesson = lessonRepository.findById(lessonId)
                .orElseThrow(() -> ResourceNotFoundException.of("Lesson", lessonId));
        if (enrollment.getCourseEntity() == null
                || lesson.getCourseSectionEntity() == null
                || lesson.getCourseSectionEntity().getCourseEntity() == null
                || !enrollment.getCourseEntity().getId().equals(
                lesson.getCourseSectionEntity().getCourseEntity().getId())) {
            throw ResourceNotFoundException.of("Lesson", lessonId);
        }

        Optional<LessonProgressEntity> existingOpt = lessonProgressRepository
                .findByUserIdAndLessonIdAndEnrollmentId(userId, lessonId, enrollmentId);

        LessonProgressEntity progress;
        if (existingOpt.isPresent()) {
            progress = existingOpt.get();
        } else {
            progress = LessonProgressEntity.builder()
                    .userId(userId)
                    .lessonId(lessonId)
                    .enrollmentId(enrollmentId)
                    .startedAt(LocalDateTime.now())
                    .status((byte) 0)
                    .progressPercent(0)
                    .lastPositionSec(0)
                    .timeSpentSec(0)
                    .build();
        }

        boolean wasCompleted = progress.getCompletedAt() != null
                || (progress.getStatus() != null && progress.getStatus() == 1);

        if (request.getWatchPercent() != null) {
            if (request.getWatchPercent() < 0 || request.getWatchPercent() > 100) {
                throw new BusinessException("Phần trăm xem video phải nằm trong khoảng 0 đến 100.");
            }
            progress.setProgressPercent(Math.max(progress.getProgressPercent() != null ? progress.getProgressPercent() : 0, request.getWatchPercent()));
        }
        if (request.getLastPositionSec() != null) {
            progress.setLastPositionSec(request.getLastPositionSec());
        }
        if (request.getTimeSpentSec() != null) {
            progress.setTimeSpentSec((progress.getTimeSpentSec() != null ? progress.getTimeSpentSec() : 0) + request.getTimeSpentSec());
        }
        if (request.getPersonalNote() != null) {
            progress.setPersonalNote(request.getPersonalNote().trim());
        }
        progress.setLastAccessedAt(LocalDateTime.now());

        boolean videoLesson = "VIDEO".equalsIgnoreCase(lesson.getContentType());
        if (videoLesson && Boolean.TRUE.equals(request.getMarkCompleted())
                && (progress.getProgressPercent() == null
                || progress.getProgressPercent() < VIDEO_COMPLETION_PERCENT)) {
            throw new BusinessException("Bạn cần xem ít nhất 70% thời lượng video trước khi hoàn thành bài học.");
        }
        if (Boolean.TRUE.equals(request.getMarkCompleted())
                || (videoLesson && progress.getProgressPercent() != null
                && progress.getProgressPercent() >= VIDEO_COMPLETION_PERCENT)) {
            if (progress.getCompletedAt() == null) {
                progress.setCompletedAt(LocalDateTime.now());
                progress.setStatus((byte) 1);
            }
        }

        LessonProgressEntity saved = lessonProgressRepository.save(progress);

        if (saved.getCompletedAt() != null) {
            if (!wasCompleted) {
                recordLessonCompletion(userId, lessonId);
                studyGoalService.evaluateUserGoals(userId);
            }
            recomputeEnrollmentProgress(enrollmentId);
        }

        return lessonProgressMapper.toResponse(saved);
    }

    /** Ghi nhận một hoạt động khi học viên hoàn thành bài học lần đầu. */
    private void recordLessonCompletion(Long userId, Long lessonId) {
        learningActivityLogRepository.save(LearningActivityLogEntity.builder()
                .userId(userId)
                .eventType("LESSON_COMPLETED")
                .entityType("LESSON")
                .entityId(lessonId)
                .device("WEB")
                .occurredAt(LocalDateTime.now())
                .build());
    }

    @Override
    @Transactional
    public LessonProgressResponse completeLesson(Long lessonId, Long userId, Long enrollmentId) {
        log.info("Completing lesson: lessonId={}, userId={}, enrollmentId={}", lessonId, userId, enrollmentId);
        UpdateProgressRequest req = UpdateProgressRequest.builder()
                .markCompleted(true)
                .build();
        return updateLessonProgress(lessonId, userId, enrollmentId, req);
    }

    private void recomputeEnrollmentProgress(Long enrollmentId) {
        if (enrollmentId == null) return;
        EnrollmentEntity enrollment = enrollmentRepository.findById(enrollmentId).orElse(null);
        if (enrollment == null || enrollment.getCourseEntity() == null) return;

        Long courseId = enrollment.getCourseEntity().getId();
        Long userId = enrollment.getUserEntity() != null ? enrollment.getUserEntity().getId() : null;
        int totalLessons = lessonRepository.countByCourseSectionEntityCourseEntityId(courseId);
        if (totalLessons == 0) return;

        long completedCount = lessonProgressRepository.countByEnrollmentIdAndStatusEquals(enrollmentId, (byte) 1);
        int percent = (int) Math.min(100, Math.round((double) completedCount * 100 / totalLessons));

        if (percent >= 100 && enrollment.getCompletedAt() == null) {
            enrollment.setCompletedAt(LocalDateTime.now());
            enrollment.setStatus((byte) 1);
            enrollmentRepository.save(enrollment);
        }

        List<CourseProgressEntity> progressList = courseProgressRepository.findByEnrollmentId(enrollmentId);
        CourseProgressEntity courseProgress = !progressList.isEmpty() ? progressList.get(0) : CourseProgressEntity.builder()
                .enrollmentId(enrollmentId)
                .courseId(courseId)
                .userId(userId)
                .build();

        courseProgress.setTotalLessons(totalLessons);
        courseProgress.setCompletedLessons((int) completedCount);
        courseProgress.setProgressPercent(percent);
        courseProgress.setLastAccessedAt(LocalDateTime.now());
        courseProgressRepository.save(courseProgress);

        certificateService.issueIfEligible(enrollmentId);

        log.info("Recomputed course progress for enrollment {}: {}% ({}/{})", enrollmentId, percent, completedCount, totalLessons);
    }

    /** Cho phép quản trị viên xem mọi khóa học; giáo viên/TA chỉ xem khóa được phân công hoặc sở hữu. */
    private boolean hasStaffPreviewAccess(Long courseId, Long userId, Long createdBy) {
        if (courseId == null || userId == null) return false;
        if (Objects.equals(createdBy, userId) || hasManagementContentAccess()) return true;
        return courseTeacherRepository.existsByCourseEntity_IdAndUserEntity_IdAndStatus(
                courseId, userId, CourseTeacherStatusEnum.ACTIVE);
    }

    /** Kiểm tra các vai trò quản trị được phép xem nội dung của toàn bộ khóa học. */
    private boolean hasManagementContentAccess() {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) return false;
        return authentication.getAuthorities().stream()
                .map(item -> item.getAuthority().toUpperCase())
                .anyMatch(role -> role.equals("ROLE_ADMIN") || role.equals("ROLE_MANAGER")
                        || role.equals("ROLE_HR"));
    }
}
