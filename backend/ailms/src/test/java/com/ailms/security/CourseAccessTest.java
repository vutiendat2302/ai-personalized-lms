package com.ailms.security;

import com.ailms.entity.CourseEntity;
import com.ailms.entity.UserEntity;
import com.ailms.entity.enums.CourseInstructorStatusEnum;
import com.ailms.entity.enums.CourseTeacherStatusEnum;
import com.ailms.repository.CourseInstructorRepository;
import com.ailms.repository.CoursePackageRepository;
import com.ailms.repository.CourseRepository;
import com.ailms.repository.CourseTeacherRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CourseAccessTest {

    @Mock private CourseRepository courseRepository;
    @Mock private CoursePackageRepository coursePackageRepository;
    @Mock private CourseTeacherRepository courseTeacherRepository;
    @Mock private CourseInstructorRepository courseInstructorRepository;
    @InjectMocks private CourseAccess courseAccess;

    /** Cho phép giảng viên được phân công ACTIVE mở khóa học dù không phải người tạo. */
    @Test
    void canManageAllowsActiveAssignedTeacher() {
        when(courseRepository.findById(10L)).thenReturn(Optional.of(CourseEntity.builder().createdBy(99L).build()));
        when(courseTeacherRepository.existsByCourseEntity_IdAndUserEntity_IdAndStatus(
                10L, 20L, CourseTeacherStatusEnum.ACTIVE)).thenReturn(true);

        boolean allowed = courseAccess.canManage(10L, authenticationFor(20L));

        assertTrue(allowed);
        verify(courseTeacherRepository).existsByCourseEntity_IdAndUserEntity_IdAndStatus(
                10L, 20L, CourseTeacherStatusEnum.ACTIVE);
    }

    /** Không cấp quyền cho lời mời PENDING, REJECTED hoặc INACTIVE. */
    @Test
    void canManageRejectsTeacherWithoutActiveAssignment() {
        when(courseRepository.findById(10L)).thenReturn(Optional.of(CourseEntity.builder().createdBy(99L).build()));
        when(courseTeacherRepository.existsByCourseEntity_IdAndUserEntity_IdAndStatus(
                10L, 20L, CourseTeacherStatusEnum.ACTIVE)).thenReturn(false);

        boolean allowed = courseAccess.canManage(10L, authenticationFor(20L));

        assertFalse(allowed);
    }

    /** Lời mời đồng giảng viên đã ACCEPTED cũng phải có quyền, dù chưa có bản ghi course_teacher cũ. */
    @Test
    void canManageAllowsAcceptedCoInstructor() {
        when(courseRepository.findById(10L)).thenReturn(Optional.of(CourseEntity.builder().createdBy(99L).build()));
        when(courseTeacherRepository.existsByCourseEntity_IdAndUserEntity_IdAndStatus(
                10L, 20L, CourseTeacherStatusEnum.ACTIVE)).thenReturn(false);
        when(courseInstructorRepository.existsByCourseIdAndInstructorIdAndStatus(
                10L, 20L, CourseInstructorStatusEnum.ACCEPTED)).thenReturn(true);

        assertTrue(courseAccess.canManage(10L, authenticationFor(20L)));
    }

    /** Tạo authentication tối thiểu cho giảng viên đang đăng nhập. */
    private UsernamePasswordAuthenticationToken authenticationFor(Long userId) {
        UserEntity user = UserEntity.builder().id(userId).build();
        CustomUserDetails principal = new CustomUserDetails(user, List.of());
        return new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities());
    }
}
