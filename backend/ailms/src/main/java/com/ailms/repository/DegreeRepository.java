package com.ailms.repository;

import com.ailms.entity.DegreeEntity;
import com.ailms.repository.base.BaseRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface DegreeRepository extends BaseRepository<DegreeEntity, Long> {
    long countByCategoryEntity_Id(Long categoryId);
}
