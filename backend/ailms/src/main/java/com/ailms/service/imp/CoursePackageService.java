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
import com.ailms.request.CoursePackageStatusRequest;
import com.ailms.response.CoursePackageResponse;
import com.ailms.response.CoursePackageStatsResponse;
import com.ailms.service.ICoursePackageService;
import com.ailms.search.MeilisearchCourseService;
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
    private final MeilisearchCourseService meilisearchCourseService;

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
        if (course.getStatus() == CourseStatusEnum.DELETED) {
            throw new BusinessException("Không thể tạo gói cho khóa học đã bị xóa.");
        }

        validatePricing(request.getPrice(), request.getOriginalPrice());

        CoursePackageEntity entity = coursePackageMapper.toEntity(request);
        entity.setCode(CodeGenerator.generate(CODE_PREFIX, coursePackageRepository::existsByCode));
        entity.setCourseEntity(course);
        entity.setClassEntity(resolveClass(
                request.getDeliveryMode(), request.getClassId(), request.getMaxGroupSize(), course));

        CoursePackageEntity saved = coursePackageRepository.saveAndFlush(entity);
        refreshCourseSearchIndex(course);
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

        validateStatusForDeliveryMode(request.getStatus(), existing.getDeliveryMode());
        validatePricing(request.getPrice(), request.getOriginalPrice());
        coursePackageMapper.updateFromRequest(request, existing);
        existing.setClassEntity(resolveClass(
                existing.getDeliveryMode(), request.getClassId(), request.getMaxGroupSize(), course));

        CoursePackageEntity updated = coursePackageRepository.saveAndFlush(existing);
        refreshCourseSearchIndex(course);
        CoursePackageResponse response = coursePackageMapper.toResponse(updated);
        publishAudit("UPDATE", id, oldValue, response);
        return response;
    }

    /** Cập nhật trạng thái gói mà không bắt buộc gửi lại toàn bộ thông tin giá. */
    @Override
    @Transactional
    public CoursePackageResponse updateStatus(Long id, CoursePackageStatusRequest request) {
        log.info("Updating status for course package: {}", id);
        CoursePackageEntity existing = coursePackageRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of(RESOURCE_NAME, id));
        validateStatusForDeliveryMode(request.getStatus(), existing.getDeliveryMode());
        CoursePackageResponse oldValue = coursePackageMapper.toResponse(existing);
        existing.setStatus(request.getStatus());
        CoursePackageEntity updated = coursePackageRepository.saveAndFlush(existing);
        refreshCourseSearchIndex(existing.getCourseEntity());
        CoursePackageResponse response = coursePackageMapper.toResponse(updated);
        publishAudit("UPDATE_STATUS", id, oldValue, response);
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
        preventRemovingLastSelfStudy(existing, CoursePackageStatusEnum.INACTIVE);
        coursePackageRepository.delete(existing);
        refreshCourseSearchIndex(existing.getCourseEntity());
        publishAudit("DELETE", id, oldValue, null);
    }

    /** Kiểm tra và lấy lớp cho GROUP_CLASS hoặc COMBO có thành phần lớp nhóm. */
    private ClassEntity resolveClass(
            DeliveryModeEnum deliveryMode, Long classId, Integer maxGroupSize,
            CourseEntity course) {
        boolean requiresClass = deliveryMode == DeliveryModeEnum.GROUP_CLASS
                || (deliveryMode == DeliveryModeEnum.COMBO && maxGroupSize != null && maxGroupSize > 1);
        if (!requiresClass) {
            if (classId != null) {
                throw new BusinessException("Chỉ gói có thành phần lớp nhóm mới được gắn classId");
            }
            return null;
        }
        if (classId == null) {
            throw new BusinessException("Gói có thành phần lớp nhóm bắt buộc phải có classId");
        }
        ClassEntity classEntity = classRepository.findById(classId)
                .orElseThrow(() -> ResourceNotFoundException.of("Class", classId));
        if (classEntity.getCourseEntity() == null || !course.getId().equals(classEntity.getCourseEntity().getId())) {
            throw new BusinessException("Selected class does not belong to course " + course.getId());
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

    /** Không cho vô hiệu hóa hoặc xóa gói tự học cuối cùng khi khóa học đang bán. */
    private void preventRemovingLastSelfStudy(
            CoursePackageEntity existing, CoursePackageStatusEnum requestedStatus) {
        if (existing.getDeliveryMode() != DeliveryModeEnum.SELF_STUDY
                || existing.getStatus() != CoursePackageStatusEnum.ACTIVE
                || requestedStatus == CoursePackageStatusEnum.ACTIVE
                || existing.getCourseEntity().getStatus() != CourseStatusEnum.ACTIVE) {
            return;
        }
        long activeCount = coursePackageRepository.countByCourseEntity_IdAndDeliveryModeAndStatus(
                existing.getCourseEntity().getId(), DeliveryModeEnum.SELF_STUDY, CoursePackageStatusEnum.ACTIVE);
        if (activeCount <= 1) {
            throw new BusinessException(
                    "Không thể xóa hoặc vô hiệu hóa gói tự học cuối cùng của khóa học đang được bán.");
        }
    }

    /** Đồng bộ cờ hiển thị của khóa học trong Meilisearch sau khi package thay đổi. */
    private void refreshCourseSearchIndex(CourseEntity course) {
        boolean activeForSale = course != null
                && course.getStatus() == CourseStatusEnum.ACTIVE
                && !coursePackageRepository.findByCourseEntity_IdAndStatus(
                        course.getId(), CoursePackageStatusEnum.ACTIVE).isEmpty();
        meilisearchCourseService.index(course, activeForSale);
    }

    /** Phát sự kiện audit cho thao tác thay đổi dữ liệu gói khóa học. */
    private void publishAudit(String action, Long entityId, Object oldValue, Object newValue) {
        applicationEventPublisher.publishEvent(
                new AuditLogEvent(this, action, AUDIT_ENTITY_TYPE, entityId, oldValue, newValue));
    }
}
