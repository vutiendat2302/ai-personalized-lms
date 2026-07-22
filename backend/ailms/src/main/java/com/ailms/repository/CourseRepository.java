package com.ailms.repository;

import com.ailms.entity.CourseEntity;
import com.ailms.repository.base.BaseRepository;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

@Repository
public interface CourseRepository extends BaseRepository<CourseEntity, Long> {
    boolean existsByLinkIgnoreCase(String link);
    boolean existsByLinkIgnoreCaseAndIdNot(String link, Long id);

    boolean existsByNameIgnoreCaseAndCategoryEntity_Id(@NotBlank(message = "Course name must not be blank") @Size(max = 100, message = "Course name must not exceed 100 characters") String name, @NotNull(message = "Category ID is required") Long categoryId);
}
