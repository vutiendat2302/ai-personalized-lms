package com.ailms.job;

import com.ailms.entity.FileMetadataEntity;
import com.ailms.entity.enums.BaseStatusEnum;
import com.ailms.repository.EmployeeContractRepository;
import com.ailms.repository.FileMetadataRepository;
import com.ailms.repository.LessonResourceRepository;
import com.ailms.repository.UserRepository;
import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;

@Slf4j
@Component
@RequiredArgsConstructor
public class FileOrphanScanJob {

    private final FileMetadataRepository fileMetadataRepository;
    private final EmployeeContractRepository employeeContractRepository;
    private final LessonResourceRepository lessonResourceRepository;
    private final UserRepository userRepository;
    private final EntityManager entityManager;

    /**
     * Scheduled job quét file mồ côi định kỳ (2h sáng hàng ngày).
     */
    @Scheduled(cron = "0 0 0 * * *")
    @Transactional
    public void detectOrphanedFilesScheduled() {
        log.info("Starting scheduled orphaned file detection job...");
        int count = scanOrphanedFiles();
        log.info("Completed scheduled orphaned file detection job. Detected {} orphaned file(s).", count);
    }

    /**
     * Logic quét và đánh dấu file mồ côi (có thể gọi từ Scheduled job hoặc trigger thủ công từ Admin API).
     */
    @Transactional
    public int scanOrphanedFiles() {
        List<FileMetadataEntity> candidates = fileMetadataRepository
                .findByStatusAndOrphanedDetectedAtIsNull(BaseStatusEnum.ACTIVE);

        Map<String, Function<Long, Boolean>> checkers = buildCheckersMap();
        int orphanedCount = 0;

        for (FileMetadataEntity file : candidates) {
            boolean stillReferenced = checkReferenceExists(
                    file.getReferenceEntityType(),
                    file.getReferenceEntityId(),
                    checkers
            );

            if (!stillReferenced) {
                file.setOrphanedDetectedAt(LocalDateTime.now());
                fileMetadataRepository.save(file);
                orphanedCount++;
            }
        }

        return orphanedCount;
    }

    private Map<String, Function<Long, Boolean>> buildCheckersMap() {
        Map<String, Function<Long, Boolean>> map = new HashMap<>();
        map.put("EmployeeContract", employeeContractRepository::existsById);
        map.put("LessonResource", lessonResourceRepository::existsById);
        map.put("User", userRepository::existsById);
        return map;
    }

    private boolean checkReferenceExists(String entityType, Long entityId, Map<String, Function<Long, Boolean>> checkers) {
        if (entityId == null) {
            return false;
        }

        if (entityType != null && checkers.containsKey(entityType)) {
            return checkers.get(entityType).apply(entityId);
        }

        // Fallback checking via EntityManager if entityType is unknown or custom
        if (entityType != null && !entityType.isBlank()) {
            try {
                String jpql = "SELECT COUNT(e) FROM " + entityType + " e WHERE e.id = :id";
                Long count = entityManager.createQuery(jpql, Long.class)
                        .setParameter("id", entityId)
                        .getSingleResult();
                return count != null && count > 0;
            } catch (Exception e) {
                log.warn("Failed to check reference existence dynamically for entityType: {} and id: {}", entityType, entityId);
                return false;
            }
        }

        return false;
    }
}
