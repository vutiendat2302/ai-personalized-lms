package com.ailms.request;

import jakarta.validation.constraints.NotEmpty;
import lombok.*;

import java.util.List;

/**
 * Thay đổi thứ tự
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReorderRequest {

    /**
     * Danh sách ID theo thứ tự mới.
     * Mỗi ID đại diện cho một bản ghi cần sắp xếp lại
     * (ví dụ: Course, Lesson, Chapter, Category...).
     * Danh sách không được để trống.
     * Ví dụ:
     * [5, 2, 8, 1]
     */
    @NotEmpty(message = "IDs list must not be empty")
    private List<Long> ids;

    /**
     * ID chương đích khi chuyển bài học sang chương khác (optional).
     */
    private Long targetSectionId;
}
