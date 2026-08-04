package com.ailms.service.imp;

import com.ailms.entity.EnrollmentEntity;
import com.ailms.entity.LessonProgressEntity;

import com.ailms.exception.ResourceNotFoundException;
import com.ailms.mapper.LessonProgressMapper;
import com.ailms.repository.EnrollmentRepository;
import com.ailms.repository.LessonProgressRepository;
import com.ailms.repository.LessonRepository;
import com.ailms.request.UpdateProgressRequest;
import com.ailms.response.CourseCurriculumResponse;
import com.ailms.response.LessonProgressResponse;
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
import java.util.function.Function;
import java.util.stream.Collectors;

import com.ailms.entity.CourseProgressEntity;
import com.ailms.repository.CourseProgressRepository;

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

    @Override
    public CourseCurriculumResponse getCourseTree(Long courseId, Long userId) {
        log.info("Getting student course tree for courseId: {}, userId: {}", courseId, userId);
        CourseCurriculumResponse curriculum = courseAuthoringService.getCurriculum(courseId);

        if (userId != null && curriculum.getSections() != null) {
            List<LessonProgressEntity> progressList = lessonProgressRepository.findByUserId(userId);
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

    @Override
    @Transactional
    public LessonProgressResponse updateLessonProgress(Long lessonId, Long userId, Long enrollmentId, UpdateProgressRequest request) {
        log.info("Updating lesson progress: lessonId={}, userId={}, enrollmentId={}", lessonId, userId, enrollmentId);

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
}
