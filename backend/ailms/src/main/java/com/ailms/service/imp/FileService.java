package com.ailms.service.imp;
import com.ailms.event.AuditLogEvent;
import com.ailms.service.IFileMetadataService;
import com.ailms.service.IFileService;
import com.ailms.service.IFileStorageService;


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
        log.info("Uploading file of type: {}", fileType);
        if (file.isEmpty()) {
            throw new FileStorageException("File cannot be empty");
        }

        try {
            String originalFilename = StringUtils.cleanPath(file.getOriginalFilename());

            // generate file key
            // 1. sinh phan mo rong cua file (.pdf, .png,...)
            String extension = "";
            int dotIndex = originalFilename.lastIndexOf('.');
            if (dotIndex > 0) {
                extension = originalFilename.substring(dotIndex);
            }

            String folder = fileType.name().toLowerCase() + "s";
            String uniqueName = UUID.randomUUID() + extension;
            String fileKey = folder + "/" + uniqueName;

            // 2. Upload physical file to storage
            fileStorageService.upload(file, fileKey);

            // 3. Save metadata to DB
            CreateFileMetadataRequest metadataRequest = CreateFileMetadataRequest.builder()
                    .fileKey(fileKey)
                    .originalName(originalFilename)
                    .fileSize(file.getSize())
                    .contentType(file.getContentType())
                    .fileType(fileType)
                    .build();

            return fileMetadataService.create(metadataRequest);

        } catch (Exception e) {
            log.error("Failed to upload file and create metadata", e);
            throw new FileStorageException("Failed to upload file: " + e.getMessage(), e);
        }
    }

    @Override
    public String getDownloadUrl(String fileKey) {
        log.info("Generating download URL for key: {}", fileKey);
        // Check metadata exist va active
        FileMetadataResponse metadata = fileMetadataService.getByFileKey(fileKey);
        if (metadata.getStatus() != BaseStatusEnum.ACTIVE) {
            throw new FileStorageException("File is not active or has been deleted");
        }


        return fileStorageService.getPresignedUrl(fileKey, Duration.ofDays(7));
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
