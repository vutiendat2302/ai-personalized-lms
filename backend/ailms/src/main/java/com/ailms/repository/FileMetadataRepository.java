package com.ailms.repository;

import com.ailms.entity.FileMetadataEntity;
import com.ailms.entity.FileTypeEnum;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.List;
import java.util.Optional;

public interface FileMetadataRepository extends JpaRepository<FileMetadataEntity, Long>, JpaSpecificationExecutor<FileMetadataEntity> {
    Optional<FileMetadataEntity> findByFileKey(String fileKey);
    
    default Optional<FileMetadataEntity> findByFileUrl(String fileUrl) {
        if (fileUrl == null) {
            return Optional.empty();
        }
        String bucketMarker = "/ailms/";
        int index = fileUrl.indexOf(bucketMarker);
        if (index != -1) {
            String fileKey = fileUrl.substring(index + bucketMarker.length());
            return findByFileKey(fileKey);
        }
        return findByFileKey(fileUrl);
    }
    
    List<FileMetadataEntity> findByFileType(FileTypeEnum fileType);
}
