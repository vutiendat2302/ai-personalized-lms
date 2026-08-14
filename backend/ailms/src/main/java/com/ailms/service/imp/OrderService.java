package com.ailms.service.imp;

import com.ailms.client.PaypalClient;
import com.ailms.entity.*;
import com.ailms.entity.enums.*;
import com.ailms.event.AuditLogEvent;
import com.ailms.event.OrderInvoiceGenerationEvent;
import com.ailms.exception.BusinessException;
import com.ailms.exception.ForbiddenException;
import com.ailms.exception.ResourceNotFoundException;
import com.ailms.mapper.OrderMapper;
import com.ailms.repository.*;
import com.ailms.request.*;
import com.ailms.response.*;
import com.ailms.service.INotificationService;
import com.ailms.service.IOrderService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.ObjectMapper;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeParseException;
import java.util.*;
import java.util.stream.Collectors;

/** Xử lý checkout PayPal và cấp quyền học idempotent sau khi capture được xác minh. */
@Service
@Slf4j
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class OrderService implements IOrderService {

    private static final int REFUND_POLICY_DAYS = 7;
    private static final String PAYMENT_METHOD_PAYPAL = "PAYPAL";

    private final UserRepository userRepository;
    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
    private final CourseRepository courseRepository;
    private final CoursePackageRepository coursePackageRepository;
    private final PaymentTransactionRepository paymentTransactionRepository;
    private final CouponRepository couponRepository;
    private final UserCouponRepository userCouponRepository;
    private final CartItemRepository cartItemRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final EnrollmentPackageRepository enrollmentPackageRepository;
    private final ClassRepository classRepository;
    private final ClassMemberRepository classMemberRepository;
    private final ClassScheduleRepository classScheduleRepository;
    private final TeacherCategoryRepository teacherCategoryRepository;
    private final OneOnOneRequestRepository oneOnOneRequestRepository;
    private final INotificationService notificationService;
    private final ApplicationEventPublisher eventPublisher;
    private final OrderMapper orderMapper;
    private final ObjectMapper objectMapper;
    private final PaypalClient paypalClient;

    /** Tạo order, order item, transaction PENDING rồi lấy approval URL PayPal Sandbox. */
    @Override
    @Transactional
    public CheckoutPaymentResponse checkout(Long userId, CheckoutRequest request) {
        UserEntity user = userRepository.findByIdForUpdate(userId)
                .orElseThrow(() -> ResourceNotFoundException.of("User", userId));
        List<CheckoutLine> lines = resolveCheckoutLines(request);
        List<CoursePackageEntity> packages = new ArrayList<>();
        Set<Long> uniquePackageIds = new HashSet<>();
        for (CheckoutLine line : lines) {
            if (!uniquePackageIds.add(line.packageId())) {
                throw new BusinessException("Một gói học không thể xuất hiện nhiều lần trong cùng đơn hàng.");
            }
            CoursePackageEntity pkg = coursePackageRepository.findByIdForCheckout(line.packageId())
                    .orElseThrow(() -> ResourceNotFoundException.of("CoursePackage", line.packageId()));
            validateCheckout(userId, pkg, line.needs(), Boolean.TRUE.equals(request.getAcceptScheduleConflict()));
            packages.add(pkg);
        }

        BigDecimal totalAmount = packages.stream().map(CoursePackageEntity::getPrice)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        UserCouponEntity ownedVoucher = reserveVoucher(userId, request.getCouponCode(), packages);
        BigDecimal discountAmount = calculateDiscount(
                ownedVoucher != null ? ownedVoucher.getCouponEntity() : null, packages);
        BigDecimal finalAmount = totalAmount.subtract(discountAmount);
        if (finalAmount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessException("Voucher làm giá trị đơn bằng 0; luồng cấp quyền miễn phí chưa được hỗ trợ.");
        }

        OrderEntity order = OrderEntity.builder()
                .userEntity(user)
                .status(OrderStatusEnum.PENDING)
                .totalAmount(totalAmount)
                .discountAmount(discountAmount)
                .finalAmount(finalAmount)
                .couponCode(ownedVoucher != null ? ownedVoucher.getCouponEntity().getCode() : null)
                .userCouponEntity(ownedVoucher)
                .expiredAt(LocalDateTime.now().plusMinutes(15))
                .build();
        List<BigDecimal> allocatedDiscounts = allocateDiscount(discountAmount, ownedVoucher, packages);
        List<OrderItemEntity> items = new ArrayList<>();
        for (int index = 0; index < packages.size(); index++) {
            CoursePackageEntity pkg = packages.get(index);
            BigDecimal lineDiscount = allocatedDiscounts.get(index);
            CheckoutLine line = lines.get(index);
            items.add(OrderItemEntity.builder().orderEntity(order).coursePackageEntity(pkg)
                    .priceSnapshot(pkg.getPrice()).discountSnapshot(lineDiscount)
                    .finalPrice(pkg.getPrice().subtract(lineDiscount))
                    .itemType(line.itemType() != null ? line.itemType() : OrderItemTypeEnum.NEW_PURCHASE)
                    .oneOnOneNeeds(serializeNeeds(pkg, line.needs())).build());
        }
        order.setItems(items);
        OrderEntity savedOrder = orderRepository.save(order);
        if (ownedVoucher != null) {
            ownedVoucher.setReservedOrderId(savedOrder.getId());
            ownedVoucher.setReservedAt(LocalDateTime.now());
            userCouponRepository.save(ownedVoucher);
            eventPublisher.publishEvent(new AuditLogEvent(this, "RESERVE_VOUCHER_FOR_ORDER", "USER_COUPON",
                    ownedVoucher.getId(), UserCouponStatusEnum.AVAILABLE, UserCouponStatusEnum.RESERVED));
        }
        cartItemRepository.deleteByUserEntity_IdAndCoursePackageEntity_IdIn(userId, packages.stream()
                .map(CoursePackageEntity::getId).toList());

        return createPaypalCheckout(savedOrder);
    }

    /** Tạo lại PayPal order cho order PENDING thuộc đúng người dùng hiện tại. */
    @Override
    @Transactional
    public CheckoutPaymentResponse createPaypalPayment(Long userId, Long orderId) {
        OrderEntity order = getOwnedOrder(userId, orderId);
        if (order.getStatus() != OrderStatusEnum.PENDING) {
            throw new BusinessException("Chỉ đơn hàng PENDING mới có thể tạo thanh toán PayPal.");
        }
        return createPaypalCheckout(order);
    }

    /** Capture server-side PayPal order, đối soát amount/currency rồi cấp quyền đúng một lần. */
    @Override
    @Transactional
    public OrderStatusResponse capturePaypalPayment(Long userId, Long orderId) {
        OrderEntity ownedOrder = getOwnedOrder(userId, orderId);
        PaymentTransactionEntity candidate = paymentTransactionRepository.findByOrderEntity_Id(orderId).stream()
                .filter(item -> item.getStatus() == PaymentTransactionStatusEnum.PENDING
                        && PAYMENT_METHOD_PAYPAL.equals(item.getPaymentMethod()))
                .max(Comparator.comparing(PaymentTransactionEntity::getCreatedAt,
                        Comparator.nullsLast(Comparator.naturalOrder())))
                .orElse(null);
        if (candidate == null) return getOrderStatus(userId, orderId);
        PaymentTransactionEntity transaction = paymentTransactionRepository
                .findByGatewayOrderIdForUpdate(candidate.getGatewayOrderId())
                .orElseThrow(() -> ResourceNotFoundException.of("PayPal order", candidate.getGatewayOrderId()));

        if (transaction.getStatus() == PaymentTransactionStatusEnum.SUCCESS) {
            return getOrderStatus(userId, orderId);
        }
        OrderEntity order = transaction.getOrderEntity();
        if (order.getStatus() != OrderStatusEnum.PENDING) {
            return getOrderStatus(userId, orderId);
        }
        PaypalClient.CaptureOrderResult capture = paypalClient.captureOrder(
                transaction.getGatewayOrderId(), transaction.getPaypalRequestId() + "-CAPTURE");
        if (!Objects.equals(transaction.getGatewayAmount(), capture.amount())
                || !Objects.equals(transaction.getGatewayCurrency(), capture.currency())) {
            throw new BusinessException("Số tiền hoặc currency PayPal trả về không khớp giao dịch.");
        }
        if (paymentTransactionRepository.existsByPaypalCaptureId(capture.captureId())) {
            throw new BusinessException("PayPal capture đã được dùng cho giao dịch khác.");
        }

        provisionOrder(order);
        markVoucherUsed(order);
        LocalDateTime now = LocalDateTime.now();
        transaction.setStatus(PaymentTransactionStatusEnum.SUCCESS);
        transaction.setPaypalCaptureId(capture.captureId());
        transaction.setTransactionRef(capture.captureId());
        transaction.setPaidAt(now);
        order.setStatus(OrderStatusEnum.PAID);
        order.setPaidAt(now);
        paymentTransactionRepository.save(transaction);
        orderRepository.save(order);
        removePurchasedPackagesFromCart(order);
        eventPublisher.publishEvent(new AuditLogEvent(
                this, "PAYPAL_CAPTURE_ORDER_PAID", "ORDER", order.getId(), null, order));
        eventPublisher.publishEvent(new OrderInvoiceGenerationEvent(this, order.getId(), false));
        return getOrderStatus(userId, ownedOrder.getId());
    }

    /** Trả trạng thái order/transaction từ database, không tin query param redirect. */
    @Override
    public OrderStatusResponse getOrderStatus(Long userId, Long orderId) {
        OrderEntity order = getOwnedOrder(userId, orderId);
        PaymentTransactionEntity transaction = paymentTransactionRepository.findByOrderEntity_Id(orderId).stream()
                .max(Comparator.comparing(PaymentTransactionEntity::getCreatedAt,
                        Comparator.nullsLast(Comparator.naturalOrder())))
                .orElse(null);
        return OrderStatusResponse.builder()
                .orderId(order.getId())
                .orderStatus(order.getStatus())
                .paymentTransactionId(transaction != null ? transaction.getId() : null)
                .paymentStatus(transaction != null ? transaction.getStatus() : null)
                .build();
    }

    /** Hoàn tiền PayPal thật, đối soát kết quả rồi mới thu hồi toàn bộ quyền của order. */
    @Override
    @Transactional
    public OrderResponse refundOrder(Long orderId, RefundRequest request) {
        if (request == null || request.getReason() == null || request.getReason().isBlank()) {
            throw new BusinessException("Lý do hoàn tiền là bắt buộc.");
        }
        OrderEntity order = orderRepository.findByIdForUpdate(orderId)
                .orElseThrow(() -> ResourceNotFoundException.of("Order", orderId));
        if (order.getStatus() != OrderStatusEnum.PAID && order.getStatus() != OrderStatusEnum.REFUNDED) {
            throw new BusinessException("Chỉ đơn hàng PAID mới có thể hoàn tiền.");
        }

        PaymentTransactionEntity candidate = paymentTransactionRepository.findByOrderEntity_Id(orderId).stream()
                .filter(item -> PAYMENT_METHOD_PAYPAL.equals(item.getPaymentMethod())
                        && item.getPaypalCaptureId() != null
                        && (item.getStatus() == PaymentTransactionStatusEnum.SUCCESS
                        || item.getStatus() == PaymentTransactionStatusEnum.REFUNDED))
                .max(Comparator.comparing(PaymentTransactionEntity::getPaidAt,
                        Comparator.nullsLast(Comparator.naturalOrder())))
                .orElseThrow(() -> new BusinessException("Không tìm thấy PayPal capture thành công để hoàn tiền."));
        PaymentTransactionEntity transaction = paymentTransactionRepository
                .findByPaypalCaptureIdForUpdate(candidate.getPaypalCaptureId())
                .orElseThrow(() -> ResourceNotFoundException.of("PayPal capture", candidate.getPaypalCaptureId()));

        if (transaction.getStatus() == PaymentTransactionStatusEnum.REFUNDED
                && transaction.getPaypalRefundId() != null) {
            LocalDateTime existingRefundedAt = transaction.getRefundedAt() != null
                    ? transaction.getRefundedAt() : LocalDateTime.now();
            revokeOrderBenefits(order, existingRefundedAt);
            restoreVoucherAfterRefund(order);
            order.setStatus(OrderStatusEnum.REFUNDED);
            OrderEntity repaired = orderRepository.save(order);
            eventPublisher.publishEvent(new AuditLogEvent(
                    this, "REPAIR_REFUNDED_ORDER_BENEFITS", "ORDER", orderId, null, repaired));
            eventPublisher.publishEvent(new OrderInvoiceGenerationEvent(this, orderId, true));
            return orderMapper.toResponse(repaired);
        }
        boolean legacyLocalRefund = order.getStatus() == OrderStatusEnum.REFUNDED;
        if (!legacyLocalRefund && order.getPaidAt() != null
                && Duration.between(order.getPaidAt(), LocalDateTime.now()).toDays() > REFUND_POLICY_DAYS) {
            throw new BusinessException("Đơn hàng đã quá thời hạn hoàn tiền " + REFUND_POLICY_DAYS + " ngày.");
        }

        String refundRequestId = transaction.getPaypalRefundRequestId() != null
                ? transaction.getPaypalRefundRequestId() : "PPREFUND-" + transaction.getId();
        PaypalClient.RefundCaptureResult refund = paypalClient.refundCapture(
                transaction.getPaypalCaptureId(), refundRequestId,
                transaction.getGatewayAmount(), transaction.getGatewayCurrency(), request.getReason());
        if (!Objects.equals(transaction.getGatewayAmount(), refund.amount())
                || !Objects.equals(transaction.getGatewayCurrency(), refund.currency())) {
            throw new BusinessException("Số tiền hoặc currency PayPal hoàn về không khớp giao dịch.");
        }
        if (paymentTransactionRepository.existsByPaypalRefundId(refund.refundId())) {
            throw new BusinessException("PayPal refund đã được dùng cho giao dịch khác.");
        }

        LocalDateTime refundedAt = LocalDateTime.now();
        transaction.setStatus(PaymentTransactionStatusEnum.REFUNDED);
        transaction.setPaypalRefundRequestId(refundRequestId);
        transaction.setPaypalRefundId(refund.refundId());
        transaction.setRefundAmount(refund.amount());
        transaction.setRefundCurrency(refund.currency());
        transaction.setRefundReason(request.getReason().trim());
        transaction.setRefundedAt(refundedAt);
        paymentTransactionRepository.save(transaction);

        revokeOrderBenefits(order, refundedAt);
        restoreVoucherAfterRefund(order);
        order.setStatus(OrderStatusEnum.REFUNDED);
        OrderEntity saved = orderRepository.save(order);
        notificationService.createSystemNotification(order.getUserEntity(), NotificationTypeEnum.GENERAL,
                "Hoàn tiền PayPal thành công",
                "PayPal đã hoàn tiền đơn hàng " + order.getId() + " về phương thức thanh toán ban đầu.",
                order.getId(), "/student/orders");
        eventPublisher.publishEvent(new AuditLogEvent(
                this, "PAYPAL_ORDER_REFUNDED", "ORDER", orderId, null, saved));
        eventPublisher.publishEvent(new OrderInvoiceGenerationEvent(this, orderId, true));
        return orderMapper.toResponse(saved);
    }

    /** Kiểm tra order còn PAID, còn hạn và có PayPal capture để xin duyệt refund. */
    @Override
    public void validateRefundEligibility(Long orderId, String reason) {
        if (reason == null || reason.isBlank()) throw new BusinessException("Lý do hoàn tiền là bắt buộc.");
        OrderEntity order = orderRepository.findById(orderId)
                .orElseThrow(() -> ResourceNotFoundException.of("Order", orderId));
        if (order.getStatus() != OrderStatusEnum.PAID) {
            throw new BusinessException("Chỉ đơn hàng đã thanh toán mới có thể yêu cầu hoàn tiền.");
        }
        if (order.getPaidAt() != null && Duration.between(order.getPaidAt(), LocalDateTime.now()).toDays() > REFUND_POLICY_DAYS) {
            throw new BusinessException("Đơn hàng đã quá thời hạn hoàn tiền " + REFUND_POLICY_DAYS + " ngày.");
        }
        boolean hasCapture = paymentTransactionRepository.findByOrderEntity_Id(orderId).stream()
                .anyMatch(item -> PAYMENT_METHOD_PAYPAL.equals(item.getPaymentMethod())
                        && item.getPaypalCaptureId() != null
                        && item.getStatus() == PaymentTransactionStatusEnum.SUCCESS);
        if (!hasCapture) throw new BusinessException("Không tìm thấy giao dịch PayPal thành công để hoàn tiền.");
    }

    /** Hết hiệu lực gói, rời lớp nhóm và đóng matching/lớp 1-1 thuộc order đã refund. */
    private void revokeOrderBenefits(OrderEntity order, LocalDateTime refundedAt) {
        Set<EnrollmentEntity> affectedEnrollments = new HashSet<>();
        order.getItems().forEach(item -> enrollmentPackageRepository.findByOrderItemEntity_Id(item.getId())
                .ifPresent(enrollmentPackage -> {
                    affectedEnrollments.add(enrollmentPackage.getEnrollmentEntity());
                    if (enrollmentPackage.getStatus() != EnrollmentPackageStatusEnum.REFUNDED) {
                        enrollmentPackage.setStatus(EnrollmentPackageStatusEnum.REFUNDED);
                        enrollmentPackage.setExpiresAt(refundedAt);
                        enrollmentPackageRepository.save(enrollmentPackage);
                    }
                    removeRefundedClassMember(order.getUserEntity(), enrollmentPackage, refundedAt);
                    cancelRefundedOneOnOne(enrollmentPackage);
                }));
        affectedEnrollments.forEach(enrollment -> cancelEnrollmentWithoutActivePackages(enrollment, refundedAt));
    }

    /** Gỡ học viên khỏi lớp gắn với gói đã hoàn và đồng bộ lại sĩ số. */
    private void removeRefundedClassMember(
            UserEntity student, EnrollmentPackageEntity enrollmentPackage, LocalDateTime refundedAt) {
        ClassEntity clazz = enrollmentPackage.getCoursePackageEntity().getClassEntity();
        if (clazz == null && enrollmentPackage.getEnrollmentEntity() != null) {
            clazz = enrollmentPackage.getEnrollmentEntity().getClassEntity();
        }
        if (clazz == null) return;
        Long classId = clazz.getId();
        if (enrollmentPackageRepository.existsActiveClassAccess(student.getId(), classId, refundedAt)) return;
        ClassEntity refundedClass = clazz;
        classMemberRepository.findById_ClassIdAndId_UserId(classId, student.getId()).ifPresent(member -> {
            if (member.getRoleInClass() != ClassMemberRole.STUDENT) return;
            member.setStatus(ClassMemberStatusEnum.REMOVED);
            member.setLeftAt(refundedAt);
            classMemberRepository.save(member);
            int currentStudents = (int) classMemberRepository.countById_ClassIdAndStatusAndRoleInClass(
                    classId, ClassMemberStatusEnum.ACTIVE, ClassMemberRole.STUDENT);
            refundedClass.setCurrentMemberCount(currentStudents);
            classRepository.save(refundedClass);
        });
    }

    /** Hủy enrollment tổng khi order refund làm mất gói ACTIVE cuối cùng của khóa học. */
    private void cancelEnrollmentWithoutActivePackages(EnrollmentEntity enrollment, LocalDateTime refundedAt) {
        if (enrollmentPackageRepository.existsActiveByEnrollment(enrollment.getId(), refundedAt)) return;
        if (!Byte.valueOf((byte) 3).equals(enrollment.getStatus())) {
            enrollment.setStatus((byte) 3);
            enrollment.setCompletedAt(null);
            enrollmentRepository.save(enrollment);
            CourseEntity course = enrollment.getCourseEntity();
            if (course != null && course.getEnrollmentCount() != null && course.getEnrollmentCount() > 0) {
                course.setEnrollmentCount(course.getEnrollmentCount() - 1);
                courseRepository.save(course);
            }
        }
    }

    /** Đóng request và lớp 1-1 phát sinh từ gói đã được PayPal hoàn tiền. */
    private void cancelRefundedOneOnOne(EnrollmentPackageEntity enrollmentPackage) {
        oneOnOneRequestRepository.findByEnrollmentPackageEntity_Id(enrollmentPackage.getId()).ifPresent(request -> {
            request.setStatus(OneOnOneRequestStatusEnum.CANCELLED);
            if (request.getTrialClassEntity() != null) {
                request.getTrialClassEntity().setStatus(BaseStatusEnum.CANCELLED);
                classRepository.save(request.getTrialClassEntity());
            }
            oneOnOneRequestRepository.save(request);
        });
    }

    /** Lấy chi tiết order theo ID. */
    @Override
    public OrderResponse getOrderById(Long orderId) {
        return orderMapper.toResponse(orderRepository.findById(orderId)
                .orElseThrow(() -> ResourceNotFoundException.of("Order", orderId)));
    }

    /** Lấy chi tiết order và chặn truy cập chéo giữa các học viên. */
    @Override
    public OrderResponse getOwnedOrderById(Long userId, Long orderId) {
        return orderMapper.toResponse(getOwnedOrder(userId, orderId));
    }

    /** Lấy các order của người dùng. */
    @Override
    public List<OrderResponse> getOrdersByUserId(Long userId) {
        return orderMapper.toResponseList(orderRepository.findByUserEntity_Id(userId));
    }

    /** Lấy toàn bộ order cho màn hình quản trị. */
    @Override
    public List<OrderResponse> getAllOrders() {
        return orderMapper.toResponseList(orderRepository.findAll());
    }

    /** Hủy order PENDING theo yêu cầu. */
    @Override
    @Transactional
    public OrderResponse cancelOrder(Long orderId, String reason) {
        OrderEntity order = orderRepository.findById(orderId)
                .orElseThrow(() -> ResourceNotFoundException.of("Order", orderId));
        if (order.getStatus() != OrderStatusEnum.PENDING) {
            throw new BusinessException("Chỉ đơn hàng PENDING mới có thể hủy.");
        }
        order.setStatus(OrderStatusEnum.CANCELLED);
        releaseReservedVoucher(order);
        OrderEntity saved = orderRepository.save(order);
        eventPublisher.publishEvent(new AuditLogEvent(
                this, "CANCEL_ORDER", "ORDER", orderId, null, saved));
        return orderMapper.toResponse(saved);
    }

    /** Chuyển các order PENDING quá hạn thành EXPIRED mà không cấp quyền học. */
    @Override
    @Transactional
    public void cancelExpiredOrders() {
        orderRepository.findByStatusAndExpiredAtBefore(OrderStatusEnum.PENDING, LocalDateTime.now())
                .forEach(order -> {
                    order.setStatus(OrderStatusEnum.EXPIRED);
                    releaseReservedVoucher(order);
                    OrderEntity saved = orderRepository.save(order);
                    eventPublisher.publishEvent(new AuditLogEvent(
                            this, "EXPIRE_ORDER", "ORDER", saved.getId(), OrderStatusEnum.PENDING, saved));
                });
    }

    /** Chuẩn hóa checkout trực tiếp hoặc nhiều dòng giỏ hàng thành cùng một cấu trúc. */
    private List<CheckoutLine> resolveCheckoutLines(CheckoutRequest request) {
        if (request == null) throw new BusinessException("Dữ liệu checkout là bắt buộc.");
        if (request.getCoursePackageId() != null) {
            return List.of(new CheckoutLine(request.getCoursePackageId(), OrderItemTypeEnum.NEW_PURCHASE,
                    request.getOneOnOneNeeds()));
        }
        if (request.getItems() == null || request.getItems().isEmpty()) {
            throw new BusinessException("Vui lòng chọn ít nhất một gói học để thanh toán.");
        }
        return request.getItems().stream().map(item -> new CheckoutLine(
                item.getCoursePackageId(), item.getItemType(), item.getOneOnOneNeeds())).toList();
    }

    /** Kiểm tra lại khóa học, gói, sở hữu, nhu cầu 1-1 và sức chứa lớp. */
    private void validateCheckout(
            Long userId, CoursePackageEntity pkg, OneOnOneNeedsRequest needs, boolean acceptScheduleConflict) {
        CourseEntity course = pkg.getCourseEntity();
        if (course == null || !courseRepository.isPubliclySellable(course.getId())) {
            throw new BusinessException("Khóa học hiện không được mở bán.");
        }
        if (pkg.getStatus() != CoursePackageStatusEnum.ACTIVE || pkg.getPrice() == null) {
            throw new BusinessException("Gói học hiện không hoạt động hoặc chưa có giá bán.");
        }
        if (enrollmentPackageRepository.existsActiveOwnedPackage(userId, pkg.getId(), LocalDateTime.now())) {
            throw new BusinessException("Bạn đang sở hữu gói học này và không thể mua lại khi còn hiệu lực.");
        }
        if (orderItemRepository.existsActivePendingCheckout(userId, pkg.getId(), LocalDateTime.now())) {
            throw new BusinessException("Bạn đã có một giao dịch đang chờ thanh toán cho gói học này.");
        }
        if (pkg.getDeliveryMode() == DeliveryModeEnum.SELF_STUDY && pkg.getClassEntity() != null) {
            throw new BusinessException("Gói SELF_STUDY không được gắn với lớp học.");
        }
        if (pkg.getDeliveryMode() == DeliveryModeEnum.ONE_ON_ONE) {
            if (pkg.getClassEntity() != null) {
                throw new BusinessException("Gói ONE_ON_ONE chưa được gắn sẵn với lớp.");
            }
        }
        if (requiresTutorNeeds(pkg)) {
            if (pkg.getIncludedTutorSessions() == null || pkg.getIncludedTutorSessions() <= 0) {
                throw new BusinessException("Gói có gia sư phải cấu hình số buổi chính thức.");
            }
            requireOneOnOneNeeds(needs);
            validateTutorScheduleConflict(userId, needs, acceptScheduleConflict);
        }
        if (requiresGroupClass(pkg)) {
            validateAndLockGroupClass(pkg);
            validateStudentScheduleConflict(userId, pkg.getClassEntity(), acceptScheduleConflict);
        }
    }

    /** Báo trùng lịch định kỳ với các lớp học viên đang tham gia trước khi tạo payment. */
    private void validateStudentScheduleConflict(Long userId, ClassEntity targetClass, boolean accepted) {
        if (accepted || targetClass == null) return;
        List<Long> existingClassIds = classMemberRepository.findById_UserId(userId).stream()
                .filter(member -> member.getStatus() == ClassMemberStatusEnum.ACTIVE
                        && member.getRoleInClass() == ClassMemberRole.STUDENT)
                .map(member -> member.getClassEntity().getId())
                .filter(id -> !id.equals(targetClass.getId())).distinct().toList();
        if (existingClassIds.isEmpty()) return;
        List<ClassScheduleEntity> targetSlots = classScheduleRepository.findByClassEntity_Id(targetClass.getId()).stream()
                .filter(slot -> slot.getStatus() == BaseStatusEnum.ACTIVE).toList();
        List<ClassScheduleEntity> conflicts = classScheduleRepository.findByClassEntity_IdIn(existingClassIds).stream()
                .filter(slot -> slot.getStatus() == BaseStatusEnum.ACTIVE)
                .filter(existing -> classDateRangesOverlap(targetClass, existing.getClassEntity()))
                .filter(existing -> targetSlots.stream().anyMatch(target -> schedulesOverlap(target, existing))).toList();
        if (!conflicts.isEmpty()) {
            ClassEntity conflictClass = conflicts.get(0).getClassEntity();
            throw new BusinessException("Lịch của gói học bị trùng với lớp " + conflictClass.getName()
                    + ". Gửi acceptScheduleConflict=true nếu bạn vẫn muốn tiếp tục thanh toán.");
        }
    }

    /** Báo khung giờ 1-1 mong muốn trùng với lịch lớp đang hoạt động của học viên. */
    private void validateTutorScheduleConflict(Long userId, OneOnOneNeedsRequest needs, boolean accepted) {
        String conflictMessage = findTutorScheduleConflict(userId, needs);
        if (!accepted && conflictMessage != null) {
            throw new BusinessException(conflictMessage + " Gửi acceptScheduleConflict=true để xác nhận.");
        }
    }

    /** Tìm mô tả xung đột lịch 1-1 để dùng chung cho kiểm tra trước và checkout. */
    private String findTutorScheduleConflict(Long userId, OneOnOneNeedsRequest needs) {
        List<TutorScheduleSlot> requestedSlots = parseTutorScheduleSlots(needs);
        List<Long> existingClassIds = classMemberRepository.findById_UserId(userId).stream()
                .filter(member -> member.getStatus() == ClassMemberStatusEnum.ACTIVE
                        && member.getRoleInClass() == ClassMemberRole.STUDENT)
                .map(ClassMemberEntity::getClassEntity)
                .filter(Objects::nonNull)
                .filter(clazz -> clazz.getStatus() == BaseStatusEnum.ACTIVE)
                .filter(clazz -> clazz.getEndDate() == null || clazz.getEndDate().isAfter(LocalDateTime.now()))
                .map(ClassEntity::getId).distinct().toList();
        if (existingClassIds.isEmpty()) return null;
        Optional<ClassScheduleEntity> conflict = classScheduleRepository.findByClassEntity_IdIn(existingClassIds).stream()
                .filter(slot -> slot.getStatus() == BaseStatusEnum.ACTIVE)
                .filter(existing -> requestedSlots.stream().anyMatch(requested -> schedulesOverlap(requested, existing)))
                .findFirst();
        if (conflict.isEmpty()) return null;
        ClassScheduleEntity existing = conflict.get();
        TutorScheduleSlot requested = requestedSlots.stream()
                .filter(slot -> schedulesOverlap(slot, existing)).findFirst().orElseThrow();
        return "Khung giờ mong muốn " + dayName(requested.dayOfWeek()) + " ("
                + requested.startTime() + " - " + requested.endTime() + ") bị trùng với lớp \""
                + existing.getClassEntity().getName() + "\" (" + existing.getStartTime() + " - "
                + existing.getEndTime() + "). Bạn chắc chắn muốn tiếp tục chứ?";
    }

    /** Đọc các cặp thứ và thời gian do bộ chọn lịch 1-1 gửi lên theo cùng thứ tự. */
    private List<TutorScheduleSlot> parseTutorScheduleSlots(OneOnOneNeedsRequest needs) {
        String[] days = needs.getAvailableDays().trim().split("\\s*;\\s*");
        String[] timeRanges = needs.getPreferredTimes().trim().split("\\s*;\\s*");
        if (days.length != timeRanges.length || days.length == 0 || days.length > 14) {
            throw new BusinessException("Danh sách ngày học và khung giờ mong muốn không hợp lệ.");
        }
        List<TutorScheduleSlot> slots = new ArrayList<>();
        for (int index = 0; index < days.length; index++) {
            String[] times = timeRanges[index].split("\\s*[-–]\\s*");
            if (times.length != 2) {
                throw new BusinessException("Khung giờ mong muốn phải có giờ bắt đầu và giờ kết thúc.");
            }
            try {
                LocalTime startTime = LocalTime.parse(times[0]);
                LocalTime endTime = LocalTime.parse(times[1]);
                if (!startTime.isBefore(endTime)) {
                    throw new BusinessException("Giờ kết thúc phải sau giờ bắt đầu trong từng khung lịch.");
                }
                slots.add(new TutorScheduleSlot(parseDayOfWeek(days[index]), startTime, endTime));
            } catch (DateTimeParseException exception) {
                throw new BusinessException("Khung giờ mong muốn phải dùng định dạng 24 giờ HH:mm.");
            }
        }
        boolean overlaps = slots.stream().anyMatch(left -> slots.stream().anyMatch(right -> left != right
                && left.dayOfWeek() == right.dayOfWeek()
                && left.startTime().isBefore(right.endTime()) && right.startTime().isBefore(left.endTime())));
        if (overlaps) throw new BusinessException("Các khung giờ mong muốn trong cùng một ngày không được trùng nhau.");
        return slots;
    }

    /** Chuyển nhãn ngày tiếng Việt đã chuẩn hóa thành thứ ISO từ 1 đến 7. */
    private int parseDayOfWeek(String value) {
        String normalized = value.trim().toLowerCase(Locale.ROOT);
        if (normalized.equals("chủ nhật")) return 7;
        if (normalized.matches("thứ\\s*[2-7]")) {
            return Integer.parseInt(normalized.replaceAll("\\D", "")) - 1;
        }
        throw new BusinessException("Ngày có thể học không hợp lệ: " + value + ".");
    }

    /** Hiển thị thứ ISO bằng nhãn tiếng Việt trong cảnh báo xung đột. */
    private String dayName(int dayOfWeek) {
        return dayOfWeek == 7 ? "Chủ nhật" : "Thứ " + (dayOfWeek + 1);
    }

    /** Kiểm tra một khung lịch mong muốn có giao với lịch lớp đang tồn tại hay không. */
    private boolean schedulesOverlap(TutorScheduleSlot requested, ClassScheduleEntity existing) {
        return Objects.equals(requested.dayOfWeek(), existing.getDayOfWeek())
                && existing.getStartTime() != null && existing.getEndTime() != null
                && requested.startTime().isBefore(existing.getEndTime())
                && existing.getStartTime().isBefore(requested.endTime());
    }

    /** Kiểm tra hai khung lịch định kỳ có cùng ngày và giao nhau hay không. */
    private boolean schedulesOverlap(ClassScheduleEntity left, ClassScheduleEntity right) {
        return Objects.equals(left.getDayOfWeek(), right.getDayOfWeek())
                && left.getStartTime() != null && left.getEndTime() != null
                && right.getStartTime() != null && right.getEndTime() != null
                && left.getStartTime().isBefore(right.getEndTime())
                && right.getStartTime().isBefore(left.getEndTime());
    }

    /** Khung lịch 1-1 đã được chuẩn hóa để so sánh với lịch lớp. */
    private record TutorScheduleSlot(int dayOfWeek, LocalTime startTime, LocalTime endTime) {
    }

    /** Chỉ coi lịch định kỳ là trùng khi thời gian hoạt động của hai lớp cũng giao nhau. */
    private boolean classDateRangesOverlap(ClassEntity left, ClassEntity right) {
        if (left == null || right == null) return false;
        boolean leftEndsBeforeRightStarts = left.getEndDate() != null && right.getStartDate() != null
                && !left.getEndDate().isAfter(right.getStartDate());
        boolean rightEndsBeforeLeftStarts = right.getEndDate() != null && left.getStartDate() != null
                && !right.getEndDate().isAfter(left.getStartDate());
        return !leftEndsBeforeRightStarts && !rightEndsBeforeLeftStarts;
    }

    /** Khóa lớp và kiểm tra trạng thái nhận học viên tại checkout. */
    private ClassEntity validateAndLockGroupClass(CoursePackageEntity pkg) {
        if (pkg.getClassEntity() == null) {
            throw new BusinessException("Gói GROUP_CLASS chưa được gắn với lớp.");
        }
        ClassEntity clazz = classRepository.findByIdForUpdate(pkg.getClassEntity().getId())
                .orElseThrow(() -> ResourceNotFoundException.of("Class", pkg.getClassEntity().getId()));
        if (clazz.getCourseEntity() == null
                || !clazz.getCourseEntity().getId().equals(pkg.getCourseEntity().getId())) {
            throw new BusinessException("Lớp không thuộc khóa học của gói.");
        }
        int current = (int) classMemberRepository.countById_ClassIdAndStatusAndRoleInClass(
                clazz.getId(), ClassMemberStatusEnum.ACTIVE, ClassMemberRole.STUDENT);
        if (clazz.getStatus() != BaseStatusEnum.ACTIVE || !Boolean.TRUE.equals(clazz.getRegistrationOpen())) {
            throw new BusinessException("Lớp hiện không nhận thêm học viên.");
        }
        if (clazz.getEndDate() != null && LocalDateTime.now().isAfter(clazz.getEndDate())) {
            throw new BusinessException("Lớp học đã kết thúc.");
        }
        if (clazz.getMaxMembers() == null || current >= clazz.getMaxMembers()) {
            throw new BusinessException("Lớp đã đủ chỗ.");
        }
        if (clazz.getStartDate() != null && LocalDateTime.now().isAfter(clazz.getStartDate())
                && !Boolean.TRUE.equals(clazz.getAllowLateEnrollment())) {
            throw new BusinessException("Lớp đã bắt đầu và không cho đăng ký muộn.");
        }
        return clazz;
    }

    /** Kiểm tra đủ các trường nhu cầu học 1-1 bắt buộc. */
    private void requireOneOnOneNeeds(OneOnOneNeedsRequest needs) {
        if (needs == null || isBlank(needs.getAvailablePeriod()) || isBlank(needs.getAvailableDays())
                || isBlank(needs.getPreferredTimes()) || isBlank(needs.getCurrentLevel())
                || isBlank(needs.getLearningSituation()) || isBlank(needs.getLearningGoals())
                || isBlank(needs.getWeakAreas())) {
            throw new BusinessException("Vui lòng cung cấp đầy đủ nhu cầu học tập cho gói ONE_ON_ONE.");
        }
    }

    /** Xác định package có thành phần lớp nhóm cần khóa chỗ và kiểm tra trùng lịch. */
    private boolean requiresGroupClass(CoursePackageEntity pkg) {
        return pkg.getDeliveryMode() == DeliveryModeEnum.GROUP_CLASS
                || (pkg.getDeliveryMode() == DeliveryModeEnum.COMBO
                && ((pkg.getMaxGroupSize() != null && pkg.getMaxGroupSize() > 1)
                || pkg.getClassEntity() != null));
    }

    /** Xác định package cần lưu nhu cầu và tạo yêu cầu tìm gia sư sau thanh toán. */
    private boolean requiresTutorNeeds(CoursePackageEntity pkg) {
        return pkg.getDeliveryMode() == DeliveryModeEnum.ONE_ON_ONE
                || (pkg.getDeliveryMode() == DeliveryModeEnum.COMBO
                && pkg.getIncludedTutorSessions() != null && pkg.getIncludedTutorSessions() > 0);
    }

    /** Khóa và giữ voucher thuộc học viên cho order sắp tạo. */
    private UserCouponEntity reserveVoucher(
            Long userId, String couponCode, List<CoursePackageEntity> packages) {
        if (couponCode == null || couponCode.isBlank()) return null;
        UserCouponEntity owned = userCouponRepository
                .findAvailableByUserAndCodeForUpdate(userId, couponCode.trim())
                .orElseThrow(() -> new BusinessException("Voucher không thuộc tài khoản hoặc đang được sử dụng."));
        CouponEntity coupon = couponRepository.findByIdForUpdate(owned.getCouponEntity().getId())
                .orElseThrow(() -> ResourceNotFoundException.of("Coupon", owned.getCouponEntity().getId()));
        validateCouponForCheckout(coupon, packages);
        owned.setCouponEntity(coupon);
        owned.setStatus(UserCouponStatusEnum.RESERVED);
        return owned;
    }

    /** Kiểm tra hiệu lực, hạn mức và phạm vi khóa học của coupon tại checkout. */
    private void validateCouponForCheckout(CouponEntity coupon, List<CoursePackageEntity> packages) {
        LocalDateTime now = LocalDateTime.now();
        if (coupon.getStatus() != CouponStatusEnum.ACTIVE) throw new BusinessException("Voucher đã bị vô hiệu hóa.");
        if (coupon.getValidFrom() != null && now.isBefore(coupon.getValidFrom())) {
            throw new BusinessException("Voucher chưa đến thời gian sử dụng.");
        }
        if (coupon.getValidTo() != null && now.isAfter(coupon.getValidTo())) {
            throw new BusinessException("Voucher đã hết hạn.");
        }
        long reservedCount = userCouponRepository.countByCouponEntity_IdAndStatus(
                coupon.getId(), UserCouponStatusEnum.RESERVED);
        if (coupon.getMaxUsage() != null
                && (coupon.getUsedCount() == null ? 0 : coupon.getUsedCount()) + reservedCount >= coupon.getMaxUsage()) {
            throw new BusinessException("Voucher đã hết lượt sử dụng.");
        }
        Long courseId = coupon.getApplicableCourseEntity() != null
                ? coupon.getApplicableCourseEntity().getId() : null;
        if (courseId != null && packages.stream().noneMatch(pkg -> pkg.getCourseEntity().getId().equals(courseId))) {
            throw new BusinessException("Voucher không áp dụng cho các gói học đã chọn.");
        }
    }

    /** Tính số tiền giảm trên các gói thuộc phạm vi của coupon. */
    private BigDecimal calculateDiscount(CouponEntity coupon, List<CoursePackageEntity> packages) {
        if (coupon == null) return BigDecimal.ZERO;
        Long courseId = coupon.getApplicableCourseEntity() != null
                ? coupon.getApplicableCourseEntity().getId() : null;
        BigDecimal eligibleSubtotal = packages.stream()
                .filter(pkg -> courseId == null || pkg.getCourseEntity().getId().equals(courseId))
                .map(CoursePackageEntity::getPrice).reduce(BigDecimal.ZERO, BigDecimal::add);
        if (coupon.getDiscountValue() == null || coupon.getDiscountValue().compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessException("Voucher chưa được cấu hình giá trị giảm hợp lệ.");
        }
        BigDecimal discount = coupon.getDiscountType() == CouponDiscountTypeEnum.PERCENT
                ? eligibleSubtotal.multiply(coupon.getDiscountValue())
                        .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP)
                : coupon.getDiscountValue();
        return discount.min(eligibleSubtotal).max(BigDecimal.ZERO);
    }

    /** Phân bổ số tiền giảm vào các dòng đủ điều kiện để hóa đơn giữ đúng snapshot. */
    private List<BigDecimal> allocateDiscount(
            BigDecimal totalDiscount, UserCouponEntity ownedVoucher, List<CoursePackageEntity> packages) {
        List<BigDecimal> allocations = new ArrayList<>(Collections.nCopies(packages.size(), BigDecimal.ZERO));
        if (ownedVoucher == null || totalDiscount.compareTo(BigDecimal.ZERO) == 0) return allocations;
        Long courseId = ownedVoucher.getCouponEntity().getApplicableCourseEntity() != null
                ? ownedVoucher.getCouponEntity().getApplicableCourseEntity().getId() : null;
        List<Integer> eligibleIndexes = new ArrayList<>();
        BigDecimal eligibleSubtotal = BigDecimal.ZERO;
        for (int index = 0; index < packages.size(); index++) {
            CoursePackageEntity pkg = packages.get(index);
            if (courseId == null || pkg.getCourseEntity().getId().equals(courseId)) {
                eligibleIndexes.add(index);
                eligibleSubtotal = eligibleSubtotal.add(pkg.getPrice());
            }
        }
        BigDecimal allocated = BigDecimal.ZERO;
        for (int position = 0; position < eligibleIndexes.size(); position++) {
            int index = eligibleIndexes.get(position);
            BigDecimal share = position == eligibleIndexes.size() - 1
                    ? totalDiscount.subtract(allocated)
                    : totalDiscount.multiply(packages.get(index).getPrice())
                            .divide(eligibleSubtotal, 2, RoundingMode.HALF_UP);
            allocations.set(index, share);
            allocated = allocated.add(share);
        }
        return allocations;
    }

    /** Đánh dấu voucher đã dùng và tăng bộ đếm coupon đúng một lần sau capture. */
    private void markVoucherUsed(OrderEntity order) {
        if (order.getUserCouponEntity() == null) return;
        UserCouponEntity owned = userCouponRepository.findByIdForUpdate(order.getUserCouponEntity().getId())
                .orElseThrow(() -> ResourceNotFoundException.of("UserCoupon", order.getUserCouponEntity().getId()));
        if (owned.getStatus() == UserCouponStatusEnum.USED && Objects.equals(owned.getUsedOrderId(), order.getId())) return;
        if (owned.getStatus() != UserCouponStatusEnum.RESERVED
                || !Objects.equals(owned.getReservedOrderId(), order.getId())) {
            throw new BusinessException("Voucher không còn được giữ cho đơn hàng này.");
        }
        CouponEntity coupon = couponRepository.findByIdForUpdate(owned.getCouponEntity().getId())
                .orElseThrow(() -> ResourceNotFoundException.of("Coupon", owned.getCouponEntity().getId()));
        coupon.setUsedCount((coupon.getUsedCount() == null ? 0 : coupon.getUsedCount()) + 1);
        couponRepository.save(coupon);
        owned.setStatus(UserCouponStatusEnum.USED);
        owned.setUsedOrderId(order.getId());
        owned.setUsedAt(LocalDateTime.now());
        owned.setReservedOrderId(null);
        owned.setReservedAt(null);
        userCouponRepository.save(owned);
        eventPublisher.publishEvent(new AuditLogEvent(this, "USE_VOUCHER", "USER_COUPON", owned.getId(),
                UserCouponStatusEnum.RESERVED, UserCouponStatusEnum.USED));
    }

    /** Giải phóng voucher khi order chưa thanh toán bị hủy hoặc hết hạn. */
    private void releaseReservedVoucher(OrderEntity order) {
        if (order.getUserCouponEntity() == null) return;
        UserCouponEntity owned = userCouponRepository.findByIdForUpdate(order.getUserCouponEntity().getId())
                .orElseThrow(() -> ResourceNotFoundException.of("UserCoupon", order.getUserCouponEntity().getId()));
        if (owned.getStatus() == UserCouponStatusEnum.RESERVED
                && Objects.equals(owned.getReservedOrderId(), order.getId())) {
            owned.setStatus(isCouponExpired(owned.getCouponEntity())
                    ? UserCouponStatusEnum.EXPIRED : UserCouponStatusEnum.AVAILABLE);
            owned.setReservedOrderId(null);
            owned.setReservedAt(null);
            userCouponRepository.save(owned);
            eventPublisher.publishEvent(new AuditLogEvent(this, "RELEASE_VOUCHER", "USER_COUPON", owned.getId(),
                    UserCouponStatusEnum.RESERVED, owned.getStatus()));
        }
    }

    /** Trả lại voucher sau refund và giảm usedCount đã ghi nhận khi capture. */
    private void restoreVoucherAfterRefund(OrderEntity order) {
        if (order.getUserCouponEntity() == null) return;
        UserCouponEntity owned = userCouponRepository.findByIdForUpdate(order.getUserCouponEntity().getId())
                .orElseThrow(() -> ResourceNotFoundException.of("UserCoupon", order.getUserCouponEntity().getId()));
        if (owned.getStatus() != UserCouponStatusEnum.USED
                || !Objects.equals(owned.getUsedOrderId(), order.getId())) return;
        CouponEntity coupon = couponRepository.findByIdForUpdate(owned.getCouponEntity().getId())
                .orElseThrow(() -> ResourceNotFoundException.of("Coupon", owned.getCouponEntity().getId()));
        coupon.setUsedCount(Math.max(0, coupon.getUsedCount() == null ? 0 : coupon.getUsedCount() - 1));
        couponRepository.save(coupon);
        owned.setStatus(isCouponExpired(coupon) ? UserCouponStatusEnum.EXPIRED : UserCouponStatusEnum.AVAILABLE);
        owned.setUsedOrderId(null);
        owned.setUsedAt(null);
        userCouponRepository.save(owned);
        eventPublisher.publishEvent(new AuditLogEvent(this, "RESTORE_VOUCHER_AFTER_REFUND", "USER_COUPON",
                owned.getId(), UserCouponStatusEnum.USED, owned.getStatus()));
    }

    /** Xác định coupon đã hết hạn thời gian hoặc bị vô hiệu hóa. */
    private boolean isCouponExpired(CouponEntity coupon) {
        return coupon.getStatus() != CouponStatusEnum.ACTIVE
                || (coupon.getValidTo() != null && LocalDateTime.now().isAfter(coupon.getValidTo()));
    }

    /** Serialize nhu cầu 1-1 vào order item để chỉ tạo matching request sau IPN. */
    private String serializeNeeds(CoursePackageEntity pkg, OneOnOneNeedsRequest needs) {
        if (!requiresTutorNeeds(pkg)) return null;
        try {
            return objectMapper.writeValueAsString(needs);
        } catch (Exception ex) {
            throw new BusinessException("Không thể lưu nhu cầu học tập 1-1.");
        }
    }

    /** Tạo PayPal transaction PENDING với request ID idempotent duy nhất. */
    private PaymentTransactionEntity createPendingTransaction(OrderEntity order) {
        String token = UUID.randomUUID().toString().replace("-", "");
        PaymentTransactionEntity transaction = PaymentTransactionEntity.builder()
                .orderEntity(order)
                .paymentMethod(PAYMENT_METHOD_PAYPAL)
                .amount(order.getFinalAmount())
                .status(PaymentTransactionStatusEnum.PENDING)
                .paypalRequestId("PPREQ" + token)
                .build();
        return paymentTransactionRepository.save(transaction);
    }

    /** Tạo PayPal order, lưu mã gateway/amount đã đối soát rồi trả approval URL. */
    private CheckoutPaymentResponse createPaypalCheckout(OrderEntity order) {
        PaymentTransactionEntity transaction = createPendingTransaction(order);
        PaypalClient.CreateOrderResult paypalOrder = paypalClient.createOrder(
                transaction.getPaypalRequestId(), "AILMS-" + order.getId(), order.getId(), transaction.getAmount(),
                "Thanh toán đơn hàng AILMS " + order.getId());
        transaction.setGatewayOrderId(paypalOrder.orderId());
        transaction.setGatewayAmount(paypalOrder.amount());
        transaction.setGatewayCurrency(paypalOrder.currency());
        paymentTransactionRepository.save(transaction);
        eventPublisher.publishEvent(new AuditLogEvent(
                this, "CREATE_PAYPAL_CHECKOUT", "ORDER", order.getId(), null, order));
        return CheckoutPaymentResponse.builder()
                .orderId(order.getId())
                .paymentTransactionId(transaction.getId())
                .payUrl(paypalOrder.approvalUrl())
                .build();
    }

    /** Kiểm tra trước lịch 1-1 mong muốn mà không tạo đơn hàng hay thay đổi dữ liệu. */
    @Override
    public TutorScheduleCheckResponse validateTutorScheduleAvailability(Long userId, OneOnOneNeedsRequest needs) {
        if (!userRepository.existsById(userId)) {
            throw ResourceNotFoundException.of("User", userId);
        }
        requireOneOnOneNeeds(needs);
        String conflictMessage = findTutorScheduleConflict(userId, needs);
        return TutorScheduleCheckResponse.builder()
                .conflict(conflictMessage != null)
                .message(conflictMessage)
                .build();
    }

    /** Dọn các gói vừa thanh toán khỏi giỏ, kể cả order được tạo trực tiếp từ CourseDetail. */
    private void removePurchasedPackagesFromCart(OrderEntity order) {
        Set<Long> purchasedPackageIds = order.getItems().stream()
                .map(item -> item.getCoursePackageEntity().getId()).collect(Collectors.toSet());
        cartItemRepository.findByUserEntity_Id(order.getUserEntity().getId()).stream()
                .filter(item -> purchasedPackageIds.contains(item.getCoursePackageEntity().getId()))
                .forEach(item -> {
                    Long cartItemId = item.getId();
                    cartItemRepository.delete(item);
                    eventPublisher.publishEvent(new AuditLogEvent(
                            this, "REMOVE_PURCHASED_CART_ITEM", "CART_ITEM", cartItemId, null, null));
                });
    }

    /** Cấp từng gói đúng một lần sau PayPal capture thành công. */
    private void provisionOrder(OrderEntity order) {
        UserEntity student = userRepository.findByIdForUpdate(order.getUserEntity().getId())
                .orElseThrow(() -> ResourceNotFoundException.of("User", order.getUserEntity().getId()));
        for (OrderItemEntity item : order.getItems()) {
            if (enrollmentPackageRepository.findByOrderItemEntity_Id(item.getId()).isPresent()) continue;
            CoursePackageEntity pkg = item.getCoursePackageEntity();
            EnrollmentEntity enrollment = getOrCreateEnrollment(student, pkg.getCourseEntity());
            EnrollmentPackageEntity enrollmentPackage = EnrollmentPackageEntity.builder()
                    .enrollmentEntity(enrollment)
                    .coursePackageEntity(pkg)
                    .orderItemEntity(item)
                    .activatedAt(LocalDateTime.now())
                    .status(EnrollmentPackageStatusEnum.ACTIVE)
                    .expiresAt(pkg.getDurationDays() == null ? null
                            : LocalDateTime.now().plusDays(pkg.getDurationDays()))
                    .build();
            EnrollmentPackageEntity savedPackage = enrollmentPackageRepository.save(enrollmentPackage);
            item.setRelatedEnrollment(enrollment);
            orderItemRepository.save(item);
            provisionByDeliveryMode(student, pkg, savedPackage, item);
        }
    }

    /** Tái sử dụng enrollment khóa học hoặc tạo mới với trạng thái đang học. */
    private EnrollmentEntity getOrCreateEnrollment(UserEntity student, CourseEntity course) {
        Optional<EnrollmentEntity> existing = enrollmentRepository
                .findForUpdateByUserAndCourse(student.getId(), course.getId());
        if (existing.isPresent()) {
            EnrollmentEntity enrollment = existing.get();
            if (Byte.valueOf((byte) 2).equals(enrollment.getStatus())
                    || Byte.valueOf((byte) 3).equals(enrollment.getStatus())) {
                enrollment.setStatus((byte) 0);
                enrollment.setEnrolledAt(LocalDateTime.now());
                enrollment.setCompletedAt(null);
                course.setEnrollmentCount((course.getEnrollmentCount() == null ? 0 : course.getEnrollmentCount()) + 1);
                courseRepository.save(course);
                return enrollmentRepository.save(enrollment);
            }
            return enrollment;
        }
        EnrollmentEntity created = enrollmentRepository.save(EnrollmentEntity.builder()
                .userEntity(student)
                .courseEntity(course)
                .status((byte) 0)
                .enrolledAt(LocalDateTime.now())
                .build());
        course.setEnrollmentCount((course.getEnrollmentCount() == null ? 0 : course.getEnrollmentCount()) + 1);
        courseRepository.save(course);
        return created;
    }

    /** Cấp đồng thời quyền lớp nhóm và yêu cầu gia sư theo các thành phần của package. */
    private void provisionByDeliveryMode(
            UserEntity student, CoursePackageEntity pkg,
            EnrollmentPackageEntity enrollmentPackage, OrderItemEntity orderItem) {
        boolean groupClassProvisioned = requiresGroupClass(pkg);
        boolean tutorRequestProvisioned = requiresTutorNeeds(pkg);
        if (groupClassProvisioned) {
            addStudentToGroupClass(student, pkg);
        }
        if (tutorRequestProvisioned) {
            createOneOnOneRequest(student, pkg, enrollmentPackage, orderItem.getOneOnOneNeeds());
            notificationService.createSystemNotification(student, NotificationTypeEnum.COURSE_ENROLLED,
                    "Đăng ký gói học 1-1 thành công",
                    "Bạn đã thanh toán gói 1-1 thành công. Hệ thống đang tìm người dạy phù hợp.",
                    enrollmentPackage.getId(), "/student/one-on-one");
        }
        if (groupClassProvisioned || tutorRequestProvisioned) return;
        notificationService.createSystemNotification(student, NotificationTypeEnum.COURSE_ENROLLED,
                "Đăng ký khóa học thành công", "Bạn đã đăng ký khóa học thành công.",
                pkg.getCourseEntity().getId(), "/learn/courses/" + pkg.getCourseEntity().getId());
    }

    /** Thêm học viên vào lớp nhóm trong cùng transaction khóa sức chứa và báo cho staff. */
    private void addStudentToGroupClass(UserEntity student, CoursePackageEntity pkg) {
        ClassEntity clazz = validateAndLockGroupClass(pkg);
        ClassMemberId memberId = new ClassMemberId(clazz.getId(), student.getId());
        if (!classMemberRepository.findById_ClassIdAndId_UserId(clazz.getId(), student.getId()).isPresent()) {
            classMemberRepository.save(ClassMemberEntity.builder()
                    .id(memberId)
                    .classEntity(clazz)
                    .userEntity(student)
                    .roleInClass(ClassMemberRole.STUDENT)
                    .status(ClassMemberStatusEnum.ACTIVE)
                    .joinedAt(LocalDateTime.now())
                    .build());
            int count = (int) classMemberRepository.countById_ClassIdAndStatusAndRoleInClass(
                    clazz.getId(), ClassMemberStatusEnum.ACTIVE, ClassMemberRole.STUDENT);
            clazz.setCurrentMemberCount(count);
            classRepository.save(clazz);
        }
        notificationService.createSystemNotification(student, NotificationTypeEnum.COURSE_ENROLLED,
                "Đăng ký lớp thành công", "Bạn đã đăng ký thành công lớp " + clazz.getName() + ".",
                clazz.getId(), "/student/classes/" + clazz.getId());
        classMemberRepository.findById_ClassIdAndRoleInClassInAndStatus(
                        clazz.getId(), List.of(ClassMemberRole.TEACHER, ClassMemberRole.TA), ClassMemberStatusEnum.ACTIVE)
                .forEach(member -> notificationService.createSystemNotification(
                        member.getUserEntity(), NotificationTypeEnum.GENERAL, "Có học viên mới",
                        "Học viên " + student.getFullName() + " vừa đăng ký lớp " + clazz.getName() + ".",
                        clazz.getId(), "/teacher/classes/" + clazz.getId()));
    }

    /** Tạo matching request đúng một lần và báo cho người dạy phù hợp theo danh mục. */
    private void createOneOnOneRequest(
            UserEntity student, CoursePackageEntity pkg,
            EnrollmentPackageEntity enrollmentPackage, String needsJson) {
        if (oneOnOneRequestRepository.existsByEnrollmentPackageEntity_Id(enrollmentPackage.getId())) return;
        OneOnOneNeedsRequest needs;
        try {
            needs = objectMapper.readValue(needsJson, OneOnOneNeedsRequest.class);
        } catch (Exception ex) {
            throw new BusinessException("Không thể đọc nhu cầu học tập 1-1 đã lưu.");
        }
        OneOnOneRequestEntity request = oneOnOneRequestRepository.save(OneOnOneRequestEntity.builder()
                .enrollmentPackageEntity(enrollmentPackage)
                .studentEntity(student)
                .status(OneOnOneRequestStatusEnum.WAITING_INSTRUCTOR)
                .availablePeriod(needs.getAvailablePeriod())
                .availableDays(needs.getAvailableDays())
                .preferredTimes(needs.getPreferredTimes())
                .currentLevel(needs.getCurrentLevel())
                .learningSituation(needs.getLearningSituation())
                .learningGoals(needs.getLearningGoals())
                .weakAreas(needs.getWeakAreas())
                .instructorPreferences(needs.getInstructorPreferences())
                .additionalNotes(needs.getAdditionalNotes())
                .build());
        Long categoryId = pkg.getCourseEntity().getCategoryEntity() != null
                ? pkg.getCourseEntity().getCategoryEntity().getId() : null;
        if (categoryId != null) {
            teacherCategoryRepository.findByCategory_IdAndStatus(categoryId, BaseStatusEnum.ACTIVE).stream()
                    .map(TeacherCategoryEntity::getEmployee)
                    .filter(Objects::nonNull)
                    .map(EmployeeEntity::getUserEntity)
                    .filter(Objects::nonNull)
                    .distinct()
                    .forEach(user -> notificationService.createSystemNotification(
                            user, NotificationTypeEnum.GENERAL, "Có yêu cầu học 1-1 mới",
                            "Có yêu cầu học 1-1 mới phù hợp với chuyên môn của bạn.",
                            request.getId(), "/instructor/one-on-one/suggestions"));
        }
    }

    /** Lấy order và chặn IDOR theo user hiện tại. */
    private OrderEntity getOwnedOrder(Long userId, Long orderId) {
        OrderEntity order = orderRepository.findById(orderId)
                .orElseThrow(() -> ResourceNotFoundException.of("Order", orderId));
        if (order.getUserEntity() == null || !order.getUserEntity().getId().equals(userId)) {
            throw new ForbiddenException("Bạn không có quyền truy cập đơn hàng này.");
        }
        return order;
    }

    /** Kiểm tra chuỗi bắt buộc rỗng. */
    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    /** Dòng checkout đã chuẩn hóa cho thanh toán trực tiếp và giỏ hàng. */
    private record CheckoutLine(Long packageId, OrderItemTypeEnum itemType, OneOnOneNeedsRequest needs) {}
}
