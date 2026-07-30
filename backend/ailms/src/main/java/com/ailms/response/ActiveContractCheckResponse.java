package com.ailms.response;

import com.ailms.entity.enums.ContractTypeEnum;
import lombok.*;

import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ActiveContractCheckResponse {

    private boolean hasActiveContract;

    private Long activeContractId;

    private ContractTypeEnum activeContractType;

    private LocalDate startDate;
}
