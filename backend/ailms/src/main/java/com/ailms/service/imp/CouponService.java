package com.ailms.service.imp;

import com.ailms.entity.CourseEntity;
import com.ailms.entity.CouponEntity;
import com.ailms.entity.UserCouponEntity;
import com.ailms.entity.UserEntity;
import com.ailms.entity.enums.CouponStatusEnum;
import com.ailms.entity.enums.UserCouponStatusEnum;
import com.ailms.exception.BusinessException;
import com.ailms.exception.ResourceNotFoundException;
import com.ailms.mapper.CouponMapper;
import com.ailms.repository.CourseRepository;
import com.ailms.repository.CouponRepository;
import com.ailms.repository.UserCouponRepository;
import com.ailms.repository.UserRepository;
import com.ailms.response.CouponResponse;
import com.ailms.response.UserCouponResponse;
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
    private final UserCouponRepository userCouponRepository;
    private final UserRepository userRepository;

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

    /** Cấp coupon cho một học viên và không cho cấp trùng cùng coupon. */
    @Override
    @Transactional
    public UserCouponResponse assignToUser(Long couponId, Long userId) {
        if (userCouponRepository.existsByUserEntity_IdAndCouponEntity_Id(userId, couponId)) {
            throw new BusinessException("Voucher đã được cấp cho người dùng này.");
        }
        CouponEntity coupon = couponRepository.findById(couponId)
                .orElseThrow(() -> ResourceNotFoundException.of(RESOURCE_NAME, couponId));
        UserEntity user = userRepository.findById(userId)
                .orElseThrow(() -> ResourceNotFoundException.of("User", userId));
        return mapUserCoupon(userCouponRepository.save(UserCouponEntity.builder()
                .userEntity(user).couponEntity(coupon).status(UserCouponStatusEnum.AVAILABLE).build()));
    }

    /** Lấy danh sách voucher được cấp và tính trạng thái khả dụng tại thời điểm đọc. */
    @Override
    public List<UserCouponResponse> getUserCoupons(Long userId) {
        return userCouponRepository.findByUserEntity_IdOrderByCreatedAtDesc(userId).stream()
                .map(this::mapUserCoupon).toList();
    }

    /** Kiểm tra voucher thuộc đúng học viên, còn hạn và áp dụng được cho ít nhất một khóa học. */
    @Override
    public UserCouponResponse validateUserCoupon(Long userId, String code, List<Long> courseIds) {
        UserCouponEntity owned = userCouponRepository.findByUserEntity_IdOrderByCreatedAtDesc(userId).stream()
                .filter(item -> item.getCouponEntity().getCode().equalsIgnoreCase(code))
                .findFirst().orElseThrow(() -> new BusinessException("Voucher không thuộc tài khoản của bạn."));
        UserCouponResponse response = mapUserCoupon(owned);
        if (!response.isUsable()) throw new BusinessException(response.getUnavailableReason());
        Long applicableCourseId = response.getApplicableCourseId();
        if (applicableCourseId != null && (courseIds == null || !courseIds.contains(applicableCourseId))) {
            throw new BusinessException("Voucher không áp dụng cho các khóa học đã chọn.");
        }
        return response;
    }

    /** Chuyển quyền voucher sang DTO và giải thích lý do không thể sử dụng. */
    private UserCouponResponse mapUserCoupon(UserCouponEntity owned) {
        CouponEntity coupon = owned.getCouponEntity();
        LocalDateTime now = LocalDateTime.now();
        String reason = null;
        if (owned.getStatus() != UserCouponStatusEnum.AVAILABLE) reason = "Voucher hiện không khả dụng.";
        else if (coupon.getStatus() != CouponStatusEnum.ACTIVE) reason = "Voucher đã bị vô hiệu hóa.";
        else if (coupon.getValidFrom() != null && now.isBefore(coupon.getValidFrom())) reason = "Voucher chưa đến thời gian sử dụng.";
        else if (coupon.getValidTo() != null && now.isAfter(coupon.getValidTo())) reason = "Voucher đã hết hạn.";
        else if (coupon.getMaxUsage() != null && coupon.getUsedCount() >= coupon.getMaxUsage()) reason = "Voucher đã hết lượt sử dụng.";
        return UserCouponResponse.builder().id(owned.getId()).couponId(coupon.getId()).code(coupon.getCode())
                .discountType(coupon.getDiscountType()).discountValue(coupon.getDiscountValue())
                .applicableCourseId(coupon.getApplicableCourseEntity() != null ? coupon.getApplicableCourseEntity().getId() : null)
                .applicableCourseName(coupon.getApplicableCourseEntity() != null ? coupon.getApplicableCourseEntity().getName() : null)
                .validFrom(coupon.getValidFrom()).validTo(coupon.getValidTo()).status(owned.getStatus())
                .usable(reason == null).unavailableReason(reason).build();
    }
}
