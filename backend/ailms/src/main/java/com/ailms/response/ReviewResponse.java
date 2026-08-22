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

    private String courseName;

    private String userName;

    private String avatarUrl;

    private String schoolName;

    private Integer rating;

    private String comment;

    private Long teacherId;

    private String teacherName;

    private String teacherAvatarUrl;

    private Integer teacherRating;

    private String teacherComment;

    private ReviewStatusEnum status;

    private LocalDateTime createdAt;
}
