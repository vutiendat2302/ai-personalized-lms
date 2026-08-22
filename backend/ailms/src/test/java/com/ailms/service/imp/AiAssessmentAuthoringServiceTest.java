package com.ailms.service.imp;

import com.ailms.client.AiServiceClient;
import com.ailms.common.snowflake.SnowflakeIdGenerator;
import com.ailms.entity.CourseEntity;
import com.ailms.entity.CourseSectionEntity;
import com.ailms.entity.ClassEntity;
import com.ailms.entity.ClassResourceEntity;
import com.ailms.entity.LessonEntity;
import com.ailms.entity.UserEntity;
import com.ailms.entity.enums.RagProcessingStatusEnum;
import com.ailms.exception.BadRequestException;
import com.ailms.exception.ForbiddenException;
import com.ailms.repository.ClassMemberRepository;
import com.ailms.repository.ClassRepository;
import com.ailms.repository.ClassResourceRepository;
import com.ailms.repository.CourseInstructorRepository;
import com.ailms.repository.LessonRepository;
import com.ailms.request.QuizQuestionOptionRequest;
import com.ailms.request.QuizQuestionRequest;
import com.ailms.request.QuizRequest;
import com.ailms.request.ai.AiAssessmentApplyRequest;
import com.ailms.request.ai.AiAssessmentQuizEditRequest;
import com.ailms.request.ai.AiAssessmentGenerationRequest;
import com.ailms.response.ai.AiAssessmentDraftResponse;
import com.ailms.response.QuizResponse;
import com.ailms.response.ai.AiGeneratedQuestionOptionResponse;
import com.ailms.response.ai.AiGeneratedQuestionResponse;
import com.ailms.response.ai.AiGeneratedQuizResponse;
import com.ailms.security.CustomUserDetails;
import com.ailms.service.ICourseAuthoringService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import tools.jackson.databind.ObjectMapper;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** Kiểm tra draft AI được claim an toàn và lưu câu hỏi quan hệ thật khi apply. */
class AiAssessmentAuthoringServiceTest {
    private LessonRepository lessonRepository;
    private ICourseAuthoringService courseAuthoringService;
    private RedisTemplate<String, String> redisTemplate;
    private ValueOperations<String, String> valueOperations;
    private ObjectMapper objectMapper;
    private AiServiceClient aiServiceClient;
    private SnowflakeIdGenerator snowflakeIdGenerator;
    private ClassRepository classRepository;
    private ClassResourceRepository classResourceRepository;
    private AiAssessmentAuthoringService service;
    private CustomUserDetails admin;

    /** Khởi tạo dependency mock và principal Admin dùng chung. */
    @BeforeEach
    void setUp() {
        lessonRepository = mock(LessonRepository.class);
        courseAuthoringService = mock(ICourseAuthoringService.class);
        redisTemplate = mock(RedisTemplate.class);
        valueOperations = mock(ValueOperations.class);
        objectMapper = mock(ObjectMapper.class);
        aiServiceClient = mock(AiServiceClient.class);
        snowflakeIdGenerator = mock(SnowflakeIdGenerator.class);
        classRepository = mock(ClassRepository.class);
        classResourceRepository = mock(ClassResourceRepository.class);
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        service = new AiAssessmentAuthoringService(
                lessonRepository,
                mock(CourseInstructorRepository.class),
                aiServiceClient,
                courseAuthoringService,
                redisTemplate,
                objectMapper,
                snowflakeIdGenerator,
                mock(ApplicationEventPublisher.class),
                classRepository,
                classResourceRepository,
                mock(ClassMemberRepository.class));
        admin = mock(CustomUserDetails.class);
        when(admin.getUser()).thenReturn(UserEntity.builder().id(1L).build());
        doReturn(List.of(new SimpleGrantedAuthority("ROLE_ADMIN"))).when(admin).getAuthorities();
    }

    /** Generate kết hợp lesson và resource READY nhưng chỉ gửi source ID/scope sang AI. */
    @Test
    void generateDraftUsesClassRagSourceWithoutSendingWholeFile() throws Exception {
        LessonEntity lesson = lesson();
        ClassEntity clazz = ClassEntity.builder().id(30L)
                .courseEntity(lesson.getCourseSectionEntity().getCourseEntity()).build();
        ClassResourceEntity resource = ClassResourceEntity.builder().id(50L).classEntity(clazz)
                .title("Giáo trình").fileName("chapter.pdf")
                .ragStatus(RagProcessingStatusEnum.READY).build();
        AiAssessmentDraftResponse generated = new AiAssessmentDraftResponse();
        generated.setQuiz(generatedQuiz());
        when(lessonRepository.findById(40L)).thenReturn(Optional.of(lesson));
        when(classRepository.findById(30L)).thenReturn(Optional.of(clazz));
        when(classResourceRepository.findAllById(any())).thenReturn(List.of(resource));
        when(aiServiceClient.generateAssessment(any())).thenReturn(generated);
        when(snowflakeIdGenerator.nextId()).thenReturn(100L);
        when(objectMapper.writeValueAsString(any())).thenReturn("json");

        var result = service.generateDraft(
                40L, "QUIZ", 3, 30L, List.of(50L), null, admin);

        ArgumentCaptor<AiAssessmentGenerationRequest> captor =
                ArgumentCaptor.forClass(AiAssessmentGenerationRequest.class);
        verify(aiServiceClient).generateAssessment(captor.capture());
        assertThat(captor.getValue().getRagSourceIds()).containsExactly("class-resource-50");
        assertThat(captor.getValue().getClassId()).isEqualTo("30");
        assertThat(captor.getValue().getCourseId()).isEqualTo("10");
        assertThat(captor.getValue().getSourceFiles()).isEmpty();
        assertThat(result.getSources()).extracting("sourceId").containsExactly("class-resource-50");
    }

    /** Không gửi request AI khi resource lớp chưa ingest READY. */
    @Test
    void rejectClassResourceThatIsNotReady() {
        LessonEntity lesson = lesson();
        ClassEntity clazz = ClassEntity.builder().id(30L)
                .courseEntity(lesson.getCourseSectionEntity().getCourseEntity()).build();
        ClassResourceEntity resource = ClassResourceEntity.builder().id(50L).classEntity(clazz)
                .title("Đang xử lý").ragStatus(RagProcessingStatusEnum.PROCESSING).build();
        when(lessonRepository.findById(40L)).thenReturn(Optional.of(lesson));
        when(classRepository.findById(30L)).thenReturn(Optional.of(clazz));
        when(classResourceRepository.findAllById(any())).thenReturn(List.of(resource));

        assertThatThrownBy(() -> service.generateDraft(
                40L, "QUIZ", 3, 30L, List.of(50L), null, admin))
                .isInstanceOf(BadRequestException.class);

        verify(aiServiceClient, never()).generateAssessment(any());
    }

    /** Apply Quiz phải truyền questions/options có cấu trúc sang CourseAuthoringService. */
    @Test
    void applyDraftPersistsStructuredQuestions() throws Exception {
        var draft = draft(1L);
        when(valueOperations.get("ai:assessment-draft:100")).thenReturn("payload");
        when(valueOperations.getAndDelete("ai:assessment-draft:100")).thenReturn("payload");
        when(objectMapper.readValue("payload", AiAssessmentAuthoringService.AiAssessmentDraft.class))
                .thenReturn(draft);
        when(lessonRepository.findById(40L)).thenReturn(Optional.of(lesson()));
        when(courseAuthoringService.createQuiz(any())).thenReturn(QuizResponse.builder().id(200L).build());
        AiAssessmentApplyRequest request = new AiAssessmentApplyRequest();
        request.setApplyQuiz(true);

        service.applyDraft("100", request, admin);

        ArgumentCaptor<QuizRequest> captor = ArgumentCaptor.forClass(QuizRequest.class);
        verify(courseAuthoringService).createQuiz(captor.capture());
        assertThat(captor.getValue().getQuestions()).hasSize(1);
        assertThat(captor.getValue().getQuestions().getFirst().getOptions()).hasSize(2);
        assertThat(captor.getValue().getQuestions().getFirst().getOptions().getFirst().getIsCorrect()).isTrue();
    }

    /** Người không sở hữu draft bị chặn trước khi draft bị xóa khỏi Redis. */
    @Test
    void foreignOwnerCannotConsumeDraft() throws Exception {
        when(valueOperations.get("ai:assessment-draft:100")).thenReturn("payload");
        when(objectMapper.readValue("payload", AiAssessmentAuthoringService.AiAssessmentDraft.class))
                .thenReturn(draft(2L));
        AiAssessmentApplyRequest request = new AiAssessmentApplyRequest();
        request.setApplyQuiz(true);

        assertThatThrownBy(() -> service.applyDraft("100", request, admin))
                .isInstanceOf(ForbiddenException.class);

        verify(valueOperations, never()).getAndDelete(any());
    }

    /** Quiz chỉnh sửa sai quy tắc đáp án không claim và không làm mất draft. */
    @Test
    void invalidEditedQuizDoesNotConsumeDraft() throws Exception {
        when(valueOperations.get("ai:assessment-draft:100")).thenReturn("payload");
        when(objectMapper.readValue("payload", AiAssessmentAuthoringService.AiAssessmentDraft.class))
                .thenReturn(draft(1L));
        when(lessonRepository.findById(40L)).thenReturn(Optional.of(lesson()));
        QuizQuestionOptionRequest wrong = QuizQuestionOptionRequest.builder()
                .content("Sai").isCorrect(false).build();
        AiAssessmentQuizEditRequest edit = new AiAssessmentQuizEditRequest();
        edit.setTitle("Quiz đã sửa");
        edit.setQuestions(List.of(QuizQuestionRequest.builder().content("Câu sửa")
                .questionType("SINGLE_CHOICE").points(BigDecimal.ONE)
                .options(List.of(wrong, wrong)).build()));
        AiAssessmentApplyRequest request = new AiAssessmentApplyRequest();
        request.setApplyQuiz(true);
        request.setQuiz(edit);

        assertThatThrownBy(() -> service.applyDraft("100", request, admin))
                .isInstanceOf(BadRequestException.class);

        verify(valueOperations, never()).getAndDelete(any());
    }

    /** Tạo draft Quiz tối thiểu có một câu single-choice hợp lệ. */
    private AiAssessmentAuthoringService.AiAssessmentDraft draft(Long ownerId) {
        AiGeneratedQuizResponse quiz = generatedQuiz();
        return AiAssessmentAuthoringService.AiAssessmentDraft.builder()
                .draftId("100").ownerId(ownerId).lessonId(40L).assessmentType("QUIZ")
                .expiresAt("2099-01-01T00:00:00Z").quiz(quiz).sources(List.of()).build();
    }

    /** Tạo structured Quiz hợp lệ dùng cho cả generate response và Redis draft. */
    private AiGeneratedQuizResponse generatedQuiz() {
        AiGeneratedQuestionOptionResponse correct = new AiGeneratedQuestionOptionResponse();
        correct.setContent("4");
        correct.setIsCorrect(true);
        AiGeneratedQuestionOptionResponse wrong = new AiGeneratedQuestionOptionResponse();
        wrong.setContent("5");
        wrong.setIsCorrect(false);
        AiGeneratedQuestionResponse question = new AiGeneratedQuestionResponse();
        question.setContent("2 + 2?");
        question.setQuestionType("SINGLE_CHOICE");
        question.setPoints(BigDecimal.ONE);
        question.setOptions(List.of(correct, wrong));
        AiGeneratedQuizResponse quiz = new AiGeneratedQuizResponse();
        quiz.setTitle("Quiz AI");
        quiz.setPassScore(BigDecimal.valueOf(70));
        quiz.setQuestions(List.of(question));
        return quiz;
    }

    /** Tạo lesson có đầy đủ section/course để service ép scope khi lưu Quiz. */
    private LessonEntity lesson() {
        CourseEntity course = CourseEntity.builder().id(10L).build();
        CourseSectionEntity section = CourseSectionEntity.builder().id(20L).courseEntity(course).build();
        return LessonEntity.builder().id(40L).courseSectionEntity(section).build();
    }
}
