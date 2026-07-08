package com.ailms.controller;

import com.ailms.request.*;
import com.ailms.response.ApiResponse;
import com.ailms.response.UserResponse;
import com.ailms.response.AuditLogResponse;
import com.ailms.response.EffectivePermissionResponse;
import com.ailms.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
@Slf4j
public class UserController {

    private final UserService userService;

    @GetMapping("/page")
    @PreAuthorize("hasRole('ROLE_M1')")
    public ResponseEntity<ApiResponse<Page<UserResponse>>> getUsers(
            UserSearchRequest request) {
        Page<UserResponse> page = userService.getUsers(request);
        return ResponseEntity.ok(ApiResponse.of("Users retrieved successfully", page));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasRole('ROLE_M1')")
    public ResponseEntity<ApiResponse<UserResponse>> getUserById(@PathVariable Long id) {
        UserResponse response = userService.getUserById(id);
        return ResponseEntity.ok(ApiResponse.of("User retrieved successfully", response));
    }

    @PostMapping("/{adminId}")
    @PreAuthorize("hasRole('ROLE_M1')")
    public ResponseEntity<ApiResponse<UserResponse>> createUser(@Valid @RequestBody CreateUserRequest request, @PathVariable Long adminId) {
        UserResponse response = userService.createUser(request, adminId);
        log.info("create completed");
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.of("User created successfully", response));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ROLE_M1')")
    public ResponseEntity<ApiResponse<UserResponse>> updateUser(
            @PathVariable Long id,
            @Valid @RequestBody UpdateUserRequest request) {
        UserResponse response = userService.updateUser(id, request);
        return ResponseEntity.ok(ApiResponse.of("User updated successfully", response));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> deleteUser(@PathVariable Long id) {
        userService.deleteUser(id);
        return ResponseEntity.ok(ApiResponse.message("User soft-deleted successfully"));
    }

//    @PostMapping("/invite")
//    @PreAuthorize("hasRole('ADMIN')")
//    public ResponseEntity<ApiResponse<Void>> inviteUser(@Valid @RequestBody InviteUserRequest request) {
//        userService.inviteUser(request);
//        return ResponseEntity.ok(ApiResponse.message("Invitation sent successfully"));
//    }
//
//    @PostMapping("/bulk-delete")
//    @PreAuthorize("hasRole('ADMIN')")
//    public ResponseEntity<ApiResponse<Map<String, Object>>> bulkDelete(@Valid @RequestBody BulkDeleteRequest request) {
//        Map<String, Object> response = userService.bulkDelete(request);
//        return ResponseEntity.ok(ApiResponse.of("Bulk delete processed", response));
//    }
//
//    @PostMapping("/bulk-assign-role")
//    @PreAuthorize("hasRole('ADMIN')")
//    public ResponseEntity<ApiResponse<Map<String, Object>>> bulkAssignRole(@Valid @RequestBody BulkAssignRoleRequest request) {
//        Map<String, Object> response = userService.bulkAssignRole(request);
//        return ResponseEntity.ok(ApiResponse.of("Bulk assign role processed", response));
//    }
//
//    @GetMapping("/{id}/audit-logs")
//    @PreAuthorize("hasRole('ADMIN')")
//    public ResponseEntity<ApiResponse<Page<AuditLogResponse>>> getAuditLogs(
//            @PathVariable Long id,
//            @RequestParam(required = false) String action,
//            @RequestParam(required = false) LocalDateTime start,
//            @RequestParam(required = false) LocalDateTime end,
//            Pageable pageable) {
//        // Query audit_log where entity_type='user' and entity_id=id
//        Page<AuditLogResponse> logs = userService.getAuditLogs("user", id, action, start, end, pageable);
//        return ResponseEntity.ok(ApiResponse.of("User activity logs retrieved successfully", logs));
//    }
//
//    @GetMapping("/{id}/effective-permissions")
//    @PreAuthorize("hasRole('ADMIN')")
//    public ResponseEntity<ApiResponse<List<EffectivePermissionResponse>>> getEffectivePermissions(@PathVariable Long id) {
//        List<EffectivePermissionResponse> response = userService.getEffectivePermissions(id);
//        return ResponseEntity.ok(ApiResponse.of("Effective permissions retrieved successfully", response));
//    }
//
//    @PostMapping("/{id}/roles")
//    @PreAuthorize("hasRole('ADMIN')")
//    public ResponseEntity<ApiResponse<Void>> assignRoles(
//            @PathVariable Long id, @Valid @RequestBody AssignRolesRequest request) {
//        userService.assignRoles(id, request);
//        return ResponseEntity.ok(ApiResponse.message("Roles assigned successfully"));
//    }

    /**
     * Xem thông tin cá nhân của người dùng đang đăng nhập.
     */
    @GetMapping("/profile")
    public ResponseEntity<ApiResponse<UserResponse>> getProfile(org.springframework.security.core.Authentication authentication) {
        com.ailms.security.CustomUserDetails userDetails = (com.ailms.security.CustomUserDetails) authentication.getPrincipal();
        Long userId = userDetails.getUser().getId();
        UserResponse response = userService.getUserById(userId);
        return ResponseEntity.ok(ApiResponse.of("Profile retrieved successfully", response));
    }

    /**
     * Cập nhật thông tin cá nhân.
     */
    @PutMapping("/profile")
    public ResponseEntity<ApiResponse<UserResponse>> updateProfile(
            @Valid @RequestBody com.ailms.request.UpdateProfileRequest request,
            org.springframework.security.core.Authentication authentication) {
        com.ailms.security.CustomUserDetails userDetails = (com.ailms.security.CustomUserDetails) authentication.getPrincipal();
        Long userId = userDetails.getUser().getId();
        UserResponse response = userService.updateProfile(userId, request);
        return ResponseEntity.ok(ApiResponse.of("Profile updated successfully", response));
    }

    /**
     * Xác thực email mới.
     */
    @PostMapping("/profile/verify-email")
    public ResponseEntity<ApiResponse<Void>> verifyEmailChange(
            @Valid @RequestBody com.ailms.request.VerifyEmailChangeRequest request,
            org.springframework.security.core.Authentication authentication) {
        com.ailms.security.CustomUserDetails userDetails = (com.ailms.security.CustomUserDetails) authentication.getPrincipal();
        Long userId = userDetails.getUser().getId();
        userService.verifyEmailChange(userId, request);
        return ResponseEntity.ok(ApiResponse.message("Cập nhật địa chỉ email thành công."));
    }

    @GetMapping
    @PreAuthorize("hasRole('ROLE_M1')")
    public ResponseEntity<ApiResponse<List<UserResponse>>> getAllUsers() {
        List<UserResponse> users = userService.getAllUsers();
        return ResponseEntity.ok(ApiResponse.of("Get all users successfully", users));
    }
}
