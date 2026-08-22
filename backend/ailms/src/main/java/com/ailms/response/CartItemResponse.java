package com.ailms.response;

import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CartItemResponse {

    private Long id;

    private Long userId;

    private Long coursePackageId;

    private String packageName;

    private Long courseId;

    private String courseName;

    private BigDecimal price;

    private String deliveryMode;

    private LocalDateTime createdAt;
}
