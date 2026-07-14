package com.ailms.request;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(callSuper = false)
public class PermissionSearchRequest extends BaseSearchRequest {

    private String keyword;

    private String entity;

    private String action;
}
