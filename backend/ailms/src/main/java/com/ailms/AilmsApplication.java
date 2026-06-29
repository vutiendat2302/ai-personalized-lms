package com.ailms;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;

@SpringBootApplication
public class AilmsApplication {

	public static void main(String[] args) {
		SpringApplication.run(AilmsApplication.class, args);
	}

}
