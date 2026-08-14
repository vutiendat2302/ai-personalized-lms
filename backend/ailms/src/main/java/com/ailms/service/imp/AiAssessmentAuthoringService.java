package com.ailms.service.imp;

import com.ailms.client.AiServiceClient;
import com.ailms.common.snowflake.SnowflakeIdGenerator;
import com.ailms.entity.CourseEntity;
import com.ailms.entity.LessonEntity;
import com.ailms.entity.enums.BaseStatusEnum;
import com.ailms.entity.enums.CourseInstructorStatusEnum;
import com.ailms.event.AuditLogEvent;
import com.ailms.exception.BadRequestException;
import com.ailms.exception.ForbiddenException;
import com.ailms.exception.ResourceNotFoundException;
import com.ailms.request.AssignmentRequest;
import com.ailms.request.CreateAssignmentRequest;
import com.ailms.request.QuizRequest;
import com.ailms.request.ai.AiAssessmentApplyRequest;
import com.ailms.request.ai.AiAssessmentGenerationRequest;
import com.ailms.request.ai.AiAssessmentSourceFile;
import com.ailms.response.ai.AiAssessmentApplyResponse;
import com.ailms.response.ai.AiAssessmentDraftResponse;
import com.ailms.response.ai.AiGeneratedAssignmentResponse;
import com.ailms.response.ai.AiGeneratedQuizResponse;
import com.ailms.repository.CourseInstructorRepository;
import com.ailms.repository.LessonRepository;
import com.ailms.security.CustomUserDetails;
import com.ailms.service.ICourseAuthoringService;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import tools.jackson.databind.ObjectMapper;

import java.io.IOException;
import java.math.BigDecimal;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/** Sinh và áp dụng assessment draft, tái sử dụng hoàn toàn quiz/assignment block của Course Builder. */
@Service
@RequiredArgsConstructor
public class AiAssessmentAuthoringService {

    private static final String REDIS_KEY_PREFIX = "ai:assessment-draft:";
    private static final Duration DRAFT_TTL = Duration.ofMinutes(15);
    private static final int MAX_SOURCE_FILES = 3;
    private static final long MAX_SOURCE_FILE_BYTES = 10L * 1024 * 1024;
    private static final List<String> ALLOWED_MIME_TYPES = List.of(
            "application/pdf",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "image/png", "image/jpeg");

    private final LessonRepository lessonRepository;
    private final CourseInstructorRepository courseInstructorRepository;
    private final AiServiceClient aiServiceClient;
    private final ICourseAuthoringService courseAuthoringService;
    private final RedisTemplate<String, String> redisTemplate;
    private final ObjectMapper objectMapper;
    private final SnowflakeIdGenerator snowflakeIdGenerator;
    private final ApplicationEventPublisher applicationEventPublisher;

    /** Tạo preview quiz/assignment từ block lesson và tài liệu upload tạm thời, chưa ghi database. */
    @Transactional(readOnly = true)
    public AiAssessmentDraftResponse generateDraft(
            Long lessonId, String assessmentType, Integer questionCount,
            MultipartFile[] materials, CustomUserDetails currentUser) {
        LessonEntity lesson = lessonRepository.findById(lessonId)
                .orElseThrow(() -> ResourceNotFoundException.of("Lesson", lessonId));
        Long ownerId = currentUser.getUser().getId();
        verifyCanAuthor(lesson, currentUser);
        String type = normalizeAssessmentType(assessmentType);
        List<AiAssessmentSourceFile> files = sourceFiles(materials);
        AiAssessmentDraftResponse generated = aiServiceClient.generateAssessment(
                AiAssessmentGenerationRequest.builder()
                        .lessonId(String.valueOf(lessonId))
                        .lessonTitle(lesson.getName())
                        .lessonContent(lessonContent(lesson))
                        .assessmentType(type)
                        .questionCount(normalizeQuestionCount(questionCount))
                        .sourceFiles(files)
                        .build());
        validateGeneratedDraft(generated, type);
        String draftId = String.valueOf(snowflakeIdGenerator.nextId());
        Instant expiresAt = Instant.now().plus(DRAFT_TTL);
        AiAssessmentDraft stored = AiAssessmentDraft.builder()
                .draftId(draftId)
                .ownerId(ownerId)
                .lessonId(lessonId)
                .assessmentType(type)
                .expiresAt(expiresAt.toString())
                .quiz(generated.getQuiz())
                .assignment(generated.getAssignment())
                .build();
        redisTemplate.opsForValue().set(redisKey(draftId), serialize(stored), DRAFT_TTL);
        applicationEventPublisher.publishEvent(new AuditLogEvent(this, "AI_ASSESSMENT_DRAFTED",
                "AiAssessmentDraft", ownerId, null,
                Map.of("draftId", draftId, "lessonId", String.valueOf(lessonId), "type", type)));
        return response(stored);
    }

    /** Xóa atomically draft rồi tạo quiz/assignment thật bằng CourseAuthoringService hiện hữu. */
    @Transactional
    public AiAssessmentApplyResponse applyDraft(
            String draftId, AiAssessmentApplyRequest request, CustomUserDetails currentUser) {
        AiAssessmentDraft draft = deserialize(redisTemplate.opsForValue().getAndDelete(redisKey(draftId)));
        if (!draft.getOwnerId().equals(currentUser.getUser().getId())) {
            throw new ForbiddenException("Assessment draft không thuộc người dùng hiện tại");
        }
        LessonEntity lesson = lessonRepository.findById(draft.getLessonId())
                .orElseThrow(() -> ResourceNotFoundException.of("Lesson", draft.getLessonId()));
        verifyCanAuthor(lesson, currentUser);
        var result = AiAssessmentApplyResponse.builder();
        if (Boolean.TRUE.equals(request.getApplyQuiz())) {
            if (draft.getQuiz() == null) {
                throw new BadRequestException("Draft không có quiz để lưu");
            }
            result.quiz(courseAuthoringService.createQuiz(toQuizRequest(lesson, draft.getQuiz())));
        }
        if (Boolean.TRUE.equals(request.getApplyAssignment())) {
            if (draft.getAssignment() == null) {
                throw new BadRequestException("Draft không có assignment để lưu");
            }
            result.assignment(courseAuthoringService.createAssignment(toAssignmentRequest(lesson, draft.getAssignment())));
        }
        applicationEventPublisher.publishEvent(new AuditLogEvent(this, "AI_ASSESSMENT_APPLIED",
                "AiAssessmentDraft", currentUser.getUser().getId(), null,
                Map.of("draftId", draftId, "lessonId", String.valueOf(draft.getLessonId()))));
        return result.build();
    }

    /** Tạo QuizRequest giữ nguyên JSON block questions mà CourseAuthoringService đã hỗ trợ. */
    private QuizRequest toQuizRequest(LessonEntity lesson, AiGeneratedQuizResponse quiz) {
        return QuizRequest.builder()
                .lessonId(lesson.getId())
                .courseId(lesson.getCourseSectionEntity().getCourseEntity().getId())
                .sectionId(lesson.getCourseSectionEntity().getId())
                .title(quiz.getTitle())
                .description(serializeQuestions(quiz))
                .timeLimitMin(quiz.getTimeLimitMin())
                .passScore(quiz.getPassScore())
                .maxAttempts(quiz.getMaxAttempts())
                .shuffleQuestions(quiz.getShuffleQuestions())
                .status(BaseStatusEnum.DRAFT)
                .build();
    }

    /** Tạo AssignmentRequest giữ JSON instructions/submissionMode mà LessonEditor đang đọc. */
    private CreateAssignmentRequest toAssignmentRequest(
            LessonEntity lesson, AiGeneratedAssignmentResponse assignment) {
        return CreateAssignmentRequest.builder()
                .lessonId(lesson.getId())
                .courseId(lesson.getCourseSectionEntity().getCourseEntity().getId())
                .sectionId(lesson.getCourseSectionEntity().getId())
                .title(assignment.getTitle())
                .description(serialize(Map.of("instructions", assignment.getInstructions(),
                        "submissionMode", assignment.getSubmissionMode())))
                .maxScore(assignment.getMaxScore())
                .allowLate(Boolean.TRUE.equals(assignment.getAllowLate()))
                .build();
    }

    /** Kiểm tra teacher là chủ khóa học hoặc co-instructor ACCEPTED; Admin luôn được phép. */
    private void verifyCanAuthor(LessonEntity lesson, CustomUserDetails currentUser) {
        boolean admin = currentUser.getAuthorities().stream()
                .anyMatch(item -> "ROLE_ADMIN".equals(item.getAuthority()));
        if (admin) {
            return;
        }
        CourseEntity course = lesson.getCourseSectionEntity().getCourseEntity();
        Long userId = currentUser.getUser().getId();
        boolean owner = userId.equals(course.getCreatedBy());
        boolean instructor = courseInstructorRepository.existsByCourseIdAndInstructorIdAndStatus(
                course.getId(), userId, CourseInstructorStatusEnum.ACCEPTED);
        if (!owner && !instructor) {
            throw new ForbiddenException("Bạn không có quyền tạo assessment cho khóa học này");
        }
    }

    /** Chuyển multipart file thành base64 sau allow-list MIME và giới hạn kích thước. */
    private List<AiAssessmentSourceFile> sourceFiles(MultipartFile[] materials) {
        if (materials == null || materials.length == 0) {
            return List.of();
        }
        if (materials.length > MAX_SOURCE_FILES) {
            throw new BadRequestException("Tối đa " + MAX_SOURCE_FILES + " tài liệu nguồn cho mỗi lần sinh");
        }
        return java.util.Arrays.stream(materials).map(file -> {
            if (file == null || file.isEmpty()) {
                throw new BadRequestException("Tài liệu nguồn không được rỗng");
            }
            String mimeType = file.getContentType() == null ? "" : file.getContentType().toLowerCase(Locale.ROOT);
            if (!ALLOWED_MIME_TYPES.contains(mimeType)) {
                throw new BadRequestException("Chỉ hỗ trợ PDF, DOCX, PNG hoặc JPEG làm tài liệu nguồn");
            }
            if (file.getSize() > MAX_SOURCE_FILE_BYTES) {
                throw new BadRequestException("Mỗi tài liệu nguồn tối đa 10 MB");
            }
            try {
                return AiAssessmentSourceFile.builder()
                        .name(file.getOriginalFilename() == null ? "source" : file.getOriginalFilename())
                        .mimeType(mimeType)
                        .contentBase64(Base64.getEncoder().encodeToString(file.getBytes()))
                        .build();
            } catch (IOException exception) {
                throw new BadRequestException("Không thể đọc tài liệu nguồn");
            }
        }).toList();
    }

    /** Lấy block text lesson đang có, không tải URL bên ngoài hoặc file riêng tư không được chọn. */
    private String lessonContent(LessonEntity lesson) {
        String content = lesson.getDescription();
        if (content == null || content.isBlank()) {
            return "Bài học: " + lesson.getName();
        }
        return content.length() > 50_000 ? content.substring(0, 50_000) : content;
    }

    /** Chuẩn hóa type đầu vào thành QUIZ, ASSIGNMENT hoặc BOTH. */
    private String normalizeAssessmentType(String value) {
        String type = value == null ? "BOTH" : value.trim().toUpperCase(Locale.ROOT);
        if (!List.of("QUIZ", "ASSIGNMENT", "BOTH").contains(type)) {
            throw new BadRequestException("assessmentType chỉ nhận QUIZ, ASSIGNMENT hoặc BOTH");
        }
        return type;
    }

    /** Giới hạn số câu để trả lời nhanh và không làm quá tải lesson builder. */
    private int normalizeQuestionCount(Integer value) {
        int count = value == null ? 5 : value;
        if (count < 3 || count > 15) {
            throw new BadRequestException("questionCount phải từ 3 đến 15");
        }
        return count;
    }

    /** Xác thực output model trước khi draft được đưa cho người dùng xem. */
    private void validateGeneratedDraft(AiAssessmentDraftResponse draft, String type) {
        if (draft == null || ("QUIZ".equals(type) || "BOTH".equals(type)) && draft.getQuiz() == null
                || ("ASSIGNMENT".equals(type) || "BOTH".equals(type)) && draft.getAssignment() == null) {
            throw new BadRequestException("AI không tạo được assessment đúng cấu trúc");
        }
        if (draft.getQuiz() != null && (draft.getQuiz().getQuestions() == null || draft.getQuiz().getQuestions().isEmpty())) {
            throw new BadRequestException("Quiz AI tạo không có câu hỏi hợp lệ");
        }
    }

    /** Tạo response preview ngoài API mà không lộ owner hoặc payload Redis. */
    private AiAssessmentDraftResponse response(AiAssessmentDraft draft) {
        AiAssessmentDraftResponse response = new AiAssessmentDraftResponse();
        response.setDraftId(draft.getDraftId());
        response.setLessonId(String.valueOf(draft.getLessonId()));
        response.setExpiresAt(draft.getExpiresAt());
        response.setRequiresConfirmation(true);
        response.setQuiz(draft.getQuiz());
        response.setAssignment(draft.getAssignment());
        return response;
    }

    /** Serialize question block để CourseAuthoringService đồng bộ question và option relation. */
    private String serializeQuestions(AiGeneratedQuizResponse quiz) {
        return serialize(quiz.getQuestions());
    }

    /** Serialize JSON nhỏ đã validate để lưu vào description chuẩn của hệ thống. */
    private String serialize(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (Exception exception) {
            throw new IllegalStateException("Không thể serialize assessment AI", exception);
        }
    }

    /** Serialize draft TTL vào Redis. */
    private String serialize(AiAssessmentDraft draft) {
        return serialize((Object) draft);
    }

    /** Đọc draft một lần hoặc báo draft hết hạn/đã dùng. */
    private AiAssessmentDraft deserialize(String value) {
        if (value == null) {
            throw new BadRequestException("Assessment draft không tồn tại, đã hết hạn hoặc đã được áp dụng");
        }
        try {
            return objectMapper.readValue(value, AiAssessmentDraft.class);
        } catch (Exception exception) {
            throw new BadRequestException("Assessment draft không hợp lệ");
        }
    }

    /** Tạo Redis key chỉ có ID draft, không chứa nội dung bài học/tài liệu. */
    private String redisKey(String draftId) {
        return REDIS_KEY_PREFIX + draftId;
    }

    /** Payload Redis tối thiểu của assessment chờ người tạo khóa học xác nhận. */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AiAssessmentDraft {
        private String draftId;
        private Long ownerId;
        private Long lessonId;
        private String assessmentType;
        private String expiresAt;
        private AiGeneratedQuizResponse quiz;
        private AiGeneratedAssignmentResponse assignment;
    }
}
