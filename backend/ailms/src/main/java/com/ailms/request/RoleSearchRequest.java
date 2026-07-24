package com.ailms.request;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(callSuper = false)
public class RoleSearchRequest extends BaseSearchRequest {

    private String keyword;

    private Boolean isSystem;
}
