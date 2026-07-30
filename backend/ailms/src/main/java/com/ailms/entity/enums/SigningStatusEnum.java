package com.ailms.entity.enums;

/**
 * Trạng thái quy trình ký điện tử hợp đồng lao động.
 */
public enum SigningStatusEnum {
    /** Vừa tạo hợp đồng/sinh file, phía công ty chưa ký */
    PENDING_COMPANY_SIGN,

    /** Phía công ty đã ký, đang chờ nhân viên truy cập link public & xác nhận OTP */
    PENDING_EMPLOYEE_SIGN,

    /** Cả hai bên đã ký hoàn tất, hợp đồng đã bị khóa chỉnh sửa */
    FULLY_SIGNED
}
