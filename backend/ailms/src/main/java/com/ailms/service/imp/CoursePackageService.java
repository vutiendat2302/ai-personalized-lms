package com.ailms.service.imp;

import com.ailms.common.util.CodeGenerator;
import com.ailms.entity.CourseEntity;
import com.ailms.entity.CoursePackageEntity;
import com.ailms.entity.ClassEntity;
import com.ailms.entity.enums.DeliveryModeEnum;
import com.ailms.entity.enums.CourseStatusEnum;
import com.ailms.entity.enums.CoursePackageStatusEnum;
import com.ailms.event.AuditLogEvent;
import com.ailms.exception.BusinessException;
import com.ailms.exception.ResourceNotFoundException;
import com.ailms.mapper.CoursePackageMapper;
import com.ailms.repository.CoursePackageRepository;
import com.ailms.repository.CourseRepository;
import com.ailms.repository.ClassRepository;
import com.ailms.repository.specification.CoursePackageSpecification;
import com.ailms.request.CreateCoursePackageRequest;
import com.ailms.request.CoursePackageSearchRequest;
import com.ailms.request.UpdateCoursePackageRequest;
import com.ailms.response.CoursePackageResponse;
import com.ailms.response.CoursePackageStatsResponse;
import com.ailms.service.ICoursePackageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import com.ailms.response.PageResponse;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class CoursePackageService implements ICoursePackageService {

    private final CoursePackageRepository coursePackageRepository;
    private final CourseRepository courseRepository;
    private final ClassRepository classRepository;
    private final CoursePackageMapper coursePackageMapper;
    private final ApplicationEventPublisher applicationEventPublisher;

    private static final String RESOURCE_NAME = "CoursePackage";
    private static final String AUDIT_ENTITY_TYPE = "COURSE_PACKAGE";
    private static final String CODE_PREFIX = "CP";

    /** Tìm kiếm gói theo mã, tên và các bộ lọc có phân trang. */
    @Override
    public PageResponse<CoursePackageResponse> search(CoursePackageSearchRequest request) {
        log.info("Searching Course Packages via specification");
        Specification<CoursePackageEntity> spec = CoursePackageSpecification.filterAndSearch(request);
        Pageable pageable = request.toPageable();
        Page<CoursePackageEntity> page = coursePackageRepository.findAll(spec, pageable);
        return PageResponse.from(page.map(coursePackageMapper::toResponse));
    }

    /** Tổng hợp số gói bán theo trạng thái; hết chỗ chỉ tính gói lớp nhóm. */
    @Override
    public CoursePackageStatsResponse getStats() {
        return CoursePackageStatsResponse.builder()
                .totalPackages(coursePackageRepository.count())
                .activePackages(coursePackageRepository.countByStatus(CoursePackageStatusEnum.ACTIVE))
                .outOfStockPackages(coursePackageRepository.countByStatusAndDeliveryMode(
                        CoursePackageStatusEnum.OUT_OF_STOCK, DeliveryModeEnum.GROUP_CLASS))
                .inactivePackages(coursePackageRepository.countByStatus(CoursePackageStatusEnum.INACTIVE))
                .build();
    }

    /** Lấy toàn bộ gói khóa học. */
    @Override
    public List<CoursePackageResponse> getAll() {
        log.info("Getting all course packages");
        return coursePackageMapper.toResponseList(coursePackageRepository.findAll());
    }

    /** Lấy chi tiết gói theo ID. */
    @Override
    public CoursePackageResponse getById(Long id) {
        log.info("Getting course package by id: {}", id);
        CoursePackageEntity entity = coursePackageRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of(RESOURCE_NAME, id));
        return coursePackageMapper.toResponse(entity);
    }

    /** Lấy danh sách gói của một khóa học. */
    @Override
    public List<CoursePackageResponse> getByCourseId(Long courseId) {
        log.info("Getting course packages by course id: {}", courseId);
        return coursePackageMapper.toResponseList(coursePackageRepository.findByCourseEntity_Id(courseId));
    }

    /** Tạo gói với mã tự sinh và ghi audit. */
    @Override
    @Transactional
    public CoursePackageResponse create(CreateCoursePackageRequest request) {
        log.info("Creating course package for course: {}", request.getCourseId());
        CourseEntity course = courseRepository.findById(request.getCourseId())
                .orElseThrow(() -> ResourceNotFoundException.of("Course", request.getCourseId()));
        if (course.getStatus() != CourseStatusEnum.ACTIVE) {
            throw new BusinessException("Khóa học đang ở trạng thái Ẩn/Chưa hoạt động. Không thể tạo hoặc mở bán bất kỳ gói học nào.");
        }

        validatePricing(request.getPrice(), request.getOriginalPrice());

        CoursePackageEntity entity = coursePackageMapper.toEntity(request);
        entity.setCode(CodeGenerator.generate(CODE_PREFIX, coursePackageRepository::existsByCode));
        entity.setCourseEntity(course);
        entity.setClassEntity(resolveClass(request.getDeliveryMode(), request.getClassId(), course, null));

        CoursePackageEntity saved = coursePackageRepository.saveAndFlush(entity);
        CoursePackageResponse response = coursePackageMapper.toResponse(saved);
        publishAudit("CREATE", saved.getId(), null, response);
        return response;
    }

    /** Cập nhật gói nhưng giữ nguyên mã tự sinh và ghi audit. */
    @Override
    @Transactional
    public CoursePackageResponse update(Long id, UpdateCoursePackageRequest request) {
        log.info("Updating course package: {}", id);
        CoursePackageEntity existing = coursePackageRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of(RESOURCE_NAME, id));
        CoursePackageResponse oldValue = coursePackageMapper.toResponse(existing);
        CourseEntity course = existing.getCourseEntity();

        if (request.getStatus() == CoursePackageStatusEnum.ACTIVE && course.getStatus() != CourseStatusEnum.ACTIVE) {
            throw new BusinessException("Khóa học đang ở trạng thái Ẩn/Chưa hoạt động. Không thể kích hoạt hoặc hiển thị bất kỳ gói học nào.");
        }

        validateStatusForDeliveryMode(request.getStatus(), existing.getDeliveryMode());
        validatePricing(request.getPrice(), request.getOriginalPrice());
        coursePackageMapper.updateFromRequest(request, existing);

        CoursePackageEntity updated = coursePackageRepository.saveAndFlush(existing);
        CoursePackageResponse response = coursePackageMapper.toResponse(updated);
        publishAudit("UPDATE", id, oldValue, response);
        return response;
    }

    /** Xóa gói và ghi lại trạng thái cũ vào audit. */
    @Override
    @Transactional
    public void delete(Long id) {
        log.info("Deleting course package: {}", id);
        CoursePackageEntity existing = coursePackageRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of(RESOURCE_NAME, id));
        CoursePackageResponse oldValue = coursePackageMapper.toResponse(existing);
        coursePackageRepository.delete(existing);
        publishAudit("DELETE", id, oldValue, null);
    }

    /** Kiểm tra và lấy lớp cho gói lớp nhóm; gói tự học và 1-1 không gắn lớp. */
    private ClassEntity resolveClass(DeliveryModeEnum deliveryMode, Long classId, CourseEntity course, Long existingPackageId) {
        if (deliveryMode != DeliveryModeEnum.GROUP_CLASS) {
            return null;
        }
        if (classId == null) {
            throw new BusinessException("GROUP_CLASS package requires a classId");
        }
        ClassEntity classEntity = classRepository.findById(classId)
                .orElseThrow(() -> ResourceNotFoundException.of("Class", classId));
        if (classEntity.getCourseEntity() == null || !course.getId().equals(classEntity.getCourseEntity().getId())) {
            throw new BusinessException("Selected class does not belong to course " + course.getId());
        }

        boolean isAlreadyAssigned = existingPackageId == null
                ? coursePackageRepository.existsByClassEntity_Id(classId)
                : coursePackageRepository.existsByClassEntity_IdAndIdNot(classId, existingPackageId);

        if (isAlreadyAssigned) {
            throw new BusinessException("Lớp học nhóm này đã được gắn với một gói bán khác.");
        }

        return classEntity;
    }

    /** Đảm bảo giá bán không vượt quá giá niêm yết. */
    private void validatePricing(BigDecimal price, BigDecimal originalPrice) {
        if (price.compareTo(originalPrice) > 0) {
            throw new BusinessException("Price must not be greater than original price");
        }
    }

    /** Chỉ cho phép trạng thái hết chỗ đối với gói lớp nhóm. */
    private void validateStatusForDeliveryMode(CoursePackageStatusEnum status, DeliveryModeEnum deliveryMode) {
        if (status == CoursePackageStatusEnum.OUT_OF_STOCK && deliveryMode != DeliveryModeEnum.GROUP_CLASS) {
            throw new BusinessException("OUT_OF_STOCK status is only valid for GROUP_CLASS packages");
        }
    }

    /** Phát sự kiện audit cho thao tác thay đổi dữ liệu gói khóa học. */
    private void publishAudit(String action, Long entityId, Object oldValue, Object newValue) {
        applicationEventPublisher.publishEvent(
                new AuditLogEvent(this, action, AUDIT_ENTITY_TYPE, entityId, oldValue, newValue));
    }
}
