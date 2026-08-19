package com.ailms.config;

import com.ailms.entity.EnrollmentEntity;
import com.ailms.entity.LearningActivityLogEntity;
import com.ailms.entity.LessonEntity;
import com.ailms.entity.LessonProgressEntity;
import com.ailms.entity.StudentProfileEntity;
import com.ailms.repository.EnrollmentRepository;
import com.ailms.repository.LearningActivityLogRepository;
import com.ailms.repository.LessonProgressRepository;
import com.ailms.repository.LessonRepository;
import com.ailms.repository.StudentProfileRepository;
import com.ailms.service.IStudyGoalService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Random;
import java.util.Set;

/**
 * Tự động phân bổ lịch sử học tập 30 ngày qua cho học viên theo Personas thực tế khi khởi động.
 * Đảm bảo Streak, Leaderboard và Activity Heatmap phản ánh dữ liệu tự nhiên và đa dạng.
 */
@Component
@RequiredArgsConstructor
@Slf4j
@ConditionalOnProperty(name = "app.simulation.auto-study.enabled", havingValue = "true", matchIfMissing = true)
public class StudentRealisticStreakSeeder {

    private final StudentProfileRepository studentProfileRepository;
    private final LearningActivityLogRepository learningActivityLogRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final LessonRepository lessonRepository;
    private final LessonProgressRepository lessonProgressRepository;
    private final IStudyGoalService studyGoalService;

    @Value("${app.simulation.auto-study.seed-on-startup:true}")
    private boolean seedOnStartup;

    /** Định nghĩa các nhóm đặc trưng hành vi học tập của học viên. */
    public enum StudentPersona {
        TOP_SCHOLAR,    // Streak 18 - 28 ngày liên tiếp, học rất chăm
        CONSISTENT,     // Streak 6 - 12 ngày liên tiếp, kỷ lục cũ dài hơn
        CASUAL,         // Streak 1 - 3 ngày, thỉnh thoảng vào học
        INACTIVE        // Streak 0 ngày, đã nghỉ học 7+ ngày gần đây
    }

    /** Lắng nghe sự kiện ứng dụng khởi động sẵn sàng để thực hiện nạp dữ liệu streak. */
    @EventListener(ApplicationReadyEvent.class)
    public void onApplicationReady() {
        if (!seedOnStartup) {
            log.info("Auto-study startup seeding is disabled by configuration");
            return;
        }
        try {
            seedRealisticStreakHistory();
        } catch (Exception e) {
            log.error("Error occurred while seeding realistic student streaks", e);
        }
    }

    /** Kiểm tra điều kiện và thực hiện nạp lịch sử học tập cho toàn bộ học sinh. */
    @Transactional
    public void seedRealisticStreakHistory() {
        LocalDate today = LocalDate.now();
        LocalDateTime thirtyDaysAgo = today.minusDays(30).atStartOfDay();

        long recentLogsCount = learningActivityLogRepository.countByOccurredAtBetween(thirtyDaysAgo, LocalDateTime.now());
        if (recentLogsCount >= 50) {
            log.info("Learning activity logs already populated ({} logs in last 30 days). Skipping seeding.", recentLogsCount);
            return;
        }

        List<StudentProfileEntity> students = studentProfileRepository.findAll();
        if (students.isEmpty()) {
            log.info("No student profiles found to seed streaks.");
            return;
        }

        log.info("Starting realistic streak seeding for {} students...", students.size());

        for (StudentProfileEntity student : students) {
            try {
                seedStudentHistory(student, today);
                studyGoalService.evaluateUserGoals(student.getUserId());
            } catch (Exception e) {
                log.warn("Failed to seed history for student userId={}: {}", student.getUserId(), e.getMessage());
            }
        }

        log.info("Realistic streak seeding completed successfully.");
    }

    /** Sinh lịch sử học tập và nhật ký hoạt động cho một học viên cụ thể theo Persona. */
    private void seedStudentHistory(StudentProfileEntity student, LocalDate today) {
        Long userId = student.getUserId();
        StudentPersona persona = determinePersona(userId);
        List<LocalDate> activeDates = generateActiveDates(persona, today, userId);

        List<EnrollmentEntity> enrollments = enrollmentRepository.findByUserEntity_Id(userId);
        List<LessonEntity> availableLessons = new ArrayList<>();

        if (!enrollments.isEmpty()) {
            for (EnrollmentEntity enrollment : enrollments) {
                if (enrollment.getCourseEntity() != null) {
                    availableLessons.addAll(lessonRepository
                            .findByCourseSectionEntity_CourseEntity_IdOrderByCourseSectionEntity_OrderIndexAscOrderIndexAsc(
                                    enrollment.getCourseEntity().getId()));
                }
            }
        }

        int lessonIndex = 0;
        for (LocalDate date : activeDates) {
            LocalDateTime occurredAt = generateRealisticTime(date, userId);
            Long lessonId = null;

            if (!availableLessons.isEmpty()) {
                LessonEntity lesson = availableLessons.get(lessonIndex % availableLessons.size());
                lessonId = lesson.getId();
                lessonIndex++;

                // Đồng bộ tiến độ bài học nếu học viên có enrollment
                if (!enrollments.isEmpty()) {
                    EnrollmentEntity primaryEnrollment = enrollments.get(0);
                    syncHistoricalLessonProgress(userId, lessonId, primaryEnrollment.getId(), occurredAt);
                }
            }

            String eventType = (lessonIndex % 3 == 0) ? "LEARNING_SESSION_END" : "LESSON_COMPLETED";
            String device = (Math.abs((userId + date.getDayOfMonth()) % 5) == 0) ? "MOBILE" : "WEB";

            createActivityLog(userId, lessonId, occurredAt, eventType, device);
        }
    }

    /** Xác định nhóm Persona dựa trên ID học viên để đảm bảo phân bổ cố định và tự nhiên. */
    public StudentPersona determinePersona(Long userId) {
        if (userId == null) return StudentPersona.CASUAL;
        int mod = (int) (Math.abs(userId) % 10);
        return switch (mod) {
            case 0, 1 -> StudentPersona.TOP_SCHOLAR;
            case 2, 3, 4, 5 -> StudentPersona.CONSISTENT;
            case 6, 7 -> StudentPersona.CASUAL;
            default -> StudentPersona.INACTIVE;
        };
    }

    /** Tạo danh sách các ngày có hoạt động học trong 30 ngày qua theo đặc trưng Persona. */
    public List<LocalDate> generateActiveDates(StudentPersona persona, LocalDate today, Long userId) {
        Set<LocalDate> dates = new HashSet<>();
        Random random = new Random(userId != null ? userId : 42);

        switch (persona) {
            case TOP_SCHOLAR -> {
                // Streak 18 - 25 ngày liên tiếp đến hôm nay
                int streakDays = 18 + random.nextInt(8); // 18 đến 25 ngày
                for (int i = 0; i < streakDays; i++) {
                    dates.add(today.minusDays(i));
                }
                // Thêm vài ngày lẻ trước đó
                for (int i = streakDays + 2; i < 30; i += 2) {
                    dates.add(today.minusDays(i));
                }
            }
            case CONSISTENT -> {
                // Streak 6 - 12 ngày liên tiếp đến hôm nay
                int streakDays = 6 + random.nextInt(7); // 6 đến 12 ngày
                for (int i = 0; i < streakDays; i++) {
                    dates.add(today.minusDays(i));
                }
                // Đứt quãng 1-2 ngày trước chuỗi hiện tại
                int gap = 1 + random.nextInt(2);
                int previousStart = streakDays + gap;
                // Chuỗi kỷ lục trước đó dài hơn (8 - 14 ngày)
                int previousStreak = 8 + random.nextInt(7);
                for (int i = previousStart; i < Math.min(30, previousStart + previousStreak); i++) {
                    dates.add(today.minusDays(i));
                }
            }
            case CASUAL -> {
                // Streak 1 - 3 ngày
                int streakDays = 1 + random.nextInt(3);
                for (int i = 0; i < streakDays; i++) {
                    dates.add(today.minusDays(i));
                }
                // Vài ngày học cách quãng trong tháng
                dates.add(today.minusDays(7));
                dates.add(today.minusDays(8));
                dates.add(today.minusDays(15));
                dates.add(today.minusDays(22));
            }
            case INACTIVE -> {
                // Streak = 0 (không học 7 ngày gần nhất, chỉ có log từ 10-25 ngày trước)
                for (int i = 10; i < 20; i++) {
                    if (i % 2 == 0) {
                        dates.add(today.minusDays(i));
                    }
                }
            }
        }

        List<LocalDate> sortedDates = new ArrayList<>(dates);
        Collections.sort(sortedDates);
        return sortedDates;
    }

    /** Tạo thời gian học tự nhiên trong ngày với phút và giây ngẫu nhiên. */
    private LocalDateTime generateRealisticTime(LocalDate date, Long userId) {
        Random random = new Random(date.toEpochDay() + (userId != null ? userId : 0));
        int hour;
        int roll = random.nextInt(100);
        if (roll < 70) {
            // 70% học buổi tối từ 19h30 đến 22h30
            hour = 19 + random.nextInt(4);
        } else if (roll < 90) {
            // 20% học buổi sáng từ 8h đến 11h
            hour = 8 + random.nextInt(4);
        } else {
            // 10% học buổi chiều từ 14h đến 17h
            hour = 14 + random.nextInt(4);
        }
        int minute = random.nextInt(60);
        int second = random.nextInt(60);
        return LocalDateTime.of(date, LocalTime.of(hour, minute, second));
    }

    /** Lưu nhật ký hoạt động học tập vào bảng learning_activity_log. */
    private void createActivityLog(Long userId, Long lessonId, LocalDateTime occurredAt, String eventType, String device) {
        LearningActivityLogEntity logEntry = LearningActivityLogEntity.builder()
                .userId(userId)
                .eventType(eventType)
                .entityType(lessonId != null ? "LESSON" : "COURSE")
                .entityId(lessonId != null ? lessonId : 1L)
                .device(device)
                .metadata("{\"duration_seconds\": " + (900 + (occurredAt.getMinute() * 15)) + "}")
                .occurredAt(occurredAt)
                .build();
        learningActivityLogRepository.save(logEntry);
    }

    /** Đồng bộ tiến độ bài học lịch sử tương ứng vào lesson_progress. */
    private void syncHistoricalLessonProgress(Long userId, Long lessonId, Long enrollmentId, LocalDateTime completedAt) {
        if (userId == null || lessonId == null || enrollmentId == null) return;
        var existing = lessonProgressRepository.findByUserIdAndLessonIdAndEnrollmentId(userId, lessonId, enrollmentId);
        if (existing.isEmpty()) {
            LessonProgressEntity progress = LessonProgressEntity.builder()
                    .userId(userId)
                    .lessonId(lessonId)
                    .enrollmentId(enrollmentId)
                    .startedAt(completedAt.minusMinutes(30))
                    .completedAt(completedAt)
                    .lastAccessedAt(completedAt)
                    .status((byte) 1)
                    .progressPercent(100)
                    .lastPositionSec(600)
                    .timeSpentSec(900)
                    .build();
            lessonProgressRepository.save(progress);
        }
    }
}
