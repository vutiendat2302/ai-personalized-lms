package com.ailms.controller;

import com.ailms.request.UpdateClassOnlineRequest;
import com.ailms.response.PageResponse;
import com.ailms.request.ClassOnlineSearchRequest;
import com.ailms.response.ClassOnlineResponse;


import com.ailms.request.CreateClassOnlineRequest;
import com.ailms.response.ApiResponse;
import com.ailms.service.IClassOnlineService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("${api.prefix}/class-online")
@RequiredArgsConstructor
public class ClassOnlineController {

    private final IClassOnlineService classOnlineService;

    @PostMapping
    @PreAuthorize("@classAccess.canCreateSession(#request.classId, #request.teacherId, authentication)")
    public ResponseEntity<ApiResponse<ClassOnlineResponse>> create(@Valid @RequestBody CreateClassOnlineRequest request) {
        ClassOnlineResponse response = classOnlineService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.of("Online class created successfully", response));
    }

    @PutMapping("/{id}")
    @PreAuthorize("@classAccess.canManageSession(#id, authentication)")
    public ResponseEntity<ApiResponse<ClassOnlineResponse>> update(
            @PathVariable Long id,
            @Valid @RequestBody UpdateClassOnlineRequest request) {
        ClassOnlineResponse response = classOnlineService.update(id, request);
        return ResponseEntity.ok(ApiResponse.of("Online class updated successfully", response));
    }

    @GetMapping("/{id}")
    @PreAuthorize("@classAccess.canViewSession(#id, authentication)")
    public ResponseEntity<ApiResponse<ClassOnlineResponse>> getById(@PathVariable Long id) {
        ClassOnlineResponse response = classOnlineService.getById(id);
        return ResponseEntity.ok(ApiResponse.of("Online class retrieved successfully", response));
    }

    @GetMapping
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_HR', 'ROLE_TEACHER', 'ROLE_TA')")
    public ResponseEntity<ApiResponse<List<ClassOnlineResponse>>> getAll() {
        List<ClassOnlineResponse> response = classOnlineService.getAll();
        return ResponseEntity.ok(ApiResponse.of("Online classes retrieved successfully", response));
    }

    @GetMapping("/class/{classId}")
    @PreAuthorize("@classAccess.canView(#classId, authentication)")
    public ResponseEntity<ApiResponse<List<ClassOnlineResponse>>> getByClassId(@PathVariable Long classId) {
        List<ClassOnlineResponse> response = classOnlineService.getByClassId(classId);
        return ResponseEntity.ok(ApiResponse.of("Online classes retrieved successfully", response));
    }

    @GetMapping("/class/{classId}/page")
    @PreAuthorize("@classAccess.canView(#classId, authentication)")
    public ResponseEntity<ApiResponse<PageResponse<ClassOnlineResponse>>> getByClassIdPage(
            @PathVariable Long classId,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "DESC") String sortDirection) {
        PageResponse<ClassOnlineResponse> response = classOnlineService.getSessionsPage(classId, keyword, status, page, size, sortDirection);
        return ResponseEntity.ok(ApiResponse.of("Online class sessions page retrieved successfully", response));
    }

    @GetMapping("/teacher/{teacherId}")
    @PreAuthorize("@classAccess.isSelfOrSystemStaff(#teacherId, authentication)")
    public ResponseEntity<ApiResponse<List<ClassOnlineResponse>>> getByTeacherId(@PathVariable Long teacherId) {
        List<ClassOnlineResponse> response = classOnlineService.getByTeacherId(teacherId);
        return ResponseEntity.ok(ApiResponse.of("Online classes retrieved successfully", response));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("@classAccess.canManageSession(#id, authentication)")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        classOnlineService.delete(id);
        return ResponseEntity.ok(ApiResponse.message("Online class deleted successfully"));
    }

    @GetMapping("/search")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_HR', 'ROLE_TEACHER', 'ROLE_TA')")
    public ResponseEntity<ApiResponse<PageResponse<ClassOnlineResponse>>> search(ClassOnlineSearchRequest request) {
        PageResponse<ClassOnlineResponse> result = classOnlineService.search(request);
        return ResponseEntity.ok(ApiResponse.of("Search ClassOnline successfully", result));
    }
}
