package com.ailms.common.config;

import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * Ensures existing database column definitions (like course.status) support 
 * soft delete ENUM string values (e.g. 'DELETED').
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class DatabaseSchemaPatcher {

    private final JdbcTemplate jdbcTemplate;

    @PostConstruct
    public void patchSchema() {
        try {
            log.info("Executing database schema patch for course status column...");
            jdbcTemplate.execute("ALTER TABLE course MODIFY COLUMN status VARCHAR(50) NOT NULL DEFAULT 'DRAFT'");
            log.info("Successfully patched course.status column to VARCHAR(50)");
        } catch (Exception e) {
            log.warn("Schema patch notice for course.status: {}", e.getMessage());
        }
    }
}
