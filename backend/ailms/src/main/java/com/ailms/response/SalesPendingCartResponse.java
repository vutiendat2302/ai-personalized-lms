package com.ailms.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SalesPendingCartResponse {
    private String userId;
    private String userName;
    private String userEmail;
    private String userPhone;
    private String userAvatar;
    private List<CartItemDetail> cartItems;
    private BigDecimal totalPrice;
    private LocalDateTime oldestItemAddedAt;
    private Long hoursInCart;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CartItemDetail {
        private String id;
        private String coursePackageId;
        private String courseName;
        private String packageName;
        private String deliveryMode;
        private BigDecimal price;
        private LocalDateTime addedAt;
    }
}
