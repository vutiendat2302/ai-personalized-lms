package com.ailms.service.imp;

import com.ailms.entity.enums.CourseTeacherStatusEnum;
import com.ailms.entity.CourseEntity;
import com.ailms.entity.CourseSectionEntity;
import com.ailms.entity.EnrollmentEntity;
import com.ailms.entity.LessonEntity;
import com.ailms.entity.LessonProgressEntity;
import com.ailms.entity.LearningActivityLogEntity;
import com.ailms.entity.UserEntity;
import com.ailms.exception.BusinessException;
import com.ailms.repository.CourseProgressRepository;
import com.ailms.repository.CourseRepository;
import com.ailms.repository.CourseTeacherRepository;
import com.ailms.repository.EnrollmentPackageRepository;
import com.ailms.repository.EnrollmentRepository;
import com.ailms.repository.LessonProgressRepository;
import com.ailms.repository.LessonRepository;
import com.ailms.repository.LearningActivityLogRepository;
import com.ailms.response.CourseCurriculumResponse;
import com.ailms.service.ICourseAuthoringService;
import com.ailms.service.IStudyGoalService;
import com.ailms.service.ICertificateService;
import com.ailms.mapper.LessonProgressMapper;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class StudentLearningServiceTest {

    @Mock private ICourseAuthoringService courseAuthoringService;
    @Mock private LessonProgressRepository lessonProgressRepository;
    @Mock private EnrollmentRepository enrollmentRepository;
    @Mock private CourseProgressRepository courseProgressRepository;
    @Mock private LessonRepository lessonRepository;
    @Mock private LessonProgressMapper lessonProgressMapper;
    @Mock private EnrollmentPackageRepository enrollmentPackageRepository;
    @Mock private CourseRepository courseRepository;
    @Mock private CourseTeacherRepository courseTeacherRepository;
    @Mock private LearningActivityLogRepository learningActivityLogRepository;
    @Mock private IStudyGoalService studyGoalService;
    @Mock private ICertificateService certificateService;
    @InjectMocks private StudentLearningService service;

    /** Dọn SecurityContext sau mỗi test để không làm rò vai trò sang test khác. */
    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    /** Giảng viên được phân công ACTIVE phải xem được toàn bộ bài, kể cả bài không FREE. */
    @Test
    void getCourseTreeUnlocksEveryLessonForAssignedTeacher() {
        when(courseRepository.findById(10L)).thenReturn(Optional.of(course(10L, 99L)));
        when(courseAuthoringService.getCurriculum(10L)).thenReturn(curriculum(10L));
        when(enrollmentRepository.findByUserEntity_IdAndCourseEntity_Id(20L, 10L))
                .thenReturn(Optional.empty());
        when(courseTeacherRepository.existsByCourseEntity_IdAndUserEntity_IdAndStatus(
                10L, 20L, CourseTeacherStatusEnum.ACTIVE)).thenReturn(true);

        CourseCurriculumResponse result = service.getCourseTree(10L, 20L);

        assertTrue(result.getStaffPreviewAccess());
        assertTrue(result.getSections().getFirst().getLessons().getFirst().getAccessible());
        assertFalse(result.getSections().getFirst().getLessons().getFirst().getLocked());
    }

    /** Role TEACHER không được tự động mở khóa khóa học nếu chưa được phân công. */
    @Test
    void getCourseTreeKeepsLessonLockedForUnassignedTeacher() {
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(
                "teacher", "", List.of(new SimpleGrantedAuthority("ROLE_TEACHER"))));
        when(courseRepository.findById(10L)).thenReturn(Optional.of(course(10L, 99L)));
        when(courseAuthoringService.getLearningCurriculum(10L)).thenReturn(curriculum(10L));
        when(enrollmentRepository.findByUserEntity_IdAndCourseEntity_Id(20L, 10L))
                .thenReturn(Optional.empty());
        when(courseRepository.isPubliclySellable(10L)).thenReturn(true);

        CourseCurriculumResponse result = service.getCourseTree(10L, 20L);

        assertFalse(result.getStaffPreviewAccess());
        assertFalse(result.getSections().getFirst().getLessons().getFirst().getAccessible());
        assertTrue(result.getSections().getFirst().getLessons().getFirst().getLocked());
    }

    /** Video chưa đạt 70% không được hoàn thành bằng endpoint đánh dấu thủ công. */
    @Test
    void completeLessonRejectsVideoBelowSeventyPercent() {
        CourseEntity course = course(10L, 99L);
        UserEntity student = UserEntity.builder().id(20L).build();
        EnrollmentEntity enrollment = EnrollmentEntity.builder()
                .id(50L).userEntity(student).courseEntity(course).build();
        CourseSectionEntity section = CourseSectionEntity.builder()
                .id(40L).courseEntity(course).name("Chương 1").build();
        LessonEntity lesson = LessonEntity.builder()
                .id(30L).courseSectionEntity(section).contentType("VIDEO").durationSec(20).build();
        LessonProgressEntity progress = LessonProgressEntity.builder()
                .id(60L).userId(20L).lessonId(30L).enrollmentId(50L).progressPercent(69).build();
        when(enrollmentRepository.findById(50L)).thenReturn(Optional.of(enrollment));
        when(enrollmentPackageRepository.existsActiveCourseAccess(
                org.mockito.ArgumentMatchers.eq(20L),
                org.mockito.ArgumentMatchers.eq(10L),
                org.mockito.ArgumentMatchers.any()))
                .thenReturn(true);
        when(lessonRepository.findById(30L)).thenReturn(Optional.of(lesson));
        when(lessonProgressRepository.findByUserIdAndLessonIdAndEnrollmentId(20L, 30L, 50L))
                .thenReturn(Optional.of(progress));

        assertThrows(BusinessException.class, () -> service.completeLesson(30L, 20L, 50L));
    }

    /** Hoàn thành bài lần đầu phải lưu lịch sử học tập và đánh giá lại streak. */
    @Test
    void completeLessonRecordsLearningActivityAndRefreshesGoals() {
        CourseEntity course = course(10L, 99L);
        EnrollmentEntity enrollment = EnrollmentEntity.builder().id(50L)
                .userEntity(UserEntity.builder().id(20L).build()).courseEntity(course).build();
        CourseSectionEntity section = CourseSectionEntity.builder().id(40L).courseEntity(course).build();
        LessonEntity lesson = LessonEntity.builder().id(30L).courseSectionEntity(section)
                .contentType("TEXT").build();
        LessonProgressEntity savedProgress = LessonProgressEntity.builder().id(60L).userId(20L)
                .lessonId(30L).enrollmentId(50L).status((byte) 1)
                .completedAt(java.time.LocalDateTime.now()).progressPercent(100).build();

        when(enrollmentRepository.findById(50L)).thenReturn(Optional.of(enrollment));
        when(enrollmentPackageRepository.existsActiveCourseAccess(
                org.mockito.ArgumentMatchers.eq(20L), org.mockito.ArgumentMatchers.eq(10L),
                org.mockito.ArgumentMatchers.any())).thenReturn(true);
        when(lessonRepository.findById(30L)).thenReturn(Optional.of(lesson));
        when(lessonProgressRepository.findByUserIdAndLessonIdAndEnrollmentId(20L, 30L, 50L))
                .thenReturn(Optional.empty());
        when(lessonProgressRepository.save(any(LessonProgressEntity.class))).thenReturn(savedProgress);
        when(lessonRepository.countByCourseSectionEntityCourseEntityId(10L)).thenReturn(1);
        when(lessonProgressRepository.countByEnrollmentIdAndStatusEquals(50L, (byte) 1)).thenReturn(1L);
        when(courseProgressRepository.findByEnrollmentId(50L)).thenReturn(List.of());

        service.completeLesson(30L, 20L, 50L);

        verify(learningActivityLogRepository).save(any(LearningActivityLogEntity.class));
        verify(studyGoalService).evaluateUserGoals(20L);
        verify(certificateService).issueIfEligible(50L);
    }

    /** Tạo cây khóa học tối thiểu với một bài bị khóa để kiểm thử quyền preview. */
    private CourseCurriculumResponse curriculum(Long courseId) {
        CourseCurriculumResponse.LessonCurriculumItem lesson = CourseCurriculumResponse.LessonCurriculumItem.builder()
                .id(30L)
                .name("Bài chuyên sâu")
                .previewType("LOCKED")
                .contentUrl("https://example.test/lesson")
                .build();
        CourseCurriculumResponse.SectionCurriculumItem section = CourseCurriculumResponse.SectionCurriculumItem.builder()
                .id(40L)
                .name("Chương 1")
                .lessons(List.of(lesson))
                .build();
        return CourseCurriculumResponse.builder()
                .courseId(courseId)
                .courseName("Khóa học")
                .createdBy(99L)
                .sections(List.of(section))
                .build();
    }

    /** Tạo course tối thiểu để service xác định chủ sở hữu trước khi chọn curriculum preview. */
    private CourseEntity course(Long courseId, Long createdBy) {
        return CourseEntity.builder().id(courseId).createdBy(createdBy).build();
    }
}
