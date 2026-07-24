package com.ailms.service.imp;

import com.ailms.dto.CourseSuggestion;
import com.ailms.entity.CourseEntity;
import com.ailms.entity.SearchHistoryEntity;
import com.ailms.entity.UserEntity;
import com.ailms.exception.ResourceNotFoundException;
import com.ailms.exception.ForbiddenException;
import com.ailms.mapper.SearchHistoryMapper;
import com.ailms.repository.CourseRepository;
import com.ailms.repository.SearchHistoryRepository;
import com.ailms.repository.UserRepository;
import com.ailms.request.SaveSearchHistoryRequest;
import com.ailms.response.SearchHistoryResponse;
import com.ailms.service.ISearchHistoryService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class SearchHistoryService implements ISearchHistoryService {

    private final SearchHistoryRepository searchHistoryRepository;
    private final UserRepository userRepository;
    private final CourseRepository courseRepository;
    private final SearchHistoryMapper searchHistoryMapper;

    private static final int MIN_KEYWORD_LENGTH = 2;
    private static final int MAX_SUGGESTIONS = 10;

    private static final int MAX_KEYWORD_LENGTH = 255;
    private static final int MAX_HISTORY_ITEMS = 10;


    @Override
    public List<CourseSuggestion> getSuggestions(String keyword) {
        if (keyword == null || keyword.trim().length() < MIN_KEYWORD_LENGTH) {
            log.debug("Keyword too short or empty, skip suggestion query: '{}'", keyword);
            return List.of();
        }

        String normalizedKeyword = keyword.trim();
        log.info("Fetching autocomplete suggestions for keyword: {}", normalizedKeyword);

        return courseRepository.findSuggestedKeywords(
                normalizedKeyword,
                PageRequest.of(0, MAX_SUGGESTIONS)
        );
    }

    @Override
    public List<CourseSuggestion> getPopularSearchCourses(int days, int limit) {
        int validDays = days <= 0 ? 7 : days;
        int validLimit = limit <= 0 ? 10 : limit;

        LocalDateTime fromDate = LocalDateTime.now().minusDays(validDays);
        log.info("Fetching popular course suggestions based on search history since {} (last {} days, limit {})",
                fromDate, validDays, validLimit);

        List<CourseSuggestion> suggestions = new ArrayList<>(
                searchHistoryRepository.findPopularCoursesBySearchHistory(fromDate, PageRequest.of(0, validLimit))
        );

        if (suggestions.size() < validLimit) {
            log.info("Popular search results ({}) fewer than limit ({}), supplementing with top active courses",
                    suggestions.size(), validLimit);
            Set<Long> existingIds = suggestions.stream()
                    .map(CourseSuggestion::getId)
                    .collect(Collectors.toSet());

            List<CourseSuggestion> fallbackCourses = courseRepository.findTopActiveCourses(PageRequest.of(0, validLimit));
            for (CourseSuggestion course : fallbackCourses) {
                if (suggestions.size() >= validLimit) {
                    break;
                }
                if (!existingIds.contains(course.getId())) {
                    suggestions.add(course);
                    existingIds.add(course.getId());
                }
            }
        }

        return suggestions;
    }

    private SearchHistoryEntity upsert(Long userId, String cleanKeyword, UserEntity user, CourseEntity course) {
        Optional<SearchHistoryEntity> existingOpt = searchHistoryRepository.findByUserIdAndKeyword(userId, cleanKeyword);

        SearchHistoryEntity entity;
        if (existingOpt.isPresent()) {
            entity = existingOpt.get();
            // Set lại field (dù giá trị giống hệt) để ép Hibernate coi entity là "dirty"
            // -> trigger @PreUpdate -> @LastModifiedDate tự cập nhật updatedAt.
            entity.setKeyword(cleanKeyword);
            entity.setCourse(course);
        } else {
            entity = SearchHistoryEntity.builder()
                    .user(user)
                    .keyword(cleanKeyword)
                    .course(course)
                    .build();
        }

        return searchHistoryRepository.save(entity);
    }


    @Override
    public List<SearchHistoryResponse> getSearchHistory(Long userId) {
        log.info("Fetching search history for user ID: {}", userId);

        return searchHistoryRepository
                .findByUserIdOrderByLastSearch(userId, PageRequest.of(0, MAX_HISTORY_ITEMS))
                .stream()
                .map(searchHistoryMapper::toResponse)
                .toList();
    }

    @Override
    @Transactional
    public SearchHistoryResponse saveSearchHistory(Long userId, SaveSearchHistoryRequest request) {
        if (request == null || request.getKeyword() == null || request.getKeyword().trim().isEmpty()) {
            throw new IllegalArgumentException("Keyword cannot be empty");
        }

        String keyword = request.getKeyword();
        log.info("Saving search history for user ID: {}, keyword: {}, courseId: {}", userId, keyword, request.getCourseId());

        String cleanKeyword = keyword.trim().toLowerCase();
        if (cleanKeyword.length() > MAX_KEYWORD_LENGTH) {
            throw new IllegalArgumentException("Keyword too long, max " + MAX_KEYWORD_LENGTH + " characters");
        }

        UserEntity user = userRepository.findById(userId)
                .orElseThrow(() -> ResourceNotFoundException.of("User", userId));

        CourseEntity course = null;
        if (request.getCourseId() != null) {
            course = courseRepository.findById(request.getCourseId())
                    .orElseThrow(() -> ResourceNotFoundException.of("Course", request.getCourseId()));
        }

        SearchHistoryEntity saved;
        try {
            saved = upsert(userId, cleanKeyword, user, course);
        } catch (DataIntegrityViolationException e) {
            // Race condition: request khác vừa insert dòng (user_id, keyword) này
            // ngay trước khi transaction hiện tại kịp commit -> query lại và update
            log.warn("Race condition detected on search_history upsert for userId={}, keyword={}, retrying as update",
                    userId, cleanKeyword);
            SearchHistoryEntity existing = searchHistoryRepository.findByUserIdAndKeyword(userId, cleanKeyword)
                    .orElseThrow(() -> e);
            existing.setKeyword(cleanKeyword); // trigger dirty checking -> @PreUpdate -> updatedAt tự cập nhật
            existing.setCourse(course);
            saved = searchHistoryRepository.save(existing);
        }

        return searchHistoryMapper.toResponse(saved);
    }

    @Override
    @Transactional
    public SearchHistoryResponse saveSearchHistory(Long userId, String keyword) {
        SaveSearchHistoryRequest request = SaveSearchHistoryRequest.builder()
                .keyword(keyword)
                .build();
        return saveSearchHistory(userId, request);
    }

    @Override
    @Transactional
    public void deleteSearchHistory(Long userId, Long id) {
        log.info("Deleting search history ID: {} for user ID: {}", id, userId);
        SearchHistoryEntity entity = searchHistoryRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of("SearchHistory", id));

        if (!entity.getUser().getId().equals(userId)) {
            throw new ForbiddenException("You are not allowed to delete this search history entry");
        }

        searchHistoryRepository.delete(entity);
    }
}
