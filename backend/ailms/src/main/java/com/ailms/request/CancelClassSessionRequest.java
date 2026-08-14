package com.ailms.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

/** Dữ liệu bắt buộc khi hủy một buổi học đã đặt. */
@Getter
@Setter
public class CancelClassSessionRequest {

    @NotBlank(message = "Lý do hủy là bắt buộc")
    @Size(max = 2000, message = "Lý do hủy tối đa 2000 ký tự")
    private String reason;
}
