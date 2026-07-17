package com.ailms.service.imp;

import com.ailms.entity.*;
import com.ailms.entity.enums.*;
import com.ailms.exception.BusinessException;
import com.ailms.exception.ResourceNotFoundException;
import com.ailms.repository.*;
import com.ailms.request.CheckoutItemRequest;
import com.ailms.request.CheckoutRequest;
import com.ailms.response.OrderItemResponse;
import com.ailms.response.OrderResponse;
import com.ailms.response.PaymentTransactionResponse;
import com.ailms.service.IOrderService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
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
    private final OrderItemRepository orderItemRepository;
    private final CoursePackageRepository coursePackageRepository;
    private final PaymentTransactionRepository paymentTransactionRepository;
    private final CouponRepository couponRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final EnrollmentPackageRepository enrollmentPackageRepository;

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
                discountAmount = totalAmount.multiply(coupon.getDiscountValue()).divide(BigDecimal.valueOf(100));
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
        return mapToOrderResponse(savedOrder);
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
        return mapToTransactionResponse(saved);
    }

    @Override
    @Transactional
    public OrderResponse handlePaymentCallback(String transactionRef, boolean success) {
        log.info("Handling payment callback for transaction {}. Success: {}", transactionRef, success);
        PaymentTransactionEntity transaction = paymentTransactionRepository.findByTransactionRef(transactionRef)
                .orElseThrow(() -> new BusinessException("Transaction ref not found: " + transactionRef));

        if (transaction.getStatus() != PaymentTransactionStatusEnum.PENDING) {
            throw new BusinessException("Transaction is already processed");
        }

        OrderEntity order = transaction.getOrderEntity();

        if (success) {
            transaction.setStatus(PaymentTransactionStatusEnum.SUCCESS);
            transaction.setPaidAt(LocalDateTime.now());
            paymentTransactionRepository.save(transaction);

            // Update order to PAID
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

                // Provision package access / enrollments
                for (OrderItemEntity item : order.getItems()) {
                    CoursePackageEntity pkg = item.getCoursePackageEntity();
                    EnrollmentEntity enrollment;

                    if (item.getItemType() == OrderItemTypeEnum.NEW_PURCHASE) {
                        // Check if already enrolled in this course
                        Optional<EnrollmentEntity> existing = enrollmentRepository.findByUserEntity_IdAndCourseEntity_Id(
                                order.getUserEntity().getId(), pkg.getCourseEntity().getId()
                        );

                        if (existing.isPresent()) {
                            enrollment = existing.get();
                        } else {
                            byte initStatus = (pkg.getDeliveryMode() == DeliveryModeEnum.SELF_STUDY) ? (byte) 1 : (byte) 0;
                            enrollment = EnrollmentEntity.builder()
                                    .userEntity(order.getUserEntity())
                                    .courseEntity(pkg.getCourseEntity())
                                    .status(initStatus)
                                    .enrolledAt(LocalDateTime.now())
                                    .build();
                            enrollment = enrollmentRepository.save(enrollment);
                        }
                    } else {
                        enrollment = item.getRelatedEnrollment();
                    }

                    // Create EnrollmentPackageEntity
                    EnrollmentPackageEntity enrollPkg = EnrollmentPackageEntity.builder()
                            .enrollmentEntity(enrollment)
                            .coursePackageEntity(pkg)
                            .orderItemEntity(item)
                            .activatedAt(LocalDateTime.now())
                            .expiresAt(pkg.getDurationDays() != null ? LocalDateTime.now().plusDays(pkg.getDurationDays()) : null)
                            .build();

                    enrollmentPackageRepository.save(enrollPkg);
                }
            }
        } else {
            transaction.setStatus(PaymentTransactionStatusEnum.FAILED);
            paymentTransactionRepository.save(transaction);
            // Leave order as PENDING so user can retry payment
        }

        return mapToOrderResponse(order);
    }

    @Override
    public OrderResponse getOrderById(Long orderId) {
        OrderEntity order = orderRepository.findById(orderId)
                .orElseThrow(() -> ResourceNotFoundException.of("Order", orderId));
        return mapToOrderResponse(order);
    }

    @Override
    public List<OrderResponse> getOrdersByUserId(Long userId) {
        return orderRepository.findByUserEntity_Id(userId).stream()
                .map(this::mapToOrderResponse)
                .collect(Collectors.toList());
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
                order.setStatus(OrderStatusEnum.CANCELLED);
                orderRepository.save(order);
            }
        }
    }

    private OrderResponse mapToOrderResponse(OrderEntity order) {
        List<OrderItemResponse> itemResponses = order.getItems().stream()
                .map(item -> OrderItemResponse.builder()
                        .id(item.getId())
                        .coursePackageId(item.getCoursePackageEntity().getId())
                        .coursePackageName(item.getCoursePackageEntity().getName())
                        .priceSnapshot(item.getPriceSnapshot())
                        .itemType(item.getItemType())
                        .relatedEnrollmentId(item.getRelatedEnrollment() != null ? item.getRelatedEnrollment().getId() : null)
                        .build())
                .collect(Collectors.toList());

        return OrderResponse.builder()
                .id(order.getId())
                .userId(order.getUserEntity().getId())
                .userName(order.getUserEntity().getUsername())
                .status(order.getStatus())
                .totalAmount(order.getTotalAmount())
                .discountAmount(order.getDiscountAmount())
                .finalAmount(order.getFinalAmount())
                .couponCode(order.getCouponCode())
                .expiredAt(order.getExpiredAt())
                .paidAt(order.getPaidAt())
                .createdAt(order.getCreatedAt())
                .items(itemResponses)
                .build();
    }

    private PaymentTransactionResponse mapToTransactionResponse(PaymentTransactionEntity tx) {
        return PaymentTransactionResponse.builder()
                .id(tx.getId())
                .orderId(tx.getOrderEntity().getId())
                .paymentMethod(tx.getPaymentMethod())
                .amount(tx.getAmount())
                .status(tx.getStatus())
                .transactionRef(tx.getTransactionRef())
                .paidAt(tx.getPaidAt())
                .createdAt(tx.getCreatedAt())
                .build();
    }
}
