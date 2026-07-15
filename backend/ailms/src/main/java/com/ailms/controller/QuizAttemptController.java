package com.ailms.controller;

import org.springframework.data.domain.Page;
import com.ailms.request.QuizAttemptSearchRequest;
import com.ailms.response.QuizAttemptResponse;


import com.ailms.request.QuizAttemptRequest;
import com.ailms.response.ApiResponse;
import com.ailms.response.QuizAttemptResponse;
import com.ailms.service.IQuizAttemptService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/quiz-attempts")
@RequiredArgsConstructor
public class QuizAttemptController {

    private final IQuizAttemptService quizAttemptService;

    @PostMapping
    public ResponseEntity<ApiResponse<QuizAttemptResponse>> create(@Valid @RequestBody QuizAttemptRequest request) {
        QuizAttemptResponse response = quizAttemptService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.of("Quiz attempt created successfully", response));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<QuizAttemptResponse>> update(
            @PathVariable Long id,
            @Valid @RequestBody QuizAttemptRequest request) {
        QuizAttemptResponse response = quizAttemptService.update(id, request);
        return ResponseEntity.ok(ApiResponse.of("Quiz attempt updated successfully", response));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<QuizAttemptResponse>> getById(@PathVariable Long id) {
        QuizAttemptResponse response = quizAttemptService.getById(id);
        return ResponseEntity.ok(ApiResponse.of("Quiz attempt retrieved successfully", response));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<QuizAttemptResponse>>> getAll() {
        List<QuizAttemptResponse> response = quizAttemptService.getAll();
        return ResponseEntity.ok(ApiResponse.of("Quiz attempts retrieved successfully", response));
    }

    @GetMapping("/quiz/{quizId}")
    public ResponseEntity<ApiResponse<List<QuizAttemptResponse>>> getByQuizId(@PathVariable Long quizId) {
        List<QuizAttemptResponse> response = quizAttemptService.getByQuizId(quizId);
        return ResponseEntity.ok(ApiResponse.of("Quiz attempts retrieved successfully", response));
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<ApiResponse<List<QuizAttemptResponse>>> getByUserId(@PathVariable Long userId) {
        List<QuizAttemptResponse> response = quizAttemptService.getByUserId(userId);
        return ResponseEntity.ok(ApiResponse.of("Quiz attempts retrieved successfully", response));
    }

    @GetMapping("/enrollment/{enrollmentId}")
    public ResponseEntity<ApiResponse<List<QuizAttemptResponse>>> getByEnrollmentId(@PathVariable Long enrollmentId) {
        List<QuizAttemptResponse> response = quizAttemptService.getByEnrollmentId(enrollmentId);
        return ResponseEntity.ok(ApiResponse.of("Quiz attempts retrieved successfully", response));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        quizAttemptService.delete(id);
        return ResponseEntity.ok(ApiResponse.message("Quiz attempt deleted successfully"));
    }

    @GetMapping("/search")
    public ResponseEntity<ApiResponse<Page<QuizAttemptResponse>>> search(QuizAttemptSearchRequest request) {
        Page<QuizAttemptResponse> result = quizAttemptService.search(request);
        return ResponseEntity.ok(ApiResponse.of("Search QuizAttempt successfully", result));
    }
}
