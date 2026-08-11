package com.ailms.service.imp;

import com.ailms.entity.CourseEntity;
import com.ailms.entity.CoursePackageEntity;
import com.ailms.entity.enums.CoursePackageStatusEnum;
import com.ailms.entity.enums.CourseStatusEnum;
import com.ailms.entity.enums.DeliveryModeEnum;
import com.ailms.repository.ClassMemberRepository;
import com.ailms.repository.ClassScheduleRepository;
import com.ailms.repository.CoursePackageRepository;
import com.ailms.repository.CourseRepository;
import com.ailms.repository.EmployeeRepository;
import com.ailms.repository.EnrollmentPackageRepository;
import com.ailms.repository.EnrollmentRepository;
import com.ailms.repository.UserRepository;
import com.ailms.response.CourseCurriculumResponse;
import com.ailms.response.CourseDetailResponse;
import com.ailms.service.ICourseAuthoringService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CourseDetailServiceTest {

    @Mock private CourseRepository courseRepository;
    @Mock private CoursePackageRepository coursePackageRepository;
    @Mock private EnrollmentRepository enrollmentRepository;
    @Mock private EnrollmentPackageRepository enrollmentPackageRepository;
    @Mock private UserRepository userRepository;
    @Mock private EmployeeRepository employeeRepository;
    @Mock private ClassMemberRepository classMemberRepository;
    @Mock private ClassScheduleRepository classScheduleRepository;
    @Mock private ICourseAuthoringService courseAuthoringService;
    @InjectMocks private CourseDetailService service;

    /** Khóa mua GROUP/COMBO thiếu classId ngay trong course detail thay vì để FE gặp 404/422. */
    @Test
    void getDetailMarksClassBackedPackagesWithoutClassUnavailable() {
        CourseEntity course = CourseEntity.builder().id(1L).code("C-01").name("Java")
                .link("java").status(CourseStatusEnum.ACTIVE).build();
        CoursePackageEntity group = packageWithoutClass(10L, DeliveryModeEnum.GROUP_CLASS, 20, 0);
        CoursePackageEntity combo = packageWithoutClass(11L, DeliveryModeEnum.COMBO, 15, 4);
        when(courseRepository.isPubliclySellable(1L)).thenReturn(true);
        when(courseRepository.findById(1L)).thenReturn(Optional.of(course));
        when(coursePackageRepository.findByCourseEntity_IdAndStatus(1L, CoursePackageStatusEnum.ACTIVE))
                .thenReturn(List.of(group, combo));
        when(courseAuthoringService.getCurriculum(1L)).thenReturn(CourseCurriculumResponse.builder()
                .courseId(1L).courseName("Java").sections(List.of()).build());

        CourseDetailResponse result = service.getDetail(1L, null);

        assertEquals(2, result.getPackages().size());
        result.getPackages().forEach(item -> {
            assertFalse(item.getPurchasable());
            assertEquals("Gói học chưa được gắn với lớp học.", item.getUnavailableReason());
        });
    }

    /** COMBO tự học + gia sư không có sĩ số lớp vẫn phải được mở checkout và thu thập nhu cầu 1-1. */
    @Test
    void getDetailAllowsTutorComboWithoutGroupClass() {
        CourseEntity course = CourseEntity.builder().id(1L).code("C-01").name("Java")
                .link("java").status(CourseStatusEnum.ACTIVE).build();
        CoursePackageEntity combo = packageWithoutClass(12L, DeliveryModeEnum.COMBO, null, 8);
        when(courseRepository.isPubliclySellable(1L)).thenReturn(true);
        when(courseRepository.findById(1L)).thenReturn(Optional.of(course));
        when(coursePackageRepository.findByCourseEntity_IdAndStatus(1L, CoursePackageStatusEnum.ACTIVE))
                .thenReturn(List.of(combo));
        when(courseAuthoringService.getCurriculum(1L)).thenReturn(CourseCurriculumResponse.builder()
                .courseId(1L).courseName("Java").sections(List.of()).build());

        CourseDetailResponse.PackageItem result = service.getDetail(1L, null).getPackages().getFirst();

        assertTrue(result.getPurchasable());
        assertNull(result.getUnavailableReason());
        assertEquals(DeliveryModeEnum.COMBO, result.getDeliveryMode());
        assertEquals(8, result.getIncludedTutorSessions());
    }

    /** Tạo package tối thiểu để kiểm thử quy tắc lớp bắt buộc theo delivery mode. */
    private CoursePackageEntity packageWithoutClass(
            Long id, DeliveryModeEnum mode, Integer maxGroupSize, Integer tutorSessions) {
        return CoursePackageEntity.builder().id(id).code("CP-" + id).name("Package " + id)
                .courseEntity(CourseEntity.builder().id(1L).build()).deliveryMode(mode)
                .price(BigDecimal.TEN).originalPrice(BigDecimal.TEN)
                .maxGroupSize(maxGroupSize).includedTutorSessions(tutorSessions)
                .status(CoursePackageStatusEnum.ACTIVE).build();
    }
}
