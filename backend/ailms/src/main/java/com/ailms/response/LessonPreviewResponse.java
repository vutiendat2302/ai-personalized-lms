package com.ailms.response;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LessonPreviewResponse {

    private Long id;

    private String name;

    private String contentType;

    private String description;

    private Integer durationMin;

    private String previewType; // "FREE", "LOCKED"

    private boolean locked;

    private String contentUrl; // Nullable if locked

    private String ctaUrl; // Payment or enroll link if locked
}
