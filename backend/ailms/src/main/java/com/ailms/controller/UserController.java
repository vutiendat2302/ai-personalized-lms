package com.ailms.controller;

import com.ailms.response.PageResponse;
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

import com.ailms.response.MonthlyUserCountResponse;
import com.ailms.response.UserDetailResponse;
import org.springframework.http.HttpHeaders;

@RestController
@RequestMapping("${api.prefix}/users")
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
     * @return danh sách người dùng dạng PageResponse<UserResponse>
     */
    @GetMapping("/page")
    public ResponseEntity<ApiResponse<PageResponse<UserResponse>>> getUsers(
            UserSearchRequest request) {
        PageResponse<UserResponse> page = userService.getUsers(request);
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

    /**
     * Lấy ra số lượng student (người dùng)
     */
    @GetMapping("/students/count")
    public ResponseEntity<ApiResponse<Long>> countStudents() {
        long count = userService.countStudents();
        return ResponseEntity.ok(ApiResponse.of("Get student count successfully", count));
    }

    /**
     * Lấy ra số lượng nhân viên
     */
    @GetMapping("/employees/count")
    public ResponseEntity<ApiResponse<Long>> countEmployees() {
        long count = userService.countEmployees();
        return ResponseEntity.ok(ApiResponse.of("Get employee count successfully", count));
    }

    /**
     * Số lượng user theo từng vai trò
     */
    @GetMapping("/stats/by-role")
    public ResponseEntity<ApiResponse<Map<String, Long>>> countUsersByRole() {
        Map<String, Long> stats = userService.countUsersByRole();
        return ResponseEntity.ok(ApiResponse.of("Get user count by role successfully", stats));
    }

    /**
     * Số lượng user theo giới tính
     */
    @GetMapping("/stats/by-gender")
    public ResponseEntity<ApiResponse<Map<String, Long>>> countUsersByGender() {
        Map<String, Long> stats = userService.countUsersByGender();
        return ResponseEntity.ok(ApiResponse.of("Get user count by gender successfully", stats));
    }

    /**
     * Số lượng người dùng (UserEntity) theo trạng thái
     */
    @GetMapping("/stats/by-status")
    public ResponseEntity<ApiResponse<Map<String, Long>>> countUsersByStatus() {
        Map<String, Long> stats = userService.countUsersByStatus();
        return ResponseEntity.ok(ApiResponse.of("Get user count by status successfully", stats));
    }


    /**
     * Số lượng nhân viên theo độ tuổi
     */
    @GetMapping("/employees/stats/by-age-group")
    public ResponseEntity<ApiResponse<Map<String, Long>>> countEmployeesByAgeGroup() {
        Map<String, Long> stats = userService.countEmployeesByAgeGroup();
        return ResponseEntity.ok(ApiResponse.of("Get employee count by age group successfully", stats));
    }

    /**
     * Số lượng nhân viên theo trạng thái
     */
    @GetMapping("/employees/stats/by-status")
    public ResponseEntity<ApiResponse<Map<String, Long>>> countEmployeesByStatus() {
        Map<String, Long> stats = userService.countEmployeesByStatus();
        return ResponseEntity.ok(ApiResponse.of("Get employee count by status successfully", stats));
    }

    /**
     * Lấy số lượng người dùng mới theo tháng (trả về danh sách năm đó (12 tháng))
     */
    @GetMapping("/stats/monthly-new-users")
    public ResponseEntity<ApiResponse<List<MonthlyUserCountResponse>>> getMonthlyNewUsers(
            @RequestParam(required = false) Integer year) {
        List<MonthlyUserCountResponse> stats = userService.getMonthlyNewUsers(year);
        return ResponseEntity.ok(ApiResponse.of("Get monthly new users count successfully", stats));
    }

    /**
     * Xem chi tiết người dùng: thông tin cá nhân (student-guardian hoặc employee), thông tin tài khoản (user),
     * thông tin hệ thống (baseEntity)
     */
    @GetMapping("/{id}/detail")
    public ResponseEntity<ApiResponse<UserDetailResponse>> getUserDetail(@PathVariable Long id) {
        UserDetailResponse detail = userService.getUserDetail(id);
        return ResponseEntity.ok(ApiResponse.of("Get user detail successfully", detail));
    }

    /**
     * Gửi email tới nhiều tài khoản (sẽ có request danh sách tài khoản email, nội dung gửi về)
     */
    @PostMapping("/send-bulk-email")
    public ResponseEntity<ApiResponse<Void>> sendBulkEmail(@Valid @RequestBody SendBulkEmailRequest request) {
        userService.sendBulkEmail(request);
        return ResponseEntity.ok(ApiResponse.message("Bulk email sent successfully"));
    }

    /**
     * Xuất file excel/csv danh sách người dùng (lọc theo các query params trong UserSearchRequest: keyword, status, ...)
     */
    @GetMapping("/export-excel")
    public ResponseEntity<byte[]> exportUsersToExcel(@ModelAttribute UserSearchRequest request) {
        byte[] excelBytes = userService.exportUsersToExcel(request);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=users_export.csv")
                .header(HttpHeaders.CONTENT_TYPE, "text/csv; charset=UTF-8")
                .body(excelBytes);
    }

    /**
     * Xuất file excel/csv thông tin chi tiết đầy đủ của 1 người dùng theo ID (gồm tài khoản, hồ sơ cá nhân học viên/nhân viên/phụ huynh, hệ thống)
     */
    @GetMapping("/{id}/export-detail")
    public ResponseEntity<byte[]> exportUserDetailToExcel(@PathVariable Long id) {
        byte[] excelBytes = userService.exportUserDetailToExcel(id);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=user_detail_" + id + ".csv")
                .header(HttpHeaders.CONTENT_TYPE, "text/csv; charset=UTF-8")
                .body(excelBytes);
    }


    /**
     * Thêm nhiều nhân viên (request: một danh sách email)
     */
    @PostMapping("/bulk-create-employees")
    public ResponseEntity<ApiResponse<Map<String, Object>>> bulkCreateEmployees(@Valid @RequestBody BulkCreateEmployeeRequest request) {
        Map<String, Object> response = userService.bulkCreateEmployees(request);
        return ResponseEntity.ok(ApiResponse.of("Bulk create employees processed successfully", response));
    }
}

