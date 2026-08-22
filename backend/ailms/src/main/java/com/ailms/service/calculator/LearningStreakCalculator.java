package com.ailms.service.calculator;

import com.ailms.repository.LearningActivityLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.NavigableSet;
import java.util.TreeSet;

/** Tính streak tổng của học viên từ các ngày có hoạt động học tập thực tế. */
@Component
@RequiredArgsConstructor
public class LearningStreakCalculator {

    private final LearningActivityLogRepository learningActivityLogRepository;

    public StreakResult calculate(Long userId, LocalDate asOfDate) {
        if (userId == null) return new StreakResult(0, 0);
        List<LocalDateTime> activityTimes = learningActivityLogRepository.findActivityTimesByUserId(userId);
        NavigableSet<LocalDate> activeDates = new TreeSet<>();
        activityTimes.stream().map(LocalDateTime::toLocalDate).forEach(activeDates::add);
        return calculateFromDates(activeDates, asOfDate != null ? asOfDate : LocalDate.now());
    }

    StreakResult calculateFromDates(NavigableSet<LocalDate> activeDates, LocalDate today) {
        if (activeDates.isEmpty()) return new StreakResult(0, 0);

        LocalDate currentCursor = activeDates.contains(today)
                ? today
                : activeDates.contains(today.minusDays(1)) ? today.minusDays(1) : null;
        int current = 0;
        while (currentCursor != null && activeDates.contains(currentCursor)) {
            current++;
            currentCursor = currentCursor.minusDays(1);
        }

        int longest = 0;
        int running = 0;
        LocalDate previous = null;
        for (LocalDate date : activeDates) {
            running = previous != null && date.equals(previous.plusDays(1)) ? running + 1 : 1;
            longest = Math.max(longest, running);
            previous = date;
        }
        return new StreakResult(current, longest);
    }

    public record StreakResult(int currentStreak, int longestStreak) {}
}
