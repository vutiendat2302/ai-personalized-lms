package com.ailms.repository;

import com.ailms.entity.InviteTokenEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface InviteTokenRepository extends JpaRepository<InviteTokenEntity, Long> {
    Optional<InviteTokenEntity> findByToken(String token);
    Optional<InviteTokenEntity> findByEmail(String email);
}
