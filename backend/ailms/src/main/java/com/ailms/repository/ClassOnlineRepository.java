package com.ailms.repository;

import com.ailms.entity.ClassOnlineEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ClassOnlineRepository extends JpaRepository<ClassOnlineEntity, Long> {
    List<ClassOnlineEntity> findByClassEntity_Id(Long classId);
    List<ClassOnlineEntity> findByTeacherEntity_Id(Long teacherId);
}
