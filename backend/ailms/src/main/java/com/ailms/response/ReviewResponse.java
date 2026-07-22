package com.ailms.response;

import com.ailms.entity.enums.ReviewStatusEnum;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReviewResponse {

    private Long id;

    private Long courseId;

    private Long userId;

//    private String userName;

    private Integer rating;

    private String comment;

    private ReviewStatusEnum status;

    private LocalDateTime createdAt;
}
