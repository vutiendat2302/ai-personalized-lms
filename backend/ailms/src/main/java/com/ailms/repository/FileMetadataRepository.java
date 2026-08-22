package com.ailms.repository;

import com.ailms.entity.FileMetadataEntity;
import com.ailms.entity.enums.FileTypeEnum;
import com.ailms.repository.base.BaseRepository;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.List;
import java.util.Optional;

import com.ailms.entity.enums.BaseStatusEnum;
import com.ailms.entity.enums.FileUsageTypeEnum;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface FileMetadataRepository extends BaseRepository<FileMetadataEntity, Long> {
    /** Lấy policy file mới nhất đang hoạt động để support công bố đúng phiên bản hiện hành. */
    Optional<FileMetadataEntity> findFirstByUsageTypeAndStatusOrderByCreatedAtDesc(
            FileUsageTypeEnum usageType, BaseStatusEnum status);
    /** Lấy các phiên bản policy active để dọn vector cũ. */
    List<FileMetadataEntity> findByUsageTypeAndStatus(FileUsageTypeEnum usageType, BaseStatusEnum status);
    Optional<FileMetadataEntity> findByFileKey(String fileKey);
    List<FileMetadataEntity> findByFileType(FileTypeEnum fileType);
    List<FileMetadataEntity> findByStatusAndOrphanedDetectedAtIsNull(BaseStatusEnum status);
    List<FileMetadataEntity> findByStatusIn(List<BaseStatusEnum> statuses);

    @Query("SELECT COUNT(f) FROM FileMetadataEntity f WHERE f.status = com.ailms.entity.enums.BaseStatusEnum.ACTIVE")
    Long countActiveFiles();

    @Query("SELECT COALESCE(SUM(f.fileSize), 0) FROM FileMetadataEntity f WHERE f.status = com.ailms.entity.enums.BaseStatusEnum.ACTIVE")
    Long sumActiveFileSize();

    @Query("SELECT COUNT(f) FROM FileMetadataEntity f WHERE f.status = com.ailms.entity.enums.BaseStatusEnum.ACTIVE AND (f.referenceEntityId IS NULL OR f.orphanedDetectedAt IS NOT NULL)")
    Long countOrphanedFiles();

    @Query("SELECT COUNT(f) FROM FileMetadataEntity f WHERE f.status = com.ailms.entity.enums.BaseStatusEnum.ACTIVE AND f.createdAt >= :startDate")
    Long countUploadedSince(@Param("startDate") LocalDateTime startDate);

    @Query("SELECT COUNT(f) FROM FileMetadataEntity f WHERE f.status = com.ailms.entity.enums.BaseStatusEnum.ARCHIVED OR f.status = com.ailms.entity.enums.BaseStatusEnum.DELETED")
    Long countArchivedOrDeleted();

    @Query("SELECT f.usageType, COALESCE(SUM(f.fileSize), 0) FROM FileMetadataEntity f WHERE f.status = com.ailms.entity.enums.BaseStatusEnum.ACTIVE AND f.usageType IS NOT NULL GROUP BY f.usageType")
    List<Object[]> aggregateSizeByUsageType();

    @Query("SELECT f.fileType, COALESCE(SUM(f.fileSize), 0) FROM FileMetadataEntity f WHERE f.status = com.ailms.entity.enums.BaseStatusEnum.ACTIVE AND f.fileType IS NOT NULL GROUP BY f.fileType")
    List<Object[]> aggregateSizeByFileType();
}
