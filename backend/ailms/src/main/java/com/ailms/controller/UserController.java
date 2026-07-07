package com.ailms.controller;

import com.ailms.request.AssignRolesRequest;
import com.ailms.response.UserResponse;
import com.ailms.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Page<UserResponse>> getUsers(
            @RequestParam(required = false) Integer status,
            @RequestParam(required = false) String search,
            Pageable pageable) {
        return ResponseEntity.ok(userService.getUsers(status, search, pageable));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<UserResponse> getUserById(@PathVariable Long id) {
        return ResponseEntity.ok(userService.getUserById(id));
    }

    @PostMapping("/{id}/roles")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> assignRoles(
            @PathVariable Long id, @Valid @RequestBody AssignRolesRequest request) {
        userService.assignRoles(id, request);
        return ResponseEntity.ok().build();
    }

    /**
     * Xem thông tin cá nhân của người dùng đang đăng nhập.
     */
    @GetMapping("/profile")
    public ResponseEntity<UserResponse> getProfile(org.springframework.security.core.Authentication authentication) {
        com.ailms.security.CustomUserDetails userDetails = (com.ailms.security.CustomUserDetails) authentication.getPrincipal();
        Long userId = userDetails.getUser().getId();
        return ResponseEntity.ok(userService.getUserById(userId));
    }

    /**
     * Cập nhật thông tin cá nhân.
     */
    @PutMapping("/profile")
    public ResponseEntity<?> updateProfile(
            @Valid @RequestBody com.ailms.request.UpdateProfileRequest request,
            org.springframework.security.core.Authentication authentication) {
        com.ailms.security.CustomUserDetails userDetails = (com.ailms.security.CustomUserDetails) authentication.getPrincipal();
        Long userId = userDetails.getUser().getId();
        
        UserResponse response = userService.updateProfile(userId, request);

        return ResponseEntity.ok(response);
    }

    /**
     * Xác thực email mới.
     */
    @PostMapping("/profile/verify-email")
    public ResponseEntity<String> verifyEmailChange(
            @Valid @RequestBody com.ailms.request.VerifyEmailChangeRequest request,
            org.springframework.security.core.Authentication authentication) {
        com.ailms.security.CustomUserDetails userDetails = (com.ailms.security.CustomUserDetails) authentication.getPrincipal();
        Long userId = userDetails.getUser().getId();
        
        userService.verifyEmailChange(userId, request);
        return ResponseEntity.ok("Cập nhật địa chỉ email thành công.");
    }
}
