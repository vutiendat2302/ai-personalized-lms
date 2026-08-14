package com.ailms.service.imp;

import com.ailms.entity.*;
import com.ailms.entity.enums.*;
import com.ailms.event.AuditLogEvent;
import com.ailms.exception.ForbiddenException;
import com.ailms.exception.ResourceNotFoundException;
import com.ailms.exception.UnauthorizedException;
import com.ailms.repository.*;
import com.ailms.request.*;
import com.ailms.response.*;
import com.ailms.security.CustomUserDetails;
import com.ailms.service.IClassStreamPostService;
import com.ailms.service.INotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/** Triển khai thảo luận lớp với quyền theo ClassMember và quyền sở hữu nội dung. */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ClassStreamPostService implements IClassStreamPostService {
    private final ClassStreamPostRepository postRepository;
    private final ClassStreamCommentRepository commentRepository;
    private final ClassResourceRepository resourceRepository;
    private final ClassRepository classRepository;
    private final ClassMemberRepository classMemberRepository;
    private final UserRepository userRepository;
    private final INotificationService notificationService;
    private final ApplicationEventPublisher eventPublisher;

    /** Tạo bài, chặn học viên đăng ANNOUNCEMENT và thông báo staff khi có câu hỏi. */
    @Override
    @Transactional
    public ClassStreamPostResponse createPost(Long classId, CreateClassStreamPostRequest request) {
        ClassEntity clazz = getClassEntity(classId);
        Long userId = getCurrentUserId();
        boolean staff = isClassStaff(classId, userId);
        ClassStreamPostTypeEnum type = request.getType() != null
                ? request.getType() : ClassStreamPostTypeEnum.DISCUSSION;
        if (!staff && type == ClassStreamPostTypeEnum.ANNOUNCEMENT) {
            throw new ForbiddenException("Học viên không được đăng bài loại ANNOUNCEMENT.");
        }
        ClassStreamPostEntity post = postRepository.save(ClassStreamPostEntity.builder()
                .classEntity(clazz).authorUserId(userId).type(type)
                .title(normalizeOptional(request.getTitle())).content(normalizeRequired(request.getContent()))
                .fileKey(request.getFileKey()).fileName(request.getFileName())
                .fileType(request.getFileType()).fileSize(request.getFileSize()).build());
        createAttachedResource(clazz, post, request, userId);
        ClassStreamPostResponse response = mapPost(post);
        eventPublisher.publishEvent(new AuditLogEvent(this, "CREATE_CLASS_POST", "CLASS_STREAM_POST",
                post.getId(), null, response));
        if (type == ClassStreamPostTypeEnum.QUESTION) notifyClassStaffOfQuestion(clazz, post, userId);
        return response;
    }

    /** Lấy bài chưa bị ẩn, ưu tiên bài ghim và trả số bình luận thật. */
    @Override
    public PageResponse<ClassStreamPostResponse> getPostsPage(Long classId, int page, int size) {
        getClassEntity(classId);
        Page<ClassStreamPostEntity> result = postRepository
                .findByClassEntity_IdAndHiddenFalseOrderByPinnedDescCreatedAtDesc(
                        classId, PageRequest.of(page, size));
        return pageOf(result, result.getContent().stream().map(this::mapPost).toList());
    }

    /** Sửa bài khi người gọi là tác giả hoặc staff phụ trách lớp. */
    @Override
    @Transactional
    public ClassStreamPostResponse updatePost(
            Long classId, Long postId, UpdateClassStreamPostRequest request) {
        ClassStreamPostEntity post = getPost(classId, postId);
        requireOwnerOrStaff(classId, post.getAuthorUserId());
        ClassStreamPostResponse oldValue = mapPost(post);
        post.setTitle(normalizeOptional(request.getTitle()));
        post.setContent(normalizeRequired(request.getContent()));
        ClassStreamPostResponse response = mapPost(postRepository.save(post));
        eventPublisher.publishEvent(new AuditLogEvent(this, "UPDATE_CLASS_POST", "CLASS_STREAM_POST",
                postId, oldValue, response));
        return response;
    }

    /** Cập nhật cờ ghim/khóa/ẩn do controller đã xác nhận quyền staff. */
    @Override
    @Transactional
    public ClassStreamPostResponse moderatePost(
            Long classId, Long postId, ClassStreamPostModerationRequest request) {
        ClassStreamPostEntity post = getPost(classId, postId);
        ClassStreamPostResponse oldValue = mapPost(post);
        if (request.getPinned() != null) post.setPinned(request.getPinned());
        if (request.getCommentLocked() != null) post.setCommentLocked(request.getCommentLocked());
        if (request.getHidden() != null) post.setHidden(request.getHidden());
        ClassStreamPostResponse response = mapPost(postRepository.save(post));
        eventPublisher.publishEvent(new AuditLogEvent(this, "MODERATE_CLASS_POST", "CLASS_STREAM_POST",
                postId, oldValue, response));
        return response;
    }

    /** Xóa bài của tác giả hoặc cho phép staff xử lý nội dung vi phạm. */
    @Override
    @Transactional
    public void deletePost(Long classId, Long postId) {
        ClassStreamPostEntity post = getPost(classId, postId);
        requireOwnerOrStaff(classId, post.getAuthorUserId());
        ClassStreamPostResponse oldValue = mapPost(post);
        postRepository.delete(post);
        eventPublisher.publishEvent(new AuditLogEvent(this, "DELETE_CLASS_POST", "CLASS_STREAM_POST",
                postId, oldValue, null));
    }

    /** Lấy bình luận chưa ẩn và bảo đảm bài thuộc đúng lớp. */
    @Override
    public PageResponse<ClassStreamCommentResponse> getComments(
            Long classId, Long postId, int page, int size) {
        getPost(classId, postId);
        Page<ClassStreamCommentEntity> result = commentRepository
                .findByPostEntity_IdAndHiddenFalseOrderByCreatedAtAsc(postId, PageRequest.of(page, size));
        return pageOf(result, result.getContent().stream().map(this::mapComment).toList());
    }

    /** Tạo bình luận; khi bài khóa chỉ staff lớp mới tiếp tục trả lời được. */
    @Override
    @Transactional
    public ClassStreamCommentResponse createComment(
            Long classId, Long postId, ClassStreamCommentRequest request) {
        ClassStreamPostEntity post = getPost(classId, postId);
        Long userId = getCurrentUserId();
        if (Boolean.TRUE.equals(post.getCommentLocked()) && !isClassStaff(classId, userId)) {
            throw new ForbiddenException("Bài đăng đã khóa bình luận.");
        }
        ClassStreamCommentEntity comment = commentRepository.save(ClassStreamCommentEntity.builder()
                .postEntity(post).authorUserId(userId).content(normalizeRequired(request.getContent())).build());
        ClassStreamCommentResponse response = mapComment(comment);
        eventPublisher.publishEvent(new AuditLogEvent(this, "CREATE_CLASS_COMMENT", "CLASS_STREAM_COMMENT",
                comment.getId(), null, response));
        notifyPostAuthor(post, userId);
        return response;
    }

    /** Sửa bình luận khi người gọi là chính tác giả. */
    @Override
    @Transactional
    public ClassStreamCommentResponse updateComment(
            Long classId, Long postId, Long commentId, ClassStreamCommentRequest request) {
        ClassStreamCommentEntity comment = getComment(classId, postId, commentId);
        if (!comment.getAuthorUserId().equals(getCurrentUserId())) {
            throw new ForbiddenException("Bạn chỉ có thể sửa bình luận do mình tạo.");
        }
        ClassStreamCommentResponse oldValue = mapComment(comment);
        comment.setContent(normalizeRequired(request.getContent()));
        ClassStreamCommentResponse response = mapComment(commentRepository.save(comment));
        eventPublisher.publishEvent(new AuditLogEvent(this, "UPDATE_CLASS_COMMENT", "CLASS_STREAM_COMMENT",
                commentId, oldValue, response));
        return response;
    }

    /** Xóa bình luận khi là tác giả hoặc staff phụ trách lớp. */
    @Override
    @Transactional
    public void deleteComment(Long classId, Long postId, Long commentId) {
        ClassStreamCommentEntity comment = getComment(classId, postId, commentId);
        requireOwnerOrStaff(classId, comment.getAuthorUserId());
        ClassStreamCommentResponse oldValue = mapComment(comment);
        commentRepository.delete(comment);
        eventPublisher.publishEvent(new AuditLogEvent(this, "DELETE_CLASS_COMMENT", "CLASS_STREAM_COMMENT",
                commentId, oldValue, null));
    }

    /** Tạo tài nguyên lớp cùng transaction khi bài có tệp đính kèm. */
    private void createAttachedResource(
            ClassEntity clazz, ClassStreamPostEntity post, CreateClassStreamPostRequest request, Long userId) {
        if (request.getFileKey() == null || request.getFileKey().isBlank()) return;
        resourceRepository.save(ClassResourceEntity.builder().classEntity(clazz)
                .title(request.getFileName() != null ? request.getFileName()
                        : post.getTitle() != null ? post.getTitle() : "Tài liệu đính kèm")
                .fileKey(request.getFileKey()).fileName(request.getFileName())
                .fileType(request.getFileType()).fileSize(request.getFileSize())
                .uploadedByUserId(userId).build());
    }

    /** Gửi thông báo câu hỏi đến giáo viên và trợ giảng, không chứa dữ liệu liên hệ. */
    private void notifyClassStaffOfQuestion(ClassEntity clazz, ClassStreamPostEntity post, Long authorId) {
        classMemberRepository.findById_ClassIdAndRoleInClassInAndStatus(clazz.getId(),
                        List.of(ClassMemberRole.TEACHER, ClassMemberRole.TA), ClassMemberStatusEnum.ACTIVE)
                .stream().map(ClassMemberEntity::getUserEntity)
                .filter(user -> user != null && !user.getId().equals(authorId))
                .forEach(user -> notificationService.createSystemNotification(user, NotificationTypeEnum.GENERAL,
                        "Câu hỏi mới trong lớp " + clazz.getName(),
                        post.getTitle() != null ? post.getTitle() : "Một học viên vừa đăng câu hỏi mới.",
                        post.getId(), "/student/classes/" + clazz.getId()));
    }

    /** Thông báo tác giả bài khi có người khác trả lời. */
    private void notifyPostAuthor(ClassStreamPostEntity post, Long commenterId) {
        if (post.getAuthorUserId().equals(commenterId)) return;
        userRepository.findById(post.getAuthorUserId()).ifPresent(user ->
                notificationService.createSystemNotification(user, NotificationTypeEnum.GENERAL,
                        "Bài đăng của bạn có trả lời mới", "Một thành viên lớp vừa trả lời bài đăng của bạn.",
                        post.getId(), "/student/classes/" + post.getClassEntity().getId()));
    }

    /** Chuyển bài cùng tác giả và số bình luận sang response. */
    private ClassStreamPostResponse mapPost(ClassStreamPostEntity post) {
        UserEntity author = userRepository.findById(post.getAuthorUserId()).orElse(null);
        return ClassStreamPostResponse.builder().id(post.getId()).classId(post.getClassEntity().getId())
                .authorUserId(post.getAuthorUserId()).authorId(post.getAuthorUserId())
                .authorName(displayName(author)).authorAvatar(author != null ? author.getAvatarUrl() : null)
                .type(post.getType()).title(post.getTitle()).content(post.getContent())
                .pinned(post.getPinned()).commentLocked(post.getCommentLocked())
                .commentCount(commentRepository.countByPostEntity_IdAndHiddenFalse(post.getId()))
                .fileKey(post.getFileKey()).fileName(post.getFileName()).fileType(post.getFileType())
                .fileSize(post.getFileSize())
                .fileUrl(post.getFileKey() != null ? "/api/v1/files/download?fileKey=" + post.getFileKey() : null)
                .createdAt(post.getCreatedAt()).updatedAt(post.getUpdatedAt()).build();
    }

    /** Chuyển bình luận và dữ liệu công khai của tác giả sang response. */
    private ClassStreamCommentResponse mapComment(ClassStreamCommentEntity comment) {
        UserEntity author = userRepository.findById(comment.getAuthorUserId()).orElse(null);
        return ClassStreamCommentResponse.builder().id(comment.getId()).postId(comment.getPostEntity().getId())
                .authorId(comment.getAuthorUserId()).authorName(displayName(author))
                .authorAvatar(author != null ? author.getAvatarUrl() : null).content(comment.getContent())
                .createdAt(comment.getCreatedAt()).updatedAt(comment.getUpdatedAt()).build();
    }

    /** Lấy tên hiển thị mà không trả thông tin liên hệ cá nhân. */
    private String displayName(UserEntity user) {
        if (user == null) return "Người dùng";
        return user.getFullName() != null && !user.getFullName().isBlank() ? user.getFullName() : user.getUsername();
    }

    /** Lấy lớp hoặc báo không tồn tại. */
    private ClassEntity getClassEntity(Long classId) {
        return classRepository.findById(classId)
                .orElseThrow(() -> ResourceNotFoundException.of("Class", classId));
    }

    /** Lấy bài và xác minh bài thuộc đúng lớp trên URL. */
    private ClassStreamPostEntity getPost(Long classId, Long postId) {
        return postRepository.findById(postId)
                .filter(post -> post.getClassEntity().getId().equals(classId))
                .orElseThrow(() -> ResourceNotFoundException.of("ClassStreamPost", postId));
    }

    /** Lấy bình luận và xác minh toàn bộ quan hệ lớp/bài trên URL. */
    private ClassStreamCommentEntity getComment(Long classId, Long postId, Long commentId) {
        getPost(classId, postId);
        return commentRepository.findById(commentId)
                .filter(comment -> comment.getPostEntity().getId().equals(postId))
                .orElseThrow(() -> ResourceNotFoundException.of("ClassStreamComment", commentId));
    }

    /** Chặn thao tác khi người gọi không phải tác giả hoặc staff đúng lớp. */
    private void requireOwnerOrStaff(Long classId, Long authorId) {
        Long userId = getCurrentUserId();
        if (!authorId.equals(userId) && !isClassStaff(classId, userId)) {
            throw new ForbiddenException("Bạn không có quyền thay đổi nội dung này.");
        }
    }

    /** Xác định Admin/HR hoặc giáo viên/trợ giảng ACTIVE của lớp. */
    private boolean isClassStaff(Long classId, Long userId) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        boolean systemStaff = auth != null && auth.getAuthorities().stream()
                .anyMatch(item -> List.of("ROLE_ADMIN", "ROLE_HR").contains(item.getAuthority().toUpperCase()));
        if (systemStaff) return true;
        return classMemberRepository.findById_ClassIdAndId_UserId(classId, userId)
                .filter(member -> member.getStatus() == ClassMemberStatusEnum.ACTIVE)
                .filter(member -> member.getRoleInClass() == ClassMemberRole.TEACHER
                        || member.getRoleInClass() == ClassMemberRole.TA).isPresent();
    }

    /** Chuẩn hóa văn bản bắt buộc; frontend hiển thị text thuần nên không render HTML. */
    private String normalizeRequired(String value) {
        return value == null ? "" : value.trim();
    }

    /** Chuẩn hóa văn bản tùy chọn thành null khi trống. */
    private String normalizeOptional(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    /** Lấy ID từ JWT hiện tại. */
    private Long getCurrentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated() && !(auth instanceof AnonymousAuthenticationToken)
                && auth.getPrincipal() instanceof CustomUserDetails details) {
            return details.getUser().getId();
        }
        throw new UnauthorizedException("Authenticated user is required");
    }

    /** Chuyển Spring Page thành định dạng phân trang chung. */
    private <T> PageResponse<T> pageOf(Page<?> source, List<T> content) {
        return PageResponse.<T>builder().content(content).pageNumber(source.getNumber()).pageSize(source.getSize())
                .totalElements(source.getTotalElements()).totalPages(source.getTotalPages())
                .first(source.isFirst()).last(source.isLast()).build();
    }
}
