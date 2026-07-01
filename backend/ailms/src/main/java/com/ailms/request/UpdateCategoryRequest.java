package com.ailms.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UpdateCategoryRequest {
    /**
     * tạo mới category hoặc cập nhật category theo id
     */
    @NotBlank(message = "Category name must not be blank")
    @Size(max = 100, message = "Category name must not exceed 100 characters")
    private String name;

    @Size(max = 3000, message = "Description must not exceed 3000 characters")
    private String description;

}
