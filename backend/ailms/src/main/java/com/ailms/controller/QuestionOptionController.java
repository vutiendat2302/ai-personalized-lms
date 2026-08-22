package com.ailms.controller;

import com.ailms.response.PageResponse;
import com.ailms.request.QuestionOptionSearchRequest;
import com.ailms.response.QuestionOptionResponse;

import com.ailms.request.QuestionOptionRequest;
import com.ailms.response.ApiResponse;
import com.ailms.response.QuestionOptionResponse;
import com.ailms.service.IQuestionOptionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/question-options")
@RequiredArgsConstructor
@PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_HR')")
public class QuestionOptionController {

    private final IQuestionOptionService questionOptionService;

    @PostMapping
    public ResponseEntity<ApiResponse<QuestionOptionResponse>> create(
            @Valid @RequestBody QuestionOptionRequest request) {
        QuestionOptionResponse response = questionOptionService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.of("Question option created successfully", response));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<QuestionOptionResponse>> update(
            @PathVariable Long id,
            @Valid @RequestBody QuestionOptionRequest request) {
        QuestionOptionResponse response = questionOptionService.update(id, request);
        return ResponseEntity.ok(ApiResponse.of("Question option updated successfully", response));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<QuestionOptionResponse>> getById(@PathVariable Long id) {
        QuestionOptionResponse response = questionOptionService.getById(id);
        return ResponseEntity.ok(ApiResponse.of("Question option retrieved successfully", response));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<QuestionOptionResponse>>> getAll() {
        List<QuestionOptionResponse> response = questionOptionService.getAll();
        return ResponseEntity.ok(ApiResponse.of("Question options retrieved successfully", response));
    }

    @GetMapping("/question/{questionId}")
    public ResponseEntity<ApiResponse<List<QuestionOptionResponse>>> getByQuestionId(@PathVariable Long questionId) {
        List<QuestionOptionResponse> response = questionOptionService.getByQuestionId(questionId);
        return ResponseEntity.ok(ApiResponse.of("Question options retrieved successfully", response));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        questionOptionService.delete(id);
        return ResponseEntity.ok(ApiResponse.message("Question option deleted successfully"));
    }

    @GetMapping("/search")
    public ResponseEntity<ApiResponse<PageResponse<QuestionOptionResponse>>> search(QuestionOptionSearchRequest request) {
        PageResponse<QuestionOptionResponse> result = questionOptionService.search(request);
        return ResponseEntity.ok(ApiResponse.of("Search QuestionOption successfully", result));
    }
}
