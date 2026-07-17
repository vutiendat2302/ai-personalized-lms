package com.ailms.service.imp;
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
import io.micrometer.common.util.StringUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.io.FilenameUtils;
import org.springframework.data.domain.Page;
import com.ailms.response.PageResponse;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class FileMetadataService implements IFileMetadataService {

    private final FileMetadataRepository fileMetadataRepository;
    private final FileMetadataMapper fileMetadataMapper;

    @Override
    @Transactional
    public FileMetadataResponse create(CreateFileMetadataRequest request) {
        log.info("Creating file metadata with key: {}", request.getFileKey());
        FileMetadataEntity entity = fileMetadataMapper.toEntity(request);
        entity.setStatus(BaseStatusEnum.ACTIVE);
        FileMetadataEntity saved = fileMetadataRepository.save(entity);
        return fileMetadataMapper.toResponse(saved);
    }

    @Override
    public FileMetadataResponse getByFileKey(String fileKey) {
        log.info("Getting file metadata by key: {}", fileKey);
        FileMetadataEntity entity = fileMetadataRepository.findByFileKey(fileKey)
                .orElseThrow(() -> new ResourceNotFoundException("File metadata not found for key"));
        return fileMetadataMapper.toResponse(entity);
    }

    @Override
    public FileMetadataResponse getById(Long id) {
        log.info("Getting file metadata by ID: {}", id);
        FileMetadataEntity entity = fileMetadataRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("File metadata not found for ID"));
        return fileMetadataMapper.toResponse(entity);
    }

    @Override
    public List<FileMetadataResponse> getByFileType(FileTypeEnum fileType) {
        log.info("Getting file metadata by type: {}", fileType);
        List<FileMetadataEntity> entities = fileMetadataRepository.findByFileType(fileType);
        return fileMetadataMapper.toResponseList(entities);
    }

    @Override
    @Transactional
    public void softDelete(String fileKey) {
        log.info("Soft deleting file metadata with key: {}", fileKey);
        FileMetadataEntity entity = fileMetadataRepository.findByFileKey(fileKey)
                .orElseThrow(() -> new ResourceNotFoundException("File metadata not found for key"));
        entity.setStatus(BaseStatusEnum.INACTIVE);
        fileMetadataRepository.save(entity);
    }

    @Override
    @Transactional
    public void hardDelete(String fileKey) {
        log.info("Hard deleting file metadata with key: {}", fileKey);
        FileMetadataEntity entity = fileMetadataRepository.findByFileKey(fileKey)
                .orElseThrow(() -> new ResourceNotFoundException("File metadata not found for key"));
        fileMetadataRepository.delete(entity);
    }

    @Override
    public boolean existsByFileKey(String fileKey) {
        log.info("Checking if file metadata exists for key: {}", fileKey);
        return fileMetadataRepository.findByFileKey(fileKey)
                .map(entity -> entity.getStatus() == BaseStatusEnum.ACTIVE)
                .orElse(false);
    }

    @Override
    public PageResponse<FileMetadataResponse> search(FileSearchRequest request) {
        log.info("Searching file metadata via specification");
        Specification<FileMetadataEntity> spec = FileSpecification.filterAndSearch(request);
        Pageable pageable = request.toPageable();
        Page<FileMetadataEntity> page = fileMetadataRepository.findAll(spec, pageable);
        return PageResponse.from(page.map(fileMetadataMapper::toResponse));
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
            finalName = sanitized; // file goc khong co extension -> khong ep gi ca
        } else if (oldExt.equalsIgnoreCase(newExt)) {
            finalName = sanitized; // user da giu dung extension (khong phan biet hoa/thuong)
        } else {
            // User doi sai/thieu extension -> ep lai extension goc
            String baseName = FilenameUtils.removeExtension(sanitized);
            finalName = baseName + "." + oldExt;
        }

        entity.setOriginalName(finalName);
        FileMetadataEntity saved = fileMetadataRepository.save(entity);
        return fileMetadataMapper.toResponse(saved);
    }

    @Override

    @Transactional
    public FileMetadataResponse updateStatus(String fileKey, BaseStatusEnum status) {
        if (status == null) {
            throw new BusinessException("Trạng thái không được để trống");
        }

        FileMetadataEntity entity = fileMetadataRepository.findByFileKey(fileKey)
                .orElseThrow(() -> ResourceNotFoundException.of("File"));

        entity.setStatus(status);
        FileMetadataEntity saved = fileMetadataRepository.save(entity);
        return fileMetadataMapper.toResponse(saved);
    }

    @Override
    public List<FileMetadataResponse> getAllFiles() {
        List<FileMetadataEntity> entities = fileMetadataRepository.findAll();
        return fileMetadataMapper.toResponseList(entities);
    }
}
