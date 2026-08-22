package com.ailms.response;

import com.ailms.entity.enums.BaseStatusEnum;
import com.ailms.entity.enums.ContractTypeEnum;
import lombok.*;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ContractTemplateResponse {

    private Long templateId;

    private String name;

    private ContractTypeEnum contractTypeEnum;

    private String templateContent;

    private List<String> placeholders;

    private Integer version;

    private BaseStatusEnum status;
}
