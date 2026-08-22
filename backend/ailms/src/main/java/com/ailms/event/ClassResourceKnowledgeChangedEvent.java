package com.ailms.event;

/** Sự kiện yêu cầu ingest lại hoặc xóa vector của một tài liệu lớp sau commit. */
public record ClassResourceKnowledgeChangedEvent(Long resourceId, boolean deleted) {
}
