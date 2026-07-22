package com.ailms.repository;

import com.ailms.entity.CartItemEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CartItemRepository extends JpaRepository<CartItemEntity, Long>, JpaSpecificationExecutor<CartItemEntity> {

    List<CartItemEntity> findByUserEntity_Id(Long userId);

    boolean existsByUserEntity_IdAndCoursePackageEntity_Id(Long userId, Long coursePackageId);

    void deleteByUserEntity_Id(Long userId);

    void deleteByUserEntity_IdAndCoursePackageEntity_IdIn(Long userId, List<Long> coursePackageIds);
}
