package com.ailms.controller;

import com.ailms.request.AuditLogSearchRequest;
import com.ailms.request.CourseSearchRequest;
import com.ailms.request.PermissionSearchRequest;
import com.ailms.request.RoleSearchRequest;
import com.ailms.request.UserSearchRequest;
import com.ailms.response.ApiResponse;
import com.ailms.response.AuditLogResponse;
import com.ailms.response.CourseResponse;
import com.ailms.response.PageResponse;
import com.ailms.response.PermissionResponse;
import com.ailms.response.RoleResponse;
import com.ailms.response.UserResponse;
import com.ailms.service.IAuditLogService;
import com.ailms.service.ICourseService;
import com.ailms.service.IPermissionService;
import com.ailms.service.IRoleService;
import com.ailms.service.IUserService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;

@RestController
@RequestMapping("${api.prefix}/admin")
@PreAuthorize("hasRole('ROLE_ADMIN')")
@RequiredArgsConstructor
public class AdminSearchController {

    private final IUserService userService;
    private final IAuditLogService auditLogService;
    private final ICourseService courseService;
    private final IRoleService roleService;
    private final IPermissionService permissionService;

    @GetMapping("/users/search")
    public ResponseEntity<ApiResponse<PageResponse<UserResponse>>> searchUsers(UserSearchRequest request) {
        PageResponse<UserResponse> response = userService.getUsers(request);
        return ResponseEntity.ok(ApiResponse.of("Users retrieved successfully", response));
    }

    @GetMapping("/audit-logs/search")
    public ResponseEntity<ApiResponse<PageResponse<AuditLogResponse>>> searchAuditLogs(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime to,
            AuditLogSearchRequest request) {

        if (keyword != null) request.setKeyword(keyword);
        if (from != null) request.setOccurredFrom(from);
        if (to != null) request.setOccurredTo(to);

        PageResponse<AuditLogResponse> response = auditLogService.getAuditLogs(request);
        return ResponseEntity.ok(ApiResponse.of("Audit logs retrieved successfully", response));
    }

    @GetMapping("/courses/search")
    public ResponseEntity<ApiResponse<PageResponse<CourseResponse>>> searchCourses(CourseSearchRequest request) {
        PageResponse<CourseResponse> response = courseService.search(request);
        return ResponseEntity.ok(ApiResponse.of("Courses retrieved successfully", response));
    }

    @GetMapping("/roles/search")
    public ResponseEntity<ApiResponse<PageResponse<RoleResponse>>> searchRoles(RoleSearchRequest request) {
        PageResponse<RoleResponse> response = roleService.getRoles(request);
        return ResponseEntity.ok(ApiResponse.of("Roles retrieved successfully", response));
    }

    @GetMapping("/permissions/search")
    public ResponseEntity<ApiResponse<PageResponse<PermissionResponse>>> searchPermissions(PermissionSearchRequest request) {
        PageResponse<PermissionResponse> response = permissionService.getPermissions(request);
        return ResponseEntity.ok(ApiResponse.of("Permissions retrieved successfully", response));
    }
}
