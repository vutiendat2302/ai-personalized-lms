package com.ailms.controller;

import com.ailms.request.CreateClassStreamPostRequest;
import com.ailms.response.ApiResponse;
import com.ailms.response.ClassStreamPostResponse;
import com.ailms.response.PageResponse;
import com.ailms.service.IClassStreamPostService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("${api.prefix}/classes/{classId}/stream-posts")
@RequiredArgsConstructor
public class ClassStreamPostController {

    private final IClassStreamPostService streamPostService;

    @PostMapping
    public ResponseEntity<ApiResponse<ClassStreamPostResponse>> createPost(
            @PathVariable Long classId,
            @Valid @RequestBody CreateClassStreamPostRequest request) {
        ClassStreamPostResponse response = streamPostService.createPost(classId, request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.of("Stream post created successfully", response));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<ClassStreamPostResponse>>> getPostsPage(
            @PathVariable Long classId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        PageResponse<ClassStreamPostResponse> response = streamPostService.getPostsPage(classId, page, size);
        return ResponseEntity.ok(ApiResponse.of("Stream posts retrieved successfully", response));
    }

    @DeleteMapping("/{postId}")
    public ResponseEntity<ApiResponse<Void>> deletePost(@PathVariable Long postId) {
        streamPostService.deletePost(postId);
        return ResponseEntity.ok(ApiResponse.message("Stream post deleted successfully"));
    }
}
