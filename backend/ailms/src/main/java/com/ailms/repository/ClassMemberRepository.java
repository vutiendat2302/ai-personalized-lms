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
import java.time.LocalDateTime;

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

    /** Lấy giáo viên và trợ giảng của lớp theo vai trò. */
    List<ClassMemberEntity> findById_ClassIdAndRoleInClassInAndStatus(
            Long classId, List<ClassMemberRole> roles, ClassMemberStatusEnum status);

    /** Lấy học viên đang học để gửi thông báo sự kiện của lớp. */
    List<ClassMemberEntity> findById_ClassIdAndRoleInClassAndStatus(
            Long classId, ClassMemberRole role, ClassMemberStatusEnum status);

    /** Lấy học viên vừa ACTIVE để scheduler phát activity cho mọi luồng ghi danh. */
    List<ClassMemberEntity> findByRoleInClassAndStatusAndJoinedAtBetween(
            ClassMemberRole role, ClassMemberStatusEnum status, LocalDateTime from, LocalDateTime to);
}
