package com.ailms.service;

import com.ailms.dto.CourseSuggestion;
import com.ailms.request.SaveSearchHistoryRequest;
import com.ailms.response.SearchHistoryResponse;
import java.util.List;

public interface ISearchHistoryService {
    List<CourseSuggestion> getSuggestions(String keyword);
    List<CourseSuggestion> getPopularSearchCourses(int days, int limit);
    List<SearchHistoryResponse> getSearchHistory(Long userId);
    SearchHistoryResponse saveSearchHistory(Long userId, SaveSearchHistoryRequest request);
    SearchHistoryResponse saveSearchHistory(Long userId, String keyword);
    void deleteSearchHistory(Long userId, Long id);
}
