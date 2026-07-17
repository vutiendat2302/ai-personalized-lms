package com.ailms.request;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CheckoutRequest {

    @NotNull(message = "User ID is required")
    private Long userId;

    @NotEmpty(message = "Items list must not be empty")
    private List<CheckoutItemRequest> items;

    private String couponCode;
}
