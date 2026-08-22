package com.ailms.service.imp;

import com.ailms.common.util.CodeGenerator;
import com.ailms.entity.ClassEntity;
import com.ailms.entity.QuestionEntity;
import com.ailms.entity.QuestionOptionEntity;
import com.ailms.entity.QuizEntity;
import com.ailms.entity.enums.BaseStatusEnum;
import com.ailms.entity.enums.ClassMemberRole;
import com.ailms.entity.enums.ClassMemberStatusEnum;
import com.ailms.event.AuditLogEvent;
import com.ailms.exception.BadRequestException;
import com.ailms.exception.ForbiddenException;
import com.ailms.exception.ResourceNotFoundException;
import com.ailms.mapper.QuizMapper;
import com.ailms.repository.ClassMemberRepository;
import com.ailms.repository.ClassRepository;
import com.ailms.repository.QuestionOptionRepository;
import com.ailms.repository.QuestionRepository;
import com.ailms.repository.QuizRepository;
import com.ailms.request.PublishClassQuizRequest;
import com.ailms.response.QuizQuestionOptionResponse;
import com.ailms.response.QuizQuestionResponse;
import com.ailms.response.QuizResponse;
import com.ailms.security.CustomUserDetails;
import com.ailms.service.IClassQuizService;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Objects;

/** Sao chép Quiz nguồn thành bản giao lớp độc lập để không làm thay đổi Course Builder. */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ClassQuizService implements IClassQuizService {
    private static final String QUIZ_CODE_PREFIX = "QZ";

    private final QuizRepository quizRepository;
    private final ClassRepository classRepository;
    private final ClassMemberRepository classMemberRepository;
    private final QuestionRepository questionRepository;
    private final QuestionOptionRepository questionOptionRepository;
    private final QuizMapper quizMapper;
    private final ApplicationEventPublisher applicationEventPublisher;

    /** Tạo bản Quiz ACTIVE cho lớp và sao chép atomically câu hỏi/phương án từ Quiz nguồn. */
    @Override
    @Transactional
    public QuizResponse publish(
            Long classId, Long sourceQuizId, PublishClassQuizRequest request, CustomUserDetails currentUser) {
        ClassEntity clazz = requireManagedClass(classId, currentUser);
        QuizEntity source = quizRepository.findById(sourceQuizId)
                .orElseThrow(() -> ResourceNotFoundException.of("Quiz", sourceQuizId));
        if (source.getClassId() != null) {
            throw new BadRequestException("Chỉ có thể phát hành từ Quiz nguồn trong Course Builder");
        }
        Long classCourseId = clazz.getCourseEntity() == null ? null : clazz.getCourseEntity().getId();
        if (classCourseId == null || !Objects.equals(classCourseId, source.getCourseId())) {
            throw new BadRequestException("Quiz và lớp phải thuộc cùng khóa học");
        }
        if (quizRepository.existsByClassIdAndSourceQuizIdAndStatus(
                classId, sourceQuizId, BaseStatusEnum.ACTIVE)) {
            throw new BadRequestException("Quiz này đã được phát hành và đang hoạt động trong lớp");
        }
        validateSchedule(request);
        QuizEntity published = QuizEntity.builder()
                .lessonId(source.getLessonId()).courseId(classCourseId).sectionId(source.getSectionId())
                .classId(classId).sourceQuizId(source.getId())
                .code(CodeGenerator.generate(QUIZ_CODE_PREFIX, quizRepository::existsByCode))
                .title(request.getTitle() == null || request.getTitle().isBlank()
                        ? source.getTitle() : request.getTitle().trim())
                .description(source.getDescription()).timeLimitMin(source.getTimeLimitMin())
                .passScore(source.getPassScore())
                .maxAttempts(request.getMaxAttempts() == null ? source.getMaxAttempts() : request.getMaxAttempts())
                .shuffleQuestions(source.getShuffleQuestions())
                .availableFrom(request.getAvailableFrom()).dueAt(request.getDueAt())
                .showResultAfterSubmit(request.getShowResultAfterSubmit() == null
                        ? Boolean.TRUE : request.getShowResultAfterSubmit())
                .status(BaseStatusEnum.ACTIVE).createdBy(currentUser.getUser().getId()).build();
        published = quizRepository.save(published);
        copyQuestions(source.getId(), published.getId());
        applicationEventPublisher.publishEvent(new AuditLogEvent(this, "PUBLISH_CLASS_QUIZ", "QUIZ",
                published.getId(), null, published));
        return detailed(published);
    }

    /** Lấy các Quiz đã giao cho đúng lớp mà người gọi đang quản lý. */
    @Override
    public List<QuizResponse> getByClass(Long classId, CustomUserDetails currentUser) {
        requireManagedClass(classId, currentUser);
        return quizRepository.findByClassIdOrderByDueAtAsc(classId).stream().map(this::detailed).toList();
    }

    /** Cập nhật lịch mở, hạn nộp và chính sách lượt làm của bản Quiz lớp. */
    @Override
    @Transactional
    public QuizResponse updateSchedule(
            Long classId, Long classQuizId, PublishClassQuizRequest request, CustomUserDetails currentUser) {
        requireManagedClass(classId, currentUser);
        validateSchedule(request);
        QuizEntity quiz = requireClassQuiz(classId, classQuizId);
        if (quiz.getStatus() != BaseStatusEnum.ACTIVE) {
            throw new BadRequestException("Chỉ có thể cập nhật Quiz lớp đang hoạt động");
        }
        if (request.getTitle() != null && !request.getTitle().isBlank()) quiz.setTitle(request.getTitle().trim());
        quiz.setAvailableFrom(request.getAvailableFrom());
        quiz.setDueAt(request.getDueAt());
        if (request.getMaxAttempts() != null) quiz.setMaxAttempts(request.getMaxAttempts());
        if (request.getShowResultAfterSubmit() != null) quiz.setShowResultAfterSubmit(request.getShowResultAfterSubmit());
        QuizEntity saved = quizRepository.save(quiz);
        applicationEventPublisher.publishEvent(new AuditLogEvent(this, "UPDATE_CLASS_QUIZ", "QUIZ",
                saved.getId(), null, saved));
        return detailed(saved);
    }

    /** Đóng Quiz lớp bằng trạng thái INACTIVE để chặn lượt làm mới và nộp bài. */
    @Override
    @Transactional
    public QuizResponse close(Long classId, Long classQuizId, CustomUserDetails currentUser) {
        requireManagedClass(classId, currentUser);
        QuizEntity quiz = requireClassQuiz(classId, classQuizId);
        quiz.setStatus(BaseStatusEnum.INACTIVE);
        QuizEntity saved = quizRepository.save(quiz);
        applicationEventPublisher.publishEvent(new AuditLogEvent(this, "CLOSE_CLASS_QUIZ", "QUIZ",
                saved.getId(), null, saved));
        return detailed(saved);
    }

    /** Kiểm tra deadline luôn sau thời điểm mở và chưa nằm trong quá khứ. */
    private void validateSchedule(PublishClassQuizRequest request) {
        if (request.getAvailableFrom() != null && request.getDueAt() != null
                && !request.getDueAt().isAfter(request.getAvailableFrom())) {
            throw new BadRequestException("Hạn nộp phải sau thời điểm mở Quiz");
        }
        if (request.getDueAt() != null && !request.getDueAt().isAfter(LocalDateTime.now())) {
            throw new BadRequestException("Hạn nộp phải ở tương lai");
        }
    }

    /** Xác thực Admin hoặc Teacher/TA ACTIVE của đúng lớp. */
    private ClassEntity requireManagedClass(Long classId, CustomUserDetails currentUser) {
        ClassEntity clazz = classRepository.findById(classId)
                .orElseThrow(() -> ResourceNotFoundException.of("Class", classId));
        boolean admin = currentUser.getAuthorities().stream()
                .anyMatch(authority -> "ROLE_ADMIN".equals(authority.getAuthority()));
        if (!admin) {
            boolean manager = classMemberRepository.findById_ClassIdAndId_UserId(classId, currentUser.getUser().getId())
                    .filter(member -> member.getStatus() == ClassMemberStatusEnum.ACTIVE)
                    .filter(member -> member.getRoleInClass() == ClassMemberRole.TEACHER
                            || member.getRoleInClass() == ClassMemberRole.TA)
                    .isPresent();
            if (!manager) throw new ForbiddenException("Bạn không có quyền quản lý Quiz của lớp này");
        }
        return clazz;
    }

    /** Lấy Quiz và chặn ID Quiz thuộc lớp khác. */
    private QuizEntity requireClassQuiz(Long classId, Long classQuizId) {
        return quizRepository.findById(classQuizId)
                .filter(quiz -> Objects.equals(classId, quiz.getClassId()))
                .orElseThrow(() -> ResourceNotFoundException.of("ClassQuiz", classQuizId));
    }

    /** Sao chép toàn bộ câu hỏi và phương án sang bản Quiz lớp mới. */
    private void copyQuestions(Long sourceQuizId, Long targetQuizId) {
        List<QuestionEntity> sourceQuestions = questionRepository.findByQuizIdOrderByOrderIndexAsc(sourceQuizId);
        if (sourceQuestions.isEmpty()) throw new BadRequestException("Quiz nguồn chưa có câu hỏi");
        for (QuestionEntity sourceQuestion : sourceQuestions) {
            QuestionEntity copied = questionRepository.save(QuestionEntity.builder()
                    .quizId(targetQuizId).content(sourceQuestion.getContent())
                    .questionType(sourceQuestion.getQuestionType()).points(sourceQuestion.getPoints())
                    .orderIndex(sourceQuestion.getOrderIndex()).explanation(sourceQuestion.getExplanation())
                    .status(sourceQuestion.getStatus()).build());
            for (QuestionOptionEntity option : questionOptionRepository
                    .findByQuestionIdOrderByOrderIndexAsc(sourceQuestion.getId())) {
                questionOptionRepository.save(QuestionOptionEntity.builder()
                        .questionId(copied.getId()).content(option.getContent())
                        .isCorrect(option.getIsCorrect()).orderIndex(option.getOrderIndex()).build());
            }
        }
    }

    /** Ánh xạ Quiz lớp kèm câu hỏi để Teacher review sau phát hành. */
    private QuizResponse detailed(QuizEntity quiz) {
        QuizResponse response = quizMapper.toResponse(quiz);
        response.setQuestions(questionRepository.findByQuizIdOrderByOrderIndexAsc(quiz.getId()).stream()
                .map(question -> QuizQuestionResponse.builder().id(question.getId()).content(question.getContent())
                        .questionType(com.ailms.entity.enums.QuestionTypeEnum.apiName(question.getQuestionType()))
                        .points(question.getPoints()).orderIndex(question.getOrderIndex())
                        .explanation(question.getExplanation())
                        .options(questionOptionRepository.findByQuestionIdOrderByOrderIndexAsc(question.getId()).stream()
                                .map(option -> QuizQuestionOptionResponse.builder().id(option.getId())
                                        .content(option.getContent()).isCorrect(option.getIsCorrect())
                                        .orderIndex(option.getOrderIndex()).build()).toList()).build()).toList());
        return response;
    }
}
