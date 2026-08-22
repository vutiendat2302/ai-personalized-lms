package com.ailms.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TrashItemResponse {

    private String entityType;      // "USER", "EMPLOYEE", "STUDENT", "COURSE", "DEPARTMENT", etc.

    private String id;              // ID ép sang chuỗi tránh mất độ chính xác JS float

    private String code;            // Mã bản ghi e.g. "EMP005", "STU088"

    private String name;            // Tên hiển thị e.g. Họ tên, Tên khóa học

    private String email;           // Thông tin bổ sung e.g. Email

    private LocalDateTime deletedAt; // Thời điểm xóa mềm

    private String deletedBy;       // Người xóa

    private Long daysInTrash;       // Số ngày đã nằm trong thùng rác

    private Boolean hasChildRecords;// Có dữ liệu con phụ thuộc FK hay không

    private Map<String, Long> childRecordCounts; // Chi tiết bảng con và số bản ghi phụ thuộc

    private Map<String, Object> extraFields;     // Các trường mở rộng riêng theo từng entity
}
