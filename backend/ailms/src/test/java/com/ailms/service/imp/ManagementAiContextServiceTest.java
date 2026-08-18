package com.ailms.service.imp;

import com.ailms.entity.CourseEntity;
import com.ailms.entity.CourseSectionEntity;
import com.ailms.entity.QuizEntity;
import com.ailms.exception.BadRequestException;
import com.ailms.exception.ForbiddenException;
import com.ailms.repository.CourseRepository;
import com.ailms.repository.CourseSectionRepository;
import com.ailms.repository.QuizRepository;
import com.ailms.request.QuizRequest;
import com.ailms.response.QuizResponse;
import com.ailms.service.ICourseAuthoringService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/** Kiểm thử thực thi Tool Calling trong ManagementAiContextService. */
@ExtendWith(MockitoExtension.class)
class ManagementAiContextServiceTest {

    @Mock private CourseRepository courseRepository;
    @Mock private CourseSectionRepository courseSectionRepository;
    @Mock private QuizRepository quizRepository;
    @Mock private ICourseAuthoringService courseAuthoringService;
    @Mock private ApplicationEventPublisher applicationEventPublisher;
    @Mock private AiNotificationActionService aiNotificationActionService;

    @InjectMocks private ManagementAiContextService service;

    /** Giảng viên có quyền tạo bài kiểm tra và lưu trực tiếp vào CSDL hệ thống. */
    @Test
    void createQuizForCourseOrLessonSuccessForTeacher() {
        AiToolAccessContext context = new AiToolAccessContext(100L, List.of("ROLE_TEACHER"));
        CourseEntity course = CourseEntity.builder().id(10L).name("Toán Lớp 6").createdBy(100L).build();
        CourseSectionEntity section = CourseSectionEntity.builder().id(20L).courseEntity(course).build();
        QuizEntity quizEntity = QuizEntity.builder().id(999L).title("Kiểm tra Lũy thừa 6 câu").build();

        when(courseRepository.findAll()).thenReturn(List.of(course));
        when(courseSectionRepository.findByCourseEntity_IdOrderByOrderIndexAsc(10L)).thenReturn(List.of(section));
        when(courseRepository.findById(10L)).thenReturn(Optional.of(course));
        when(quizRepository.findById(999L)).thenReturn(Optional.of(quizEntity));

        QuizResponse createdQuiz = QuizResponse.builder()
                .id(999L)
                .code("QZ_TOAN6_001")
                .title("Kiểm tra Lũy thừa 6 câu")
                .build();
        when(courseAuthoringService.createQuiz(any(QuizRequest.class))).thenReturn(createdQuiz);

        Map<String, Object> arguments = Map.of(
                "title", "Kiểm tra Lũy thừa 6 câu",
                "description", "Đề kiểm tra nhanh 15 phút",
                "timeLimitMin", 15,
                "passScore", 80.0,
                "questions", List.of(
                        Map.of(
                                "content", "Lũy thừa bậc n của a là gì?",
                                "questionType", "SINGLE_CHOICE",
                                "explanation", "Tích của n thừa số bằng nhau mỗi thừa số bằng a",
                                "points", 1.0,
                                "options", List.of(
                                        Map.of("content", "n thừa số mỗi thừa số bằng a", "isCorrect", true),
                                        Map.of("content", "a thừa số mỗi thừa số bằng n", "isCorrect", false)
                                )
                        )
                )
        );

        Map<String, Object> result = service.execute("create_quiz_for_course_or_lesson", arguments, context);

        assertNotNull(result);
        assertEquals("SUCCESS", result.get("status"));
        assertEquals("999", result.get("quizId"));
        assertEquals("QZ_TOAN6_001", result.get("quizCode"));
        assertEquals("Kiểm tra Lũy thừa 6 câu", result.get("title"));
        assertEquals(1, result.get("questionCount"));

        ArgumentCaptor<QuizRequest> captor = ArgumentCaptor.forClass(QuizRequest.class);
        verify(courseAuthoringService).createQuiz(captor.capture());
        QuizRequest captured = captor.getValue();
        assertEquals("Kiểm tra Lũy thừa 6 câu", captured.getTitle());
        assertEquals(1, captured.getQuestions().size());
        assertEquals("Lũy thừa bậc n của a là gì?", captured.getQuestions().getFirst().getContent());
        assertEquals(2, captured.getQuestions().getFirst().getOptions().size());
        assertTrue(captured.getQuestions().getFirst().getOptions().getFirst().getIsCorrect());
    }

    /** Học viên không được phép gọi tool tạo bài kiểm tra. */
    @Test
    void createQuizForbiddenForStudent() {
        AiToolAccessContext context = new AiToolAccessContext(200L, List.of("ROLE_STUDENT"));
        Map<String, Object> arguments = Map.of(
                "title", "Đề thi thử",
                "questions", List.of(Map.of("content", "Câu 1", "options", List.of(Map.of("content", "A", "isCorrect", true))))
        );

        assertThrows(ForbiddenException.class, () ->
                service.execute("create_quiz_for_course_or_lesson", arguments, context));
    }

    /** Không có danh sách câu hỏi phải ném BadRequestException. */
    @Test
    void createQuizThrowsBadRequestWhenQuestionsEmpty() {
        AiToolAccessContext context = new AiToolAccessContext(100L, List.of("ROLE_TEACHER"));
        CourseEntity course = CourseEntity.builder().id(10L).name("Khóa học").createdBy(100L).build();
        when(courseRepository.findAll()).thenReturn(List.of(course));

        Map<String, Object> arguments = Map.of(
                "title", "Đề thi không có câu hỏi",
                "questions", List.of()
        );

        assertThrows(BadRequestException.class, () ->
                service.execute("create_quiz_for_course_or_lesson", arguments, context));
    }
}
