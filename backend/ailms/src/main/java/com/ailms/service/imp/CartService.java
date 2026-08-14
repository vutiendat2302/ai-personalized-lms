package com.ailms.service.imp;

import com.ailms.entity.CartItemEntity;
import com.ailms.entity.CoursePackageEntity;
import com.ailms.entity.UserEntity;
import com.ailms.entity.enums.CoursePackageStatusEnum;
import com.ailms.entity.enums.DeliveryModeEnum;
import com.ailms.entity.enums.BaseStatusEnum;
import com.ailms.entity.enums.ClassMemberRole;
import com.ailms.entity.enums.ClassMemberStatusEnum;
import com.ailms.event.AuditLogEvent;
import com.ailms.exception.BusinessException;
import com.ailms.exception.DuplicateResourceException;
import com.ailms.exception.ResourceNotFoundException;
import com.ailms.mapper.CartMapper;
import com.ailms.repository.CartItemRepository;
import com.ailms.repository.CoursePackageRepository;
import com.ailms.repository.UserRepository;
import com.ailms.repository.CourseRepository;
import com.ailms.repository.EnrollmentPackageRepository;
import com.ailms.repository.OrderItemRepository;
import com.ailms.repository.ClassMemberRepository;
import com.ailms.request.OneOnOneNeedsRequest;
import com.ailms.response.CartItemResponse;
import com.ailms.service.ICartService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.time.LocalDateTime;
import tools.jackson.databind.ObjectMapper;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class CartService implements ICartService {

    private final CartItemRepository cartItemRepository;
    private final UserRepository userRepository;
    private final CoursePackageRepository coursePackageRepository;
    private final CourseRepository courseRepository;
    private final EnrollmentPackageRepository enrollmentPackageRepository;
    private final OrderItemRepository orderItemRepository;
    private final ClassMemberRepository classMemberRepository;
    private final CartMapper cartMapper;
    private final ApplicationEventPublisher applicationEventPublisher;
    private final ObjectMapper objectMapper;

    private static final String RESOURCE_NAME = "CartItem";

    @Transactional
    @Override
    public CartItemResponse addToCart(Long userId, Long coursePackageId, OneOnOneNeedsRequest needs) {
        log.info("Adding package {} to cart for user {}", coursePackageId, userId);

        UserEntity user = userRepository.findById(userId)
                .orElseThrow(() -> ResourceNotFoundException.of("User", userId));

        CoursePackageEntity pkg = coursePackageRepository.findById(coursePackageId)
                .orElseThrow(() -> ResourceNotFoundException.of("CoursePackage", coursePackageId));

        if (pkg.getStatus() != CoursePackageStatusEnum.ACTIVE) {
            throw new BusinessException("Cannot add inactive course package to cart: " + pkg.getName());
        }
        if (pkg.getCourseEntity() == null || !courseRepository.isPubliclySellable(pkg.getCourseEntity().getId())) {
            throw new BusinessException("Khóa học của gói hiện không được mở bán.");
        }
        if (enrollmentPackageRepository.existsActiveOwnedPackage(userId, coursePackageId, LocalDateTime.now())) {
            throw new BusinessException("Bạn đang sở hữu gói học này.");
        }
        if (orderItemRepository.existsActivePendingCheckout(userId, coursePackageId, LocalDateTime.now())) {
            throw new BusinessException("Gói học đang có giao dịch chờ thanh toán.");
        }
        validateNeeds(pkg, needs);
        validatePackageAvailability(pkg);

        Optional<CartItemEntity> existingItem = cartItemRepository
                .findByUserEntity_IdAndCoursePackageEntity_Id(userId, coursePackageId);
        if (existingItem.isPresent()) {
            if (!requiresTutorNeeds(pkg)) {
                throw new DuplicateResourceException("Item already in cart: " + coursePackageId);
            }
            CartItemEntity existing = existingItem.get();
            CartItemResponse oldValue = cartMapper.toResponse(existing);
            existing.setOneOnOneNeeds(serializeNeeds(needs));
            CartItemEntity saved = cartItemRepository.save(existing);
            applicationEventPublisher.publishEvent(new AuditLogEvent(
                    this, "UPDATE_CART_TUTOR_NEEDS", "CART_ITEM", saved.getId(), oldValue, cartMapper.toResponse(saved)));
            return cartMapper.toResponse(saved);
        }

        CartItemEntity cartItem = CartItemEntity.builder()
                .userEntity(user)
                .coursePackageEntity(pkg)
                .oneOnOneNeeds(serializeNeeds(needs))
                .build();

        CartItemEntity saved = cartItemRepository.save(cartItem);
        applicationEventPublisher.publishEvent(new AuditLogEvent(this, "ADD_TO_CART", "CART_ITEM", saved.getId(), null, saved));
        return cartMapper.toResponse(saved);
    }

    /** Kiểm tra nhu cầu bắt buộc cho gói 1-1 và COMBO có buổi gia sư. */
    private void validateNeeds(CoursePackageEntity pkg, OneOnOneNeedsRequest needs) {
        boolean needsTutorRequest = requiresTutorNeeds(pkg);
        if (needsTutorRequest && needs == null) {
            throw new BusinessException("Vui lòng nhập nhu cầu học tập cho gói có buổi gia sư.");
        }
        if (!needsTutorRequest && needs != null) {
            throw new BusinessException("Chỉ gói có buổi gia sư mới nhận nhu cầu học tập.");
        }
    }

    /** Kiểm tra lớp của package còn hoạt động, còn chỗ và còn cho phép ghi danh. */
    private void validatePackageAvailability(CoursePackageEntity pkg) {
        if (!requiresGroupClass(pkg)) return;
        var clazz = pkg.getClassEntity();
        if (clazz == null || clazz.getCourseEntity() == null
                || !clazz.getCourseEntity().getId().equals(pkg.getCourseEntity().getId())) {
            throw new BusinessException("Lớp của gói học không hợp lệ.");
        }
        long currentStudents = classMemberRepository.countById_ClassIdAndStatusAndRoleInClass(
                clazz.getId(), ClassMemberStatusEnum.ACTIVE, ClassMemberRole.STUDENT);
        if (clazz.getStatus() != BaseStatusEnum.ACTIVE || !Boolean.TRUE.equals(clazz.getRegistrationOpen())) {
            throw new BusinessException("Lớp hiện không nhận thêm học viên.");
        }
        if (clazz.getEndDate() != null && LocalDateTime.now().isAfter(clazz.getEndDate())) {
            throw new BusinessException("Lớp học đã kết thúc.");
        }
        if (clazz.getMaxMembers() == null || currentStudents >= clazz.getMaxMembers()) {
            throw new BusinessException("Lớp đã đủ chỗ.");
        }
        if (clazz.getStartDate() != null && LocalDateTime.now().isAfter(clazz.getStartDate())
                && !Boolean.TRUE.equals(clazz.getAllowLateEnrollment())) {
            throw new BusinessException("Lớp đã bắt đầu và không cho đăng ký muộn.");
        }
    }

    /** Xác định package có thành phần lớp nhóm cần kiểm tra lịch và sức chứa. */
    private boolean requiresGroupClass(CoursePackageEntity pkg) {
        return pkg.getDeliveryMode() == DeliveryModeEnum.GROUP_CLASS
                || (pkg.getDeliveryMode() == DeliveryModeEnum.COMBO
                && ((pkg.getMaxGroupSize() != null && pkg.getMaxGroupSize() > 1)
                || pkg.getClassEntity() != null));
    }

    /** Xác định package cần thu thập nhu cầu để tạo yêu cầu tìm gia sư. */
    private boolean requiresTutorNeeds(CoursePackageEntity pkg) {
        return pkg.getDeliveryMode() == DeliveryModeEnum.ONE_ON_ONE
                || (pkg.getDeliveryMode() == DeliveryModeEnum.COMBO
                && pkg.getIncludedTutorSessions() != null && pkg.getIncludedTutorSessions() > 0);
    }

    /** Serialize nhu cầu 1-1 để checkout dùng lại sau khi thanh toán. */
    private String serializeNeeds(OneOnOneNeedsRequest needs) {
        if (needs == null) return null;
        try {
            return objectMapper.writeValueAsString(needs);
        } catch (Exception exception) {
            throw new BusinessException("Không thể lưu bản nháp nhu cầu học tập 1-1.");
        }
    }

    @Override
    public List<CartItemResponse> getCart(Long userId) {
        log.info("Getting cart for user {}", userId);
        LocalDateTime now = LocalDateTime.now();
        return cartItemRepository.findByUserEntity_Id(userId).stream()
                .filter(item -> item.getCoursePackageEntity().getStatus() == CoursePackageStatusEnum.ACTIVE)
                .filter(item -> item.getCoursePackageEntity().getCourseEntity() != null
                        && courseRepository.isPubliclySellable(item.getCoursePackageEntity().getCourseEntity().getId()))
                .filter(item -> !enrollmentPackageRepository.existsActiveOwnedPackage(
                        userId, item.getCoursePackageEntity().getId(), now))
                .filter(item -> !orderItemRepository.existsActivePendingCheckout(
                        userId, item.getCoursePackageEntity().getId(), now))
                .map(cartMapper::toResponse).toList();
    }

    @Transactional
    @Override
    public void removeFromCart(Long userId, Long cartItemId) {
        log.info("Removing item {} from cart for user {}", cartItemId, userId);
        CartItemEntity item = cartItemRepository.findById(cartItemId)
                .orElseThrow(() -> ResourceNotFoundException.of(RESOURCE_NAME, cartItemId));

        if (!item.getUserEntity().getId().equals(userId)) {
            throw new BusinessException("Cart item does not belong to user");
        }

        CartItemResponse oldValue = cartMapper.toResponse(item);
        cartItemRepository.delete(item);
        applicationEventPublisher.publishEvent(new AuditLogEvent(
                this, "REMOVE_FROM_CART", "CART_ITEM", cartItemId, oldValue, null));
    }

    @Transactional
    @Override
    public void clearCart(Long userId) {
        log.info("Clearing cart for user {}", userId);
        List<CartItemResponse> oldItems = cartMapper.toResponseList(cartItemRepository.findByUserEntity_Id(userId));
        cartItemRepository.deleteByUserEntity_Id(userId);
        oldItems.forEach(item -> applicationEventPublisher.publishEvent(new AuditLogEvent(
                this, "CLEAR_CART", "CART_ITEM", item.getId(), item, null)));
    }
}
