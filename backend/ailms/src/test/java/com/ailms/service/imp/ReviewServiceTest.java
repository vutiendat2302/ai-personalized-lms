package com.ailms.service.imp;

import com.ailms.entity.ClassEntity;
import com.ailms.entity.ClassMemberEntity;
import com.ailms.entity.CourseEntity;
import com.ailms.entity.EnrollmentEntity;
import com.ailms.entity.ReviewEntity;
import com.ailms.entity.UserEntity;
import com.ailms.entity.enums.ClassMemberRole;
import com.ailms.entity.enums.ClassMemberStatusEnum;
import com.ailms.exception.BusinessException;
import com.ailms.mapper.ReviewMapper;
import com.ailms.repository.ClassMemberRepository;
import com.ailms.repository.CourseRepository;
import com.ailms.repository.CourseTeacherRepository;
import com.ailms.repository.EnrollmentRepository;
import com.ailms.repository.ReviewRepository;
import com.ailms.repository.StudentProfileRepository;
import com.ailms.repository.UserRepository;
import com.ailms.request.CreateReviewRequest;
import com.ailms.response.ReviewResponse;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

/** Kiểm tra học viên chỉ đánh giá sau hoàn thành và review gắn đúng giáo viên chính. */
@ExtendWith(MockitoExtension.class)
class ReviewServiceTest {
    @Mock private ReviewRepository reviewRepository;
    @Mock private CourseRepository courseRepository;
    @Mock private EnrollmentRepository enrollmentRepository;
    @Mock private UserRepository userRepository;
    @Mock private StudentProfileRepository studentProfileRepository;
    @Mock private ClassMemberRepository classMemberRepository;
    @Mock private CourseTeacherRepository courseTeacherRepository;
    @Mock private ReviewMapper reviewMapper;
    @Mock private ApplicationEventPublisher applicationEventPublisher;
    @InjectMocks private ReviewService service;

    /** Review sau hoàn thành phải lưu cả điểm khóa học và điểm giáo viên của đúng lớp. */
    @Test
    void completedStudentCanReviewAssignedTeacher() {
        CourseEntity course = CourseEntity.builder().id(20L).name("Java").build();
        UserEntity student = UserEntity.builder().id(10L).fullName("Học viên").build();
        UserEntity teacher = UserEntity.builder().id(11L).fullName("Giảng viên").build();
        ClassEntity clazz = ClassEntity.builder().id(30L).courseEntity(course).build();
        EnrollmentEntity enrollment = EnrollmentEntity.builder().id(40L).courseEntity(course)
                .classEntity(clazz).userEntity(student).status((byte) 1).completedAt(LocalDateTime.now()).build();
        ClassMemberEntity teacherMember = ClassMemberEntity.builder().classEntity(clazz).userEntity(teacher)
                .roleInClass(ClassMemberRole.TEACHER).status(ClassMemberStatusEnum.ACTIVE).build();
        when(courseRepository.findById(20L)).thenReturn(Optional.of(course));
        when(enrollmentRepository.findByUserEntity_IdAndCourseEntity_Id(10L, 20L)).thenReturn(Optional.of(enrollment));
        when(reviewRepository.existsByCourseIdAndUserId(20L, 10L)).thenReturn(false);
        when(userRepository.findById(10L)).thenReturn(Optional.of(student));
        when(userRepository.findById(11L)).thenReturn(Optional.of(teacher));
        when(classMemberRepository.findById_ClassIdAndRoleInClassInAndStatus(
                30L, List.of(ClassMemberRole.TEACHER), ClassMemberStatusEnum.ACTIVE))
                .thenReturn(List.of(teacherMember));
        when(reviewRepository.save(any(ReviewEntity.class))).thenAnswer(invocation -> {
            ReviewEntity review = invocation.getArgument(0);
            review.setId(50L);
            return review;
        });
        when(reviewMapper.toResponse(any(ReviewEntity.class))).thenAnswer(invocation -> {
            ReviewEntity review = invocation.getArgument(0);
            return ReviewResponse.builder().id(review.getId()).courseId(review.getCourseId())
                    .userId(review.getUserId()).rating(review.getRating()).comment(review.getComment())
                    .teacherId(review.getTeacherId()).teacherRating(review.getTeacherRating())
                    .teacherComment(review.getTeacherComment()).build();
        });
        when(studentProfileRepository.findById(10L)).thenReturn(Optional.empty());
        when(reviewRepository.getAverageRatingForCourse(20L)).thenReturn(5D);
        when(reviewRepository.getReviewCountForCourse(20L)).thenReturn(1L);

        ReviewResponse result = service.createReview(10L, 20L, CreateReviewRequest.builder()
                .rating(5).comment("Nội dung tốt").teacherRating(4).teacherComment("Hướng dẫn rõ").build());

        assertEquals(11L, result.getTeacherId());
        assertEquals(4, result.getTeacherRating());
        assertEquals(5D, course.getAvgRating());
    }

    /** Enrollment chưa hoàn thành phải bị từ chối dù đã có quyền học. */
    @Test
    void activeStudentCannotReviewBeforeCompletion() {
        CourseEntity course = CourseEntity.builder().id(20L).build();
        EnrollmentEntity enrollment = EnrollmentEntity.builder().id(40L).courseEntity(course)
                .userEntity(UserEntity.builder().id(10L).build()).status((byte) 0).build();
        when(courseRepository.findById(20L)).thenReturn(Optional.of(course));
        when(enrollmentRepository.findByUserEntity_IdAndCourseEntity_Id(10L, 20L)).thenReturn(Optional.of(enrollment));

        assertThrows(BusinessException.class, () -> service.createReview(
                10L, 20L, CreateReviewRequest.builder().rating(5).build()));
    }
}
