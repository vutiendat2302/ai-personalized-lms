package com.ailms.job;

import com.ailms.config.StudentRealisticStreakSeeder;
import com.ailms.config.StudentRealisticStreakSeeder.StudentPersona;
import com.ailms.entity.CourseEntity;
import com.ailms.entity.EnrollmentEntity;
import com.ailms.entity.LessonEntity;
import com.ailms.entity.LessonProgressEntity;
import com.ailms.entity.UserEntity;
import com.ailms.repository.EnrollmentRepository;
import com.ailms.repository.LessonProgressRepository;
import com.ailms.repository.LessonRepository;
import com.ailms.response.LearningSessionResponse;
import com.ailms.service.ILearningSessionService;
import com.ailms.service.IStudentLearningService;
import com.ailms.service.IStudyGoalService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

/**
 * Kiểm thử đơn vị cho tác vụ nền AutoStudentLearningSimulationJob.
 */
@ExtendWith(MockitoExtension.class)
class AutoStudentLearningSimulationJobTest {

    @Mock
    private EnrollmentRepository enrollmentRepository;
    @Mock
    private LessonRepository lessonRepository;
    @Mock
    private LessonProgressRepository lessonProgressRepository;
    @Mock
    private IStudentLearningService studentLearningService;
    @Mock
    private ILearningSessionService learningSessionService;
    @Mock
    private IStudyGoalService studyGoalService;
    @Mock
    private StudentRealisticStreakSeeder streakSeeder;

    @InjectMocks
    private AutoStudentLearningSimulationJob simulationJob;

    /** Kiểm tra xác suất tham gia học dựa trên Persona và giá trị xúc xắc. */
    @Test
    void testShouldStudentStudyTodayProbabilities() {
        assertTrue(simulationJob.shouldStudentStudyToday(StudentPersona.TOP_SCHOLAR, 50));
        assertTrue(simulationJob.shouldStudentStudyToday(StudentPersona.TOP_SCHOLAR, 94));
        assertFalse(simulationJob.shouldStudentStudyToday(StudentPersona.TOP_SCHOLAR, 96));

        assertTrue(simulationJob.shouldStudentStudyToday(StudentPersona.CONSISTENT, 70));
        assertFalse(simulationJob.shouldStudentStudyToday(StudentPersona.CONSISTENT, 80));

        assertTrue(simulationJob.shouldStudentStudyToday(StudentPersona.CASUAL, 30));
        assertFalse(simulationJob.shouldStudentStudyToday(StudentPersona.CASUAL, 50));

        assertTrue(simulationJob.shouldStudentStudyToday(StudentPersona.INACTIVE, 5));
        assertFalse(simulationJob.shouldStudentStudyToday(StudentPersona.INACTIVE, 15));
    }

    /** Kiểm tra học bài mới khi khóa học còn bài chưa hoàn thành. */
    @Test
    void testSimulateStudyAdvancesNewLesson() {
        Long userId = 10L;
        Long courseId = 100L;
        Long enrollmentId = 500L;
        Long lessonId1 = 1L;
        Long lessonId2 = 2L;

        UserEntity user = UserEntity.builder().id(userId).build();
        CourseEntity course = CourseEntity.builder().id(courseId).name("Java Core").build();
        EnrollmentEntity enrollment = EnrollmentEntity.builder()
                .id(enrollmentId)
                .userEntity(user)
                .courseEntity(course)
                .build();

        LessonEntity lesson1 = LessonEntity.builder().id(lessonId1).name("Lesson 1").build();
        LessonEntity lesson2 = LessonEntity.builder().id(lessonId2).name("Lesson 2").build();

        LessonProgressEntity progress1 = LessonProgressEntity.builder()
                .lessonId(lessonId1)
                .status((byte) 1)
                .completedAt(LocalDateTime.now().minusDays(1))
                .build();

        when(lessonRepository.findByCourseSectionEntity_CourseEntity_IdOrderByCourseSectionEntity_OrderIndexAscOrderIndexAsc(courseId))
                .thenReturn(List.of(lesson1, lesson2));
        when(lessonProgressRepository.findByEnrollmentId(enrollmentId))
                .thenReturn(List.of(progress1));

        boolean processed = simulationJob.processStudentStudySession(userId, enrollment);

        assertTrue(processed);
        // Bài 1 đã xong, bài 2 chưa xong -> Gọi hoàn thành bài 2 qua service
        verify(studentLearningService, times(1)).completeLesson(eq(lessonId2), eq(userId), eq(enrollmentId));
        verify(learningSessionService, never()).startSession(anyLong(), anyString(), anyLong());
    }

    /** Kiểm tra kích hoạt chế độ ôn tập (Revision Mode) khi khóa học đã 100%. */
    @Test
    void testSimulateStudyRevisionModeWhenCourseIsCompleted() {
        Long userId = 10L;
        Long courseId = 100L;
        Long enrollmentId = 500L;
        Long lessonId1 = 1L;

        UserEntity user = UserEntity.builder().id(userId).build();
        CourseEntity course = CourseEntity.builder().id(courseId).name("Java Core").build();
        EnrollmentEntity enrollment = EnrollmentEntity.builder()
                .id(enrollmentId)
                .userEntity(user)
                .courseEntity(course)
                .build();

        LessonEntity lesson1 = LessonEntity.builder().id(lessonId1).name("Lesson 1").build();

        LessonProgressEntity progress1 = LessonProgressEntity.builder()
                .lessonId(lessonId1)
                .status((byte) 1)
                .completedAt(LocalDateTime.now().minusDays(1))
                .build();

        when(lessonRepository.findByCourseSectionEntity_CourseEntity_IdOrderByCourseSectionEntity_OrderIndexAscOrderIndexAsc(courseId))
                .thenReturn(List.of(lesson1));
        when(lessonProgressRepository.findByEnrollmentId(enrollmentId))
                .thenReturn(List.of(progress1));

        LearningSessionResponse sessionResponse = LearningSessionResponse.builder()
                .id(999L)
                .userId(userId)
                .build();
        when(learningSessionService.startSession(eq(userId), eq("LESSON"), eq(lessonId1)))
                .thenReturn(sessionResponse);

        boolean processed = simulationJob.processStudentStudySession(userId, enrollment);

        assertTrue(processed);
        // Vì bài 1 đã xong 100% -> Chuyển sang phiên ôn tập LearningSession
        verify(studentLearningService, never()).completeLesson(anyLong(), anyLong(), anyLong());
        verify(learningSessionService, times(1)).startSession(eq(userId), eq("LESSON"), eq(lessonId1));
        verify(learningSessionService, times(1)).endSession(eq(999L), eq("REVISION_COMPLETED"));
        verify(studyGoalService, times(1)).evaluateUserGoals(userId);
    }
}
