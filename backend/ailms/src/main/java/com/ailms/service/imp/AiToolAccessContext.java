package com.ailms.service.imp;

import java.util.List;

/** Ngữ cảnh người gọi đã ký, dùng khi AI Service quay lại Backend gọi tool. */
public record AiToolAccessContext(Long ownerId, List<String> roles) {
}
