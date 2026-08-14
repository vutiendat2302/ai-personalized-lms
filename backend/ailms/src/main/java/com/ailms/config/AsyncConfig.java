package com.ailms.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

import java.util.concurrent.Executor;

/**
 * Cau hinh thuc thi cac tac vu bat dong bo
 * Xử lý các công việc chạy nền
 */
@Configuration
@EnableAsync
public class AsyncConfig {

    /**
     * Thread pool dành cho các tác vụ đánh giá mục tiêu học tập
     * CorePoolSize: 2 luồng sẵn sàng
     * Khi cả 2 luồng đều bận, các tác vụ mới sẽ được đưa vào hàng đợi
     * Nếu hàng đợi đầy, hệ thống sẽ tạo thêm luồng cho đến tối đa 8 luồng.
     * Khi số tác vụ vượt quá khả năng xử lý.  các tác vụ mới sẽ bị từ chối theo chính sách mặc định.
     * Max pool size: tối đa 8 luồng
     * Queue capacity: hang doi chua toi da 500 tac vu
     *
     * @return
     */
    @Bean(name = "studyGoalTaskExecutor")
    public Executor studyGoalTaskExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(2);
        executor.setMaxPoolSize(8);
        executor.setQueueCapacity(500);
        executor.setThreadNamePrefix("study-goal-eval-");
        executor.initialize();
        return executor;
    }

    /** Tạo thread pool riêng cho các tác vụ đồng bộ dữ liệu sang AI Service. */
    @Bean(name = "aiIngestionTaskExecutor")
    public Executor aiIngestionTaskExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(2);
        executor.setMaxPoolSize(4);
        executor.setQueueCapacity(200);
        executor.setThreadNamePrefix("ai-ingestion-");
        executor.initialize();
        return executor;
    }
}
