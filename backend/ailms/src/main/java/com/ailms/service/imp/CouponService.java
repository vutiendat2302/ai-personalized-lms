package com.ailms.service.imp;

import com.ailms.entity.CourseEntity;
import com.ailms.entity.CouponEntity;
import com.ailms.entity.enums.CouponStatusEnum;
import com.ailms.exception.BusinessException;
import com.ailms.exception.ResourceNotFoundException;
import com.ailms.mapper.CouponMapper;
import com.ailms.repository.CourseRepository;
import com.ailms.repository.CouponRepository;
import com.ailms.response.CouponResponse;
import com.ailms.service.ICouponService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class CouponService implements ICouponService {

    private final CouponRepository couponRepository;
    private final CourseRepository courseRepository;
    private final CouponMapper couponMapper;

    private static final String RESOURCE_NAME = "Coupon";

    @Override
    public List<CouponResponse> getAll() {
        log.info("Getting all coupons");
        return couponMapper.toResponseList(couponRepository.findAll());
    }

    @Override
    public CouponResponse getById(Long id) {
        log.info("Getting coupon by id: {}", id);
        CouponEntity entity = couponRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of(RESOURCE_NAME, id));
        return couponMapper.toResponse(entity);
    }

    @Override
    public CouponResponse getByCode(String code) {
        log.info("Getting coupon by code: {}", code);
        CouponEntity entity = couponRepository.findByCode(code)
                .orElseThrow(() -> new BusinessException("Coupon not found: " + code));
        return couponMapper.toResponse(entity);
    }

    @Override
    @Transactional
    public CouponResponse create(com.ailms.request.CouponRequest request) {
        log.info("Creating coupon with code: {}", request.getCode());
        if (couponRepository.findByCode(request.getCode()).isPresent()) {
            throw new BusinessException("Coupon code already exists: " + request.getCode());
        }

        CouponEntity entity = couponMapper.toEntity(request);
        if (request.getApplicableCourseId() != null) {
            CourseEntity course = courseRepository.findById(request.getApplicableCourseId())
                    .orElseThrow(() -> ResourceNotFoundException.of("Course", request.getApplicableCourseId()));
            entity.setApplicableCourseEntity(course);
        }

        CouponEntity saved = couponRepository.save(entity);
        return couponMapper.toResponse(saved);
    }

    @Override
    @Transactional
    public CouponResponse update(Long id, com.ailms.request.CouponRequest request) {
        log.info("Updating coupon: {}", id);
        CouponEntity existing = couponRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of(RESOURCE_NAME, id));

        couponRepository.findByCode(request.getCode()).ifPresent(other -> {
            if (!other.getId().equals(id)) {
                throw new BusinessException("Coupon code already exists: " + request.getCode());
            }
        });

        couponMapper.updateFromRequest(request, existing);

        if (request.getApplicableCourseId() != null) {
            CourseEntity course = courseRepository.findById(request.getApplicableCourseId())
                    .orElseThrow(() -> ResourceNotFoundException.of("Course", request.getApplicableCourseId()));
            existing.setApplicableCourseEntity(course);
        } else {
            existing.setApplicableCourseEntity(null);
        }

        CouponEntity updated = couponRepository.save(existing);
        return couponMapper.toResponse(updated);
    }

    @Override
    @Transactional
    public void delete(Long id) {
        log.info("Deleting coupon: {}", id);
        if (!couponRepository.existsById(id)) {
            throw ResourceNotFoundException.of(RESOURCE_NAME, id);
        }
        couponRepository.deleteById(id);
    }

    @Override
    public CouponResponse validateCoupon(String code, Long courseId) {
        log.info("Validating coupon code: {} for course id: {}", code, courseId);
        CouponEntity entity = couponRepository.findByCode(code)
                .orElseThrow(() -> new BusinessException("Coupon code not found: " + code));

        if (entity.getStatus() != CouponStatusEnum.ACTIVE) {
            throw new BusinessException("Coupon is inactive");
        }

        LocalDateTime now = LocalDateTime.now();
        if (entity.getValidFrom() != null && now.isBefore(entity.getValidFrom())) {
            throw new BusinessException("Coupon is not active yet");
        }

        if (entity.getValidTo() != null && now.isAfter(entity.getValidTo())) {
            throw new BusinessException("Coupon has expired");
        }

        if (entity.getMaxUsage() != null && entity.getUsedCount() >= entity.getMaxUsage()) {
            throw new BusinessException("Coupon usage limit reached");
        }

        if (entity.getApplicableCourseEntity() != null && courseId != null) {
            if (!entity.getApplicableCourseEntity().getId().equals(courseId)) {
                throw new BusinessException("Coupon is not applicable to this course");
            }
        }

        return couponMapper.toResponse(entity);
    }
}
