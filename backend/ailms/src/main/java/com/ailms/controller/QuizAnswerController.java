package com.ailms.controller;

import com.ailms.request.QuizAnswerRequest;
import com.ailms.response.ApiResponse;
import com.ailms.response.QuizAnswerResponse;
import com.ailms.service.QuizAnswerService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/quiz-answers")
@RequiredArgsConstructor
public class QuizAnswerController {

    private final QuizAnswerService quizAnswerService;

    @PostMapping
    public ResponseEntity<ApiResponse<QuizAnswerResponse>> create(@Valid @RequestBody QuizAnswerRequest request) {
        QuizAnswerResponse response = quizAnswerService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.of("Quiz answer created successfully", response));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<QuizAnswerResponse>> update(
            @PathVariable Long id,
            @Valid @RequestBody QuizAnswerRequest request) {
        QuizAnswerResponse response = quizAnswerService.update(id, request);
        return ResponseEntity.ok(ApiResponse.of("Quiz answer updated successfully", response));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<QuizAnswerResponse>> getById(@PathVariable Long id) {
        QuizAnswerResponse response = quizAnswerService.getById(id);
        return ResponseEntity.ok(ApiResponse.of("Quiz answer retrieved successfully", response));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<QuizAnswerResponse>>> getAll() {
        List<QuizAnswerResponse> response = quizAnswerService.getAll();
        return ResponseEntity.ok(ApiResponse.of("Quiz answers retrieved successfully", response));
    }

    @GetMapping("/attempt/{attemptId}")
    public ResponseEntity<ApiResponse<List<QuizAnswerResponse>>> getByAttemptId(@PathVariable Long attemptId) {
        List<QuizAnswerResponse> response = quizAnswerService.getByAttemptId(attemptId);
        return ResponseEntity.ok(ApiResponse.of("Quiz answers retrieved successfully", response));
    }

    @GetMapping("/question/{questionId}")
    public ResponseEntity<ApiResponse<List<QuizAnswerResponse>>> getByQuestionId(@PathVariable Long questionId) {
        List<QuizAnswerResponse> response = quizAnswerService.getByQuestionId(questionId);
        return ResponseEntity.ok(ApiResponse.of("Quiz answers retrieved successfully", response));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        quizAnswerService.delete(id);
        return ResponseEntity.ok(ApiResponse.message("Quiz answer deleted successfully"));
    }
}
