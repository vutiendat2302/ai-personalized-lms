package com.ailms.controller;

import com.ailms.request.CreateInterestRequest;
import com.ailms.request.InterestSearchRequest;
import com.ailms.request.InterestStatusRequest;
import com.ailms.request.UpdateInterestRequest;
import com.ailms.response.ApiResponse;
import com.ailms.response.InterestResponse;
import com.ailms.response.PageResponse;
import com.ailms.service.IInterestService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("${api.prefix}/interests")
@RequiredArgsConstructor
public class InterestController {

    private final IInterestService interestService;

    @PostMapping
    public ResponseEntity<ApiResponse<InterestResponse>> create(@Valid @RequestBody CreateInterestRequest request) {
        InterestResponse response = interestService.createInterest(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.of("Interest created successfully", response));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<InterestResponse>> update(
            @PathVariable Long id,
            @Valid @RequestBody UpdateInterestRequest request) {
        InterestResponse response = interestService.updateInterest(id, request);
        return ResponseEntity.ok(ApiResponse.of("Interest updated successfully", response));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<ApiResponse<InterestResponse>> updateStatus(
            @PathVariable Long id,
            @Valid @RequestBody InterestStatusRequest request) {
        InterestResponse response = interestService.updateStatus(id, request);
        return ResponseEntity.ok(ApiResponse.of("Interest status updated successfully", response));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        interestService.delete(id);
        return ResponseEntity.ok(ApiResponse.message("Interest deleted successfully"));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<InterestResponse>> getById(@PathVariable Long id) {
        InterestResponse response = interestService.getInterestById(id);
        return ResponseEntity.ok(ApiResponse.of("Interest retrieved successfully", response));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<InterestResponse>>> getAll() {
        List<InterestResponse> response = interestService.getInterests();
        return ResponseEntity.ok(ApiResponse.of("Interests retrieved successfully", response));
    }

    @GetMapping("/search")
    public ResponseEntity<ApiResponse<PageResponse<InterestResponse>>> search(InterestSearchRequest request) {
        PageResponse<InterestResponse> response = interestService.search(request);
        return ResponseEntity.ok(ApiResponse.of("Search interests successfully", response));
    }
}
