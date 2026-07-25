package com.ailms.request;

import jakarta.validation.constraints.NotEmpty;
import lombok.Data;

import java.util.List;

@Data
public class BulkCreateEmployeeRequest {

    @NotEmpty(message = "Danh sách email nhân viên không được để trống")
    private List<String> emails;

    private Long departmentId;

    private String roleCode;
}
