package com.ailms.response;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class ApiResponse<T> {

    /**
     * Chuẩn hóa định dạng phản hồi Response
     */
    @Builder.Default
    private boolean success = true;

    private String message;
    private T data;

    @Builder.Default
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime timestamp = LocalDateTime.now();

    public static <T> ApiResponse<T> of(String message, T data) {
        return ApiResponse.<T>builder()
                .message(message)
                .data(data)
                .build();
    }

    public static <T> ApiResponse<T> of(T data) {
        return of(null, data);
    }

    public static <T> ApiResponse<T> message(String message) {
        return ApiResponse.<T>builder()
                .message(message)
                .build();
    }

}
