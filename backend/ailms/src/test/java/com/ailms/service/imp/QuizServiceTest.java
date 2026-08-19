package com.ailms.service.imp;

import com.ailms.entity.QuestionEntity;
import com.ailms.entity.QuestionOptionEntity;
import com.ailms.entity.QuizEntity;
import com.ailms.mapper.QuizMapper;
import com.ailms.repository.ClassRepository;
import com.ailms.repository.QuestionOptionRepository;
import com.ailms.repository.QuestionRepository;
import com.ailms.repository.QuizRepository;
import com.ailms.response.QuizResponse;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class QuizServiceTest {

    @Mock private QuizRepository quizRepository;
    @Mock private QuizMapper quizMapper;
    @Mock private ClassRepository classRepository;
    @Mock private QuestionRepository questionRepository;
    @Mock private QuestionOptionRepository questionOptionRepository;
    @InjectMocks private QuizService service;

    /** Chi tiết quiz phải chứa câu hỏi và phương án thật thay vì DTO rỗng từ mapper. */
    @Test
    void getByIdReturnsStructuredQuestionsAndOptions() {
        QuizEntity quiz = QuizEntity.builder().id(10L).title("Quiz JVB").build();
        QuestionEntity question = QuestionEntity.builder()
                .id(20L).quizId(10L).content("JVB hoạt động trong lĩnh vực nào?")
                .questionType((byte) 1).points(BigDecimal.valueOf(20)).orderIndex(0).build();
        QuestionOptionEntity option = QuestionOptionEntity.builder()
                .id(30L).questionId(20L).content("Công nghệ thông tin")
                .isCorrect(true).orderIndex(0).build();
        when(quizRepository.findById(10L)).thenReturn(Optional.of(quiz));
        when(quizMapper.toResponse(quiz)).thenReturn(QuizResponse.builder().id(10L).title("Quiz JVB").build());
        when(questionRepository.findByQuizIdOrderByOrderIndexAsc(10L)).thenReturn(List.of(question));
        when(questionOptionRepository.findByQuestionIdOrderByOrderIndexAsc(20L)).thenReturn(List.of(option));

        QuizResponse result = service.getById(10L);

        assertEquals(1, result.getQuestions().size());
        assertEquals("JVB hoạt động trong lĩnh vực nào?", result.getQuestions().getFirst().getContent());
        assertEquals(1, result.getQuestions().getFirst().getOptions().size());
        assertTrue(result.getQuestions().getFirst().getOptions().getFirst().getIsCorrect());
    }
}
