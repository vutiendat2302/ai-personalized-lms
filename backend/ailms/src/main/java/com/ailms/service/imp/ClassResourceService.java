package com.ailms.service.imp;

import com.ailms.entity.ClassEntity;
import com.ailms.entity.ClassResourceEntity;
import com.ailms.entity.UserEntity;
import com.ailms.entity.enums.RagProcessingStatusEnum;
import com.ailms.event.ClassResourceKnowledgeChangedEvent;
import com.ailms.event.AuditLogEvent;
import com.ailms.exception.BadRequestException;
import com.ailms.exception.ResourceNotFoundException;
import com.ailms.exception.UnauthorizedException;
import com.ailms.repository.ClassRepository;
import com.ailms.repository.ClassResourceRepository;
import com.ailms.repository.UserRepository;
import com.ailms.request.CreateClassResourceRequest;
import com.ailms.response.ClassResourceResponse;
import com.ailms.response.PageResponse;
import com.ailms.security.CustomUserDetails;
import com.ailms.service.IClassResourceService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ClassResourceService implements IClassResourceService {

    private final ClassResourceRepository resourceRepository;
    private final ClassRepository classRepository;
    private final UserRepository userRepository;
    private final ApplicationEventPublisher applicationEventPublisher;

    /** Tạo metadata resource và phát event ingestion sau khi transaction commit. */
    @Override
    @Transactional
    public ClassResourceResponse createResource(Long classId, CreateClassResourceRequest request) {
        ClassEntity classEntity = classRepository.findById(classId)
                .orElseThrow(() -> new ResourceNotFoundException("Class not found with id: " + classId));

        Long currentUserId = getCurrentUserId();
        UserEntity uploader = userRepository.findById(currentUserId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + currentUserId));

        ClassResourceEntity resource = ClassResourceEntity.builder()
                .classEntity(classEntity)
                .title(request.getTitle())
                .fileKey(request.getFileKey())
                .fileName(request.getFileName())
                .fileType(request.getFileType())
                .fileSize(request.getFileSize())
                .uploadedByUserId(currentUserId)
                .ragStatus(RagProcessingStatusEnum.PENDING)
                .ragChunksCount(0)
                .build();

        ClassResourceEntity savedResource = resourceRepository.save(resource);
        applicationEventPublisher.publishEvent(new ClassResourceKnowledgeChangedEvent(savedResource.getId(), false));
        applicationEventPublisher.publishEvent(new AuditLogEvent(this, "CREATE", "CLASS_RESOURCE",
                savedResource.getId(), null, Map.of("classId", String.valueOf(classId))));
        return mapToResponse(savedResource, uploader);
    }

    /** Lấy tài liệu lớp phân trang kèm trạng thái RAG và thông tin người upload. */
    @Override
    @Transactional(readOnly = true)
    public PageResponse<ClassResourceResponse> getResourcesPage(Long classId, String keyword, int page, int size) {
        if (!classRepository.existsById(classId)) {
            throw new ResourceNotFoundException("Class not found with id: " + classId);
        }

        PageRequest pageRequest = PageRequest.of(
                Math.max(page, 0),
                Math.max(size, 1),
                Sort.by(Sort.Direction.DESC, "createdAt")
        );
        String normalizedKeyword = keyword == null ? "" : keyword.trim();
        Page<ClassResourceEntity> pageResult = normalizedKeyword.isEmpty()
                ? resourceRepository.findByClassEntity_Id(classId, pageRequest)
                : resourceRepository.findByClassEntity_IdAndTitleContainingIgnoreCaseOrClassEntity_IdAndFileNameContainingIgnoreCase(
                        classId,
                        normalizedKeyword,
                        classId,
                        normalizedKeyword,
                        pageRequest
                );

        List<ClassResourceResponse> content = pageResult.getContent().stream().map(res -> {
            UserEntity uploader = res.getUploadedByUserId() == null
                    ? null
                    : userRepository.findById(res.getUploadedByUserId()).orElse(null);
            return mapToResponse(res, uploader);
        }).collect(Collectors.toList());

        return PageResponse.<ClassResourceResponse>builder()
                .content(content)
                .pageNumber(pageResult.getNumber())
                .pageSize(pageResult.getSize())
                .totalElements(pageResult.getTotalElements())
                .totalPages(pageResult.getTotalPages())
                .first(pageResult.isFirst())
                .last(pageResult.isLast())
                .build();
    }

    /** Xóa metadata resource rồi yêu cầu AI Service xóa vector theo source ID ổn định. */
    @Override
    @Transactional
    public void deleteResource(Long resourceId) {
        ClassResourceEntity resource = resourceRepository.findById(resourceId)
                .orElseThrow(() -> ResourceNotFoundException.of("ClassResource", resourceId));
        resourceRepository.delete(resource);
        applicationEventPublisher.publishEvent(new ClassResourceKnowledgeChangedEvent(resourceId, true));
        applicationEventPublisher.publishEvent(new AuditLogEvent(this, "DELETE", "CLASS_RESOURCE",
                resourceId, Map.of("classId", String.valueOf(resource.getClassEntity().getId())), null));
    }

    /** Chỉ reset resource FAILED để tránh tạo đồng thời nhiều ingestion cho cùng source. */
    @Override
    @Transactional
    public ClassResourceResponse retryRag(Long resourceId) {
        ClassResourceEntity resource = resourceRepository.findById(resourceId)
                .orElseThrow(() -> ResourceNotFoundException.of("ClassResource", resourceId));
        if (resource.getRagStatus() != RagProcessingStatusEnum.FAILED) {
            throw new BadRequestException("Chỉ có thể thử lại tài liệu RAG đang ở trạng thái FAILED");
        }
        resource.setRagStatus(RagProcessingStatusEnum.PENDING);
        resource.setRagChunksCount(0);
        resource.setRagError(null);
        ClassResourceEntity saved = resourceRepository.save(resource);
        applicationEventPublisher.publishEvent(new ClassResourceKnowledgeChangedEvent(resourceId, false));
        UserEntity uploader = saved.getUploadedByUserId() == null ? null
                : userRepository.findById(saved.getUploadedByUserId()).orElse(null);
        return mapToResponse(saved, uploader);
    }

    /** Ánh xạ entity sang response và chỉ bật AI khi ingestion đã READY. */
    private ClassResourceResponse mapToResponse(ClassResourceEntity resource, UserEntity uploader) {
        return ClassResourceResponse.builder()
                .id(resource.getId())
                .classId(resource.getClassEntity().getId())
                .title(resource.getTitle())
                .fileKey(resource.getFileKey())
                .fileName(resource.getFileName())
                .fileType(resource.getFileType())
                .fileSize(resource.getFileSize())
                .fileUrl("/api/v1/files/download?fileKey=" + resource.getFileKey())
                .uploadedByUserId(resource.getUploadedByUserId())
                .uploadedByName(uploader != null ? (uploader.getFullName() != null ? uploader.getFullName() : uploader.getUsername()) : "Người dùng")
                .ragStatus(resource.getRagStatus() == null ? RagProcessingStatusEnum.PENDING.name() : resource.getRagStatus().name())
                .ragChunksCount(resource.getRagChunksCount())
                .ragError(resource.getRagError())
                .canUseForAi(resource.getRagStatus() == RagProcessingStatusEnum.READY)
                .createdAt(resource.getCreatedAt())
                .build();
    }

    /** Lấy user ID từ principal JWT hiện tại hoặc từ chối request ẩn danh. */
    private Long getCurrentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null
                && auth.isAuthenticated()
                && !(auth instanceof AnonymousAuthenticationToken)
                && auth.getPrincipal() instanceof CustomUserDetails userDetails) {
            return userDetails.getUser().getId();
        }
        throw new UnauthorizedException("Authenticated user is required");
    }
}
