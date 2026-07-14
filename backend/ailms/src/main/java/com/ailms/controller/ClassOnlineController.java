package com.ailms.controller;

import com.ailms.request.ClassOnlineRequest;
import com.ailms.response.ApiResponse;
import com.ailms.response.ClassOnlineResponse;
import com.ailms.service.ClassOnlineService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/class-online")
@RequiredArgsConstructor
public class ClassOnlineController {

    private final ClassOnlineService classOnlineService;

    @PostMapping
    public ResponseEntity<ApiResponse<ClassOnlineResponse>> create(@Valid @RequestBody ClassOnlineRequest request) {
        ClassOnlineResponse response = classOnlineService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.of("Online class created successfully", response));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<ClassOnlineResponse>> update(
            @PathVariable Long id,
            @Valid @RequestBody ClassOnlineRequest request) {
        ClassOnlineResponse response = classOnlineService.update(id, request);
        return ResponseEntity.ok(ApiResponse.of("Online class updated successfully", response));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<ClassOnlineResponse>> getById(@PathVariable Long id) {
        ClassOnlineResponse response = classOnlineService.getById(id);
        return ResponseEntity.ok(ApiResponse.of("Online class retrieved successfully", response));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<ClassOnlineResponse>>> getAll() {
        List<ClassOnlineResponse> response = classOnlineService.getAll();
        return ResponseEntity.ok(ApiResponse.of("Online classes retrieved successfully", response));
    }

    @GetMapping("/class/{classId}")
    public ResponseEntity<ApiResponse<List<ClassOnlineResponse>>> getByClassId(@PathVariable Long classId) {
        List<ClassOnlineResponse> response = classOnlineService.getByClassId(classId);
        return ResponseEntity.ok(ApiResponse.of("Online classes retrieved successfully", response));
    }

    @GetMapping("/teacher/{teacherId}")
    public ResponseEntity<ApiResponse<List<ClassOnlineResponse>>> getByTeacherId(@PathVariable Long teacherId) {
        List<ClassOnlineResponse> response = classOnlineService.getByTeacherId(teacherId);
        return ResponseEntity.ok(ApiResponse.of("Online classes retrieved successfully", response));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        classOnlineService.delete(id);
        return ResponseEntity.ok(ApiResponse.message("Online class deleted successfully"));
    }
}
