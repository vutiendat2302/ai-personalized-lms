package com.ailms.service.imp;

import com.ailms.entity.EnrollmentEntity;
import com.ailms.entity.LessonEntity;
import com.ailms.entity.LessonProgressEntity;

import com.ailms.exception.ResourceNotFoundException;
import com.ailms.exception.ForbiddenException;
import com.ailms.mapper.LessonProgressMapper;
import com.ailms.repository.EnrollmentRepository;
import com.ailms.repository.CourseRepository;
import com.ailms.repository.LessonProgressRepository;
import com.ailms.repository.LessonRepository;
import com.ailms.request.UpdateProgressRequest;
import com.ailms.response.CourseCurriculumResponse;
import com.ailms.response.LessonProgressResponse;
import com.ailms.response.LessonPreviewResponse;
import com.ailms.service.ICourseAuthoringService;
import com.ailms.service.IStudentLearningService;
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
import org.springframework.security.core.context.SecurityContextHolder;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class StudentLearningService implements IStudentLearningService {

    private final ICourseAuthoringService courseAuthoringService;
    private final LessonProgressRepository lessonProgressRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final CourseProgressRepository courseProgressRepository;
    private final LessonRepository lessonRepository;
    private final LessonProgressMapper lessonProgressMapper;
    private final EnrollmentPackageRepository enrollmentPackageRepository;
    private final CourseRepository courseRepository;

    @Override
    public CourseCurriculumResponse getCourseTree(Long courseId, Long userId) {
        log.info("Getting student course tree for courseId: {}, userId: {}", courseId, userId);
        CourseCurriculumResponse curriculum = courseAuthoringService.getCurriculum(courseId);
        EnrollmentEntity enrollment = userId != null
                ? enrollmentRepository.findByUserEntity_IdAndCourseEntity_Id(userId, courseId).orElse(null)
                : null;
        boolean hasAccess = userId != null && (isPrivilegedUser()
                || (curriculum.getCreatedBy() != null && curriculum.getCreatedBy().equals(userId))
                || enrollmentPackageRepository.existsActiveCourseAccess(userId, courseId, LocalDateTime.now()));
        if (!hasAccess && !courseRepository.isPubliclySellable(courseId)) {
            throw ResourceNotFoundException.of("Course", courseId);
        }
        curriculum.setEnrollmentId(hasAccess && enrollment != null ? enrollment.getId() : null);

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
                        } else {
                            lesson.setCompleted(false);
                            lesson.setProgressPercent(0);
                            lesson.setLastPositionSec(0);
                        }
                    });
                }
            });
        }

        return curriculum;
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
        boolean hasAccess = userId != null && courseId != null && (isPrivilegedUser()
                || Objects.equals(lesson.getCourseSectionEntity().getCourseEntity().getCreatedBy(), userId)
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
        if (enrollment.getCourseEntity() == null || lessonRepository.findById(lessonId)
                .map(lesson -> lesson.getCourseSectionEntity() == null
                        || lesson.getCourseSectionEntity().getCourseEntity() == null
                        || !enrollment.getCourseEntity().getId().equals(
                        lesson.getCourseSectionEntity().getCourseEntity().getId()))
                .orElse(true)) {
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

        if (request.getWatchPercent() != null) {
            progress.setProgressPercent(Math.max(progress.getProgressPercent() != null ? progress.getProgressPercent() : 0, request.getWatchPercent()));
        }
        if (request.getLastPositionSec() != null) {
            progress.setLastPositionSec(request.getLastPositionSec());
        }
        if (request.getTimeSpentSec() != null) {
            progress.setTimeSpentSec((progress.getTimeSpentSec() != null ? progress.getTimeSpentSec() : 0) + request.getTimeSpentSec());
        }
        progress.setLastAccessedAt(LocalDateTime.now());

        if (Boolean.TRUE.equals(request.getMarkCompleted()) || (progress.getProgressPercent() != null && progress.getProgressPercent() >= 80)) {
            if (progress.getCompletedAt() == null) {
                progress.setCompletedAt(LocalDateTime.now());
                progress.setStatus((byte) 1);
            }
        }

        LessonProgressEntity saved = lessonProgressRepository.save(progress);

        if (saved.getCompletedAt() != null) {
            recomputeEnrollmentProgress(enrollmentId);
        }

        return lessonProgressMapper.toResponse(saved);
    }

    @Override
    @Transactional
    public LessonProgressResponse completeLesson(Long lessonId, Long userId, Long enrollmentId) {
        log.info("Completing lesson: lessonId={}, userId={}, enrollmentId={}", lessonId, userId, enrollmentId);
        UpdateProgressRequest req = UpdateProgressRequest.builder()
                .markCompleted(true)
                .watchPercent(100)
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

        log.info("Recomputed course progress for enrollment {}: {}% ({}/{})", enrollmentId, percent, completedCount, totalLessons);
    }

    /** Cho phép Admin/giáo viên/trợ giảng/HR xem nội dung để quản trị và soạn thảo. */
    private boolean isPrivilegedUser() {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) return false;
        return authentication.getAuthorities().stream()
                .map(item -> item.getAuthority().toUpperCase())
                .anyMatch(role -> role.equals("ROLE_ADMIN") || role.equals("ROLE_TEACHER")
                        || role.equals("ROLE_TA") || role.equals("ROLE_HR"));
    }
}
