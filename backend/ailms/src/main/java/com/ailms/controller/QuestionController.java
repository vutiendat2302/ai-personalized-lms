package com.ailms.controller;

import com.ailms.response.PageResponse;
import com.ailms.request.QuestionSearchRequest;
import com.ailms.response.QuestionResponse;

import com.ailms.request.QuestionRequest;
import com.ailms.response.ApiResponse;
import com.ailms.response.QuestionResponse;
import com.ailms.service.IQuestionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/questions")
@RequiredArgsConstructor
@PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_HR')")
public class QuestionController {

    private final IQuestionService questionService;

    @PostMapping
    public ResponseEntity<ApiResponse<QuestionResponse>> create(@Valid @RequestBody QuestionRequest request) {
        QuestionResponse response = questionService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.of("Question created successfully", response));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<QuestionResponse>> update(
            @PathVariable Long id,
            @Valid @RequestBody QuestionRequest request) {
        QuestionResponse response = questionService.update(id, request);
        return ResponseEntity.ok(ApiResponse.of("Question updated successfully", response));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<QuestionResponse>> getById(@PathVariable Long id) {
        QuestionResponse response = questionService.getById(id);
        return ResponseEntity.ok(ApiResponse.of("Question retrieved successfully", response));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<QuestionResponse>>> getAll() {
        List<QuestionResponse> response = questionService.getAll();
        return ResponseEntity.ok(ApiResponse.of("Questions retrieved successfully", response));
    }

    @GetMapping("/quiz/{quizId}")
    public ResponseEntity<ApiResponse<List<QuestionResponse>>> getByQuizId(@PathVariable Long quizId) {
        List<QuestionResponse> response = questionService.getByQuizId(quizId);
        return ResponseEntity.ok(ApiResponse.of("Questions retrieved successfully", response));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        questionService.delete(id);
        return ResponseEntity.ok(ApiResponse.message("Question deleted successfully"));
    }

    @GetMapping("/search")
    public ResponseEntity<ApiResponse<PageResponse<QuestionResponse>>> search(QuestionSearchRequest request) {
        PageResponse<QuestionResponse> result = questionService.search(request);
        return ResponseEntity.ok(ApiResponse.of("Search Question successfully", result));
    }
}
