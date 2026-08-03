package com.ailms.service.imp;

import com.ailms.entity.*;
import com.ailms.entity.enums.*;
import com.ailms.event.AuditLogEvent;
import com.ailms.mapper.PaymentTransactionMapper;
import com.ailms.mapper.OrderMapper;
import com.ailms.exception.BusinessException;
import com.ailms.exception.ResourceNotFoundException;
import com.ailms.repository.*;
import com.ailms.request.CheckoutItemRequest;
import com.ailms.request.CheckoutRequest;
import com.ailms.request.RefundRequest;
import com.ailms.response.OrderResponse;
import com.ailms.response.PaymentTransactionResponse;
import com.ailms.service.IEmailService;
import com.ailms.service.IOrderService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@Slf4j
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class OrderService implements IOrderService {

    private final UserRepository userRepository;
    private final OrderRepository orderRepository;
    private final CoursePackageRepository coursePackageRepository;
    private final PaymentTransactionRepository paymentTransactionRepository;
    private final CouponRepository couponRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final EnrollmentPackageRepository enrollmentPackageRepository;
    private final CartItemRepository cartItemRepository;
    private final IEmailService emailService;
    private final ApplicationEventPublisher applicationEventPublisher;
    private final PaymentTransactionMapper paymentTransactionMapper;
    private final OrderMapper orderMapper;

    private static final String RESOURCE_NAME = "Order";
    private static final int REFUND_POLICY_DAYS = 7;

    @Override
    @Transactional
    public OrderResponse createOrder(CheckoutRequest request) {
        log.info("Creating order for user {}", request.getUserId());
        UserEntity user = userRepository.findById(request.getUserId())
                .orElseThrow(() -> ResourceNotFoundException.of("User", request.getUserId()));

        BigDecimal totalAmount = BigDecimal.ZERO;
        List<OrderItemEntity> items = new ArrayList<>();

        OrderEntity order = OrderEntity.builder()
                .userEntity(user)
                .status(OrderStatusEnum.PENDING)
                .couponCode(request.getCouponCode())
                .expiredAt(LocalDateTime.now().plusHours(24))
                .build();

        Long courseIdForCoupon = null;

        for (CheckoutItemRequest itemReq : request.getItems()) {
            CoursePackageEntity pkg = coursePackageRepository.findById(itemReq.getCoursePackageId())
                    .orElseThrow(() -> ResourceNotFoundException.of("CoursePackage", itemReq.getCoursePackageId()));

            if (pkg.getStatus() != CoursePackageStatusEnum.ACTIVE) {
                throw new BusinessException("Course package is not active: " + pkg.getName());
            }

            courseIdForCoupon = pkg.getCourseEntity().getId();
            BigDecimal price = pkg.getPrice();
            totalAmount = totalAmount.add(price);

            EnrollmentEntity relatedEnrollment = null;
            if (itemReq.getItemType() == OrderItemTypeEnum.UPGRADE || itemReq.getItemType() == OrderItemTypeEnum.RENEWAL) {
                if (itemReq.getRelatedEnrollmentId() == null) {
                    throw new BusinessException("relatedEnrollmentId is required for UPGRADE or RENEWAL");
                }
                relatedEnrollment = enrollmentRepository.findById(itemReq.getRelatedEnrollmentId())
                        .orElseThrow(() -> ResourceNotFoundException.of("Enrollment", itemReq.getRelatedEnrollmentId()));

                if (!relatedEnrollment.getUserEntity().getId().equals(request.getUserId())) {
                    throw new BusinessException("Enrollment does not belong to the checkout user");
                }
            }

            OrderItemEntity item = OrderItemEntity.builder()
                    .orderEntity(order)
                    .coursePackageEntity(pkg)
                    .priceSnapshot(price)
                    .itemType(itemReq.getItemType())
                    .relatedEnrollment(relatedEnrollment)
                    .build();

            items.add(item);
        }

        BigDecimal discountAmount = BigDecimal.ZERO;
        if (request.getCouponCode() != null && !request.getCouponCode().trim().isEmpty()) {
            CouponEntity coupon = couponRepository.findByCode(request.getCouponCode())
                    .orElseThrow(() -> new BusinessException("Coupon not found: " + request.getCouponCode()));

            // Validate coupon basic rules
            if (coupon.getStatus() != CouponStatusEnum.ACTIVE) {
                throw new BusinessException("Coupon is inactive");
            }
            LocalDateTime now = LocalDateTime.now();
            if (coupon.getValidFrom() != null && now.isBefore(coupon.getValidFrom())) {
                throw new BusinessException("Coupon is not active yet");
            }
            if (coupon.getValidTo() != null && now.isAfter(coupon.getValidTo())) {
                throw new BusinessException("Coupon has expired");
            }
            if (coupon.getMaxUsage() != null && coupon.getUsedCount() >= coupon.getMaxUsage()) {
                throw new BusinessException("Coupon usage limit reached");
            }
            if (coupon.getApplicableCourseEntity() != null && courseIdForCoupon != null) {
                if (!coupon.getApplicableCourseEntity().getId().equals(courseIdForCoupon)) {
                    throw new BusinessException("Coupon is not applicable to the selected course");
                }
            }

            // Calculate discount
            if (coupon.getDiscountType() == CouponDiscountTypeEnum.PERCENT) {
                discountAmount = totalAmount.multiply(coupon.getDiscountValue())
                        .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
            } else if (coupon.getDiscountType() == CouponDiscountTypeEnum.FIXED) {
                discountAmount = coupon.getDiscountValue();
            }

            if (discountAmount.compareTo(totalAmount) > 0) {
                discountAmount = totalAmount;
            }
        }

        BigDecimal finalAmount = totalAmount.subtract(discountAmount);
        order.setTotalAmount(totalAmount);
        order.setDiscountAmount(discountAmount);
        order.setFinalAmount(finalAmount);
        order.setItems(items);

        OrderEntity savedOrder = orderRepository.save(order);
        applicationEventPublisher.publishEvent(new AuditLogEvent(this, "CREATE_ORDER", "ORDER", savedOrder.getId(), null, savedOrder));
        return orderMapper.toResponse(savedOrder);
    }

    @Override
    @Transactional
    public PaymentTransactionResponse initiatePayment(Long orderId, String paymentMethod) {
        log.info("Initiating payment for order {} via {}", orderId, paymentMethod);
        OrderEntity order = orderRepository.findById(orderId)
                .orElseThrow(() -> ResourceNotFoundException.of("Order", orderId));

        if (order.getStatus() != OrderStatusEnum.PENDING) {
            throw new BusinessException("Order status must be PENDING to initiate payment");
        }

        PaymentTransactionEntity transaction = PaymentTransactionEntity.builder()
                .orderEntity(order)
                .paymentMethod(paymentMethod)
                .amount(order.getFinalAmount())
                .status(PaymentTransactionStatusEnum.PENDING)
                .transactionRef("TXN-" + UUID.randomUUID().toString().replace("-", "").toUpperCase().substring(0, 12))
                .build();

        PaymentTransactionEntity saved = paymentTransactionRepository.save(transaction);
        return paymentTransactionMapper.toResponse(saved);
    }

    @Override
    @Transactional
    public OrderResponse handlePaymentCallback(String transactionRef, boolean success) {
        log.info("Handling payment callback for transaction {}. Success: {}", transactionRef, success);
        PaymentTransactionEntity transaction = paymentTransactionRepository.findByTransactionRef(transactionRef)
                .orElseThrow(() -> new BusinessException("Transaction ref not found: " + transactionRef));

        // 8.8 Idempotency check: if transaction already processed as SUCCESS, return without re-processing!
        if (transaction.getStatus() == PaymentTransactionStatusEnum.SUCCESS) {
            log.warn("Transaction {} is already SUCCESS (Idempotent webhook call). Skipping duplicate processing.", transactionRef);
            return orderMapper.toResponse(transaction.getOrderEntity());
        }

        OrderEntity order = transaction.getOrderEntity();

        if (success) {
            transaction.setStatus(PaymentTransactionStatusEnum.SUCCESS);
            transaction.setPaidAt(LocalDateTime.now());
            paymentTransactionRepository.save(transaction);

            // Mark the order as PAID.
            OrderStatusEnum oldStatus = order.getStatus();
            if (oldStatus.canTransitionTo(OrderStatusEnum.PAID)) {
                order.setStatus(OrderStatusEnum.PAID);
                order.setPaidAt(LocalDateTime.now());
                orderRepository.save(order);

                // Increment coupon used count if any
                if (order.getCouponCode() != null) {
                    couponRepository.findByCode(order.getCouponCode()).ifPresent(coupon -> {
                        coupon.setUsedCount(coupon.getUsedCount() + 1);
                        couponRepository.save(coupon);
                    });
                }

                // 8.5 Remove purchased items from user's shopping cart
                List<Long> purchasedPkgIds = order.getItems().stream()
                        .map(i -> i.getCoursePackageEntity().getId())
                        .collect(Collectors.toList());
                cartItemRepository.deleteByUserEntity_IdAndCoursePackageEntity_IdIn(order.getUserEntity().getId(), purchasedPkgIds);

                // Provision package access / enrollments
                for (OrderItemEntity item : order.getItems()) {
                    CoursePackageEntity pkg = item.getCoursePackageEntity();
                    EnrollmentEntity enrollment;

                    if (item.getItemType() == OrderItemTypeEnum.NEW_PURCHASE) {
                        enrollment = enrollmentRepository.findByUserEntity_IdAndCourseEntity_Id(
                                order.getUserEntity().getId(), pkg.getCourseEntity().getId())
                                .orElseGet(() -> {
                            byte initStatus = (pkg.getDeliveryMode() == DeliveryModeEnum.SELF_STUDY) ? (byte) 1 : (byte) 0;
                            EnrollmentEntity newEnrollment = EnrollmentEntity.builder()
                                    .userEntity(order.getUserEntity())
                                    .courseEntity(pkg.getCourseEntity())
                                    .status(initStatus)
                                    .enrolledAt(LocalDateTime.now())
                                    .build();
                            return enrollmentRepository.save(newEnrollment);
                        });
                    } else {
                        enrollment = item.getRelatedEnrollment();
                    }

                    // 8.6 Package Renewal/Upgrade duration chaining
                    LocalDateTime activatedAt = LocalDateTime.now();
                    int durationDays = pkg.getDurationDays() != null ? pkg.getDurationDays() : 30;

                    if (item.getItemType() == OrderItemTypeEnum.RENEWAL) {
                        List<EnrollmentPackageEntity> activePackages = enrollmentPackageRepository.findByEnrollmentEntity_Id(enrollment.getId());
                        Optional<EnrollmentPackageEntity> lastActivePackage = activePackages.stream()
                                .filter(ep -> ep.getExpiresAt() != null && ep.getExpiresAt().isAfter(LocalDateTime.now()))
                                .max(Comparator.comparing(EnrollmentPackageEntity::getExpiresAt));
                        activatedAt = lastActivePackage
                                .map(EnrollmentPackageEntity::getExpiresAt)
                                .orElse(activatedAt);
                    }
                    LocalDateTime expiresAt = activatedAt.plusDays(durationDays);

                    EnrollmentPackageEntity enrollPkg = EnrollmentPackageEntity.builder()
                            .enrollmentEntity(enrollment)
                            .coursePackageEntity(pkg)
                            .orderItemEntity(item)
                            .activatedAt(activatedAt)
                            .expiresAt(expiresAt)
                            .build();

                    enrollmentPackageRepository.save(enrollPkg);
                }

                // Send invoice & confirmation email
                if (order.getUserEntity().getEmail() != null) {
                    try {
                        emailService.sendInviteEmail(order.getUserEntity().getEmail(),
                                "Order #" + order.getId() + " confirmed! Total Paid: " + order.getFinalAmount() + " VND");
                    } catch (Exception e) {
                        log.error("Failed to send order invoice email", e);
                    }
                }

                applicationEventPublisher.publishEvent(new AuditLogEvent(this, "ORDER_PAID", "ORDER", order.getId(), null, order));
            }
        } else {
            transaction.setStatus(PaymentTransactionStatusEnum.FAILED);
            paymentTransactionRepository.save(transaction);
        }

        return orderMapper.toResponse(order);
    }

    @Transactional
    @Override
    public OrderResponse refundOrder(Long orderId, RefundRequest request) {
        log.info("Processing refund for order: {}, reason: {}", orderId, request.getReason());

        OrderEntity order = orderRepository.findById(orderId)
                .orElseThrow(() -> ResourceNotFoundException.of(RESOURCE_NAME, orderId));

        if (order.getStatus() != OrderStatusEnum.PAID) {
            throw new BusinessException("Only PAID orders can be refunded.");
        }

        // 8.3 Validate refund policy (e.g. within 7 days of payment)
        if (order.getPaidAt() != null) {
            long daysSincePaid = Duration.between(order.getPaidAt(), LocalDateTime.now()).toDays();
            if (daysSincePaid > REFUND_POLICY_DAYS) {
                throw new BusinessException("Refund window expired (Policy limit: " + REFUND_POLICY_DAYS + " days).");
            }
        }

        order.setStatus(OrderStatusEnum.REFUNDED);
        orderRepository.save(order);

        // Terminate related enrollment packages & check enrollment status
        for (OrderItemEntity item : order.getItems()) {
            List<EnrollmentPackageEntity> packages = enrollmentPackageRepository.findByEnrollmentEntity_Id(
                    item.getRelatedEnrollment() != null ? item.getRelatedEnrollment().getId() : 0L
            );

            for (EnrollmentPackageEntity ep : packages) {
                if (ep.getOrderItemEntity() != null && ep.getOrderItemEntity().getId().equals(item.getId())) {
                    ep.setExpiresAt(LocalDateTime.now());
                    enrollmentPackageRepository.save(ep);
                }
            }

            if (item.getRelatedEnrollment() != null) {
                EnrollmentEntity enrollment = item.getRelatedEnrollment();
                boolean hasOtherActive = enrollmentPackageRepository.findByEnrollmentEntity_Id(enrollment.getId()).stream()
                        .anyMatch(ep -> ep.getExpiresAt() != null && ep.getExpiresAt().isAfter(LocalDateTime.now()));

                if (!hasOtherActive) {
                    enrollment.setStatus((byte) 0); // DROPPED / INACTIVE
                    enrollmentRepository.save(enrollment);
                }
            }
        }

        applicationEventPublisher.publishEvent(new AuditLogEvent(this, "ORDER_REFUNDED", "ORDER", orderId, null, order));
        return orderMapper.toResponse(order);
    }

    @Override
    public OrderResponse getOrderById(Long orderId) {
        OrderEntity order = orderRepository.findById(orderId)
                .orElseThrow(() -> ResourceNotFoundException.of("Order", orderId));
        return orderMapper.toResponse(order);
    }

    @Override
    public List<OrderResponse> getOrdersByUserId(Long userId) {
        return orderMapper.toResponseList(orderRepository.findByUserEntity_Id(userId));
    }

    @Override
    public List<OrderResponse> getAllOrders() {
        return orderMapper.toResponseList(orderRepository.findAll());
    }

    @Override
    @Transactional
    public OrderResponse cancelOrder(Long orderId, String reason) {
        log.info("Cancelling order {} with reason: {}", orderId, reason);
        OrderEntity order = orderRepository.findById(orderId)
                .orElseThrow(() -> ResourceNotFoundException.of("Order", orderId));

        if (order.getStatus() != OrderStatusEnum.PENDING) {
            throw new BusinessException("Only PENDING orders can be cancelled");
        }

        order.setStatus(OrderStatusEnum.CANCELLED);
        orderRepository.save(order);

        applicationEventPublisher.publishEvent(new AuditLogEvent(this, "CANCEL_ORDER", "ORDER", orderId, null, order));
        return orderMapper.toResponse(order);
    }

    @Override
    @Transactional
    public void cancelExpiredOrders() {
        log.info("Checking for expired pending orders");
        List<OrderEntity> pendingOrders = orderRepository.findByStatus(OrderStatusEnum.PENDING);
        LocalDateTime now = LocalDateTime.now();

        for (OrderEntity order : pendingOrders) {
            if (order.getExpiredAt() != null && now.isAfter(order.getExpiredAt())) {
                log.info("Cancelling expired order {}", order.getId());
                order.setStatus(OrderStatusEnum.EXPIRED);
                orderRepository.save(order);

                // Revert coupon usage count
                if (order.getCouponCode() != null) {
                    couponRepository.findByCode(order.getCouponCode()).ifPresent(coupon -> {
                        coupon.setUsedCount(Math.max(0, coupon.getUsedCount() - 1));
                        couponRepository.save(coupon);
                    });
                }
            }
        }
    }

}
