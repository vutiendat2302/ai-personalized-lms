package com.ailms.request;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(callSuper = false) // Khong so sanh in hoa voi in thuong
public class CategorySearchRequest extends BaseSearchRequest {

    /**
     * Tìm kiếm gần đúng (LIKE, case-insensitive) theo name
     */
    private String name;

    /**
     * Filter chính xác theo status: 1 = Active, 0 = Inactive. Null = lấy tất cả
     */
    private Byte status;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime createdFrom;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime createdTo;
}
