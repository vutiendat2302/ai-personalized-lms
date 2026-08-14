package com.ailms.request;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

/** Danh sách người dạy cùng danh mục được HR chọn để nhận thông báo lớp 1-1. */
@Getter
@Setter
public class OneOnOneNotifyInstructorsRequest {
    @NotEmpty(message = "Vui lòng chọn ít nhất một giáo viên hoặc trợ giảng")
    @Size(max = 100, message = "Chỉ được gửi tối đa 100 người trong một lần")
    private List<Long> instructorIds;
}
