package com.ailms.service.imp;

import com.ailms.entity.ClassEntity;
import com.ailms.entity.QuestionEntity;
import com.ailms.entity.QuestionOptionEntity;
import com.ailms.entity.enums.QuestionTypeEnum;
import com.ailms.common.util.CodeGenerator;
import com.ailms.exception.BusinessException;
import com.ailms.repository.QuestionOptionRepository;
import com.ailms.repository.QuestionRepository;
import com.ailms.repository.specification.QuizSpecification;
import com.ailms.request.QuizSearchRequest;
import com.ailms.service.IQuizService;

import com.ailms.entity.QuizEntity;
import com.ailms.exception.ResourceNotFoundException;
import com.ailms.mapper.QuizMapper;
import com.ailms.repository.QuizRepository;
import com.ailms.repository.ClassRepository;
import com.ailms.request.QuizRequest;
import com.ailms.request.QuizQuestionOptionRequest;
import com.ailms.request.QuizQuestionRequest;
import com.ailms.response.QuizResponse;
import com.ailms.response.QuizQuestionOptionResponse;
import com.ailms.response.QuizQuestionResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import com.ailms.response.PageResponse;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Objects;
import java.math.BigDecimal;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class QuizService implements IQuizService {
    private static final String QUIZ_CODE_PREFIX = "QZ";

    @Override
    public PageResponse<QuizResponse> search(QuizSearchRequest request) {
        log.info("Searching Quiz via specification");
        Specification<QuizEntity> spec = QuizSpecification.filterAndSearch(request);
        Pageable pageable = request.toPageable();
        Page<QuizEntity> page = quizRepository.findAll(spec, pageable);
        return PageResponse.from(page.map(quizMapper::toResponse));
    }

    /** Tìm kiếm có phân trang và bắt buộc lọc createdBy theo user trong JWT. */
    @Override
    public PageResponse<QuizResponse> searchAuthored(QuizSearchRequest request, Long userId) {
        Specification<QuizEntity> spec = QuizSpecification.filterAndSearch(request)
                .and((root, query, criteriaBuilder) -> criteriaBuilder.equal(root.get("createdBy"), userId));
        Page<QuizEntity> page = quizRepository.findAll(spec, request.toPageable());
        return PageResponse.from(page.map(quizMapper::toResponse));
    }

    private final QuizRepository quizRepository;
    private final QuizMapper quizMapper;
    private final ClassRepository classRepository;
    private final QuestionRepository questionRepository;
    private final QuestionOptionRepository questionOptionRepository;

    private static final String RESOURCE_NAME = "Quiz";

    public List<QuizResponse> getAll() {
        log.info("Getting all quizzes");
        return quizMapper.toResponseList(quizRepository.findAll());
    }

    public QuizResponse getById(Long id) {
        log.info("Getting quiz by id: {}", id);
        QuizEntity entity = quizRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of(RESOURCE_NAME, id));
        return toDetailedResponse(entity);
    }

    /** Trả chi tiết quiz thuộc quyền sở hữu của user hiện tại. */
    @Override
    public QuizResponse getAuthoredById(Long id, Long userId) {
        return toDetailedResponse(requireAuthored(id, userId));
    }

    public List<QuizResponse> getByLessonId(Long lessonId) {
        log.info("Getting quizzes by lesson id: {}", lessonId);
        return quizMapper.toResponseList(quizRepository.findByLessonId(lessonId));
    }

    public List<QuizResponse> getByCourseId(Long courseId) {
        log.info("Getting quizzes by course id: {}", courseId);
        return quizMapper.toResponseList(quizRepository.findByCourseId(courseId));
    }

    public List<QuizResponse> getBySectionId(Long sectionId) {
        log.info("Getting quizzes by section id: {}", sectionId);
        return quizMapper.toResponseList(quizRepository.findBySectionId(sectionId));
    }

    /** Lấy quiz của lớp theo thời hạn tăng dần. */
    @Override
    public List<QuizResponse> getByClassId(Long classId) {
        return quizMapper.toResponseList(quizRepository.findByClassIdOrderByDueAtAsc(classId));
    }

    @Transactional
    public QuizResponse create(QuizRequest request) {
        log.info("Creating quiz: {}", request.getTitle());
        normalizeClassCourse(request);
        QuizEntity entity = quizMapper.toEntity(request);
        entity.setCode(CodeGenerator.generate(QUIZ_CODE_PREFIX, quizRepository::existsByCode));
        QuizEntity saved = quizRepository.save(entity);
        synchronizeQuestions(saved.getId(), request.getQuestions());
        return toDetailedResponse(saved);
    }

    /** Tạo quiz với createdBy lấy từ JWT thay vì nhận từ payload. */
    @Override
    @Transactional
    public QuizResponse createForAuthor(QuizRequest request, Long userId) {
        normalizeClassCourse(request);
        QuizEntity entity = quizMapper.toEntity(request);
        entity.setCreatedBy(userId);
        entity.setCode(CodeGenerator.generate(QUIZ_CODE_PREFIX, quizRepository::existsByCode));
        QuizEntity saved = quizRepository.save(entity);
        synchronizeQuestions(saved.getId(), request.getQuestions());
        return toDetailedResponse(saved);
    }

    @Transactional
    public QuizResponse update(Long id, QuizRequest request) {
        log.info("Updating quiz: {}", id);
        QuizEntity existing = quizRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of(RESOURCE_NAME, id));
        normalizeClassCourse(request);
        quizMapper.updateFromRequest(request, existing);
        QuizEntity updated = quizRepository.save(existing);
        synchronizeQuestions(updated.getId(), request.getQuestions());
        return toDetailedResponse(updated);
    }

    /** Chỉ cập nhật quiz do chính user hiện tại tạo. */
    @Override
    @Transactional
    public QuizResponse updateAuthored(Long id, QuizRequest request, Long userId) {
        QuizEntity existing = requireAuthored(id, userId);
        normalizeClassCourse(request);
        quizMapper.updateFromRequest(request, existing);
        QuizEntity updated = quizRepository.save(existing);
        synchronizeQuestions(updated.getId(), request.getQuestions());
        return toDetailedResponse(updated);
    }

    @Transactional
    public void delete(Long id) {
        log.info("Deleting quiz: {}", id);
        if (!quizRepository.existsById(id)) {
            throw ResourceNotFoundException.of(RESOURCE_NAME, id);
        }
        deleteQuestions(id);
        quizRepository.deleteById(id);
    }

    /** Chỉ xóa quiz do chính user hiện tại tạo. */
    @Override
    @Transactional
    public void deleteAuthored(Long id, Long userId) {
        QuizEntity quiz = requireAuthored(id, userId);
        deleteQuestions(quiz.getId());
        quizRepository.delete(quiz);
    }

    /** Ánh xạ quiz cùng câu hỏi và phương án từ các bảng quan hệ. */
    private QuizResponse toDetailedResponse(QuizEntity quiz) {
        QuizResponse response = quizMapper.toResponse(quiz);
        response.setQuestions(questionRepository.findByQuizIdOrderByOrderIndexAsc(quiz.getId()).stream()
                .map(question -> QuizQuestionResponse.builder()
                        .id(question.getId())
                        .content(question.getContent())
                        .questionType(QuestionTypeEnum.apiName(question.getQuestionType()))
                        .points(question.getPoints())
                        .orderIndex(question.getOrderIndex())
                        .explanation(question.getExplanation())
                        .options(questionOptionRepository.findByQuestionIdOrderByOrderIndexAsc(question.getId()).stream()
                                .map(option -> QuizQuestionOptionResponse.builder()
                                        .id(option.getId())
                                        .content(option.getContent())
                                        .isCorrect(option.getIsCorrect())
                                        .orderIndex(option.getOrderIndex())
                                        .build())
                                .toList())
                        .build())
                .toList());
        return response;
    }

    /** Đồng bộ atomically danh sách câu hỏi khi request có gửi trường questions. */
    private void synchronizeQuestions(Long quizId, List<QuizQuestionRequest> questions) {
        if (questions == null) return;
        deleteQuestions(quizId);
        for (int questionIndex = 0; questionIndex < questions.size(); questionIndex++) {
            QuizQuestionRequest request = questions.get(questionIndex);
            QuestionTypeEnum type = QuestionTypeEnum.fromName(request.getQuestionType());
            validateQuestionOptions(request, type, questionIndex);
            QuestionEntity saved = questionRepository.save(QuestionEntity.builder()
                    .quizId(quizId)
                    .content(request.getContent().trim())
                    .questionType(type.getCode())
                    .points(request.getPoints() != null ? request.getPoints() : BigDecimal.ONE)
                    .orderIndex(questionIndex)
                    .explanation(request.getExplanation())
                    .status((byte) 1)
                    .build());
            for (int optionIndex = 0; optionIndex < request.getOptions().size(); optionIndex++) {
                QuizQuestionOptionRequest option = request.getOptions().get(optionIndex);
                questionOptionRepository.save(QuestionOptionEntity.builder()
                        .questionId(saved.getId())
                        .content(option.getContent().trim())
                        .isCorrect(Boolean.TRUE.equals(option.getIsCorrect()))
                        .orderIndex(optionIndex)
                        .build());
            }
        }
    }

    /** Kiểm tra số đáp án đúng theo loại câu hỏi trước khi ghi dữ liệu. */
    private void validateQuestionOptions(QuizQuestionRequest request, QuestionTypeEnum type, int questionIndex) {
        if (request.getOptions() == null || request.getOptions().isEmpty()) {
            throw new BusinessException("Câu hỏi " + (questionIndex + 1) + " phải có phương án trả lời.");
        }
        long correctCount = request.getOptions().stream()
                .filter(option -> Boolean.TRUE.equals(option.getIsCorrect())).count();
        if ((type == QuestionTypeEnum.SINGLE_CHOICE || type == QuestionTypeEnum.TRUE_FALSE)
                && correctCount != 1) {
            throw new BusinessException("Câu hỏi " + (questionIndex + 1) + " phải có đúng một đáp án đúng.");
        }
        if (type == QuestionTypeEnum.MULTIPLE_CHOICE && correctCount < 1) {
            throw new BusinessException("Câu hỏi " + (questionIndex + 1) + " phải có ít nhất một đáp án đúng.");
        }
    }

    /** Xóa phương án trước câu hỏi để giữ toàn vẹn khóa ngoại khi cập nhật hoặc xóa quiz. */
    private void deleteQuestions(Long quizId) {
        List<QuestionEntity> questions = questionRepository.findByQuizId(quizId);
        questions.forEach(question -> questionOptionRepository.deleteByQuestionId(question.getId()));
        questionRepository.deleteByQuizId(quizId);
    }

    /** Tìm quiz theo ID và che giấu bản ghi nếu không thuộc người tạo hiện tại. */
    private QuizEntity requireAuthored(Long id, Long userId) {
        return quizRepository.findById(id)
                .filter(item -> Objects.equals(item.getCreatedBy(), userId))
                .orElseThrow(() -> ResourceNotFoundException.of(RESOURCE_NAME, id));
    }

    /** Đồng bộ courseId từ lớp để quiz không thể trỏ sang khóa học khác. */
    private void normalizeClassCourse(QuizRequest request) {
        if (request.getClassId() == null) return;
        ClassEntity clazz;
        clazz = classRepository.findById(request.getClassId())
                .orElseThrow(() -> ResourceNotFoundException.of("Class", request.getClassId()));
        if (clazz.getCourseEntity() == null) {
            throw new BusinessException("Lớp chưa được gắn với khóa học.");
        }
        request.setCourseId(clazz.getCourseEntity().getId());
    }
}
