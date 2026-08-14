package com.ailms.request.ai;

import com.ailms.entity.enums.AiFeedbackType;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

/** Payload thumbs up/down cho message AI. */
@Data
public class AiFeedbackRequest {
    @NotNull(message = "Feedback không được để trống")
    private AiFeedbackType feedback;
}
