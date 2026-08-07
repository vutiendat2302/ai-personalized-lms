package com.ailms.request;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BulkTrashRequest {

    private String entityType; // "USER", "EMPLOYEE", "STUDENT", "COURSE", etc.

    private List<Long> ids;
}
