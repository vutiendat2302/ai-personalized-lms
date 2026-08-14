package com.ailms.service.imp;

import com.ailms.entity.ClassEntity;
import com.ailms.exception.BusinessException;
import com.ailms.repository.specification.QuizSpecification;
import com.ailms.request.QuizSearchRequest;
import com.ailms.service.IQuizService;

import com.ailms.entity.QuizEntity;
import com.ailms.exception.ResourceNotFoundException;
import com.ailms.mapper.QuizMapper;
import com.ailms.repository.QuizRepository;
import com.ailms.repository.ClassRepository;
import com.ailms.request.QuizRequest;
import com.ailms.response.QuizResponse;
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

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class QuizService implements IQuizService {
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

    private static final String RESOURCE_NAME = "Quiz";

    public List<QuizResponse> getAll() {
        log.info("Getting all quizzes");
        return quizMapper.toResponseList(quizRepository.findAll());
    }

    public QuizResponse getById(Long id) {
        log.info("Getting quiz by id: {}", id);
        QuizEntity entity = quizRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of(RESOURCE_NAME, id));
        return quizMapper.toResponse(entity);
    }

    /** Trả chi tiết quiz thuộc quyền sở hữu của user hiện tại. */
    @Override
    public QuizResponse getAuthoredById(Long id, Long userId) {
        return quizMapper.toResponse(requireAuthored(id, userId));
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
        QuizEntity saved = quizRepository.save(entity);
        return quizMapper.toResponse(saved);
    }

    /** Tạo quiz với createdBy lấy từ JWT thay vì nhận từ payload. */
    @Override
    @Transactional
    public QuizResponse createForAuthor(QuizRequest request, Long userId) {
        normalizeClassCourse(request);
        QuizEntity entity = quizMapper.toEntity(request);
        entity.setCreatedBy(userId);
        return quizMapper.toResponse(quizRepository.save(entity));
    }

    @Transactional
    public QuizResponse update(Long id, QuizRequest request) {
        log.info("Updating quiz: {}", id);
        QuizEntity existing = quizRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of(RESOURCE_NAME, id));
        normalizeClassCourse(request);
        quizMapper.updateFromRequest(request, existing);
        QuizEntity updated = quizRepository.save(existing);
        return quizMapper.toResponse(updated);
    }

    /** Chỉ cập nhật quiz do chính user hiện tại tạo. */
    @Override
    @Transactional
    public QuizResponse updateAuthored(Long id, QuizRequest request, Long userId) {
        QuizEntity existing = requireAuthored(id, userId);
        normalizeClassCourse(request);
        quizMapper.updateFromRequest(request, existing);
        return quizMapper.toResponse(quizRepository.save(existing));
    }

    @Transactional
    public void delete(Long id) {
        log.info("Deleting quiz: {}", id);
        if (!quizRepository.existsById(id)) {
            throw ResourceNotFoundException.of(RESOURCE_NAME, id);
        }
        quizRepository.deleteById(id);
    }

    /** Chỉ xóa quiz do chính user hiện tại tạo. */
    @Override
    @Transactional
    public void deleteAuthored(Long id, Long userId) {
        quizRepository.delete(requireAuthored(id, userId));
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
