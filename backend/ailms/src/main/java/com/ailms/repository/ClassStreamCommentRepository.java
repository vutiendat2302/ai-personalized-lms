package com.ailms.repository;

import com.ailms.entity.ClassStreamCommentEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

/** Truy cập bình luận lớp theo bài đăng và phân trang. */
public interface ClassStreamCommentRepository extends JpaRepository<ClassStreamCommentEntity, Long> {
    /** Lấy bình luận chưa bị ẩn theo thứ tự thời gian. */
    Page<ClassStreamCommentEntity> findByPostEntity_IdAndHiddenFalseOrderByCreatedAtAsc(Long postId, Pageable pageable);

    /** Đếm bình luận đang hiển thị của một bài. */
    long countByPostEntity_IdAndHiddenFalse(Long postId);
}
