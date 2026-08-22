package com.ailms.service.imp;

import com.ailms.entity.CourseEntity;
import com.ailms.entity.QuestionEntity;
import com.ailms.entity.QuestionOptionEntity;
import com.ailms.entity.QuizEntity;
import com.ailms.entity.enums.CourseStatusEnum;
import com.ailms.entity.enums.BaseStatusEnum;
import com.ailms.mapper.QuizMapper;
import com.ailms.mapper.AssignmentMapper;
import com.ailms.repository.CourseRepository;
import com.ailms.repository.CourseSectionRepository;
import com.ailms.repository.AssignmentRepository;
import com.ailms.repository.QuestionOptionRepository;
import com.ailms.repository.QuestionRepository;
import com.ailms.repository.QuizRepository;
import com.ailms.response.CourseCurriculumResponse;
import com.ailms.response.QuizResponse;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CourseAuthoringServiceTest {

    @Mock private CourseRepository courseRepository;
    @Mock private CourseSectionRepository courseSectionRepository;
    @Mock private QuizRepository quizRepository;
    @Mock private AssignmentRepository assignmentRepository;
    @Mock private QuestionRepository questionRepository;
    @Mock private QuestionOptionRepository questionOptionRepository;
    @Mock private QuizMapper quizMapper;
    @Mock private AssignmentMapper assignmentMapper;
    @InjectMocks private CourseAuthoringService service;

    /** Curriculum học viên có ID phương án thật nhưng tuyệt đối không lộ đáp án đúng. */
    @Test
    void learningCurriculumHidesCorrectAnswers() {
        prepareFinalQuiz();

        CourseCurriculumResponse result = service.getLearningCurriculum(1L);

        assertFalse(result.getFinalExamQuizzes().isEmpty());
        assertNull(result.getFinalExamQuizzes().getFirst().getQuestions().getFirst()
                .getOptions().getFirst().getIsCorrect());
    }

    /** Curriculum tác giả giữ đáp án đúng để giảng viên có thể chỉnh sửa và preview. */
    @Test
    void authoringCurriculumIncludesCorrectAnswers() {
        prepareFinalQuiz();

        CourseCurriculumResponse result = service.getCurriculum(1L);

        assertTrue(result.getFinalExamQuizzes().getFirst().getQuestions().getFirst()
                .getOptions().getFirst().getIsCorrect());
    }

    /** Chuẩn bị một final quiz tối thiểu từ dữ liệu quan hệ thật của response mapper. */
    private void prepareFinalQuiz() {
        CourseEntity course = CourseEntity.builder().id(1L).name("JVB").status(CourseStatusEnum.ACTIVE).build();
        QuizEntity quiz = QuizEntity.builder().id(2L).courseId(1L).title("Quiz").status(BaseStatusEnum.ACTIVE).build();
        QuestionEntity question = QuestionEntity.builder().id(3L).quizId(2L).content("Câu hỏi")
                .questionType((byte) 1).points(BigDecimal.valueOf(20)).orderIndex(0).build();
        QuestionOptionEntity option = QuestionOptionEntity.builder().id(4L).questionId(3L)
                .content("Đáp án").isCorrect(true).orderIndex(0).build();
        when(courseRepository.findById(1L)).thenReturn(Optional.of(course));
        when(courseSectionRepository.findByCourseEntity_IdOrderByOrderIndexAsc(1L)).thenReturn(List.of());
        when(quizRepository.findByCourseId(1L)).thenReturn(List.of(quiz));
        when(quizMapper.toResponse(quiz)).thenReturn(QuizResponse.builder().id(2L).title("Quiz").build());
        when(questionRepository.findByQuizIdOrderByOrderIndexAsc(2L)).thenReturn(List.of(question));
        when(questionOptionRepository.findByQuestionIdOrderByOrderIndexAsc(3L)).thenReturn(List.of(option));
    }
}
