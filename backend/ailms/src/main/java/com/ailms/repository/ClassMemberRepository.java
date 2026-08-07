package com.ailms.repository;

import com.ailms.entity.ClassMemberEntity;
import com.ailms.entity.ClassMemberId;
import com.ailms.entity.enums.ClassMemberRole;
import com.ailms.entity.enums.ClassMemberStatusEnum;
import com.ailms.repository.base.BaseRepository;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ClassMemberRepository extends BaseRepository<ClassMemberEntity, Long> {
    // Tìm danh sách tất cả thành viên trong một lớp học
    List<ClassMemberEntity> findById_ClassId(Long classId);

    // Tìm danh sách lớp học của một User (Eager load Class và User để tối ưu hiệu năng)
    @EntityGraph(attributePaths = {"classEntity", "userEntity"})
    List<ClassMemberEntity> findById_UserId(Long userId);

    // Đếm số lượng thành viên trong một lớp theo trạng thái (ví dụ: đã tham gia, chờ duyệt)
    long countById_ClassIdAndStatus(Long classId, ClassMemberStatusEnum status);

    // Đếm số lượng thành viên trong một lớp theo trạng thái và vai trò (Học viên hoặc Giảng viên)
    long countById_ClassIdAndStatusAndRoleInClass(Long classId, ClassMemberStatusEnum status, ClassMemberRole roleInClass);

    // Lấy danh sách thành viên trong hàng đợi (Waitlist) xếp theo thời gian đăng ký tăng dần
    List<ClassMemberEntity> findById_ClassIdAndStatusOrderByWaitlistedAtAsc(Long classId, ClassMemberStatusEnum status);

    // Tìm thông tin chi tiết của một thành viên cụ thể trong một lớp học
    Optional<ClassMemberEntity> findById_ClassIdAndId_UserId(Long classId, Long userId);

    // Tìm danh sách thành viên thuộc nhiều lớp học theo trạng thái (Eager load để tối ưu hiệu năng)
    @EntityGraph(attributePaths = {"classEntity", "userEntity"})
    List<ClassMemberEntity> findById_ClassIdInAndStatus(List<Long> classIds, ClassMemberStatusEnum status);
}
