package com.ailms.repository;

import com.ailms.entity.AiMessageEntity;
import com.ailms.entity.enums.AiConversationScope;
import com.ailms.repository.base.BaseRepository;

import java.util.List;
import java.util.Optional;

/** Truy cập tin nhắn theo cuộc hội thoại. */
public interface AiMessageRepository extends BaseRepository<AiMessageEntity, Long> {

    /** Lấy toàn bộ tin nhắn theo thứ tự thời gian. */
    List<AiMessageEntity> findByConversation_IdOrderByCreatedAtAsc(String conversationId);

    /** Lấy các tin gần nhất để tạo context cho AI. */
    List<AiMessageEntity> findTop10ByConversation_IdOrderByCreatedAtDesc(String conversationId);

    /** Xóa toàn bộ tin nhắn trước khi xóa hội thoại. */
    void deleteByConversation_Id(String conversationId);

    /** Tìm message khi đúng owner và scope để chống trộn tầng lịch sử. */
    Optional<AiMessageEntity> findByIdAndConversation_OwnerIdAndConversation_Scope(
            Long id, Long ownerId, AiConversationScope scope);
}
