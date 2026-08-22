package com.ailms.service.imp;

import com.ailms.entity.*;
import com.ailms.entity.enums.OrderItemTypeEnum;
import com.ailms.entity.enums.OrderStatusEnum;
import com.ailms.exception.ForbiddenException;
import com.ailms.repository.OrderRepository;
import com.ailms.service.IFileStorageService;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.lang.reflect.Proxy;
import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.util.HashMap;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class InvoiceServiceTest {

    /** Tự động lưu PDF MinIO rồi endpoint chỉ tải lại đúng object đã lưu. */
    @Test
    void generateForOwnerReturnsPdf() {
        OrderEntity order = paidOrder();
        OrderRepository repository = repositoryReturning(order);
        Map<String, byte[]> objects = new HashMap<>();
        InvoiceService service = new InvoiceService(repository, storageBackedBy(objects), event -> { });

        service.storePaymentInvoice(order.getId());
        byte[] pdf = service.downloadPaymentForOwner(10L, order.getId());

        assertTrue(order.getPaymentInvoiceKey().endsWith("/payment.pdf"));
        assertTrue(pdf.length > 1000);
        assertTrue(new String(pdf, 0, 4, java.nio.charset.StandardCharsets.US_ASCII).equals("%PDF"));
    }

    /** Chặn học viên tải hóa đơn của người dùng khác. */
    @Test
    void generateForOwnerRejectsDifferentUser() {
        OrderEntity order = paidOrder();
        OrderRepository repository = repositoryReturning(order);

        assertThrows(ForbiddenException.class,
                () -> new InvoiceService(repository, storageBackedBy(new HashMap<>()), event -> { })
                        .downloadPaymentForOwner(99L, order.getId()));
    }

    /** Tự động lưu chứng từ hoàn tiền tách biệt với hóa đơn thanh toán. */
    @Test
    void storeRefundInvoiceCreatesSeparatePdf() {
        OrderEntity order = paidOrder();
        order.setStatus(OrderStatusEnum.REFUNDED);
        Map<String, byte[]> objects = new HashMap<>();
        InvoiceService service = new InvoiceService(
                repositoryReturning(order), storageBackedBy(objects), event -> { });

        service.storeRefundInvoice(order.getId());
        byte[] pdf = service.getRefundForOwner(10L, order.getId());

        assertTrue(order.getRefundInvoiceKey().endsWith("/refund.pdf"));
        assertTrue(pdf.length > 1000);
    }

    /** Tạo order tối thiểu với đầy đủ snapshot để kiểm thử hóa đơn. */
    private OrderEntity paidOrder() {
        UserEntity user = UserEntity.builder().id(10L).fullName("Học viên A").email("student@example.com").build();
        CourseEntity course = CourseEntity.builder().id(20L).name("Khóa học thử nghiệm").build();
        CoursePackageEntity pack = CoursePackageEntity.builder().id(30L).name("Gói tự học")
                .courseEntity(course).price(new BigDecimal("1000000")).build();
        OrderEntity order = OrderEntity.builder().id(40L).userEntity(user).status(OrderStatusEnum.PAID)
                .totalAmount(new BigDecimal("1000000")).discountAmount(new BigDecimal("100000"))
                .finalAmount(new BigDecimal("900000")).couponCode("WELCOME100K")
                .paidAt(LocalDateTime.now()).build();
        OrderItemEntity item = OrderItemEntity.builder().id(50L).orderEntity(order).coursePackageEntity(pack)
                .priceSnapshot(new BigDecimal("1000000")).discountSnapshot(new BigDecimal("100000"))
                .finalPrice(new BigDecimal("900000")).itemType(OrderItemTypeEnum.NEW_PURCHASE).build();
        order.setItems(List.of(item));
        return order;
    }

    /** Tạo repository proxy tối thiểu để test không phụ thuộc Mockito agent trên Java 25. */
    private OrderRepository repositoryReturning(OrderEntity order) {
        return (OrderRepository) Proxy.newProxyInstance(
                OrderRepository.class.getClassLoader(), new Class<?>[]{OrderRepository.class},
                (proxy, method, arguments) -> {
                    if (method.getName().equals("findById")) return Optional.of(order);
                    if (method.getName().equals("save")) return arguments[0];
                    if (method.getName().equals("toString")) return "OrderRepositoryTestProxy";
                    throw new UnsupportedOperationException(method.getName());
                });
    }

    /** Tạo storage proxy trong bộ nhớ mô phỏng upload/download MinIO. */
    private IFileStorageService storageBackedBy(Map<String, byte[]> objects) {
        return (IFileStorageService) Proxy.newProxyInstance(
                IFileStorageService.class.getClassLoader(), new Class<?>[]{IFileStorageService.class},
                (proxy, method, arguments) -> {
                    if (method.getName().equals("upload") && arguments.length == 4) {
                        objects.put((String) arguments[1], ((InputStream) arguments[0]).readAllBytes());
                        return null;
                    }
                    if (method.getName().equals("download")) {
                        return new ByteArrayInputStream(objects.get((String) arguments[0]));
                    }
                    if (method.getName().equals("exists")) return objects.containsKey((String) arguments[0]);
                    if (method.getName().equals("toString")) return "FileStorageTestProxy";
                    throw new UnsupportedOperationException(method.getName());
                });
    }
}
