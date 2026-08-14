package com.ailms.repository;

import com.ailms.entity.SupportChatMessageEntity;
import com.ailms.repository.base.BaseRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Repository;

/** Truy vấn tin nhắn theo conversation, không cho đọc chéo visitor. */
@Repository
public interface SupportChatMessageRepository extends BaseRepository<SupportChatMessageEntity, Long> {
    /** Lấy tin nhắn theo thứ tự thời gian tăng dần. */
    Page<SupportChatMessageEntity> findByConversation_IdOrderByCreatedAtAsc(Long conversationId, Pageable pageable);
}
