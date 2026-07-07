package com.ailms.response;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Định dạng phản hồi chuẩn khi API xảy ra lỗi.
 *
 * <p>Được sử dụng để trả về thông tin chi tiết về lỗi, bao gồm
 * mã trạng thái HTTP, thông điệp lỗi và các lỗi xác thực dữ liệu
 * (nếu có).
 */

@Getter
@Builder
public class ErrorResponse {

    /**
     * Thời điểm xảy ra lỗi.
     */
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime timestamp;

    /**
     * Mã trạng thái HTTP.
     */
    private int status;
    /**
     * Tên hoặc mô tả ngắn của lỗi HTTP.
     * Ví dụ: "Bad Request", "Unauthorized", "Internal Server Error".
     */
    private String error;

    /**
     * Thông điệp mô tả chi tiết lỗi.
     */
    private String message;

    /**
     * Đường dẫn của API phát sinh lỗi.
     */
    private String path;

    /**
     * Chi tiết lỗi validate field (nếu có), vd: ["name: must not be blank"]
     */
    private List<String> details;
}
