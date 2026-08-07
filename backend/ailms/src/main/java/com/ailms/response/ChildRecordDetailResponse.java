package com.ailms.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChildRecordDetailResponse {

    private String tableName;          // Tên bảng trong CSDL (e.g. "employee_contract")

    private String displayName;        // Tên hiển thị tiếng Việt (e.g. "Hợp đồng lao động")

    private Long count;                // Tổng số bản ghi phụ thuộc

    private List<Map<String, Object>> items; // Danh sách chi tiết các dòng bản ghi
}
