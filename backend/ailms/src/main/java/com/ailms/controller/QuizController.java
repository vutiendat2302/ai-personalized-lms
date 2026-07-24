package com.ailms.controller;

import com.ailms.response.PageResponse;
import com.ailms.request.QuizSearchRequest;
import com.ailms.response.QuizResponse;

import com.ailms.request.QuizRequest;
import com.ailms.response.ApiResponse;
import com.ailms.response.QuizResponse;
import com.ailms.service.IQuizService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/quizzes")
@RequiredArgsConstructor
public class QuizController {

    private final IQuizService quizService;

    @PostMapping
    public ResponseEntity<ApiResponse<QuizResponse>> create(@Valid @RequestBody QuizRequest request) {
        QuizResponse response = quizService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.of("Quiz created successfully", response));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<QuizResponse>> update(
            @PathVariable Long id,
            @Valid @RequestBody QuizRequest request) {
        QuizResponse response = quizService.update(id, request);
        return ResponseEntity.ok(ApiResponse.of("Quiz updated successfully", response));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<QuizResponse>> getById(@PathVariable Long id) {
        QuizResponse response = quizService.getById(id);
        return ResponseEntity.ok(ApiResponse.of("Quiz retrieved successfully", response));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<QuizResponse>>> getAll() {
        List<QuizResponse> response = quizService.getAll();
        return ResponseEntity.ok(ApiResponse.of("Quizzes retrieved successfully", response));
    }

    @GetMapping("/lesson/{lessonId}")
    public ResponseEntity<ApiResponse<List<QuizResponse>>> getByLessonId(@PathVariable Long lessonId) {
        List<QuizResponse> response = quizService.getByLessonId(lessonId);
        return ResponseEntity.ok(ApiResponse.of("Quizzes retrieved successfully", response));
    }

    @GetMapping("/course/{courseId}")
    public ResponseEntity<ApiResponse<List<QuizResponse>>> getByCourseId(@PathVariable Long courseId) {
        List<QuizResponse> response = quizService.getByCourseId(courseId);
        return ResponseEntity.ok(ApiResponse.of("Quizzes retrieved successfully", response));
    }

    @GetMapping("/section/{sectionId}")
    public ResponseEntity<ApiResponse<List<QuizResponse>>> getBySectionId(@PathVariable Long sectionId) {
        List<QuizResponse> response = quizService.getBySectionId(sectionId);
        return ResponseEntity.ok(ApiResponse.of("Quizzes retrieved successfully", response));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        quizService.delete(id);
        return ResponseEntity.ok(ApiResponse.message("Quiz deleted successfully"));
    }

    @GetMapping("/search")
    public ResponseEntity<ApiResponse<PageResponse<QuizResponse>>> search(QuizSearchRequest request) {
        PageResponse<QuizResponse> result = quizService.search(request);
        return ResponseEntity.ok(ApiResponse.of("Search Quiz successfully", result));
    }
}
