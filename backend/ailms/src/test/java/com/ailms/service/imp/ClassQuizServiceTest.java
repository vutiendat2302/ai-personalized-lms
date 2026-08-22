package com.ailms.service.imp;

import com.ailms.entity.ClassEntity;
import com.ailms.entity.CourseEntity;
import com.ailms.entity.QuestionEntity;
import com.ailms.entity.QuestionOptionEntity;
import com.ailms.entity.QuizEntity;
import com.ailms.entity.UserEntity;
import com.ailms.exception.BadRequestException;
import com.ailms.mapper.QuizMapper;
import com.ailms.repository.ClassMemberRepository;
import com.ailms.repository.ClassRepository;
import com.ailms.repository.QuestionOptionRepository;
import com.ailms.repository.QuestionRepository;
import com.ailms.repository.QuizRepository;
import com.ailms.request.PublishClassQuizRequest;
import com.ailms.response.QuizResponse;
import com.ailms.security.CustomUserDetails;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** Kiểm tra phát hành Quiz tạo bản sao độc lập theo lớp và chặn sai scope. */
class ClassQuizServiceTest {
    private QuizRepository quizRepository;
    private ClassRepository classRepository;
    private QuestionRepository questionRepository;
    private QuestionOptionRepository optionRepository;
    private QuizMapper quizMapper;
    private ClassQuizService service;
    private CustomUserDetails admin;

    /** Khởi tạo service và principal Admin đáng tin cậy. */
    @BeforeEach
    void setUp() {
        quizRepository = mock(QuizRepository.class);
        classRepository = mock(ClassRepository.class);
        questionRepository = mock(QuestionRepository.class);
        optionRepository = mock(QuestionOptionRepository.class);
        quizMapper = mock(QuizMapper.class);
        service = new ClassQuizService(quizRepository, classRepository,
                mock(ClassMemberRepository.class), questionRepository, optionRepository,
                quizMapper, mock(ApplicationEventPublisher.class));
        admin = mock(CustomUserDetails.class);
        when(admin.getUser()).thenReturn(UserEntity.builder().id(99L).build());
        org.mockito.Mockito.doReturn(List.of(new SimpleGrantedAuthority("ROLE_ADMIN")))
                .when(admin).getAuthorities();
    }

    /** Phát hành sao chép Quiz, câu hỏi, phương án và gắn sourceQuizId/classId. */
    @Test
    void publishCopiesQuizToClass() {
        CourseEntity course = CourseEntity.builder().id(10L).build();
        ClassEntity clazz = ClassEntity.builder().id(20L).courseEntity(course).build();
        QuizEntity source = QuizEntity.builder().id(30L).courseId(10L).title("Quiz nguồn").build();
        QuestionEntity question = QuestionEntity.builder().id(40L).quizId(30L)
                .content("Câu hỏi").questionType((byte) 0).orderIndex(0).status((byte) 1).build();
        QuestionOptionEntity option = QuestionOptionEntity.builder().id(50L).questionId(40L)
                .content("Đáp án").isCorrect(true).orderIndex(0).build();
        when(classRepository.findById(20L)).thenReturn(Optional.of(clazz));
        when(quizRepository.findById(30L)).thenReturn(Optional.of(source));
        when(quizRepository.existsByCode(any())).thenReturn(false);
        when(quizRepository.save(any())).thenAnswer(invocation -> {
            QuizEntity saved = invocation.getArgument(0);
            saved.setId(31L);
            return saved;
        });
        when(questionRepository.findByQuizIdOrderByOrderIndexAsc(30L)).thenReturn(List.of(question));
        when(questionRepository.save(any())).thenAnswer(invocation -> {
            QuestionEntity saved = invocation.getArgument(0);
            saved.setId(41L);
            return saved;
        });
        when(optionRepository.findByQuestionIdOrderByOrderIndexAsc(40L)).thenReturn(List.of(option));
        when(questionRepository.findByQuizIdOrderByOrderIndexAsc(31L)).thenReturn(List.of());
        when(quizMapper.toResponse(any())).thenReturn(new QuizResponse());
        PublishClassQuizRequest request = new PublishClassQuizRequest();
        request.setDueAt(LocalDateTime.now().plusDays(1));

        service.publish(20L, 30L, request, admin);

        verify(optionRepository).save(any(QuestionOptionEntity.class));
        verify(quizRepository).save(any(QuizEntity.class));
    }

    /** Chặn phát hành Quiz của khóa học khác vào lớp. */
    @Test
    void rejectQuizFromAnotherCourse() {
        ClassEntity clazz = ClassEntity.builder().id(20L)
                .courseEntity(CourseEntity.builder().id(10L).build()).build();
        QuizEntity source = QuizEntity.builder().id(30L).courseId(11L).build();
        when(classRepository.findById(20L)).thenReturn(Optional.of(clazz));
        when(quizRepository.findById(30L)).thenReturn(Optional.of(source));

        assertThrows(BadRequestException.class,
                () -> service.publish(20L, 30L, new PublishClassQuizRequest(), admin));
    }

    /** Chặn deadline không nằm sau thời điểm mở. */
    @Test
    void rejectInvalidSchedule() {
        ClassEntity clazz = ClassEntity.builder().id(20L)
                .courseEntity(CourseEntity.builder().id(10L).build()).build();
        QuizEntity source = QuizEntity.builder().id(30L).courseId(10L).build();
        when(classRepository.findById(20L)).thenReturn(Optional.of(clazz));
        when(quizRepository.findById(30L)).thenReturn(Optional.of(source));
        PublishClassQuizRequest request = new PublishClassQuizRequest();
        request.setAvailableFrom(LocalDateTime.now().plusDays(2));
        request.setDueAt(LocalDateTime.now().plusDays(1));

        assertThrows(BadRequestException.class, () -> service.publish(20L, 30L, request, admin));
    }

    /** Chặn giáo viên bấm phát hành lặp một Quiz đang ACTIVE vào cùng lớp. */
    @Test
    void rejectDuplicateActivePublication() {
        ClassEntity clazz = ClassEntity.builder().id(20L)
                .courseEntity(CourseEntity.builder().id(10L).build()).build();
        QuizEntity source = QuizEntity.builder().id(30L).courseId(10L).build();
        when(classRepository.findById(20L)).thenReturn(Optional.of(clazz));
        when(quizRepository.findById(30L)).thenReturn(Optional.of(source));
        when(quizRepository.existsByClassIdAndSourceQuizIdAndStatus(
                20L, 30L, com.ailms.entity.enums.BaseStatusEnum.ACTIVE)).thenReturn(true);

        assertThrows(BadRequestException.class,
                () -> service.publish(20L, 30L, new PublishClassQuizRequest(), admin));
    }
}
