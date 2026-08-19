package com.ailms.config;

import com.ailms.config.StudentRealisticStreakSeeder.StudentPersona;
import com.ailms.entity.LearningActivityLogEntity;
import com.ailms.entity.StudentProfileEntity;
import com.ailms.entity.UserEntity;
import com.ailms.repository.EnrollmentRepository;
import com.ailms.repository.LearningActivityLogRepository;
import com.ailms.repository.LessonProgressRepository;
import com.ailms.repository.LessonRepository;
import com.ailms.repository.StudentProfileRepository;
import com.ailms.service.IStudyGoalService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Kiểm thử đơn vị cho thành phần StudentRealisticStreakSeeder.
 */
@ExtendWith(MockitoExtension.class)
class StudentRealisticStreakSeederTest {

    @Mock
    private StudentProfileRepository studentProfileRepository;
    @Mock
    private LearningActivityLogRepository learningActivityLogRepository;
    @Mock
    private EnrollmentRepository enrollmentRepository;
    @Mock
    private LessonRepository lessonRepository;
    @Mock
    private LessonProgressRepository lessonProgressRepository;
    @Mock
    private IStudyGoalService studyGoalService;

    @InjectMocks
    private StudentRealisticStreakSeeder seeder;

    /** Kiểm tra phân loại Persona theo mã ID học viên chính xác và ổn định. */
    @Test
    void testDeterminePersona() {
        assertEquals(StudentPersona.TOP_SCHOLAR, seeder.determinePersona(10L));
        assertEquals(StudentPersona.TOP_SCHOLAR, seeder.determinePersona(11L));
        assertEquals(StudentPersona.CONSISTENT, seeder.determinePersona(12L));
        assertEquals(StudentPersona.CONSISTENT, seeder.determinePersona(15L));
        assertEquals(StudentPersona.CASUAL, seeder.determinePersona(16L));
        assertEquals(StudentPersona.CASUAL, seeder.determinePersona(17L));
        assertEquals(StudentPersona.INACTIVE, seeder.determinePersona(18L));
        assertEquals(StudentPersona.INACTIVE, seeder.determinePersona(19L));
    }

    /** Kiểm tra tạo danh sách ngày học theo đặc trưng của Top Scholar và Consistent. */
    @Test
    void testGenerateActiveDates() {
        LocalDate today = LocalDate.now();

        List<LocalDate> topScholarDates = seeder.generateActiveDates(StudentPersona.TOP_SCHOLAR, today, 10L);
        assertTrue(topScholarDates.size() >= 18, "Top Scholar must have at least 18 active study days");
        assertTrue(topScholarDates.contains(today), "Top Scholar must have studied today");

        List<LocalDate> consistentDates = seeder.generateActiveDates(StudentPersona.CONSISTENT, today, 12L);
        assertTrue(consistentDates.size() >= 6, "Consistent student must have active streak");
        assertTrue(consistentDates.contains(today), "Consistent student must have studied today");

        List<LocalDate> inactiveDates = seeder.generateActiveDates(StudentPersona.INACTIVE, today, 18L);
        assertFalse(inactiveDates.contains(today), "Inactive student must not have active streak today");
    }

    /** Kiểm tra bỏ qua seeding nếu bảng log đã có nhiều dữ liệu hoạt động. */
    @Test
    void testSkipSeedingWhenLogsAlreadyExist() {
        when(learningActivityLogRepository.countByOccurredAtBetween(any(LocalDateTime.class), any(LocalDateTime.class)))
                .thenReturn(100L);

        seeder.seedRealisticStreakHistory();

        verify(studentProfileRepository, never()).findAll();
        verify(learningActivityLogRepository, never()).save(any(LearningActivityLogEntity.class));
    }

    /** Kiểm tra thực thi seeding và kích hoạt đánh giá mục tiêu khi dữ liệu trống. */
    @Test
    void testSeedRealisticStreakHistorySuccessfully() {
        when(learningActivityLogRepository.countByOccurredAtBetween(any(LocalDateTime.class), any(LocalDateTime.class)))
                .thenReturn(0L);

        UserEntity user = UserEntity.builder().id(10L).fullName("Nguyen Van A").build();
        StudentProfileEntity student = StudentProfileEntity.builder()
                .userId(10L)
                .userEntity(user)
                .studentCode("STU001")
                .build();

        when(studentProfileRepository.findAll()).thenReturn(List.of(student));
        when(enrollmentRepository.findByUserEntity_Id(10L)).thenReturn(List.of());

        seeder.seedRealisticStreakHistory();

        verify(learningActivityLogRepository, atLeastOnce()).save(any(LearningActivityLogEntity.class));
        verify(studyGoalService, times(1)).evaluateUserGoals(10L);
    }
}
