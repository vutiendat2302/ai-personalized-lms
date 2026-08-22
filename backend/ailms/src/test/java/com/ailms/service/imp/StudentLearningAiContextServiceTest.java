package com.ailms.service.imp;

import com.ailms.entity.ClassEntity;
import com.ailms.entity.ClassMemberEntity;
import com.ailms.entity.CourseEntity;
import com.ailms.entity.CourseSectionEntity;
import com.ailms.entity.EnrollmentEntity;
import com.ailms.entity.LessonEntity;
import com.ailms.entity.enums.ClassMemberRole;
import com.ailms.entity.enums.ClassMemberStatusEnum;
import com.ailms.exception.BadRequestException;
import com.ailms.exception.ForbiddenException;
import com.ailms.repository.ClassMemberRepository;
import com.ailms.repository.EnrollmentRepository;
import com.ailms.repository.EnrollmentPackageRepository;
import com.ailms.repository.LessonRepository;
import com.ailms.request.ai.AiChatRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

/** Kiểm tra context Chat học viên luôn được suy từ enrollment và membership thật. */
class StudentLearningAiContextServiceTest {
    private EnrollmentRepository enrollmentRepository;
    private EnrollmentPackageRepository enrollmentPackageRepository;
    private LessonRepository lessonRepository;
    private ClassMemberRepository classMemberRepository;
    private StudentLearningAiContextService service;

    /** Khởi tạo các dependency mock độc lập cho mỗi case. */
    @BeforeEach
    void setUp() {
        enrollmentRepository = mock(EnrollmentRepository.class);
        enrollmentPackageRepository = mock(EnrollmentPackageRepository.class);
        lessonRepository = mock(LessonRepository.class);
        classMemberRepository = mock(ClassMemberRepository.class);
        service = new StudentLearningAiContextService(
                enrollmentRepository, enrollmentPackageRepository, lessonRepository, classMemberRepository);
        when(enrollmentPackageRepository.existsActiveCourseAccess(
                org.mockito.ArgumentMatchers.anyLong(),
                org.mockito.ArgumentMatchers.anyLong(), any(LocalDateTime.class))).thenReturn(true);
    }

    /** Resolve thành công course/class/lesson và mặc định LESSON_ONLY. */
    @Test
    void resolveValidLessonContext() {
        CourseEntity course = CourseEntity.builder().id(10L).build();
        ClassEntity clazz = ClassEntity.builder().id(20L).courseEntity(course).build();
        EnrollmentEntity enrollment = EnrollmentEntity.builder()
                .courseEntity(course).classEntity(clazz).status((byte) 0).build();
        CourseSectionEntity section = CourseSectionEntity.builder().id(30L).courseEntity(course).build();
        LessonEntity lesson = LessonEntity.builder().id(40L).courseSectionEntity(section).build();
        ClassMemberEntity member = mock(ClassMemberEntity.class);
        when(member.getStatus()).thenReturn(ClassMemberStatusEnum.ACTIVE);
        when(member.getRoleInClass()).thenReturn(ClassMemberRole.STUDENT);
        when(enrollmentRepository.findByUserEntity_IdAndCourseEntity_Id(1L, 10L))
                .thenReturn(Optional.of(enrollment));
        when(lessonRepository.findById(40L)).thenReturn(Optional.of(lesson));
        when(classMemberRepository.findById_ClassIdAndId_UserId(20L, 1L))
                .thenReturn(Optional.of(member));

        var context = service.resolve(1L, AiChatRequest.builder().courseId(10L).lessonId(40L).build());

        assertEquals(10L, context.courseId());
        assertEquals(20L, context.classId());
        assertEquals(40L, context.lessonId());
        assertEquals("LESSON_ONLY", context.retrievalScope());
    }

    /** Chặn truy xuất course khi user không có enrollment. */
    @Test
    void rejectCourseWithoutEnrollment() {
        when(enrollmentRepository.findByUserEntity_IdAndCourseEntity_Id(1L, 10L))
                .thenReturn(Optional.empty());

        assertThrows(ForbiddenException.class,
                () -> service.resolve(1L, AiChatRequest.builder().courseId(10L).build()));
    }

    /** Chặn lesson thuộc course khác dù ID lesson tồn tại. */
    @Test
    void rejectLessonFromAnotherCourse() {
        CourseEntity course = CourseEntity.builder().id(10L).build();
        EnrollmentEntity enrollment = EnrollmentEntity.builder().courseEntity(course).status((byte) 0).build();
        CourseEntity otherCourse = CourseEntity.builder().id(11L).build();
        LessonEntity lesson = LessonEntity.builder().id(40L)
                .courseSectionEntity(CourseSectionEntity.builder().courseEntity(otherCourse).build()).build();
        when(enrollmentRepository.findByUserEntity_IdAndCourseEntity_Id(1L, 10L))
                .thenReturn(Optional.of(enrollment));
        when(lessonRepository.findById(40L)).thenReturn(Optional.of(lesson));

        assertThrows(ForbiddenException.class, () -> service.resolve(
                1L, AiChatRequest.builder().courseId(10L).lessonId(40L).build()));
    }

    /** Chặn scope lớp khi enrollment không gắn class. */
    @Test
    void rejectClassScopeWithoutClass() {
        CourseEntity course = CourseEntity.builder().id(10L).build();
        EnrollmentEntity enrollment = EnrollmentEntity.builder().courseEntity(course).status((byte) 0).build();
        when(enrollmentRepository.findByUserEntity_IdAndCourseEntity_Id(1L, 10L))
                .thenReturn(Optional.of(enrollment));

        assertThrows(BadRequestException.class, () -> service.resolve(1L, AiChatRequest.builder()
                .courseId(10L).retrievalScope("CLASS_MATERIALS").build()));
    }

    /** Chặn mọi learning scope khi enrollment của học viên đã bị hủy. */
    @Test
    void rejectCancelledEnrollment() {
        CourseEntity course = CourseEntity.builder().id(10L).build();
        EnrollmentEntity enrollment = EnrollmentEntity.builder().courseEntity(course).status((byte) 3).build();
        when(enrollmentRepository.findByUserEntity_IdAndCourseEntity_Id(1L, 10L))
                .thenReturn(Optional.of(enrollment));

        assertThrows(ForbiddenException.class,
                () -> service.resolve(1L, AiChatRequest.builder().courseId(10L).build()));
    }

    /** Chặn RAG khi enrollment còn lưu nhưng toàn bộ package đã hết hạn hoặc bị thu hồi. */
    @Test
    void rejectCourseWithoutActivePackage() {
        CourseEntity course = CourseEntity.builder().id(10L).build();
        EnrollmentEntity enrollment = EnrollmentEntity.builder().courseEntity(course).status((byte) 0).build();
        when(enrollmentRepository.findByUserEntity_IdAndCourseEntity_Id(1L, 10L))
                .thenReturn(Optional.of(enrollment));
        when(enrollmentPackageRepository.existsActiveCourseAccess(
                org.mockito.ArgumentMatchers.eq(1L),
                org.mockito.ArgumentMatchers.eq(10L), any(LocalDateTime.class))).thenReturn(false);

        assertThrows(ForbiddenException.class,
                () -> service.resolve(1L, AiChatRequest.builder().courseId(10L).build()));
    }

    /** Chặn context lớp khi membership không còn ACTIVE dù enrollment vẫn tồn tại. */
    @Test
    void rejectInactiveClassMembership() {
        CourseEntity course = CourseEntity.builder().id(10L).build();
        ClassEntity clazz = ClassEntity.builder().id(20L).courseEntity(course).build();
        EnrollmentEntity enrollment = EnrollmentEntity.builder()
                .courseEntity(course).classEntity(clazz).status((byte) 0).build();
        ClassMemberEntity member = mock(ClassMemberEntity.class);
        when(member.getStatus()).thenReturn(ClassMemberStatusEnum.REMOVED);
        when(member.getRoleInClass()).thenReturn(ClassMemberRole.STUDENT);
        when(enrollmentRepository.findByUserEntity_IdAndCourseEntity_Id(1L, 10L))
                .thenReturn(Optional.of(enrollment));
        when(classMemberRepository.findById_ClassIdAndId_UserId(20L, 1L))
                .thenReturn(Optional.of(member));

        assertThrows(ForbiddenException.class,
                () -> service.resolve(1L, AiChatRequest.builder().courseId(10L).build()));
    }
}
