package com.ailms.repository;

import com.ailms.entity.AiConversationEntity;
import com.ailms.entity.enums.AiConversationScope;
import com.ailms.repository.base.BaseRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.Optional;

/** Truy cập hội thoại AI theo ownership. */
public interface AiConversationRepository extends BaseRepository<AiConversationEntity, String> {

    /** Lấy hội thoại khi đồng thời đúng owner và scope trách nhiệm. */
    Optional<AiConversationEntity> findByIdAndOwnerIdAndScope(
            String id, Long ownerId, AiConversationScope scope);

    /** Phân trang hội thoại theo owner và loại trợ lý. */
    Page<AiConversationEntity> findByOwnerIdAndScopeOrderByLastMessageAtDesc(
            Long ownerId, AiConversationScope scope, Pageable pageable);
}
