package com.ailms.repository;

import com.ailms.entity.CourseInstructorEntity;
import com.ailms.entity.enums.CourseInstructorStatusEnum;
import com.ailms.repository.base.BaseRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CourseInstructorRepository extends BaseRepository<CourseInstructorEntity, Long> {

    // Tìm danh sách tất cả giảng viên cộng tác của một khóa học
    List<CourseInstructorEntity> findByCourseId(Long courseId);

    // Lấy danh sách liên kết khóa học của một giảng viên theo trạng thái (ví dụ: tìm lời mời đang chờ duyệt)
    List<CourseInstructorEntity> findByInstructorIdAndStatus(Long instructorId, CourseInstructorStatusEnum status);

    // Lấy tất cả danh sách liên kết khóa học của một giảng viên (không phân biệt trạng thái)
    List<CourseInstructorEntity> findByInstructorId(Long instructorId);

    // Tìm thông tin liên kết cụ thể của một giảng viên với một khóa học
    Optional<CourseInstructorEntity> findByCourseIdAndInstructorId(Long courseId, Long instructorId);

    // Kiểm tra xem giảng viên đó có đang ở trạng thái chỉ định trong khóa học hay không (ví dụ: đã ACCEPTED chưa)
    boolean existsByCourseIdAndInstructorIdAndStatus(Long courseId, Long instructorId, CourseInstructorStatusEnum status);

    // Kiểm tra xem giảng viên đó đã được gán/mời vào khóa học này hay chưa
    boolean existsByCourseIdAndInstructorId(Long courseId, Long instructorId);

    // Xóa liên kết của giảng viên ra khỏi khóa học (khi hủy phân công / từ chối lời mời)
    void deleteByCourseIdAndInstructorId(Long courseId, Long instructorId);
}
