package com.ailms.request;

import com.ailms.entity.enums.SalaryStatusEnum;
import com.ailms.entity.enums.SalaryTypeEnum;
import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.*;
import org.springframework.format.annotation.DateTimeFormat;

import java.time.LocalDateTime;
import java.time.YearMonth;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(callSuper = false)
public class SalarySearchRequest extends BaseSearchRequest {

    private String keyword;

    @DateTimeFormat(pattern = "yyyy-MM")
    private YearMonth period;

    @DateTimeFormat(pattern = "yyyy-MM")
    private YearMonth periodFrom;

    @DateTimeFormat(pattern = "yyyy-MM")
    private YearMonth periodTo;

    private SalaryStatusEnum status;

    private Long departmentId;

    private SalaryTypeEnum salaryTypeEnum;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime createdFrom;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime createdTo;
}
