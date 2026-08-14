package com.ailms.service.imp;

import com.ailms.entity.enums.CourseTeacherStatusEnum;
import com.ailms.repository.CourseProgressRepository;
import com.ailms.repository.CourseRepository;
import com.ailms.repository.CourseTeacherRepository;
import com.ailms.repository.EnrollmentPackageRepository;
import com.ailms.repository.EnrollmentRepository;
import com.ailms.repository.LessonProgressRepository;
import com.ailms.repository.LessonRepository;
import com.ailms.response.CourseCurriculumResponse;
import com.ailms.service.ICourseAuthoringService;
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
import static org.junit.jupiter.api.Assertions.assertTrue;
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
    @InjectMocks private StudentLearningService service;

    /** Dọn SecurityContext sau mỗi test để không làm rò vai trò sang test khác. */
    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    /** Giảng viên được phân công ACTIVE phải xem được toàn bộ bài, kể cả bài không FREE. */
    @Test
    void getCourseTreeUnlocksEveryLessonForAssignedTeacher() {
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
        when(courseAuthoringService.getCurriculum(10L)).thenReturn(curriculum(10L));
        when(enrollmentRepository.findByUserEntity_IdAndCourseEntity_Id(20L, 10L))
                .thenReturn(Optional.empty());
        when(courseRepository.isPubliclySellable(10L)).thenReturn(true);

        CourseCurriculumResponse result = service.getCourseTree(10L, 20L);

        assertFalse(result.getStaffPreviewAccess());
        assertFalse(result.getSections().getFirst().getLessons().getFirst().getAccessible());
        assertTrue(result.getSections().getFirst().getLessons().getFirst().getLocked());
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
}
