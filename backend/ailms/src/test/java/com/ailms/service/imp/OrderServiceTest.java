package com.ailms.service.imp;

import com.ailms.client.PaypalClient;
import com.ailms.entity.*;
import com.ailms.entity.enums.*;
import com.ailms.exception.BusinessException;
import com.ailms.mapper.OrderMapper;
import com.ailms.repository.*;
import com.ailms.request.CheckoutRequest;
import com.ailms.request.OneOnOneNeedsRequest;
import com.ailms.service.INotificationService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import tools.jackson.databind.ObjectMapper;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.times;

/** Kiểm thử các quy tắc checkout liên quan quyền lợi gói học. */
@ExtendWith(MockitoExtension.class)
class OrderServiceTest {
    @Mock private UserRepository userRepository;
    @Mock private OrderRepository orderRepository;
    @Mock private OrderItemRepository orderItemRepository;
    @Mock private CourseRepository courseRepository;
    @Mock private CoursePackageRepository coursePackageRepository;
    @Mock private PaymentTransactionRepository paymentTransactionRepository;
    @Mock private CouponRepository couponRepository;
    @Mock private UserCouponRepository userCouponRepository;
    @Mock private CartItemRepository cartItemRepository;
    @Mock private EnrollmentRepository enrollmentRepository;
    @Mock private EnrollmentPackageRepository enrollmentPackageRepository;
    @Mock private ClassRepository classRepository;
    @Mock private ClassMemberRepository classMemberRepository;
    @Mock private ClassScheduleRepository classScheduleRepository;
    @Mock private TeacherCategoryRepository teacherCategoryRepository;
    @Mock private OneOnOneRequestRepository oneOnOneRequestRepository;
    @Mock private INotificationService notificationService;
    @Mock private ApplicationEventPublisher eventPublisher;
    @Mock private OrderMapper orderMapper;
    @Mock private ObjectMapper objectMapper;
    @Mock private PaypalClient paypalClient;
    @Mock private com.ailms.config.PaypalProperties paypalProperties;

    @InjectMocks private OrderService service;

    /** Không tạo PayPal checkout khi quyền tự học đã được một gói khác cùng khóa cấp. */
    @Test
    void checkoutRejectsSelfStudyWhenCourseAccessAlreadyExists() {
        UserEntity student = UserEntity.builder().id(10L).build();
        CourseEntity course = CourseEntity.builder().id(20L).name("Java").build();
        CoursePackageEntity selfStudy = CoursePackageEntity.builder()
                .id(30L).name("Tự học").courseEntity(course)
                .deliveryMode(DeliveryModeEnum.SELF_STUDY)
                .status(CoursePackageStatusEnum.ACTIVE).price(BigDecimal.valueOf(100_000)).build();
        CheckoutRequest request = CheckoutRequest.builder().coursePackageId(30L).build();

        when(userRepository.findByIdForUpdate(10L)).thenReturn(Optional.of(student));
        when(coursePackageRepository.findByIdForCheckout(30L)).thenReturn(Optional.of(selfStudy));
        when(courseRepository.isPubliclySellable(20L)).thenReturn(true);
        when(enrollmentPackageRepository.existsActiveOwnedPackage(
                org.mockito.ArgumentMatchers.eq(10L), org.mockito.ArgumentMatchers.eq(30L), any(LocalDateTime.class)))
                .thenReturn(false);
        when(enrollmentPackageRepository.existsActiveCourseAccess(
                org.mockito.ArgumentMatchers.eq(10L), org.mockito.ArgumentMatchers.eq(20L), any(LocalDateTime.class)))
                .thenReturn(true);

        assertThatThrownBy(() -> service.checkout(10L, request))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Bạn đã có quyền tự học của khóa học này từ gói đang sở hữu, không cần mua thêm gói tự học.");
    }

    /** Checkout group trả thông báo rõ lớp nào đang trùng lịch trước khi tạo PayPal order. */
    @Test
    void checkoutRejectsConflictingGroupClassSchedule() {
        UserEntity student = UserEntity.builder().id(10L).build();
        CourseEntity course = CourseEntity.builder().id(20L).name("Java").build();
        ClassEntity targetClass = activeClass(40L, "Java tối", course);
        ClassEntity existingClass = activeClass(41L, "Spring tối", course);
        CoursePackageEntity group = CoursePackageEntity.builder().id(30L).name("Group")
                .courseEntity(course).classEntity(targetClass).deliveryMode(DeliveryModeEnum.GROUP_CLASS)
                .status(CoursePackageStatusEnum.ACTIVE).price(BigDecimal.valueOf(100_000)).build();
        ClassMemberEntity existingMember = ClassMemberEntity.builder().classEntity(existingClass)
                .status(ClassMemberStatusEnum.ACTIVE).roleInClass(ClassMemberRole.STUDENT).build();
        ClassScheduleEntity targetSlot = slot(targetClass, 1, "19:00", "20:30");
        ClassScheduleEntity existingSlot = slot(existingClass, 1, "20:00", "21:00");

        stubSellableCheckout(student, course, group);
        when(classRepository.findByIdForUpdate(40L)).thenReturn(Optional.of(targetClass));
        when(classMemberRepository.findById_UserId(10L)).thenReturn(List.of(existingMember));
        when(classScheduleRepository.findByClassEntity_Id(40L)).thenReturn(List.of(targetSlot));
        when(classScheduleRepository.findByClassEntity_IdIn(List.of(41L))).thenReturn(List.of(existingSlot));

        assertThatThrownBy(() -> service.checkout(10L, CheckoutRequest.builder().coursePackageId(30L).build()))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Spring tối").hasMessageContaining("acceptScheduleConflict=true");
        verify(paypalClient, never()).createOrder(any(), any(), any(), any(), any());
    }

    /** API kiểm tra trước 1-1 phát hiện khung mong muốn giao với lịch lớp hiện tại. */
    @Test
    void tutorScheduleCheckReportsExistingClassConflict() {
        CourseEntity course = CourseEntity.builder().id(20L).build();
        ClassEntity existingClass = activeClass(41L, "Spring tối", course);
        ClassMemberEntity existingMember = ClassMemberEntity.builder().classEntity(existingClass)
                .status(ClassMemberStatusEnum.ACTIVE).roleInClass(ClassMemberRole.STUDENT).build();
        when(userRepository.existsById(10L)).thenReturn(true);
        when(classMemberRepository.findById_UserId(10L)).thenReturn(List.of(existingMember));
        when(classScheduleRepository.findByClassEntity_IdIn(List.of(41L)))
                .thenReturn(List.of(slot(existingClass, 1, "19:00", "21:00")));
        OneOnOneNeedsRequest needs = OneOnOneNeedsRequest.builder().availablePeriod("Buổi tối")
                .availableDays("Thứ 2").preferredTimes("20:00-21:30")
                .currentLevel("Cơ bản").learningSituation("Đang học")
                .learningGoals("Nâng cao").weakAreas("Thuật toán").build();

        var result = service.validateTutorScheduleAvailability(10L, needs);

        assertThat(result.isConflict()).isTrue();
        assertThat(result.getMessage()).contains("Spring tối").contains("Bạn chắc chắn");
    }

    /** Capture PayPal lặp lại chỉ cấp membership và gửi thông báo đúng một lần. */
    @Test
    void paypalCaptureProvisionsGroupClassIdempotentlyAndNotifiesBothSides() {
        UserEntity student = UserEntity.builder().id(10L).fullName("Học viên").build();
        UserEntity teacher = UserEntity.builder().id(11L).fullName("Giáo viên").build();
        CourseEntity course = CourseEntity.builder().id(20L).name("Java").enrollmentCount(0).build();
        ClassEntity clazz = activeClass(40L, "Java Group 01", course);
        CoursePackageEntity group = CoursePackageEntity.builder().id(30L).name("Group")
                .courseEntity(course).classEntity(clazz).deliveryMode(DeliveryModeEnum.GROUP_CLASS)
                .status(CoursePackageStatusEnum.ACTIVE).price(BigDecimal.valueOf(260_000)).build();
        OrderEntity order = OrderEntity.builder().id(50L).userEntity(student).status(OrderStatusEnum.PENDING)
                .totalAmount(BigDecimal.valueOf(260_000)).discountAmount(BigDecimal.ZERO)
                .finalAmount(BigDecimal.valueOf(260_000)).build();
        OrderItemEntity item = OrderItemEntity.builder().id(60L).orderEntity(order).coursePackageEntity(group)
                .priceSnapshot(BigDecimal.valueOf(260_000)).finalPrice(BigDecimal.valueOf(260_000))
                .itemType(OrderItemTypeEnum.NEW_PURCHASE).build();
        order.setItems(List.of(item));
        PaymentTransactionEntity transaction = PaymentTransactionEntity.builder().id(70L).orderEntity(order)
                .paymentMethod("PAYPAL").status(PaymentTransactionStatusEnum.PENDING)
                .gatewayOrderId("PAYPAL-1").paypalRequestId("REQ-1")
                .gatewayAmount(BigDecimal.TEN).gatewayCurrency("USD").build();
        ClassMemberEntity teacherMember = ClassMemberEntity.builder().classEntity(clazz).userEntity(teacher)
                .roleInClass(ClassMemberRole.TEACHER).status(ClassMemberStatusEnum.ACTIVE).build();
        when(orderRepository.findById(50L)).thenReturn(Optional.of(order));
        when(paymentTransactionRepository.findByOrderEntity_Id(50L)).thenReturn(List.of(transaction));
        when(paymentTransactionRepository.findByGatewayOrderIdForUpdate("PAYPAL-1")).thenReturn(Optional.of(transaction));
        when(paypalClient.captureOrder("PAYPAL-1", "REQ-1-CAPTURE"))
                .thenReturn(new PaypalClient.CaptureOrderResult("CAPTURE-1", BigDecimal.TEN, "USD"));
        when(userRepository.findByIdForUpdate(10L)).thenReturn(Optional.of(student));
        when(enrollmentPackageRepository.findByOrderItemEntity_Id(60L)).thenReturn(Optional.empty());
        when(enrollmentRepository.findForUpdateByUserAndCourse(10L, 20L)).thenReturn(Optional.empty());
        when(enrollmentRepository.save(any(EnrollmentEntity.class))).thenAnswer(invocation -> {
            EnrollmentEntity saved = invocation.getArgument(0);
            saved.setId(80L);
            return saved;
        });
        when(enrollmentPackageRepository.save(any(EnrollmentPackageEntity.class))).thenAnswer(invocation -> {
            EnrollmentPackageEntity saved = invocation.getArgument(0);
            saved.setId(90L);
            return saved;
        });
        when(classRepository.findByIdForUpdate(40L)).thenReturn(Optional.of(clazz));
        when(classMemberRepository.findById_ClassIdAndId_UserId(40L, 10L)).thenReturn(Optional.empty());
        when(classMemberRepository.findById_ClassIdAndRoleInClassInAndStatus(
                40L, List.of(ClassMemberRole.TEACHER, ClassMemberRole.TA), ClassMemberStatusEnum.ACTIVE))
                .thenReturn(List.of(teacherMember));
        when(cartItemRepository.findByUserEntity_Id(10L)).thenReturn(List.of());

        var first = service.capturePaypalPayment(10L, 50L);
        var second = service.capturePaypalPayment(10L, 50L);

        assertThat(first.getOrderStatus()).isEqualTo(OrderStatusEnum.PAID);
        assertThat(second.getOrderStatus()).isEqualTo(OrderStatusEnum.PAID);
        verify(paypalClient, times(1)).captureOrder("PAYPAL-1", "REQ-1-CAPTURE");
        verify(enrollmentPackageRepository, times(1)).save(any(EnrollmentPackageEntity.class));
        verify(classMemberRepository, times(1)).save(any(ClassMemberEntity.class));
        verify(notificationService, times(3)).createSystemNotification(any(), any(), any(), any(), any(), any());
    }

    /** Chuẩn bị các điều kiện chung trước khi validate checkout gói. */
    private void stubSellableCheckout(UserEntity student, CourseEntity course, CoursePackageEntity coursePackage) {
        when(userRepository.findByIdForUpdate(10L)).thenReturn(Optional.of(student));
        when(coursePackageRepository.findByIdForCheckout(coursePackage.getId())).thenReturn(Optional.of(coursePackage));
        when(courseRepository.isPubliclySellable(course.getId())).thenReturn(true);
        when(enrollmentPackageRepository.existsActiveOwnedPackage(
                org.mockito.ArgumentMatchers.eq(10L), org.mockito.ArgumentMatchers.eq(coursePackage.getId()), any(LocalDateTime.class)))
                .thenReturn(false);
        // Mặc định: không có PENDING order cũ cần cancel.
        when(orderRepository.findActivePendingOrdersByUserAndPackages(
                org.mockito.ArgumentMatchers.eq(10L), any(), any(LocalDateTime.class)))
                .thenReturn(List.of());
    }

    /** Checkout với voucher 100%: PENDING order cũ bị tự động cancel và quyền học được cấp ngay. */
    @Test
    void voucher100PercentCancelsStalePendingOrderThenProvisions() {
        UserEntity student = UserEntity.builder().id(10L).build();
        CourseEntity course = CourseEntity.builder().id(20L).name("Java").enrollmentCount(0).build();
        CoursePackageEntity pkg = CoursePackageEntity.builder()
                .id(30L).name("Tự học").courseEntity(course)
                .deliveryMode(DeliveryModeEnum.SELF_STUDY)
                .status(CoursePackageStatusEnum.ACTIVE)
                .price(BigDecimal.valueOf(200_000)).build();

        // Order PENDING cũ cùng gói chưa hết hạn
        OrderEntity staleOrder = OrderEntity.builder().id(99L).userEntity(student)
                .status(OrderStatusEnum.PENDING)
                .totalAmount(BigDecimal.valueOf(200_000))
                .discountAmount(BigDecimal.ZERO)
                .finalAmount(BigDecimal.valueOf(200_000))
                .expiredAt(LocalDateTime.now().plusMinutes(10))
                .build();

        // Voucher 100%
        CouponEntity coupon = CouponEntity.builder().id(1L).code("FREE100")
                .discountType(com.ailms.entity.enums.CouponDiscountTypeEnum.PERCENT)
                .discountValue(BigDecimal.valueOf(100))
                .maxUsage(10).usedCount(0)
                .status(com.ailms.entity.enums.CouponStatusEnum.ACTIVE)
                .build();
        UserCouponEntity userCoupon = UserCouponEntity.builder().id(2L)
                .couponEntity(coupon).status(UserCouponStatusEnum.AVAILABLE).build();

        CheckoutRequest request = CheckoutRequest.builder()
                .coursePackageId(30L).couponCode("FREE100").build();

        when(userRepository.findByIdForUpdate(10L)).thenReturn(Optional.of(student));
        when(paypalProperties.getReturnUrl()).thenReturn("http://localhost:3000/return");
        when(coursePackageRepository.findByIdForCheckout(30L)).thenReturn(Optional.of(pkg));
        when(courseRepository.isPubliclySellable(20L)).thenReturn(true);
        // Lần đầu trả staleOrder, lần sau trả rỗng (sau khi đã cancel)
        when(orderRepository.findActivePendingOrdersByUserAndPackages(
                org.mockito.ArgumentMatchers.eq(10L), any(), any(LocalDateTime.class)))
                .thenReturn(List.of(staleOrder));
        when(orderRepository.save(any(OrderEntity.class))).thenAnswer(inv -> {
            OrderEntity o = inv.getArgument(0);
            if (o.getId() == null) o.setId(100L);
            return o;
        });
        when(enrollmentPackageRepository.existsActiveOwnedPackage(
                org.mockito.ArgumentMatchers.eq(10L), org.mockito.ArgumentMatchers.eq(30L), any(LocalDateTime.class)))
                .thenReturn(false);
        when(enrollmentPackageRepository.existsActiveCourseAccess(
                org.mockito.ArgumentMatchers.eq(10L), org.mockito.ArgumentMatchers.eq(20L), any(LocalDateTime.class)))
                .thenReturn(false);
        when(orderItemRepository.existsActivePendingCheckout(
                org.mockito.ArgumentMatchers.eq(10L), org.mockito.ArgumentMatchers.eq(30L), any(LocalDateTime.class)))
                .thenReturn(false);
        when(userCouponRepository.findAvailableByUserAndCodeForUpdate(10L, "FREE100"))
                .thenReturn(Optional.of(userCoupon));
        when(couponRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(coupon));
        when(userCouponRepository.findByIdForUpdate(2L)).thenReturn(Optional.of(userCoupon));
        when(enrollmentRepository.findForUpdateByUserAndCourse(10L, 20L)).thenReturn(Optional.empty());
        when(enrollmentRepository.save(any(EnrollmentEntity.class))).thenAnswer(inv -> {
            EnrollmentEntity e = inv.getArgument(0); e.setId(80L); return e;
        });
        when(enrollmentPackageRepository.save(any(EnrollmentPackageEntity.class))).thenAnswer(inv -> {
            EnrollmentPackageEntity ep = inv.getArgument(0); ep.setId(90L); return ep;
        });
        when(paymentTransactionRepository.save(any(PaymentTransactionEntity.class))).thenAnswer(inv -> inv.getArgument(0));
        when(cartItemRepository.findByUserEntity_Id(10L)).thenReturn(List.of());

        var result = service.checkout(10L, request);

        // PENDING order cũ đã bị cancel
        verify(orderRepository, times(1)).save(org.mockito.ArgumentMatchers.argThat(
                o -> o.getId() != null && o.getId().equals(99L) && o.getStatus() == OrderStatusEnum.CANCELLED));
        // Đơn mới PAID được tạo
        assertThat(result.getOrderId()).isNotNull();
        assertThat(result.getPayUrl()).contains("free=true");
    }

    /** Checkout thông thường (có phí) không bị block bởi PENDING order cũ vì stale đã bị auto-cancel. */
    @Test
    void checkoutDoesNotBlockWhenStalePendingOrderAutosCancelled() {
        UserEntity student = UserEntity.builder().id(10L).build();
        CourseEntity course = CourseEntity.builder().id(20L).name("Python").build();
        CoursePackageEntity pkg = CoursePackageEntity.builder()
                .id(31L).name("Group Python").courseEntity(course)
                .deliveryMode(DeliveryModeEnum.SELF_STUDY)
                .status(CoursePackageStatusEnum.ACTIVE)
                .price(BigDecimal.valueOf(300_000)).build();

        // stubSellableCheckout tự stub findActivePendingOrdersByUserAndPackages = List.of()
        stubSellableCheckout(student, course, pkg);
        when(enrollmentPackageRepository.existsActiveCourseAccess(
                org.mockito.ArgumentMatchers.eq(10L), org.mockito.ArgumentMatchers.eq(20L), any(LocalDateTime.class)))
                .thenReturn(false);
        when(orderItemRepository.existsActivePendingCheckout(
                org.mockito.ArgumentMatchers.eq(10L), org.mockito.ArgumentMatchers.eq(31L), any(LocalDateTime.class)))
                .thenReturn(false);
        when(orderRepository.save(any(OrderEntity.class))).thenAnswer(inv -> {
            OrderEntity o = inv.getArgument(0); o.setId(101L); return o;
        });
        when(paypalClient.createOrder(any(), any(), any(), any(), any()))
                .thenReturn(new PaypalClient.CreateOrderResult("PAYPAL-2", "https://paypal.com/approve",
                        BigDecimal.valueOf(300_000), "VND"));
        when(paymentTransactionRepository.save(any(PaymentTransactionEntity.class))).thenAnswer(inv -> {
            PaymentTransactionEntity t = inv.getArgument(0); t.setId(70L); return t;
        });

        var result = service.checkout(10L, CheckoutRequest.builder().coursePackageId(31L).build());

        assertThat(result.getOrderId()).isEqualTo(101L);
        assertThat(result.getPayUrl()).isEqualTo("https://paypal.com/approve");
    }

    /** Tạo lớp đang nhận học viên trong thời hạn hoạt động. */
    private ClassEntity activeClass(Long id, String name, CourseEntity course) {
        return ClassEntity.builder().id(id).name(name).courseEntity(course).status(BaseStatusEnum.ACTIVE)
                .registrationOpen(true).allowLateEnrollment(true).maxMembers(20)
                .startDate(LocalDateTime.now().minusDays(1)).endDate(LocalDateTime.now().plusMonths(2)).build();
    }

    /** Tạo một khung lịch định kỳ ACTIVE. */
    private ClassScheduleEntity slot(ClassEntity clazz, int day, String start, String end) {
        return ClassScheduleEntity.builder().classEntity(clazz).dayOfWeek(day)
                .startTime(LocalTime.parse(start)).endTime(LocalTime.parse(end)).status(BaseStatusEnum.ACTIVE).build();
    }
}

