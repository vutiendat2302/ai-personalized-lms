package com.ailms.entity.enums;

/** Các trạng thái hợp lệ của yêu cầu ghép giáo viên cho gói học 1-1. */
public enum OneOnOneRequestStatusEnum {
    WAITING_INSTRUCTOR,
    INSTRUCTOR_ACCEPTED,
    CONTACTED,
    TRIAL_SCHEDULED,
    TRIAL_COMPLETED,
    MATCHED,
    REMATCHING,
    CANCELLED
}
