package com.ailms.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

/** Lý do HR từ chối kết nối người dạy đang nhận yêu cầu 1-1. */
@Getter
@Setter
public class OneOnOneConnectionRejectRequest {
    @NotBlank(message = "Lý do từ chối kết nối là bắt buộc")
    @Size(min = 5, max = 1000, message = "Lý do từ chối phải từ 5 đến 1000 ký tự")
    private String reason;
}
