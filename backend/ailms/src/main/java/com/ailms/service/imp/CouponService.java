package com.ailms.service.imp;

import com.ailms.entity.CourseEntity;
import com.ailms.entity.CouponEntity;
import com.ailms.entity.UserCouponEntity;
import com.ailms.entity.UserEntity;
import com.ailms.entity.enums.CouponStatusEnum;
import com.ailms.entity.enums.CouponDistributionScopeEnum;
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
import java.util.LinkedHashSet;
import java.util.Optional;


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
        return couponRepository.findAll().stream().map(this::toResponse).toList();
    }

    @Override
    public CouponResponse getById(Long id) {
        log.info("Getting coupon by id: {}", id);
        CouponEntity entity = couponRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of(RESOURCE_NAME, id));
        return toResponse(entity);
    }

    @Override
    public CouponResponse getByCode(String code) {
        log.info("Getting coupon by code: {}", code);
        CouponEntity entity = couponRepository.findByCode(code)
                .orElseThrow(() -> new BusinessException("Coupon not found: " + code));
        return toResponse(entity);
    }

    @Override
    @Transactional
    public CouponResponse create(com.ailms.request.CouponRequest request) {
        log.info("Creating coupon with code: {}", request.getCode());
        if (couponRepository.findByCode(request.getCode()).isPresent()) {
            throw new BusinessException("Coupon code already exists: " + request.getCode());
        }

        CouponEntity entity = couponMapper.toEntity(request);
        applyCourses(request, entity);

        if (entity.getDistributionScope() == null) entity.setDistributionScope(CouponDistributionScopeEnum.NONE);
        CouponEntity saved = couponRepository.save(entity);
        return toResponse(saved);
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

        applyCourses(request, existing);

        CouponEntity updated = couponRepository.save(existing);
        return toResponse(updated);
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

        if (!entity.getApplicableCourseEntities().isEmpty() && courseId != null) {
            if (entity.getApplicableCourseEntities().stream().noneMatch(course -> course.getId().equals(courseId))) {
                throw new BusinessException("Coupon is not applicable to this course");
            }
        }

        return toResponse(entity);
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
        coupon.setDistributionScope(CouponDistributionScopeEnum.SELECTED_STUDENTS);
        return mapUserCoupon(userCouponRepository.save(UserCouponEntity.builder()
                .userEntity(user).couponEntity(coupon).status(UserCouponStatusEnum.AVAILABLE).build()));
    }

    /** Cấp voucher cho toàn bộ học viên đang hoạt động, không tạo bản ghi trùng. */
    @Override
    @Transactional
    public int assignToAllStudents(Long couponId) {
        CouponEntity coupon = couponRepository.findById(couponId)
                .orElseThrow(() -> ResourceNotFoundException.of(RESOURCE_NAME, couponId));
        int assignedCount = 0;
        coupon.setDistributionScope(CouponDistributionScopeEnum.ALL_STUDENTS);
        for (UserEntity student : userRepository.findUsersByRoleName("STUDENT", com.ailms.entity.enums.UserStatusEnum.DELETED)) {
            if (!userCouponRepository.existsByUserEntity_IdAndCouponEntity_Id(student.getId(), couponId)) {
                userCouponRepository.save(UserCouponEntity.builder()
                        .userEntity(student).couponEntity(coupon).status(UserCouponStatusEnum.AVAILABLE).build());
                assignedCount++;
            }
        }
        return assignedCount;
    }

    /** Cấp voucher cho nhiều học viên hợp lệ và cập nhật phạm vi phát riêng. */
    @Override
    @Transactional
    public int assignToUsers(Long couponId, List<Long> userIds) {
        CouponEntity coupon = couponRepository.findById(couponId)
                .orElseThrow(() -> ResourceNotFoundException.of(RESOURCE_NAME, couponId));
        if (userIds == null || userIds.isEmpty()) throw new BusinessException("Phải chọn ít nhất một học viên.");
        int assignedCount = 0;
        for (UserEntity user : userRepository.findAllById(userIds.stream().distinct().toList())) {
            if (!userCouponRepository.existsByUserEntity_IdAndCouponEntity_Id(user.getId(), couponId)) {
                userCouponRepository.save(UserCouponEntity.builder().userEntity(user).couponEntity(coupon)
                        .status(UserCouponStatusEnum.AVAILABLE).build());
                assignedCount++;
            }
        }
        coupon.setDistributionScope(CouponDistributionScopeEnum.SELECTED_STUDENTS);
        return assignedCount;
    }

    /** Lấy danh sách voucher được cấp và tự động đồng bộ voucher toàn hệ thống cho học viên. */
    @Override
    @Transactional
    public List<UserCouponResponse> getUserCoupons(Long userId) {
        syncGlobalCouponsForUser(userId);
        return userCouponRepository.findByUserEntity_IdOrderByCreatedAtDesc(userId).stream()
                .map(this::mapUserCoupon).toList();
    }

    /** Tự động đồng bộ các coupon toàn hệ thống ALL_STUDENTS còn hoạt động cho học viên. */
    private void syncGlobalCouponsForUser(Long userId) {
        List<CouponEntity> globalCoupons = couponRepository.findAll().stream()
                .filter(c -> c.getStatus() == CouponStatusEnum.ACTIVE
                        && c.getDistributionScope() == CouponDistributionScopeEnum.ALL_STUDENTS)
                .toList();
        for (CouponEntity global : globalCoupons) {
            if (!userCouponRepository.existsByUserEntity_IdAndCouponEntity_Id(userId, global.getId())) {
                UserEntity student = userRepository.findById(userId).orElse(null);
                if (student != null) {
                    userCouponRepository.save(UserCouponEntity.builder()
                            .userEntity(student)
                            .couponEntity(global)
                            .status(UserCouponStatusEnum.AVAILABLE)
                            .build());
                }
            }
        }
    }

    /** Kiểm tra voucher thuộc đúng học viên, còn hạn và áp dụng được cho ít nhất một khóa học. */
    @Override
    @Transactional
    public UserCouponResponse validateUserCoupon(Long userId, String code, List<Long> courseIds) {
        if (code == null || code.isBlank()) {
            throw new BusinessException("Mã voucher không được để trống.");
        }
        String cleanCode = code.trim();
        Optional<UserCouponEntity> ownedOpt = userCouponRepository.findByUserEntity_IdOrderByCreatedAtDesc(userId).stream()
                .filter(item -> item.getCouponEntity().getCode().equalsIgnoreCase(cleanCode))
                .findFirst();
        UserCouponEntity owned;
        if (ownedOpt.isPresent()) {
            owned = ownedOpt.get();
        } else {
            CouponEntity globalCoupon = couponRepository.findByCode(cleanCode)
                    .orElseThrow(() -> new BusinessException("Mã voucher không tồn tại."));
            if (globalCoupon.getDistributionScope() == CouponDistributionScopeEnum.ALL_STUDENTS) {
                UserEntity student = userRepository.findById(userId)
                        .orElseThrow(() -> ResourceNotFoundException.of("User", userId));
                owned = userCouponRepository.save(UserCouponEntity.builder()
                        .userEntity(student)
                        .couponEntity(globalCoupon)
                        .status(UserCouponStatusEnum.AVAILABLE)
                        .build());
            } else {
                throw new BusinessException("Voucher không thuộc tài khoản của bạn.");
            }
        }
        UserCouponResponse response = mapUserCoupon(owned);
        if (!response.isUsable()) throw new BusinessException(response.getUnavailableReason());
        if (response.getApplicableCourseIds() != null && !response.getApplicableCourseIds().isEmpty()
                && (courseIds == null || response.getApplicableCourseIds().stream().noneMatch(courseIds::contains))) {
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
                .applicableCourseIds(coupon.getApplicableCourseEntities().stream().map(CourseEntity::getId).toList())
                .applicableCourseNames(coupon.getApplicableCourseEntities().stream().map(CourseEntity::getName).toList())
                .validFrom(coupon.getValidFrom()).validTo(coupon.getValidTo()).status(owned.getStatus())
                .usable(reason == null).unavailableReason(reason).build();
    }

    /** Ánh xạ coupon trong transaction để dữ liệu khóa học n-n được khởi tạo đầy đủ. */
    private CouponResponse toResponse(CouponEntity entity) {
        return couponMapper.toResponse(entity);
    }

    /** Gán danh sách khóa học mới, đồng thời giữ cột đơn cũ tương thích ngược. */
    private void applyCourses(com.ailms.request.CouponRequest request, CouponEntity entity) {
        List<Long> ids = request.getApplicableCourseIds();
        if (ids == null) ids = request.getApplicableCourseId() == null ? List.of() : List.of(request.getApplicableCourseId());
        var courses = new LinkedHashSet<>(courseRepository.findAllById(ids));
        if (courses.size() != ids.stream().distinct().count()) throw new ResourceNotFoundException("Course not found");
        entity.setApplicableCourseEntities(courses);
        entity.setApplicableCourseEntity(courses.stream().findFirst().orElse(null));
    }
}
