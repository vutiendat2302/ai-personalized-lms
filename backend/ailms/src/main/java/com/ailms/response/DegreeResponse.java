package com.ailms.response;

import com.ailms.entity.enums.BaseStatusEnum;
import com.ailms.entity.enums.DegreeTypeEnum;
import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DegreeResponse {
    private Long id;
    private Long categoryId;
    private String categoryName;
    private String universityName;
    private String universityLogo;
    private String title;
    private DegreeTypeEnum type;
    private String duration;
    private String image;
    private BaseStatusEnum status;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime createdAt;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime updatedAt;
}
