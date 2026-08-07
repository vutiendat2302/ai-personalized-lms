package com.ailms.repository;

import com.ailms.entity.ClassStreamPostEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ClassStreamPostRepository extends JpaRepository<ClassStreamPostEntity, Long> {
    Page<ClassStreamPostEntity> findByClassEntity_IdOrderByCreatedAtDesc(Long classId, Pageable pageable);
}
