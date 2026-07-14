package com.ailms.response;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Định dạng phản hồi chuẩn cho các API trong hệ thống.
 *
 * <p>Mọi API đều trả về cùng một cấu trúc gồm:
 * <ul>
 *     <li>{@code success}: Trạng thái xử lý của yêu cầu.</li>
 *     <li>{@code message}: Thông điệp mô tả kết quả.</li>
 *     <li>{@code data}: Dữ liệu được trả về (nếu có).</li>
 *     <li>{@code timestamp}: Thời điểm tạo phản hồi.</li>
 * </ul>
 *
 * @param <T> Kiểu dữ liệu của trường {@code data}.
 */

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class ApiResponse<T> {

    /**
     * Trạng thái xử lý của API.
     * Mặc định là {@code true}.
     */
    @Builder.Default
    private boolean success = true;

    /**
     * Thông điệp mô tả kết quả của yêu cầu.
     */
    private String message;

    /**
     * Dữ liệu trả về từ API.
     */
    private T data;

    /**
     * Thời điểm tạo phản hồi.
     */
    @Builder.Default
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime timestamp = LocalDateTime.now();

    /**
     * Tạo phản hồi API với thông điệp và dữ liệu.
     *
     * @param message Thông điệp phản hồi.
     * @param data Dữ liệu trả về.
     * @return Đối tượng {@link ApiResponse}.
     */
    public static <T> ApiResponse<T> of(String message, T data) {
        return ApiResponse.<T>builder()
                .message(message)
                .data(data)
                .build();
    }

    /**
     * Tạo phản hồi API chỉ chứa dữ liệu.
     * @param data Dữ liệu trả về.
     * @return Đối tượng {@link ApiResponse}.
     */
    public static <T> ApiResponse<T> of(T data) {
        return of(null, data);
    }

    /**
     * Tạo phản hồi API chỉ chứa thông điệp.
     *
     * @param message Thông điệp phản hồi.
     * @return Đối tượng {@link ApiResponse}.
     */
    public static <T> ApiResponse<T> message(String message) {
        return ApiResponse.<T>builder()
                .message(message)
                .build();
    }

}
