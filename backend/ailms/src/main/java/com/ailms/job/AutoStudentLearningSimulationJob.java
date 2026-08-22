package com.ailms.job;

import com.ailms.config.StudentRealisticStreakSeeder;
import com.ailms.config.StudentRealisticStreakSeeder.StudentPersona;
import com.ailms.entity.EnrollmentEntity;
import com.ailms.entity.LessonEntity;
import com.ailms.entity.LessonProgressEntity;
import com.ailms.repository.EnrollmentRepository;
import com.ailms.repository.LessonProgressRepository;
import com.ailms.repository.LessonRepository;
import com.ailms.response.LearningSessionResponse;
import com.ailms.service.ILearningSessionService;
import com.ailms.service.IStudentLearningService;
import com.ailms.service.IStudyGoalService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Tác vụ nền tự động mô phỏng hoạt động học tập và duy trì chuỗi Streak cho học viên.
 * Hoạt động 100% qua tầng nghiệp vụ Service (IStudentLearningService, ILearningSessionService).
 */
@Component
@RequiredArgsConstructor
@Slf4j
@ConditionalOnProperty(name = "app.simulation.auto-study.enabled", havingValue = "true", matchIfMissing = true)
public class AutoStudentLearningSimulationJob {

    private final EnrollmentRepository enrollmentRepository;
    private final LessonRepository lessonRepository;
    private final LessonProgressRepository lessonProgressRepository;
    private final IStudentLearningService studentLearningService;
    private final ILearningSessionService learningSessionService;
    private final IStudyGoalService studyGoalService;
    private final StudentRealisticStreakSeeder streakSeeder;

    private final Random random = new Random();

    /** Thực thi mô phỏng học tập theo các khung giờ cố định trong ngày (08:30, 14:30, 20:30, 22:00). */
    @Scheduled(cron = "${app.simulation.auto-study.cron:0 30 8,14,20,22 * * *}", zone = "Asia/Bangkok")
    public void runScheduledStudySimulation() {
        log.info("Starting scheduled student learning simulation...");
        simulateDailyStudyActivities();
    }

    /** Điều phối mô phỏng học tập cho tất cả học viên có đăng ký khóa học theo Personas. */
    public void simulateDailyStudyActivities() {
        List<EnrollmentEntity> enrollments = enrollmentRepository.findAll();
        if (enrollments.isEmpty()) {
            log.info("No enrollments found for auto-study simulation.");
            return;
        }

        // Gom nhóm ghi danh theo từng học viên
        Map<Long, List<EnrollmentEntity>> enrollmentsByUser = enrollments.stream()
                .filter(e -> e.getUserEntity() != null && e.getUserEntity().getId() != null)
                .filter(e -> e.getCourseEntity() != null && e.getCourseEntity().getId() != null)
                .collect(Collectors.groupingBy(e -> e.getUserEntity().getId()));

        int simulatedCount = 0;
        for (Map.Entry<Long, List<EnrollmentEntity>> entry : enrollmentsByUser.entrySet()) {
            Long userId = entry.getKey();
            List<EnrollmentEntity> userEnrollments = entry.getValue();

            StudentPersona persona = streakSeeder.determinePersona(userId);
            if (!shouldStudentStudyToday(persona)) {
                continue;
            }

            try {
                // Chọn một khóa học ngẫu nhiên trong danh sách đã ghi danh
                EnrollmentEntity enrollment = userEnrollments.get(random.nextInt(userEnrollments.size()));
                boolean success = processStudentStudySession(userId, enrollment);
                if (success) {
                    simulatedCount++;
                }
            } catch (Exception e) {
                log.warn("Error simulating study for student userId={}: {}", userId, e.getMessage());
            }
        }

        log.info("Auto-study simulation finished. Simulated study for {} active students.", simulatedCount);
    }

    /** Kiểm tra xác suất tham gia học hôm nay của học viên dựa trên nhóm Persona. */
    public boolean shouldStudentStudyToday(StudentPersona persona) {
        return shouldStudentStudyToday(persona, random.nextInt(100));
    }

    /** Kiểm tra xác suất tham gia học dựa trên Persona và giá trị xúc xắc cụ thể. */
    public boolean shouldStudentStudyToday(StudentPersona persona, int roll) {
        return switch (persona) {
            case TOP_SCHOLAR -> roll < 95;   // 95% cơ hội học
            case CONSISTENT -> roll < 75;    // 75% cơ hội học
            case CASUAL -> roll < 40;        // 40% cơ hội học
            case INACTIVE -> roll < 10;      // 10% cơ hội học
        };
    }

    /** Xử lý một phiên học chuẩn nghiệp vụ: học bài mới hoặc ôn tập bài cũ nếu đã 100%. */
    public boolean processStudentStudySession(Long userId, EnrollmentEntity enrollment) {
        Long courseId = enrollment.getCourseEntity().getId();
        Long enrollmentId = enrollment.getId();

        List<LessonEntity> allLessons = lessonRepository
                .findByCourseSectionEntity_CourseEntity_IdOrderByCourseSectionEntity_OrderIndexAscOrderIndexAsc(courseId);

        if (allLessons.isEmpty()) {
            return false;
        }

        List<LessonProgressEntity> progressList = lessonProgressRepository.findByEnrollmentId(enrollmentId);
        Set<Long> completedLessonIds = progressList.stream()
                .filter(p -> p.getCompletedAt() != null || (p.getStatus() != null && p.getStatus() == 1))
                .map(LessonProgressEntity::getLessonId)
                .collect(Collectors.toSet());

        // Tìm bài học chưa hoàn thành đầu tiên
        LessonEntity nextUncompletedLesson = allLessons.stream()
                .filter(l -> !completedLessonIds.contains(l.getId()))
                .findFirst()
                .orElse(null);

        if (nextUncompletedLesson != null) {
            // Nhánh 1: Tiến độ bài học mới qua Service chính thức
            log.info("Simulating new lesson completion: userId={}, lessonId={}, courseId={}",
                    userId, nextUncompletedLesson.getId(), courseId);
            studentLearningService.completeLesson(nextUncompletedLesson.getId(), userId, enrollmentId);
            return true;
        } else {
            // Nhánh 2: Khóa học đã hoàn thành 100% -> Thực hiện phiên ôn tập bài cũ (Revision Mode)
            LessonEntity reviewLesson = allLessons.get(random.nextInt(allLessons.size()));
            log.info("Simulating revision study session for completed course: userId={}, lessonId={}, courseId={}",
                    userId, reviewLesson.getId(), courseId);

            LearningSessionResponse session = learningSessionService.startSession(userId, "LESSON", reviewLesson.getId());
            if (session != null && session.getId() != null) {
                learningSessionService.endSession(session.getId(), "REVISION_COMPLETED");
                studyGoalService.evaluateUserGoals(userId);
                return true;
            }
        }
        return false;
    }
}
