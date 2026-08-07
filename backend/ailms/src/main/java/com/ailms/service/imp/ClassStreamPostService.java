package com.ailms.service.imp;

import com.ailms.entity.ClassEntity;
import com.ailms.entity.ClassResourceEntity;
import com.ailms.entity.ClassStreamPostEntity;
import com.ailms.entity.UserEntity;
import com.ailms.exception.ResourceNotFoundException;
import com.ailms.repository.ClassRepository;
import com.ailms.repository.ClassResourceRepository;
import com.ailms.repository.ClassStreamPostRepository;
import com.ailms.repository.UserRepository;
import com.ailms.request.CreateClassStreamPostRequest;
import com.ailms.response.ClassStreamPostResponse;
import com.ailms.response.PageResponse;
import com.ailms.security.CustomUserDetails;
import com.ailms.exception.UnauthorizedException;
import com.ailms.service.IClassStreamPostService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.core.Authentication;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ClassStreamPostService implements IClassStreamPostService {

    private final ClassStreamPostRepository postRepository;
    private final ClassResourceRepository resourceRepository;
    private final ClassRepository classRepository;
    private final UserRepository userRepository;

    @Override
    @Transactional
    public ClassStreamPostResponse createPost(Long classId, CreateClassStreamPostRequest request) {
        ClassEntity classEntity = classRepository.findById(classId)
                .orElseThrow(() -> new ResourceNotFoundException("Class not found with id: " + classId));

        Long currentUserId = getCurrentUserId();
        UserEntity author = userRepository.findById(currentUserId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + currentUserId));

        ClassStreamPostEntity post = ClassStreamPostEntity.builder()
                .classEntity(classEntity)
                .authorUserId(currentUserId)
                .title(request.getTitle())
                .content(request.getContent())
                .fileKey(request.getFileKey())
                .fileName(request.getFileName())
                .fileType(request.getFileType())
                .fileSize(request.getFileSize())
                .build();

        ClassStreamPostEntity savedPost = postRepository.save(post);

        // Single Transaction: Automatically create ClassResourceEntity if fileKey is provided
        if (request.getFileKey() != null && !request.getFileKey().isBlank()) {
            ClassResourceEntity resource = ClassResourceEntity.builder()
                    .classEntity(classEntity)
                    .title(request.getFileName() != null ? request.getFileName() : (request.getTitle() != null ? request.getTitle() : "Tài liệu đính kèm"))
                    .fileKey(request.getFileKey())
                    .fileName(request.getFileName())
                    .fileType(request.getFileType())
                    .fileSize(request.getFileSize())
                    .uploadedByUserId(currentUserId)
                    .build();
            resourceRepository.save(resource);
        }

        return mapToResponse(savedPost, author);
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<ClassStreamPostResponse> getPostsPage(Long classId, int page, int size) {
        Page<ClassStreamPostEntity> postsPage = postRepository.findByClassEntity_IdOrderByCreatedAtDesc(classId, PageRequest.of(page, size));

        List<ClassStreamPostResponse> content = postsPage.getContent().stream().map(post -> {
            UserEntity author = userRepository.findById(post.getAuthorUserId()).orElse(null);
            return mapToResponse(post, author);
        }).collect(Collectors.toList());

        return PageResponse.<ClassStreamPostResponse>builder()
                .content(content)
                .pageNumber(postsPage.getNumber())
                .pageSize(postsPage.getSize())
                .totalElements(postsPage.getTotalElements())
                .totalPages(postsPage.getTotalPages())
                .first(postsPage.isFirst())
                .last(postsPage.isLast())
                .build();
    }

    @Override
    @Transactional
    public void deletePost(Long postId) {
        postRepository.deleteById(postId);
    }

    private ClassStreamPostResponse mapToResponse(ClassStreamPostEntity post, UserEntity author) {
        return ClassStreamPostResponse.builder()
                .id(post.getId())
                .classId(post.getClassEntity().getId())
                .authorUserId(post.getAuthorUserId())
                .authorName(author != null ? (author.getFullName() != null ? author.getFullName() : author.getUsername()) : "Người dùng")
                .authorAvatar(author != null ? author.getAvatarUrl() : null)
                .title(post.getTitle())
                .content(post.getContent())
                .fileKey(post.getFileKey())
                .fileName(post.getFileName())
                .fileType(post.getFileType())
                .fileSize(post.getFileSize())
                .fileUrl(post.getFileKey() != null ? "/api/v1/files/download?fileKey=" + post.getFileKey() : null)
                .createdAt(post.getCreatedAt())
                .build();
    }

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
