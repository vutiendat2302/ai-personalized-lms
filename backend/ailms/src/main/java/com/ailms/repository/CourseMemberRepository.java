package com.ailms.repository;

import com.ailms.entity.ClassEntity;
import com.ailms.entity.CourseMemberEntity;
import com.ailms.entity.CourseMemberId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CourseMemberRepository extends JpaRepository<CourseMemberEntity, CourseMemberId>, JpaSpecificationExecutor<CourseMemberEntity> {
    List<CourseMemberEntity> findByCourseEntity_Id(Long courseId);
    List<CourseMemberEntity> findByUserEntity_Id(Long userId);
}
