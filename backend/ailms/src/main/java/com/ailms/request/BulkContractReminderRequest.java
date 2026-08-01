package com.ailms.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import lombok.Data;

import java.util.List;

@Data
/** Dữ liệu gửi nhắc hạn cho nhiều hợp đồng và nhiều người nhận. */
public class BulkContractReminderRequest {
    @NotEmpty(message = "Danh sách hợp đồng không được để trống")
    private List<Long> ids;

    @NotEmpty(message = "Vui lòng chọn ít nhất một nhân sự HR")
    private List<Long> recipientUserIds;

    @NotBlank(message = "Nội dung nhắc nhở không được để trống")
    private String content;

    private String subject;
}
