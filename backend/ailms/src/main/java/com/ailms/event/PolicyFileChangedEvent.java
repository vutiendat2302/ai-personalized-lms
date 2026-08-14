package com.ailms.event;

/** Báo policy file mới đã commit để đồng bộ nội dung sang vector store. */
public record PolicyFileChangedEvent(Long fileId) {
}
