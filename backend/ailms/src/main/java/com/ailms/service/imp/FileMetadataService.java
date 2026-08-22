package com.ailms.service.imp;
import com.ailms.common.converter.SimpleJsonWriter;
import com.ailms.entity.enums.FileUsageTypeEnum;
import com.ailms.event.AuditLogEvent;
import com.ailms.event.PolicyFileChangedEvent;
import com.ailms.job.FileOrphanScanJob;
import com.ailms.repository.EmployeeRepository;
import com.ailms.repository.UserRepository;
import com.ailms.request.BulkFileActionRequest;
import com.ailms.request.UpdateFileMetadataRequest;
import com.ailms.response.FileManagementSummaryResponse;
import com.ailms.service.IFileMetadataService;


import com.ailms.entity.enums.BaseStatusEnum;
import com.ailms.entity.FileMetadataEntity;
import com.ailms.entity.enums.FileTypeEnum;
import com.ailms.exception.BusinessException;
import com.ailms.exception.ResourceNotFoundException;
import com.ailms.mapper.FileMetadataMapper;
import com.ailms.repository.FileMetadataRepository;
import com.ailms.repository.specification.FileSpecification;
import com.ailms.request.CreateFileMetadataRequest;
import com.ailms.request.FileSearchRequest;
import com.ailms.response.FileMetadataResponse;
import com.ailms.service.IFileStorageService;
import io.micrometer.common.util.StringUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.io.FilenameUtils;
import org.springframework.context.ApplicationEventPublisher;
import com.ailms.response.PageResponse;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class FileMetadataService implements IFileMetadataService {

    private final FileMetadataRepository fileMetadataRepository;
    private final FileMetadataMapper fileMetadataMapper;
    private final UserRepository userRepository;
    private final EmployeeRepository employeeRepository;
    private final IFileStorageService fileStorageService;
    private final ApplicationEventPublisher applicationEventPublisher;
    private final com.ailms.search.MeilisearchFileService meilisearchFileService;

    /** Ánh xạ metadata kèm thông tin người tạo để hiển thị trong trang quản trị. */
    private FileMetadataResponse mapToResponseWithUser(FileMetadataEntity entity) {
        FileMetadataResponse response = fileMetadataMapper.toResponse(entity);
        if (entity.getCreatedBy() != null) {
            userRepository.findById(entity.getCreatedBy()).ifPresent(u -> {
                if (response.getCreatedByName() == null) {
                    response.setCreatedByName(u.getFullName() != null ? u.getFullName() : u.getUsername());
                }
                employeeRepository.findById(u.getId()).ifPresentOrElse(
                        emp -> response.setCreatedByCode(emp.getEmployeeCode()),
                        () -> response.setCreatedByCode(u.getUsername())
                );
            });
        }
        return response;
    }

    @Override
    @Transactional
    public FileMetadataResponse create(CreateFileMetadataRequest request) {
        log.info("Creating file metadata with key: {}", request.getFileKey());
        FileMetadataEntity entity = fileMetadataMapper.toEntity(request);
        entity.setStatus(BaseStatusEnum.ACTIVE);
        FileMetadataEntity saved = fileMetadataRepository.save(entity);
        meilisearchFileService.index(saved);

        applicationEventPublisher.publishEvent(new AuditLogEvent(this, "UPLOAD", "FILE", saved.getId(), null, saved));
        if (saved.getUsageType() == FileUsageTypeEnum.POLICY) {
            applicationEventPublisher.publishEvent(new PolicyFileChangedEvent(saved.getId()));
        }
        return fileMetadataMapper.toResponse(saved);
    }

    @Override
    public FileMetadataResponse getByFileKey(String fileKey) {
        log.info("Getting file metadata by key: {}", fileKey);
        FileMetadataEntity entity = fileMetadataRepository.findByFileKey(fileKey)
                .orElseThrow(() -> new ResourceNotFoundException("File metadata not found for key"));
        return mapToResponseWithUser(entity);
    }

    @Override
    public FileMetadataResponse getById(Long id) {
        log.info("Getting file metadata by ID: {}", id);
        FileMetadataEntity entity = fileMetadataRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("File metadata not found for ID"));
        return mapToResponseWithUser(entity);
    }

    @Override
    public List<FileMetadataResponse> getByFileType(FileTypeEnum fileType) {
        log.info("Getting file metadata by type: {}", fileType);
        List<FileMetadataEntity> entities = fileMetadataRepository.findByFileType(fileType);
        return entities.stream().map(this::mapToResponseWithUser).toList();
    }

    @Override
    @Transactional
    public void softDelete(String fileKey) {
        log.info("Soft deleting file metadata with key: {}", fileKey);
        FileMetadataEntity entity = fileMetadataRepository.findByFileKey(fileKey)
                .orElseThrow(() -> new ResourceNotFoundException("File metadata not found for key"));

        String oldValue = SimpleJsonWriter.toJson(entity);
        entity.setStatus(BaseStatusEnum.INACTIVE);
        fileMetadataRepository.save(entity);
        applicationEventPublisher.publishEvent(new AuditLogEvent(this, "DELETE_SOFT", "FILE", entity.getId(), oldValue, entity));
    }

    @Override
    @Transactional
    public void hardDelete(String fileKey) {
        log.info("Hard deleting file metadata and physical MinIO object for key: {}", fileKey);
        FileMetadataEntity entity = fileMetadataRepository.findByFileKey(fileKey)
                .orElseThrow(() -> new ResourceNotFoundException("File metadata not found for key"));
        String oldValue = SimpleJsonWriter.toJson(entity);

        try {
            fileStorageService.delete(entity.getFileKey());
            log.info("Successfully deleted physical object from MinIO for key: {}", entity.getFileKey());
        } catch (Exception e) {
            log.error("Failed to delete physical object from MinIO for key {}: {}", entity.getFileKey(), e.getMessage());
        }

        fileMetadataRepository.delete(entity);
        applicationEventPublisher.publishEvent(new AuditLogEvent(this, "DELETE_HARD", "FILE", entity.getId(), oldValue, null));
    }

    @Override
    public boolean existsByFileKey(String fileKey) {
        log.info("Checking if file metadata exists for key: {}", fileKey);
        return fileMetadataRepository.findByFileKey(fileKey)
                .map(entity -> entity.getStatus() == BaseStatusEnum.ACTIVE)
                .orElse(false);
    }

    /** Tìm metadata trực tiếp từ MySQL để dữ liệu quản trị luôn đầy đủ và nhất quán với MinIO. */
    @Override
    public PageResponse<FileMetadataResponse> search(FileSearchRequest request) {
        log.info("Searching file metadata via MySQL specification");
        Specification<FileMetadataEntity> spec = FileSpecification.filterAndSearch(request);
        Pageable pageable = request.toPageable();
        List<FileMetadataEntity> storedFiles = filterExistingFiles(fileMetadataRepository.findAll(spec, pageable.getSort()));

        int start = Math.min((int) pageable.getOffset(), storedFiles.size());
        int end = Math.min(start + pageable.getPageSize(), storedFiles.size());
        List<FileMetadataResponse> content = storedFiles.subList(start, end).stream()
                .map(this::mapToResponseWithUser)
                .toList();
        long total = storedFiles.size();

        return PageResponse.<FileMetadataResponse>builder()
                .content(content)
                .pageNumber(pageable.getPageNumber())
                .pageSize(pageable.getPageSize())
                .totalElements(total)
                .totalPages((int) Math.ceil((double) total / pageable.getPageSize()))
                .first(pageable.getPageNumber() == 0)
                .last(end >= total)
                .build();
    }

    /** Khởi tạo cấu hình và đồng bộ lại index tập tin sau khi ứng dụng sẵn sàng. */
    @org.springframework.context.event.EventListener(org.springframework.boot.context.event.ApplicationReadyEvent.class)
    public void initializeFileSearchIndex() {
        if (!meilisearchFileService.isEnabled()) return;
        fileMetadataRepository.findAll().forEach(meilisearchFileService::index);
        meilisearchFileService.configureIndex();
    }

    @Override
    @Transactional
    public FileMetadataResponse updateOriginalName(String fileKey, String newOriginalName) {
        if (StringUtils.isBlank(newOriginalName)) {
            throw new BusinessException("Tên file không được để trống");
        }

        FileMetadataEntity entity = fileMetadataRepository.findByFileKey(fileKey)
                .orElseThrow(() -> ResourceNotFoundException.of("File"));

        if (entity.getStatus() != BaseStatusEnum.ACTIVE) {
            throw ResourceNotFoundException.of("File");
        }

        // Loai bo path separator va ky tu dieu khien de tranh path traversal / header injection
        String sanitized = newOriginalName.replaceAll("[\\\\/\\r\\n\\t]", "").trim();
        if (sanitized.isEmpty()) {
            throw new BusinessException("Tên file không hợp lệ");
        }
        if (sanitized.length() > 255) {
            throw new BusinessException("Tên file không được vượt quá 255 ký tự");
        }

        String oldExt = FilenameUtils.getExtension(entity.getOriginalName()); // khong co dau cham
        String newExt = FilenameUtils.getExtension(sanitized);

        String finalName;
        if (StringUtils.isBlank(oldExt)) {
            finalName = sanitized;
        } else if (oldExt.equalsIgnoreCase(newExt)) {
            finalName = sanitized;
        } else if (StringUtils.isBlank(newExt)) {
            // User không gõ đuôi -> tự động đính kèm đuôi gốc
            finalName = sanitized + "." + oldExt;
        } else {
            // User gõ sai đuôi mở rộng (ví dụ: .pdfaafads hoặc .exe) -> báo lỗi rõ ràng
            throw new BusinessException("Đuôi tệp tin mở rộng phải giữ nguyên định dạng ." + oldExt);
        }

        String oldOriginalName = entity.getOriginalName();
        entity.setOriginalName(finalName);
        FileMetadataEntity saved = fileMetadataRepository.save(entity);

        applicationEventPublisher.publishEvent(new AuditLogEvent(this, "UPDATE_NAME", "FILE", entity.getId(), oldOriginalName, finalName));
        return mapToResponseWithUser(saved);
    }

    @Override

    @Transactional
    public FileMetadataResponse updateStatus(String fileKey, BaseStatusEnum status) {
        if (status == null) {
            throw new BusinessException("Trạng thái không được để trống");
        }

        FileMetadataEntity entity = fileMetadataRepository.findByFileKey(fileKey)
                .orElseThrow(() -> ResourceNotFoundException.of("File"));
        String oldValue = SimpleJsonWriter.toJson(entity.getStatus());
        entity.setStatus(status);
        FileMetadataEntity saved = fileMetadataRepository.save(entity);

        applicationEventPublisher.publishEvent(new AuditLogEvent(this, "UPDATE_STATUS", "FILE", entity.getId(), oldValue, saved.getStatus()));
        return fileMetadataMapper.toResponse(saved);
    }

    @Override
    public List<FileMetadataResponse> getAllFiles() {
        List<FileMetadataEntity> entities = filterExistingFiles(fileMetadataRepository.findAll());
        return fileMetadataMapper.toResponseList(entities);
    }

    @Override
    public FileManagementSummaryResponse getSummary() {
        log.info("Generating FileManagementSummaryResponse metrics");
        List<FileMetadataEntity> storedFiles = filterExistingFiles(fileMetadataRepository.findAll());
        List<FileMetadataEntity> activeFiles = storedFiles.stream()
                .filter(file -> file.getStatus() == BaseStatusEnum.ACTIVE)
                .toList();
        Long totalFiles = (long) activeFiles.size();
        Long totalSizeBytes = activeFiles.stream()
                .mapToLong(file -> file.getFileSize() != null ? file.getFileSize() : 0L)
                .sum();
        Long orphanedFilesCount = activeFiles.stream()
                .filter(file -> file.getReferenceEntityId() == null || file.getOrphanedDetectedAt() != null)
                .count();

        LocalDateTime startOfMonth = LocalDateTime.now().withDayOfMonth(1).withHour(0).withMinute(0).withSecond(0);
        Long uploadedThisMonth = activeFiles.stream()
                .filter(file -> file.getCreatedAt() != null && !file.getCreatedAt().isBefore(startOfMonth))
                .count();
        Long archivedOrDeletedCount = storedFiles.stream()
                .filter(file -> file.getStatus() == BaseStatusEnum.ARCHIVED || file.getStatus() == BaseStatusEnum.DELETED)
                .count();

        Map<FileUsageTypeEnum, Long> sizeByUsageType = new EnumMap<>(FileUsageTypeEnum.class);
        activeFiles.stream()
                .filter(file -> file.getUsageType() != null)
                .forEach(file -> sizeByUsageType.merge(file.getUsageType(),
                        file.getFileSize() != null ? file.getFileSize() : 0L, Long::sum));

        Map<FileTypeEnum, Long> sizeByFileType = new EnumMap<>(FileTypeEnum.class);
        activeFiles.stream()
                .filter(file -> file.getFileType() != null)
                .forEach(file -> sizeByFileType.merge(file.getFileType(),
                        file.getFileSize() != null ? file.getFileSize() : 0L, Long::sum));

        // Build 12 months trend
        List<FileManagementSummaryResponse.MonthlyUploadTrend> trend = new ArrayList<>();
        YearMonth currentMonth = YearMonth.now();
        for (int i = 11; i >= 0; i--) {
            YearMonth ym = currentMonth.minusMonths(i);
            LocalDateTime from = ym.atDay(1).atStartOfDay();
            LocalDateTime to = ym.atEndOfMonth().atTime(23, 59, 59);

            List<FileMetadataEntity> monthFiles = activeFiles.stream()
                    .filter(file -> file.getCreatedAt() != null)
                    .filter(file -> !file.getCreatedAt().isBefore(from) && !file.getCreatedAt().isAfter(to))
                    .toList();

            long count = monthFiles.size();
            long size = monthFiles.stream().mapToLong(f -> f.getFileSize() != null ? f.getFileSize() : 0L).sum();

            trend.add(FileManagementSummaryResponse.MonthlyUploadTrend.builder()
                    .month(ym.toString())
                    .count(count)
                    .sizeBytes(size)
                    .build());
        }

        return FileManagementSummaryResponse.builder()
                .totalFiles(totalFiles)
                .totalSizeBytes(totalSizeBytes)
                .orphanedFilesCount(orphanedFilesCount)
                .uploadedThisMonth(uploadedThisMonth)
                .archivedOrDeletedCount(archivedOrDeletedCount)
                .sizeByUsageType(sizeByUsageType)
                .sizeByFileType(sizeByFileType)
                .uploadTrend(trend)
                .build();
    }

    /** Lọc metadata, chỉ giữ các dòng còn object vật lý tương ứng trên MinIO. */
    private List<FileMetadataEntity> filterExistingFiles(List<FileMetadataEntity> files) {
        Set<String> existingKeys = fileStorageService.findExistingKeys(files.stream()
                .map(FileMetadataEntity::getFileKey)
                .toList());
        return files.stream()
                .filter(file -> existingKeys.contains(file.getFileKey()))
                .toList();
    }

    @Override
    @Transactional
    public void bulkArchive(BulkFileActionRequest request) {
        log.info("Bulk archiving file IDs: {}", request.getFileIds());
        List<FileMetadataEntity> files = fileMetadataRepository.findAllById(request.getFileIds());
        for (FileMetadataEntity file : files) {
            file.setStatus(BaseStatusEnum.ARCHIVED);
            fileMetadataRepository.save(file);
            applicationEventPublisher.publishEvent(new AuditLogEvent(this, "BULK_ARCHIVE", "FILE", file.getId(), null, request.getReason()));
        }
    }

    @Override
    @Transactional
    public void bulkDelete(BulkFileActionRequest request) {
        log.info("Bulk soft deleting file IDs: {}", request.getFileIds());
        List<FileMetadataEntity> files = fileMetadataRepository.findAllById(request.getFileIds());

        for (FileMetadataEntity file : files) {
            file.setStatus(BaseStatusEnum.DELETED);
            fileMetadataRepository.save(file);
            applicationEventPublisher.publishEvent(new AuditLogEvent(this, "BULK_SOFT_DELETE", "FILE_METADATA", file.getId(), null, request.getReason()));
        }
    }

    @Override
    @Transactional
    public void bulkPurge(BulkFileActionRequest request) {
        log.info("Bulk purging file IDs: {}", request.getFileIds());
        List<FileMetadataEntity> files = fileMetadataRepository.findAllById(request.getFileIds());

        for (FileMetadataEntity file : files) {
            if (file.getStatus() != BaseStatusEnum.DELETED) {
                throw new BusinessException("Chỉ có thể xoá vĩnh viễn file đã ở trạng thái DELETED (Thùng rác). File \"" + file.getOriginalName() + "\" chưa bị xoá mềm.");
            }

            try {
                fileStorageService.delete(file.getFileKey());
                log.info("Successfully deleted physical object from MinIO for key: {}", file.getFileKey());
            } catch (Exception e) {
                log.error("Failed to delete physical object from MinIO for key {}: {}", file.getFileKey(), e.getMessage());
            }

            fileMetadataRepository.delete(file);
            applicationEventPublisher.publishEvent(new AuditLogEvent(this, "BULK_PURGE", "FILE_METADATA", file.getId(), null, request.getReason()));
        }
    }

    @Override
    @Transactional
    /** Quét lại và đánh dấu các tệp không còn liên kết với bản ghi nghiệp vụ. */
    public int triggerRescanOrphaned() {
        log.info("Triggering manual rescan for orphaned files");
        FileOrphanScanJob job = new FileOrphanScanJob(
                fileMetadataRepository, null, null, null, null
        );
        // Better: count orphaned files actively
        List<FileMetadataEntity> candidates = fileMetadataRepository
                .findByStatusAndOrphanedDetectedAtIsNull(BaseStatusEnum.ACTIVE);
        int orphanedCount = 0;
        for (FileMetadataEntity file : candidates) {
            if (file.getReferenceEntityId() == null) {
                file.setOrphanedDetectedAt(LocalDateTime.now());
                fileMetadataRepository.save(file);
                orphanedCount++;
            }
        }
        return orphanedCount;
    }

    @Override
    /** Xuất metadata của các tệp vật lý còn tồn tại theo bộ lọc quản trị. */
    public byte[] exportCsv(FileSearchRequest request) {
        log.info("Exporting CSV report for files with request filters");
        Specification<FileMetadataEntity> spec = FileSpecification.filterAndSearch(request);
        List<FileMetadataEntity> files = filterExistingFiles(fileMetadataRepository.findAll(spec));

        StringBuilder sb = new StringBuilder();
        sb.append("ID,Original Name,File Key,Usage Type,File Type,Size (Bytes),Status,Orphaned,Created At\n");

        for (FileMetadataEntity f : files) {
            boolean isOrphan = f.getOrphanedDetectedAt() != null || f.getReferenceEntityId() == null;
            sb.append(f.getId()).append(",")
                    .append("\"").append(f.getOriginalName().replace("\"", "\"\"")).append("\",")
                    .append("\"").append(f.getFileKey()).append("\",")
                    .append(f.getUsageType() != null ? f.getUsageType().name() : "").append(",")
                    .append(f.getFileType() != null ? f.getFileType().name() : "").append(",")
                    .append(f.getFileSize() != null ? f.getFileSize() : 0).append(",")
                    .append(f.getStatus() != null ? f.getStatus().name() : "").append(",")
                    .append(isOrphan ? "YES" : "NO").append(",")
                    .append(f.getCreatedAt() != null ? f.getCreatedAt().toString() : "").append("\n");
        }

        return sb.toString().getBytes(StandardCharsets.UTF_8);
    }

    @Override
    @Transactional
    public FileMetadataResponse updateMetadata(Long id, UpdateFileMetadataRequest request) {
        FileMetadataEntity entity = fileMetadataRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of("File"));

        String oldValue = SimpleJsonWriter.toJson(entity);

        if (request != null) {
            if (StringUtils.isNotBlank(request.getOriginalName())) {
                String sanitized = request.getOriginalName().replaceAll("[\\\\/\\r\\n\\t]", "").trim();
                if (!sanitized.isEmpty()) {
                    String oldExt = FilenameUtils.getExtension(entity.getOriginalName());
                    String newExt = FilenameUtils.getExtension(sanitized);

                    String finalName;
                    if (StringUtils.isBlank(oldExt)) {
                        finalName = sanitized;
                    } else if (oldExt.equalsIgnoreCase(newExt)) {
                        finalName = sanitized;
                    } else {
                        String baseName = FilenameUtils.removeExtension(sanitized);
                        finalName = baseName + "." + oldExt;
                    }
                    entity.setOriginalName(finalName);
                }
            }

            if (request.getCreatedAt() != null) {
                entity.setCreatedAt(request.getCreatedAt());
            }

            if (request.getUsageType() != null) {
                entity.setUsageType(request.getUsageType());
            }
        }

        FileMetadataEntity saved = fileMetadataRepository.save(entity);
        applicationEventPublisher.publishEvent(new AuditLogEvent(this, "UPDATE_FILE_METADATA", "FILE_METADATA", entity.getId(), oldValue, saved));
        return mapToResponseWithUser(saved);
    }
}
