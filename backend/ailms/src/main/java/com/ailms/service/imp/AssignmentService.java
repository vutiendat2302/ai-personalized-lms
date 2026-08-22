package com.ailms.service.imp;

import com.ailms.entity.ClassEntity;
import com.ailms.exception.BusinessException;
import com.ailms.service.IAssignmentService;

import com.ailms.entity.AssignmentEntity;
import com.ailms.exception.ResourceNotFoundException;
import com.ailms.mapper.AssignmentMapper;
import com.ailms.repository.AssignmentRepository;
import com.ailms.repository.ClassRepository;
import com.ailms.repository.specification.AssignmentSpecification;
import com.ailms.request.AssignmentRequest;
import com.ailms.request.AssignmentSearchRequest;
import com.ailms.response.AssignmentResponse;
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
public class AssignmentService implements IAssignmentService {

    private final AssignmentRepository assignmentRepository;
    private final AssignmentMapper assignmentMapper;
    private final ClassRepository classRepository;

    private static final String RESOURCE_NAME = "Assignment";

    public List<AssignmentResponse> getAll() {
        log.info("Getting all assignments");
        return assignmentMapper.toResponseList(assignmentRepository.findAll());
    }

    public AssignmentResponse getById(Long id) {
        log.info("Getting assignment by id: {}", id);
        AssignmentEntity entity = assignmentRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of(RESOURCE_NAME, id));
        return assignmentMapper.toResponse(entity);
    }

    /** Trả chi tiết bài tập thuộc quyền sở hữu của user hiện tại. */
    @Override
    public AssignmentResponse getAuthoredById(Long id, Long userId) {
        return assignmentMapper.toResponse(requireAuthored(id, userId));
    }

    public List<AssignmentResponse> getByLessonId(Long lessonId) {
        log.info("Getting assignments by lesson id: {}", lessonId);
        return assignmentMapper.toResponseList(assignmentRepository.findByLessonId(lessonId));
    }

    public List<AssignmentResponse> getByCourseId(Long courseId) {
        log.info("Getting assignments by course id: {}", courseId);
        return assignmentMapper.toResponseList(assignmentRepository.findByCourseId(courseId));
    }

    public List<AssignmentResponse> getBySectionId(Long sectionId) {
        log.info("Getting assignments by section id: {}", sectionId);
        return assignmentMapper.toResponseList(assignmentRepository.findBySectionId(sectionId));
    }

    /** Lấy bài tập của lớp theo hạn nộp tăng dần. */
    @Override
    public List<AssignmentResponse> getByClassId(Long classId) {
        return assignmentMapper.toResponseList(assignmentRepository.findByClassIdOrderByDueDateAsc(classId));
    }

    @Transactional
    public AssignmentResponse create(AssignmentRequest request) {
        log.info("Creating assignment: {}", request.getTitle());
        normalizeClassCourse(request);
        AssignmentEntity entity = assignmentMapper.toEntity(request);
        AssignmentEntity saved = assignmentRepository.save(entity);
        return assignmentMapper.toResponse(saved);
    }

    /** Tạo bài tập với createdBy lấy từ JWT thay vì nhận từ payload. */
    @Override
    @Transactional
    public AssignmentResponse createForAuthor(AssignmentRequest request, Long userId) {
        normalizeClassCourse(request);
        AssignmentEntity entity = assignmentMapper.toEntity(request);
        entity.setCreatedBy(userId);
        return assignmentMapper.toResponse(assignmentRepository.save(entity));
    }

    @Transactional
    public AssignmentResponse update(Long id, AssignmentRequest request) {
        log.info("Updating assignment: {}", id);
        AssignmentEntity existing = assignmentRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of(RESOURCE_NAME, id));
        normalizeClassCourse(request);
        assignmentMapper.updateFromRequest(request, existing);
        AssignmentEntity updated = assignmentRepository.save(existing);
        return assignmentMapper.toResponse(updated);
    }

    /** Chỉ cập nhật bài tập do chính user hiện tại tạo. */
    @Override
    @Transactional
    public AssignmentResponse updateAuthored(Long id, AssignmentRequest request, Long userId) {
        AssignmentEntity existing = requireAuthored(id, userId);
        normalizeClassCourse(request);
        assignmentMapper.updateFromRequest(request, existing);
        return assignmentMapper.toResponse(assignmentRepository.save(existing));
    }

    @Transactional
    public void delete(Long id) {
        log.info("Deleting assignment: {}", id);
        if (!assignmentRepository.existsById(id)) {
            throw ResourceNotFoundException.of(RESOURCE_NAME, id);
        }
        assignmentRepository.deleteById(id);
    }

    /** Chỉ xóa bài tập do chính user hiện tại tạo. */
    @Override
    @Transactional
    public void deleteAuthored(Long id, Long userId) {
        assignmentRepository.delete(requireAuthored(id, userId));
    }

    /** Đồng bộ courseId từ lớp để bài tập không thể trỏ sang khóa học khác. */
    private void normalizeClassCourse(AssignmentRequest request) {
        if (request.getClassId() == null) return;
        ClassEntity clazz = classRepository.findById(request.getClassId())
                .orElseThrow(() -> ResourceNotFoundException.of("Class", request.getClassId()));
        if (clazz.getCourseEntity() == null) {
            throw new BusinessException("Lớp chưa được gắn với khóa học.");
        }
        request.setCourseId(clazz.getCourseEntity().getId());
    }

    @Override
    public PageResponse<AssignmentResponse> search(AssignmentSearchRequest request) {
        log.info("Searching Assignment via specification");
        Specification<AssignmentEntity> spec = AssignmentSpecification.filterAndSearch(request);
        Pageable pageable = request.toPageable();
        Page<AssignmentEntity> page = assignmentRepository.findAll(spec, pageable);
        return PageResponse.from(page.map(assignmentMapper::toResponse));
    }

    /** Tìm kiếm có phân trang và bắt buộc lọc createdBy theo user trong JWT. */
    @Override
    public PageResponse<AssignmentResponse> searchAuthored(AssignmentSearchRequest request, Long userId) {
        Specification<AssignmentEntity> spec = AssignmentSpecification.filterAndSearch(request)
                .and((root, query, criteriaBuilder) -> criteriaBuilder.equal(root.get("createdBy"), userId));
        Page<AssignmentEntity> page = assignmentRepository.findAll(spec, request.toPageable());
        return PageResponse.from(page.map(assignmentMapper::toResponse));
    }

    /** Tìm bài tập theo ID và che giấu bản ghi nếu không thuộc người tạo hiện tại. */
    private AssignmentEntity requireAuthored(Long id, Long userId) {
        return assignmentRepository.findById(id)
                .filter(item -> Objects.equals(item.getCreatedBy(), userId))
                .orElseThrow(() -> ResourceNotFoundException.of(RESOURCE_NAME, id));
    }
}
