package com.ailms.event;

import com.ailms.service.IStudyGoalService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/**
 * Lắng nghe sự kiện kết thúc phiên học và thực hiện đánh giá lại
 * mục tiêu học tập của người dùng theo cơ chế bất đồng bộ.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class StudyGoalEvaluationListener {

    private final IStudyGoalService studyGoalService;

    /**
     * Xử lý sự kiện sau khi phiên học kết thúc.
     * Sự kiện chỉ được xử lý sau khi transaction hiện tại commit thành công
     * nhằm đảm bảo dữ liệu đã được lưu xuống cơ sở dữ liệu trước khi đánh giá.
     * @param event
     */
    @Async("studyGoalTaskExecutor")
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onStudySessionEnded(StudySessionEndedEvent event) {
        Long userId = event.getUserId();
        try {
            studyGoalService.evaluateUserGoals(userId);
        } catch (Exception e) {
            log.error("Async study goal evaluation failed for user: {}", userId, e);
        }
    }
}