package com.ailms.controller;

import com.ailms.dto.CourseSuggestion;
import com.ailms.exception.ForbiddenException;
import com.ailms.request.SaveSearchHistoryRequest;
import com.ailms.response.ApiResponse;
import com.ailms.response.SearchHistoryResponse;
import com.ailms.security.CustomUserDetails;
import com.ailms.service.ISearchHistoryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("${api.prefix}/search")
@RequiredArgsConstructor
@Slf4j
public class SearchController {

    private final ISearchHistoryService searchHistoryService;

    @GetMapping("/suggestions")
    public ResponseEntity<ApiResponse<List<CourseSuggestion>>> getSuggestions(@RequestParam("keyword") String keyword) {
        List<CourseSuggestion> response = searchHistoryService.getSuggestions(keyword);
        return ResponseEntity.ok(ApiResponse.of("Course suggestions retrieved successfully", response));
    }

    @GetMapping("/popular")
    public ResponseEntity<ApiResponse<List<CourseSuggestion>>> getPopularSearchCourses(
            @RequestParam(value = "days", defaultValue = "7") int days,
            @RequestParam(value = "limit", defaultValue = "5") int limit) {
        List<CourseSuggestion> response = searchHistoryService.getPopularSearchCourses(days, limit);
        return ResponseEntity.ok(ApiResponse.of("Popular course suggestions retrieved successfully", response));
    }

    @GetMapping("/history")
    public ResponseEntity<ApiResponse<List<SearchHistoryResponse>>> getSearchHistory() {
        Long userId = getCurrentUserId();
        List<SearchHistoryResponse> history = searchHistoryService.getSearchHistory(userId);
        return ResponseEntity.ok(ApiResponse.of("Search history retrieved successfully", history));
    }

    @PostMapping("/history")
    public ResponseEntity<ApiResponse<SearchHistoryResponse>> saveSearchHistory(
            @Valid @RequestBody SaveSearchHistoryRequest request) {
        Long userId = getCurrentUserId();
        SearchHistoryResponse response = searchHistoryService.saveSearchHistory(userId, request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.of("Search history saved successfully", response));
    }

    @DeleteMapping("/history/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteSearchHistory(@PathVariable Long id) {
        Long userId = getCurrentUserId();
        searchHistoryService.deleteSearchHistory(userId, id);
        return ResponseEntity.ok(ApiResponse.message("Search history deleted successfully"));
    }

    private Long getCurrentUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.isAuthenticated() && !(authentication instanceof AnonymousAuthenticationToken)) {
            Object principal = authentication.getPrincipal();
            if (principal instanceof CustomUserDetails userDetails) {
                return userDetails.getUser().getId();
            }
        }
        throw new ForbiddenException("Yêu cầu đăng nhập để thực hiện thao tác này.");
    }
}
