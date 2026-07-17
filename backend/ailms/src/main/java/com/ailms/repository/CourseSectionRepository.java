package com.ailms.repository;

import com.ailms.entity.CourseSectionEntity;
import com.ailms.repository.base.BaseRepository;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface CourseSectionRepository extends BaseRepository<CourseSectionEntity, Long> {
    int countByCourseEntityId(Long courseId);

    boolean findByNameAndCourseEntity_Id(String name, Long courseEntityId);

    boolean existsByNameAndCourseEntity_Id(@NotBlank(message = "Section name must not be blank") @Size(max = 100, message = "Section name must not exceed 100 characters") String name, Long courseId);
}

