package com.ailms.service.imp;

import com.ailms.entity.FileMetadataEntity;
import com.ailms.entity.enums.BaseStatusEnum;
import com.ailms.exception.BusinessException;
import com.ailms.exception.ResourceNotFoundException;
import com.ailms.repository.FileMetadataRepository;
import com.ailms.response.ChildRecordDetailResponse;
import com.ailms.response.PageResponse;
import com.ailms.response.TrashItemResponse;
import com.ailms.service.IFileStorageService;
import com.ailms.service.ITrashable;
import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.*;

/** Quản lý vòng đời tệp trong thùng rác và đồng bộ xóa với kho lưu trữ. */
@Service("fileTrashService")
@RequiredArgsConstructor
@Slf4j
public class FileTrashService implements ITrashable {
    private final FileMetadataRepository fileMetadataRepository;
    private final IFileStorageService fileStorageService;
    private final EntityManager entityManager;
    private final TrashItemTransactionExecutor transactionExecutor;

    @Override public String getEntityType() { return "FILE"; }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<TrashItemResponse> getTrashItems(String keyword, Pageable pageable) {
        List<FileMetadataEntity> files = fileMetadataRepository.findByStatusIn(
                List.of(BaseStatusEnum.INACTIVE, BaseStatusEnum.DELETED));
        if (keyword != null && !keyword.isBlank()) {
            String value = keyword.trim().toLowerCase(Locale.ROOT);
            files = files.stream().filter(file -> file.getOriginalName().toLowerCase(Locale.ROOT).contains(value)
                    || file.getFileKey().toLowerCase(Locale.ROOT).contains(value)).toList();
        }
        List<TrashItemResponse> items = files.stream()
                .sorted(Comparator.comparing(FileMetadataEntity::getUpdatedAt,
                        Comparator.nullsLast(Comparator.reverseOrder())))
                .map(this::map).toList();
        if (pageable.isUnpaged()) return PageResponse.from(new PageImpl<>(items));
        int start = Math.min((int) pageable.getOffset(), items.size());
        int end = Math.min(start + pageable.getPageSize(), items.size());
        return PageResponse.from(new PageImpl<>(items.subList(start, end), pageable, items.size()));
    }

    @Override
    @Transactional(readOnly = true)
    public TrashItemResponse getTrashItemDetail(Long id) { return map(find(id)); }

    @Override
    @Transactional(readOnly = true)
    public Map<String, Long> checkChildRecords(Long id) {
        FileMetadataEntity file = find(id);
        long current = count("SELECT COUNT(*) FROM employee_contract WHERE file_metadata_id = :id OR original_file_metadata_id = :id", id);
        return current > 0 ? Map.of("employee_contract", current) : Collections.emptyMap();
    }

    @Override public List<ChildRecordDetailResponse> getChildRecordDetails(Long id) { return Collections.emptyList(); }

    @Override
    @Transactional
    public void hardDelete(Long id) {
        FileMetadataEntity file = find(id);
        if (file.getStatus() != BaseStatusEnum.INACTIVE && file.getStatus() != BaseStatusEnum.DELETED) {
            throw new BusinessException("Chỉ được xóa vĩnh viễn file đang nằm trong thùng rác.");
        }
        entityManager.createNativeQuery("UPDATE employee_contract SET file_metadata_id = NULL WHERE file_metadata_id = :id")
                .setParameter("id", id).executeUpdate();
        entityManager.createNativeQuery("UPDATE employee_contract SET original_file_metadata_id = NULL WHERE original_file_metadata_id = :id")
                .setParameter("id", id).executeUpdate();
        String fileKey = file.getFileKey();
        fileMetadataRepository.delete(file);
        fileMetadataRepository.flush();
        Runnable deleteObject = () -> {
            try { fileStorageService.delete(fileKey); }
            catch (Exception exception) { log.error("Không thể xóa object MinIO {}", fileKey, exception); }
        };
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override public void afterCommit() { deleteObject.run(); }
            });
        } else deleteObject.run();
    }

    @Override
    @Transactional
    public void restore(Long id) {
        FileMetadataEntity file = find(id);
        if (!fileStorageService.exists(file.getFileKey())) {
            throw new BusinessException("Không thể khôi phục vì file vật lý không còn trong kho lưu trữ.");
        }
        file.setStatus(BaseStatusEnum.ACTIVE);
        file.setOrphanedDetectedAt(null);
        fileMetadataRepository.save(file);
    }

    @Override
    public Map<String, Object> bulkHardDelete(List<Long> ids) { return bulk(ids, true); }

    @Override
    public Map<String, Object> bulkRestore(List<Long> ids) { return bulk(ids, false); }

    private Map<String, Object> bulk(List<Long> ids, boolean delete) {
        int success = 0; List<String> errors = new ArrayList<>();
        for (Long id : ids == null ? Collections.<Long>emptyList() : ids) {
            try {
                if (delete) transactionExecutor.hardDelete(this, id);
                else transactionExecutor.restore(this, id);
                success++;
            }
            catch (Exception exception) { errors.add("File ID " + id + ": " + exception.getMessage()); }
        }
        return Map.of("successCount", success, "failureCount", errors.size(), "errors", errors);
    }

    private FileMetadataEntity find(Long id) {
        return fileMetadataRepository.findById(id).orElseThrow(() -> ResourceNotFoundException.of("FileMetadata", id));
    }

    private long count(String sql, Long id) {
        return ((Number) entityManager.createNativeQuery(sql).setParameter("id", id).getSingleResult()).longValue();
    }

    private TrashItemResponse map(FileMetadataEntity file) {
        LocalDateTime deletedAt = file.getUpdatedAt() != null ? file.getUpdatedAt() : file.getCreatedAt();
        return TrashItemResponse.builder().entityType("FILE").id(String.valueOf(file.getId()))
                .code(file.getFileKey()).name(file.getOriginalName()).deletedAt(deletedAt)
                .daysInTrash(deletedAt == null ? 0 : Math.max(0, ChronoUnit.DAYS.between(deletedAt, LocalDateTime.now())))
                .hasChildRecords(!checkChildRecords(file.getId()).isEmpty())
                .childRecordCounts(checkChildRecords(file.getId()))
                .extraFields(Map.of("contentType", Objects.toString(file.getContentType(), ""),
                        "fileSize", Objects.requireNonNullElse(file.getFileSize(), 0L),
                        "usageType", Objects.toString(file.getUsageType(), "")))
                .build();
    }
}
