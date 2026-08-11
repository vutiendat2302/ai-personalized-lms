package com.ailms.security;

import com.ailms.repository.CoursePackageRepository;
import com.ailms.repository.CourseRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;

/** Kiểm tra ownership khóa học cho các API soạn thảo và quản lý gói. */
@Component("courseAccess")
@RequiredArgsConstructor
public class CourseAccess {

    private final CourseRepository courseRepository;
    private final CoursePackageRepository coursePackageRepository;

    /** Cho phép Admin/HR hoặc đúng người tạo khóa học thay đổi khóa học. */
    public boolean canManage(Long courseId, Authentication authentication) {
        if (hasAnyRole(authentication, "ROLE_ADMIN", "ROLE_HR")) return true;
        Long currentUserId = currentUserId(authentication);
        return currentUserId != null && courseRepository.findById(courseId)
                .map(course -> currentUserId.equals(course.getCreatedBy()))
                .orElse(false);
    }

    /** Kiểm tra quyền thay đổi gói thông qua ownership của khóa học chứa gói. */
    public boolean canManagePackage(Long packageId, Authentication authentication) {
        return coursePackageRepository.findById(packageId)
                .map(pkg -> canManage(pkg.getCourseEntity().getId(), authentication))
                .orElse(false);
    }

    /** Lấy ID người dùng từ principal JWT. */
    private Long currentUserId(Authentication authentication) {
        if (authentication == null || !(authentication.getPrincipal() instanceof CustomUserDetails details)
                || details.getUser() == null) return null;
        return details.getUser().getId();
    }

    /** Kiểm tra một trong các role quản trị hệ thống. */
    private boolean hasAnyRole(Authentication authentication, String... roles) {
        if (authentication == null || !authentication.isAuthenticated()) return false;
        java.util.Set<String> allowed = java.util.Set.of(roles);
        return authentication.getAuthorities().stream()
                .anyMatch(item -> allowed.contains(item.getAuthority().toUpperCase()));
    }
}
