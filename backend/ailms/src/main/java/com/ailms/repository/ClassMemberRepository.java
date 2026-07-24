package com.ailms.repository;

import com.ailms.entity.ClassMemberEntity;
import com.ailms.entity.ClassMemberId;
import com.ailms.entity.enums.ClassMemberStatusEnum;
import com.ailms.repository.base.BaseRepository;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ClassMemberRepository extends BaseRepository<ClassMemberEntity, Long> {
    List<ClassMemberEntity> findById_ClassId(Long classId);
    List<ClassMemberEntity> findById_UserId(Long userId);
    long countById_ClassIdAndStatus(Long classId, ClassMemberStatusEnum status);
    List<ClassMemberEntity> findById_ClassIdAndStatusOrderByWaitlistedAtAsc(Long classId, ClassMemberStatusEnum status);
    Optional<ClassMemberEntity> findById_ClassIdAndId_UserId(Long classId, Long userId);
}
