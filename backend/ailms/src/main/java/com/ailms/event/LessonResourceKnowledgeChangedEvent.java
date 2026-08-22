package com.ailms.event;

/** Sự kiện ingest hoặc xóa vector của tài liệu lesson sau khi transaction hoàn tất. */
public record LessonResourceKnowledgeChangedEvent(Long resourceId, boolean deleted) {
}
