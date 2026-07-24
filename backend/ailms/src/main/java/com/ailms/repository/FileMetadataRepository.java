package com.ailms.repository;

import com.ailms.entity.FileMetadataEntity;
import com.ailms.entity.enums.FileTypeEnum;
import com.ailms.repository.base.BaseRepository;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.List;
import java.util.Optional;

public interface FileMetadataRepository extends BaseRepository<FileMetadataEntity, Long> {
    Optional<FileMetadataEntity> findByFileKey(String fileKey);
    List<FileMetadataEntity> findByFileType(FileTypeEnum fileType);
}
