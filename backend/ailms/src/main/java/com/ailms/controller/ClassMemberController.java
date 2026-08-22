package com.ailms.controller;

import com.ailms.entity.ClassMemberEntity;
import com.ailms.entity.enums.ClassMemberRole;
import com.ailms.response.ApiResponse;
import com.ailms.response.ClassMemberResponse;
import com.ailms.response.MemberDetailResponse;
import com.ailms.response.PageResponse;
import com.ailms.request.ReplaceClassTeacherRequest;
import jakarta.validation.Valid;
import com.ailms.service.IClassMemberService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("${api.prefix}/classes")
@RequiredArgsConstructor
public class ClassMemberController {

    private final IClassMemberService classMemberService;

    @PostMapping("/{classId}/members/{userId}/join")
    @PreAuthorize("@classAccess.canManage(#classId, authentication)")
    public ResponseEntity<ApiResponse<ClassMemberResponse>> join(
            @PathVariable Long classId,
            @PathVariable Long userId,
            @RequestParam ClassMemberRole role) {
        ClassMemberEntity member = classMemberService.join(classId, userId, role);
        return ResponseEntity.ok(ApiResponse.of("Joined class successfully", mapToResponse(member)));
    }

    @PostMapping("/{classId}/members/{userId}/leave")
    @PreAuthorize("@classAccess.canManage(#classId, authentication)")
    public ResponseEntity<ApiResponse<ClassMemberResponse>> leave(
            @PathVariable Long classId,
            @PathVariable Long userId,
            @RequestParam(required = false, defaultValue = "Self-initiated leave") String reason) {
        ClassMemberEntity member = classMemberService.leave(classId, userId, reason);
        return ResponseEntity.ok(ApiResponse.of("Left class successfully", mapToResponse(member)));
    }

    @PostMapping("/{classId}/members/{userId}/transfer")
    @PreAuthorize("@classAccess.canManage(#classId, authentication)")
    public ResponseEntity<ApiResponse<Void>> transfer(
            @PathVariable Long classId,
            @PathVariable Long userId,
            @RequestParam Long toClassId) {
        classMemberService.transfer(classId, toClassId, userId);
        return ResponseEntity.ok(ApiResponse.message("Transferred class successfully"));
    }

    @PostMapping("/{classId}/members/{userId}/rejoin")
    @PreAuthorize("@classAccess.canManage(#classId, authentication)")
    public ResponseEntity<ApiResponse<ClassMemberResponse>> rejoin(
            @PathVariable Long classId,
            @PathVariable Long userId) {
        ClassMemberEntity member = classMemberService.rejoin(classId, userId);
        return ResponseEntity.ok(ApiResponse.of("Rejoined class successfully", mapToResponse(member)));
    }

    /** HR/Admin thay giáo viên lớp atomically sau khi backend kiểm tra trùng lịch. */
    @PostMapping("/{classId}/teacher/replace")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_HR')")
    public ResponseEntity<ApiResponse<ClassMemberResponse>> replaceTeacher(
            @PathVariable Long classId, @Valid @RequestBody ReplaceClassTeacherRequest request) {
        ClassMemberEntity member = classMemberService.replaceTeacher(
                classId, request.getNewTeacherUserId(), request.getReason());
        return ResponseEntity.ok(ApiResponse.of("Teacher replaced successfully", mapToResponse(member)));
    }

    @GetMapping("/members/user/{userId}")
    @PreAuthorize("@classAccess.isSelfOrSystemStaff(#userId, authentication)")
    public ResponseEntity<ApiResponse<List<ClassMemberResponse>>> getByUserId(@PathVariable Long userId) {
        List<ClassMemberResponse> members = classMemberService.getByUserId(userId);
        return ResponseEntity.ok(ApiResponse.of("Class memberships retrieved successfully", members));
    }

    @GetMapping("/{classId}/members")
    @PreAuthorize("@classAccess.canView(#classId, authentication)")
    public ResponseEntity<ApiResponse<List<ClassMemberResponse>>> getByClassId(@PathVariable Long classId) {
        return ResponseEntity.ok(ApiResponse.of(
                "Class members retrieved successfully",
                classMemberService.getByClassId(classId)
        ));
    }

    @GetMapping("/{classId}/members/{userId}/detail")
    @PreAuthorize("@classAccess.canViewMemberDetail(#classId, #userId, authentication)")
    public ResponseEntity<ApiResponse<MemberDetailResponse>> getMemberDetail(
            @PathVariable Long classId,
            @PathVariable Long userId) {
        return ResponseEntity.ok(ApiResponse.of(
                "Member detail retrieved successfully",
                classMemberService.getMemberDetail(classId, userId)
        ));
    }

    @GetMapping("/{classId}/members/page")
    @PreAuthorize("@classAccess.canView(#classId, authentication)")
    public ResponseEntity<ApiResponse<PageResponse<ClassMemberResponse>>> getMembersPage(
            @PathVariable Long classId,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String role,
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(ApiResponse.of(
                "Class members paged retrieved successfully",
                classMemberService.getMembersPage(classId, keyword, role, status, page, size)
        ));
    }

    private ClassMemberResponse mapToResponse(ClassMemberEntity entity) {
        return ClassMemberResponse.builder()
                .classId(entity.getClassEntity().getId())
                .className(entity.getClassEntity().getName())
                .userId(entity.getUserEntity().getId())
                .username(entity.getUserEntity().getUsername())
                .fullName(entity.getUserEntity().getFullName())
                .email(entity.getUserEntity().getEmail())
                .avatarUrl(entity.getUserEntity().getAvatarUrl())
                .roleInClass(entity.getRoleInClass())
                .status(entity.getStatus())
                .joinedAt(entity.getJoinedAt())
                .waitlistedAt(entity.getWaitlistedAt())
                .leftAt(entity.getLeftAt())
                .build();
    }
}
