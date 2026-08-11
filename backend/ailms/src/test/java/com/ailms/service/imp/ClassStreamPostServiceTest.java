package com.ailms.service.imp;

import com.ailms.entity.*;
import com.ailms.entity.enums.*;
import com.ailms.exception.ForbiddenException;
import com.ailms.repository.*;
import com.ailms.request.CreateClassStreamPostRequest;
import com.ailms.security.CustomUserDetails;
import com.ailms.service.INotificationService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/** Kiểm tra các giới hạn quyền quan trọng của thảo luận lớp. */
@ExtendWith(MockitoExtension.class)
class ClassStreamPostServiceTest {
    @Mock private ClassStreamPostRepository postRepository;
    @Mock private ClassStreamCommentRepository commentRepository;
    @Mock private ClassResourceRepository resourceRepository;
    @Mock private ClassRepository classRepository;
    @Mock private ClassMemberRepository classMemberRepository;
    @Mock private UserRepository userRepository;
    @Mock private INotificationService notificationService;
    @Mock private ApplicationEventPublisher eventPublisher;

    private ClassStreamPostService service;
    private UserEntity student;
    private ClassEntity clazz;

    /** Khởi tạo service và principal học viên cho từng test. */
    @BeforeEach
    void setUp() {
        service = new ClassStreamPostService(postRepository, commentRepository, resourceRepository,
                classRepository, classMemberRepository, userRepository, notificationService, eventPublisher);
        student = UserEntity.builder().id(1L).username("student").fullName("Học viên").build();
        clazz = ClassEntity.builder().id(10L).name("Lớp A").build();
        CustomUserDetails details = new CustomUserDetails(student, List.of());
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(details, null, List.of()));
        when(classRepository.findById(10L)).thenReturn(Optional.of(clazz));
    }

    /** Dọn SecurityContext để test không làm rò principal sang test khác. */
    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    /** Học viên không thể tự nâng loại bài thành thông báo lớp. */
    @Test
    void studentCannotCreateAnnouncement() {
        when(classMemberRepository.findById_ClassIdAndId_UserId(10L, 1L)).thenReturn(Optional.empty());
        CreateClassStreamPostRequest request = CreateClassStreamPostRequest.builder()
                .type(ClassStreamPostTypeEnum.ANNOUNCEMENT).content("Thông báo giả").build();

        assertThrows(ForbiddenException.class, () -> service.createPost(10L, request));
        verify(postRepository, never()).save(any());
    }

    /** Câu hỏi hợp lệ được lưu đúng loại và thông báo giáo viên, không gửi cho chính tác giả. */
    @Test
    void questionNotifiesClassStaff() {
        UserEntity teacher = UserEntity.builder().id(2L).username("teacher").fullName("Giáo viên").build();
        ClassMemberEntity staffMember = ClassMemberEntity.builder().userEntity(teacher)
                .roleInClass(ClassMemberRole.TEACHER).status(ClassMemberStatusEnum.ACTIVE).build();
        when(classMemberRepository.findById_ClassIdAndId_UserId(10L, 1L)).thenReturn(Optional.empty());
        when(classMemberRepository.findById_ClassIdAndRoleInClassInAndStatus(
                eq(10L), anyList(), eq(ClassMemberStatusEnum.ACTIVE))).thenReturn(List.of(staffMember));
        when(postRepository.save(any())).thenAnswer(invocation -> {
            ClassStreamPostEntity post = invocation.getArgument(0);
            post.setId(100L);
            return post;
        });
        when(userRepository.findById(1L)).thenReturn(Optional.of(student));
        when(commentRepository.countByPostEntity_IdAndHiddenFalse(100L)).thenReturn(0L);
        CreateClassStreamPostRequest request = CreateClassStreamPostRequest.builder()
                .type(ClassStreamPostTypeEnum.QUESTION).title("Cần hỗ trợ")
                .content("Em chưa hiểu bài này").build();

        service.createPost(10L, request);

        ArgumentCaptor<ClassStreamPostEntity> captor = ArgumentCaptor.forClass(ClassStreamPostEntity.class);
        verify(postRepository).save(captor.capture());
        assertEquals(ClassStreamPostTypeEnum.QUESTION, captor.getValue().getType());
        verify(notificationService).createSystemNotification(eq(teacher), eq(NotificationTypeEnum.GENERAL),
                anyString(), anyString(), eq(100L), anyString());
        verify(notificationService, never()).createSystemNotification(eq(student), any(), anyString(), anyString(), any(), anyString());
    }
}
