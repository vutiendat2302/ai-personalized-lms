package com.ailms;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

@ActiveProfiles("test")
@SpringBootTest(properties = {
		"app.scheduling.enabled=false",
		"meilisearch.enabled=false",
		"public-catalog.vector-startup-sync=false"
})
class AilmsApplicationTests {

	/** Xác nhận toàn bộ Spring context có thể khởi tạo khi scheduler được cô lập khỏi test. */
	@Test
	void contextLoads() {
	}

}
