package com.ailms.controller;

import com.ailms.request.HeartbeatRequest;
import com.ailms.response.ApiResponse;
import com.ailms.response.LearningSessionResponse;
import com.ailms.service.ILearningSessionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("${api.prefix}/learning-sessions")
@RequiredArgsConstructor
public class LearningSessionController {

    private final ILearningSessionService learningSessionService;

    @PostMapping("/start")
    public ResponseEntity<ApiResponse<LearningSessionResponse>> startSession(
            @RequestParam Long userId,
            @RequestParam(required = false) String entityType,
            @RequestParam(required = false) Long entityId) {
        LearningSessionResponse response = learningSessionService.startSession(userId, entityType, entityId);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.of("Learning session started", response));
    }

    @PostMapping("/{id}/heartbeat")
    public ResponseEntity<ApiResponse<LearningSessionResponse>> heartbeat(
            @PathVariable Long id,
            @RequestBody(required = false) HeartbeatRequest request) {
        if (request == null) {
            request = new HeartbeatRequest(30, true);
        }
        LearningSessionResponse response = learningSessionService.heartbeat(id, request);
        return ResponseEntity.ok(ApiResponse.of("Heartbeat received", response));
    }

    @PostMapping("/{id}/end")
    public ResponseEntity<ApiResponse<LearningSessionResponse>> endSession(
            @PathVariable Long id,
            @RequestParam(required = false) String closeReason) {
        LearningSessionResponse response = learningSessionService.endSession(id, closeReason);
        return ResponseEntity.ok(ApiResponse.of("Learning session ended", response));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<LearningSessionResponse>> getById(@PathVariable Long id) {
        LearningSessionResponse response = learningSessionService.getById(id);
        return ResponseEntity.ok(ApiResponse.of("Learning session retrieved", response));
    }

    @GetMapping("/user/{userId}/active")
    public ResponseEntity<ApiResponse<List<LearningSessionResponse>>> getActiveSessionsForUser(@PathVariable Long userId) {
        List<LearningSessionResponse> response = learningSessionService.getActiveSessionsForUser(userId);
        return ResponseEntity.ok(ApiResponse.of("Active learning sessions retrieved", response));
    }
}
