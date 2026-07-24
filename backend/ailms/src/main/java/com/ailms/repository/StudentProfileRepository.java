package com.ailms.repository;

import com.ailms.entity.StudentProfileEntity;
import com.ailms.repository.base.BaseRepository;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface StudentProfileRepository extends BaseRepository<StudentProfileEntity, Long> {
    Optional<StudentProfileEntity> findByStudentCode(String studentCode);
    boolean existsByStudentCode(String studentCode);
}
