package com.ailms.request;

import jakarta.validation.constraints.NotEmpty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
/** Dữ liệu dùng chung cho các thao tác hàng loạt trên tệp. */
public class BulkFileActionRequest {

    @NotEmpty(message = "Danh sách ID file không được để trống")
    private List<Long> fileIds;

    private String reason;
}
