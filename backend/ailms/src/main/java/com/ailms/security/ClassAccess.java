package com.ailms.security;

import com.ailms.entity.enums.ClassMemberRole;
import com.ailms.entity.enums.ClassMemberStatusEnum;
import com.ailms.repository.ClassMemberRepository;
import com.ailms.repository.ClassOnlineRepository;
import com.ailms.repository.ClassResourceRepository;
import com.ailms.repository.ClassStreamPostRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;

import java.util.List;

/** Kiểm tra membership/ownership lớp dùng trực tiếp trong method security. */
@Component("classAccess")
@RequiredArgsConstructor
public class ClassAccess {

    private final ClassMemberRepository classMemberRepository;
    private final ClassOnlineRepository classOnlineRepository;
    private final ClassResourceRepository classResourceRepository;
    private final ClassStreamPostRepository classStreamPostRepository;

    /** Cho phép staff hệ thống hoặc thành viên ACTIVE xem dữ liệu một lớp. */
    public boolean canView(Long classId, Authentication authentication) {
        if (isSystemStaff(authentication)) return true;
        Long userId = currentUserId(authentication);
        return userId != null && classMemberRepository
                .findById_ClassIdAndId_UserId(classId, userId)
                .filter(item -> item.getStatus() == ClassMemberStatusEnum.ACTIVE)
                .isPresent();
    }

    /** Chỉ Admin/HR hoặc giáo viên/trợ giảng ACTIVE của đúng lớp được quản trị. */
    public boolean canManage(Long classId, Authentication authentication) {
        if (hasAnyRole(authentication, "ROLE_ADMIN", "ROLE_HR")) return true;
        Long userId = currentUserId(authentication);
        return userId != null && classMemberRepository
                .findById_ClassIdAndId_UserId(classId, userId)
                .filter(item -> item.getStatus() == ClassMemberStatusEnum.ACTIVE)
                .filter(item -> item.getRoleInClass() == ClassMemberRole.TEACHER
                        || item.getRoleInClass() == ClassMemberRole.TA)
                .isPresent();
    }

    /** Kiểm tra quyền xem lớp chứa một buổi học. */
    public boolean canViewSession(Long sessionId, Authentication authentication) {
        return classOnlineRepository.findById(sessionId)
                .map(item -> canView(item.getClassEntity().getId(), authentication))
                .orElse(false);
    }

    /** Kiểm tra quyền quản trị lớp chứa một buổi học. */
    public boolean canManageSession(Long sessionId, Authentication authentication) {
        return classOnlineRepository.findById(sessionId)
                .map(item -> canManage(item.getClassEntity().getId(), authentication))
                .orElse(false);
    }

    /** Chặn người dạy tạo buổi dưới danh tính của một người dạy khác. */
    public boolean canCreateSession(Long classId, Long teacherId, Authentication authentication) {
        return canManage(classId, authentication)
                && (isSystemStaff(authentication) || teacherId.equals(currentUserId(authentication)));
    }

    /** Kiểm tra tài liệu thực sự thuộc lớp và người gọi được quản trị lớp đó. */
    public boolean canManageResource(Long classId, Long resourceId, Authentication authentication) {
        return classResourceRepository.findById(resourceId)
                .filter(item -> item.getClassEntity().getId().equals(classId))
                .map(item -> canManage(classId, authentication))
                .orElse(false);
    }

    /** Kiểm tra bài bảng tin thực sự thuộc lớp và người gọi được quản trị lớp đó. */
    public boolean canManagePost(Long classId, Long postId, Authentication authentication) {
        return classStreamPostRepository.findById(postId)
                .filter(item -> item.getClassEntity().getId().equals(classId))
                .map(item -> canManage(classId, authentication))
                .orElse(false);
    }

    /** Cho phép chính người dùng hoặc staff hệ thống đọc danh sách lớp của họ. */
    public boolean isSelfOrSystemStaff(Long userId, Authentication authentication) {
        return isSystemStaff(authentication) || userId.equals(currentUserId(authentication));
    }

    /** Chỉ chính học viên hoặc người quản trị đúng lớp được xem tiến độ/điểm chi tiết. */
    public boolean canViewMemberDetail(Long classId, Long userId, Authentication authentication) {
        return userId.equals(currentUserId(authentication)) || canManage(classId, authentication);
    }

    /** Xác định nhóm vai trò quản trị có thể xem mọi lớp. */
    private boolean isSystemStaff(Authentication authentication) {
        return hasAnyRole(authentication, "ROLE_ADMIN", "ROLE_HR");
    }

    /** Lấy Snowflake ID từ principal JWT hiện tại. */
    private Long currentUserId(Authentication authentication) {
        if (authentication == null || !(authentication.getPrincipal() instanceof CustomUserDetails details)
                || details.getUser() == null) return null;
        return details.getUser().getId();
    }

    /** Kiểm tra authentication có ít nhất một authority chỉ định. */
    private boolean hasAnyRole(Authentication authentication, String... roles) {
        if (authentication == null || !authentication.isAuthenticated()) return false;
        List<String> allowed = List.of(roles);
        return authentication.getAuthorities().stream()
                .anyMatch(item -> allowed.contains(item.getAuthority().toUpperCase()));
    }
}
