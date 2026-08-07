package com.ailms.repository;

import com.ailms.entity.ClassResourceEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ClassResourceRepository extends JpaRepository<ClassResourceEntity, Long> {

    // Lấy danh sách tài liệu (tài nguyên) của lớp học, có phân trang
    Page<ClassResourceEntity> findByClassEntity_Id(Long classId, Pageable pageable);

    // Tìm kiếm tài liệu trong lớp theo từ khóa khớp với Tiêu đề hoặc Tên file (không phân biệt hoa thường, có phân trang)
    Page<ClassResourceEntity> findByClassEntity_IdAndTitleContainingIgnoreCaseOrClassEntity_IdAndFileNameContainingIgnoreCase(
            Long classIdForTitle,
            String titleKeyword,
            Long classIdForFileName,
            String fileNameKeyword,
            Pageable pageable
    );
}
