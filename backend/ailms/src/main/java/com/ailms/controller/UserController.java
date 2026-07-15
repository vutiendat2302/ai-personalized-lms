package com.ailms.controller;

import org.springframework.data.domain.Page;
import com.ailms.request.UserSearchRequest;
import com.ailms.response.UserResponse;


import com.ailms.request.*;
import com.ailms.response.ApiResponse;
import com.ailms.response.EffectivePermissionResponse;
import com.ailms.security.CustomUserDetails;
import com.ailms.service.IUserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
@Slf4j
public class UserController {

    private final IUserService userService;

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<UserResponse>> getUserById(@PathVariable Long id) {
        UserResponse response = userService.getUserById(id);
        return ResponseEntity.ok(ApiResponse.of("User retrieved successfully", response));
    }

    @PostMapping()
    @PreAuthorize("hasRole('ROLE_ADMIN')")
    public ResponseEntity<ApiResponse<UserResponse>> createUser(@Valid @RequestBody CreateUserRequest request) {
        UserResponse response = userService.createUser(request);
        log.info("create completed");
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.of("User created successfully", response));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<UserResponse>> updateUser(
            @PathVariable Long id,
            @Valid @RequestBody UpdateUserRequest request) {
        UserResponse response = userService.updateUser(id, request);
        return ResponseEntity.ok(ApiResponse.of("User updated successfully", response));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteUser(@PathVariable Long id) {
        userService.deleteUser(id);
        return ResponseEntity.ok(ApiResponse.message("User soft-deleted successfully"));
    }

    /**
     * Xem thông tin cá nhân của người dùng đang đăng nhập.
     */
    @GetMapping("/profile")
    public ResponseEntity<ApiResponse<UserResponse>> getProfile(Authentication authentication) {
        CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();
        Long userId = userDetails.getUser().getId();
        UserResponse response = userService.getUserById(userId);
        return ResponseEntity.ok(ApiResponse.of("Profile retrieved successfully", response));
    }

    /**
     * Cập nhật thông tin cá nhân.
     */
    @PutMapping("/profile")
    public ResponseEntity<ApiResponse<UserResponse>> updateProfile(
            @Valid @RequestBody UpdateProfileRequest request,
            Authentication authentication) {
        CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();
        Long userId = userDetails.getUser().getId();
        UserResponse response = userService.updateProfile(userId, request);
        return ResponseEntity.ok(ApiResponse.of("Profile updated successfully", response));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<UserResponse>>> getAllUsers() {
        List<UserResponse> users = userService.getAllUsers();
        return ResponseEntity.ok(ApiResponse.of("Get all users successfully", users));
    }

    @PostMapping("/invite")
    public ResponseEntity<ApiResponse<Void>> inviteUser(@Valid @RequestBody InviteUserRequest request) {
        userService.inviteUser(request);
        return ResponseEntity.ok(ApiResponse.message("Invitation sent successfully"));
    }

    /**
     * Lấy danh sách người dùng theo điều kiện tìm kiếm và phân trang.
     * Các tham số trong UserSearchRequest có thể được truyền qua query string:
     * - keyword: từ khóa tìm kiếm (username, email, ...)
     * - page: số trang (bắt đầu từ 0)
     * - size: số bản ghi trên mỗi trang
     * - sortBy: trường sắp xếp
     * - sortDir: hướng sắp xếp (ASC/DESC)
     *
     * @param request chứa các điều kiện tìm kiếm, phân trang và sắp xếp
     * @return danh sách người dùng dạng Page<UserResponse>
     */
    @GetMapping("/page")
    public ResponseEntity<ApiResponse<Page<UserResponse>>> getUsers(
            UserSearchRequest request) {
        Page<UserResponse> page = userService.getUsers(request);
        return ResponseEntity.ok(ApiResponse.of("Users retrieved successfully", page));
    }

    @PostMapping("/bulk-delete")
    public ResponseEntity<ApiResponse<Map<String, Object>>> bulkDelete(@Valid @RequestBody BulkDeleteRequest request) {
        Map<String, Object> response = userService.bulkDelete(request);
        return ResponseEntity.ok(ApiResponse.of("Bulk delete processed", response));
    }

    /**
     * Gán một role cho nhiều user cùng lúc.
     * Request gồm:
     * - Danh sách userIds cần gán role
     * - roleId cần gán
     * Kết quả trả về:
     * - Số lượng gán thành công
     * - Số lượng thất bại
     * - Danh sách lỗi (nếu có)
     */
    @PostMapping("/bulk-assign-role")
    public ResponseEntity<ApiResponse<Map<String, Object>>> bulkAssignRole(@Valid @RequestBody BulkAssignRoleRequest request) {
        Map<String, Object> response = userService.bulkAssignRole(request);
        return ResponseEntity.ok(ApiResponse.of("Bulk assign role processed", response));
    }

    @GetMapping("/{id}/effective-permissions")
    public ResponseEntity<ApiResponse<List<EffectivePermissionResponse>>> getEffectivePermissions(@PathVariable Long id) {
        List<EffectivePermissionResponse> response = userService.getEffectivePermissions(id);
        return ResponseEntity.ok(ApiResponse.of("Effective permissions retrieved successfully", response));
    }

    @PostMapping("/{id}/roles")
    public ResponseEntity<ApiResponse<Void>> assignRoles(
            @PathVariable Long id, @Valid @RequestBody AssignRolesRequest request) {
        userService.assignRoles(id, request);
        return ResponseEntity.ok(ApiResponse.message("Roles assigned successfully"));
    }

    /**
     * Xác thực email mới.
     */
    @PostMapping("/profile/verify-email")
    public ResponseEntity<ApiResponse<Void>> verifyEmailChange(
            @Valid @RequestBody VerifyEmailChangeRequest request,
            Authentication authentication) {
        CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();
        Long userId = userDetails.getUser().getId();
        userService.verifyEmailChange(userId, request);
        return ResponseEntity.ok(ApiResponse.message("Cập nhật địa chỉ email thành công."));
    }
}
