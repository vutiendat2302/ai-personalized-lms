package com.ailms;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;
import org.springframework.scheduling.annotation.EnableAsync;
import java.util.TimeZone;

@SpringBootApplication
@EnableAsync
public class AilmsApplication {

	/** Khởi động ứng dụng AILMS với cấu hình Spring Boot hiện hành. */
	public static void main(String[] args) {
		// Đồng bộ LocalDateTime của lịch học với múi giờ hiển thị cho người dùng.
		TimeZone.setDefault(TimeZone.getTimeZone(System.getProperty("app.timezone", "Asia/Ho_Chi_Minh")));
		SpringApplication.run(AilmsApplication.class, args);
	}

}
