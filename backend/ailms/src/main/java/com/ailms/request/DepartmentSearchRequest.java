package com.ailms.request;

import com.ailms.entity.enums.BaseStatusEnum;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class DepartmentSearchRequest extends CommonSearchRequest<BaseStatusEnum> {
    /**
     * null = tất cả, true = có nhân viên, false = không có nhân viên (phòng ban rỗng)
     */
    private Boolean hasEmployees;
}
