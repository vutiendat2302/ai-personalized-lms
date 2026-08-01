package com.ailms.service.imp;
import com.ailms.entity.enums.FileUsageTypeEnum;
import com.ailms.service.IFileMetadataService;
import com.ailms.service.IFileService;


import com.ailms.entity.enums.BaseStatusEnum;
import com.ailms.entity.enums.FileTypeEnum;
import com.ailms.exception.FileStorageException;
import com.ailms.request.CreateFileMetadataRequest;
import com.ailms.response.FileMetadataResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.time.Duration;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class FileService implements IFileService {

    private final MinioFileStorageService fileStorageService;
    private final IFileMetadataService fileMetadataService;
    private final ApplicationEventPublisher applicationEventPublisher;

    @Override
    @Transactional
    public FileMetadataResponse uploadFile(MultipartFile file, FileTypeEnum fileType) {
        return uploadFile(file, fileType, null, null, null);
    }

    @Override
    @Transactional
    public FileMetadataResponse uploadFile(
            MultipartFile file,
            FileTypeEnum fileType,
            FileUsageTypeEnum usageType,
            Long referenceEntityId,
            String referenceEntityType
    ) {
        log.info("Uploading physical file to MinIO with usageType: {}", usageType);
        if (file == null || file.isEmpty()) {
            throw new FileStorageException("File cannot be empty");
        }

        try {
            String originalFilename = StringUtils.cleanPath(file.getOriginalFilename());

            String extension = "";
            int dotIndex = originalFilename.lastIndexOf('.');
            if (dotIndex > 0) {
                extension = originalFilename.substring(dotIndex);
            }

            if (fileType == null) {
                fileType = detectFileType(file.getContentType(), extension);
            }

            String folder = (usageType != null ? usageType.name().toLowerCase() : fileType.name().toLowerCase()) + "s";
            String uniqueName = UUID.randomUUID() + extension;
            String fileKey = folder + "/" + uniqueName;

            // 1. Upload physical file bytes to MinIO Storage
            fileStorageService.upload(file, fileKey);

            // 2. Save metadata to Database
            CreateFileMetadataRequest metadataRequest = CreateFileMetadataRequest.builder()
                    .fileKey(fileKey)
                    .originalName(originalFilename)
                    .fileSize(file.getSize())
                    .contentType(file.getContentType())
                    .fileType(fileType)
                    .usageType(usageType != null ? usageType : FileUsageTypeEnum.OTHER)
                    .referenceEntityId(referenceEntityId)
                    .referenceEntityType(referenceEntityType)
                    .build();

            return fileMetadataService.create(metadataRequest);

        } catch (Exception e) {
            log.error("Failed to upload file to MinIO and create metadata", e);
            throw new FileStorageException("Failed to upload file: " + e.getMessage(), e);
        }
    }

    private FileTypeEnum detectFileType(String contentType, String extension) {
        if (contentType != null) {
            String ct = contentType.toLowerCase();
            if (ct.startsWith("image/")) return FileTypeEnum.IMAGE;
            if (ct.startsWith("video/")) return FileTypeEnum.VIDEO;
            if (ct.startsWith("audio/")) return FileTypeEnum.AUDIO;
            if (ct.contains("pdf") || ct.contains("word") || ct.contains("document") || ct.contains("excel") || ct.contains("zip")) return FileTypeEnum.DOCUMENT;
        }
        if (extension != null) {
            String ext = extension.toLowerCase();
            if (ext.endsWith(".png") || ext.endsWith(".jpg") || ext.endsWith(".jpeg") || ext.endsWith(".svg") || ext.endsWith(".webp")) return FileTypeEnum.IMAGE;
            if (ext.endsWith(".mp4") || ext.endsWith(".mkv") || ext.endsWith(".avi")) return FileTypeEnum.VIDEO;
            if (ext.endsWith(".mp3") || ext.endsWith(".wav") || ext.endsWith(".aac")) return FileTypeEnum.AUDIO;
            if (ext.endsWith(".pdf") || ext.endsWith(".docx") || ext.endsWith(".xlsx") || ext.endsWith(".pptx") || ext.endsWith(".zip")) return FileTypeEnum.DOCUMENT;
        }
        return FileTypeEnum.OTHER;
    }

    @Override
    public String getDownloadUrl(String fileKey) {
        log.info("Generating download URL for key: {}", fileKey);
        // Check metadata exist va active
        FileMetadataResponse metadata = fileMetadataService.getByFileKey(fileKey);
        if (metadata.getStatus() != BaseStatusEnum.ACTIVE) {
            throw new FileStorageException("File is not active or has been deleted");
        }


        // URL ký sẵn không thể thu hồi sau khi phát hành. Giữ thời hạn ngắn để
        // việc archive có hiệu lực nhanh cả với URL đã được lấy trước đó.
        return fileStorageService.getPresignedUrl(fileKey, Duration.ofMinutes(10));
    }

    @Override
    public String getAdminDownloadUrl(String fileKey) {
        log.info("Generating admin download URL for key: {}", fileKey);
        FileMetadataResponse metadata = fileMetadataService.getByFileKey(fileKey);
        if (metadata.getStatus() == BaseStatusEnum.DELETED) {
            throw new FileStorageException("File has been deleted");
        }

        return fileStorageService.getPresignedUrl(fileKey, Duration.ofMinutes(10));
    }

    @Override
    @Transactional
    public void deleteHardFile(String fileKey) {
        log.info("Deleting hard file with key: {}", fileKey);
        fileMetadataService.getByFileKey(fileKey);

        // Delete physical file
        fileStorageService.delete(fileKey);

        // Soft-delete metadata in DB
        fileMetadataService.hardDelete(fileKey);


    }
}
