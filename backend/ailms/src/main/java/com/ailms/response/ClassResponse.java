package com.ailms.response;

import com.ailms.entity.enums.BaseStatusEnum;
import com.ailms.entity.enums.DeliveryModeEnum;
import com.fasterxml.jackson.annotation.JsonFormat;
import jakarta.persistence.Column;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ClassResponse {

    private Long id;

    private Long courseId;

    private String courseName;

    private Long categoryId;

    private String categoryName;

    private String name;

    private Byte type;

    private DeliveryModeEnum packageType;

    private Integer maxMembers;

    private Integer currentMemberCount;

    private BaseStatusEnum status;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime startDate;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime endDate;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime createdAt;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime updatedAt;


}
