package com.ailms.request;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.List;

@Data
public class SendBulkEmailRequest {

    @NotEmpty(message = "Danh sách email không được để trống")
    private List<String> emails;

    @NotNull(message = "Tiêu đề email không được để trống")
    private String subject;

    @NotNull(message = "Nội dung email không được để trống")
    private String content;
}
