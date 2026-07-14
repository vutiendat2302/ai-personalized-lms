package com.ailms.service;

import com.ailms.entity.BaseStatusEnum;
import com.ailms.entity.FileMetadataEntity;
import com.ailms.entity.FileTypeEnum;
import com.ailms.exception.ResourceNotFoundException;
import com.ailms.mapper.FileMetadataMapper;
import com.ailms.repository.FileMetadataRepository;
import com.ailms.repository.specification.FileSpecification;
import com.ailms.request.CreateFileMetadataRequest;
import com.ailms.request.FileSearchRequest;
import com.ailms.response.FileMetadataResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
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
                .orElseThrow(() -> new ResourceNotFoundException("File metadata not found for key: " + fileKey));
        return fileMetadataMapper.toResponse(entity);
    }

    @Override
    public FileMetadataResponse getById(Long id) {
        log.info("Getting file metadata by ID: {}", id);
        FileMetadataEntity entity = fileMetadataRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("File metadata not found for ID: " + id));
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
                .orElseThrow(() -> new ResourceNotFoundException("File metadata not found for key: " + fileKey));
        entity.setStatus(BaseStatusEnum.INACTIVE);
        fileMetadataRepository.save(entity);
    }

    @Override
    @Transactional
    public void hardDelete(String fileKey) {
        log.info("Hard deleting file metadata with key: {}", fileKey);
        FileMetadataEntity entity = fileMetadataRepository.findByFileKey(fileKey)
                .orElseThrow(() -> new ResourceNotFoundException("File metadata not found for key: " + fileKey));
        fileMetadataRepository.delete(entity);
    }

    @Override
    public boolean existsByFileKey(String fileKey) {
        log.info("Checking if file metadata exists for key: {}", fileKey);
        return fileMetadataRepository.findByFileKey(fileKey).isPresent();
    }

    @Override
    public Page<FileMetadataResponse> search(FileSearchRequest request) {
        log.info("Searching file metadata via specification");
        Specification<FileMetadataEntity> spec = FileSpecification.filterAndSearch(request);
        Pageable pageable = request.toPageable();
        Page<FileMetadataEntity> page = fileMetadataRepository.findAll(spec, pageable);
        return page.map(fileMetadataMapper::toResponse);
    }
}
