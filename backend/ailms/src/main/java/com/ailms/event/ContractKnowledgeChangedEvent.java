package com.ailms.event;

/** Sự kiện đồng bộ hợp đồng sang RAG sau khi transaction nghiệp vụ hoàn tất. */
public record ContractKnowledgeChangedEvent(Long contractId, Operation operation) {

    /** Loại thay đổi cần áp dụng lên vector store. */
    public enum Operation {
        UPSERT,
        DELETE
    }
}
