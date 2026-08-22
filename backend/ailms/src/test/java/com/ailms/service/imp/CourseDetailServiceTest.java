package com.ailms.service.imp;

import com.ailms.entity.CourseEntity;
import com.ailms.entity.CoursePackageEntity;
import com.ailms.entity.EmployeeEntity;
import com.ailms.entity.EnrollmentPackageEntity;
import com.ailms.entity.UserEntity;
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
import static org.junit.jupiter.api.Assertions.assertNotNull;
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

    /** Khóa mua GROUP_CLASS thiếu classId ngay trong course detail thay vì để FE gặp 404/422. */
    @Test
    void getDetailMarksClassBackedPackagesWithoutClassUnavailable() {
        CourseEntity course = CourseEntity.builder().id(1L).code("C-01").name("Java")
                .link("java").status(CourseStatusEnum.ACTIVE).build();
        CoursePackageEntity group = packageWithoutClass(10L, DeliveryModeEnum.GROUP_CLASS, 20, 0);
        when(courseRepository.isPubliclySellable(1L)).thenReturn(true);
        when(courseRepository.findById(1L)).thenReturn(Optional.of(course));
        when(coursePackageRepository.findByCourseEntity_IdAndStatus(1L, CoursePackageStatusEnum.ACTIVE))
                .thenReturn(List.of(group));
        when(courseAuthoringService.getLearningCurriculum(1L)).thenReturn(CourseCurriculumResponse.builder()
                .courseId(1L).courseName("Java").sections(List.of()).build());

        CourseDetailResponse result = service.getDetail(1L, null);

        assertEquals(1, result.getPackages().size());
        result.getPackages().forEach(item -> {
            assertFalse(item.getPurchasable());
            assertEquals("Gói học chưa được gắn với lớp học.", item.getUnavailableReason());
        });
    }

    /** Không cho học viên bắt đầu checkout gói 1-1 cũ đang thiếu số buổi kèm. */
    @Test
    void getDetailMarksOneOnOneWithoutTutorSessionsUnavailable() {
        CourseEntity course = CourseEntity.builder().id(1L).code("C-01").name("Java")
                .link("java").status(CourseStatusEnum.ACTIVE).build();
        CoursePackageEntity oneOnOne = packageWithoutClass(13L, DeliveryModeEnum.ONE_ON_ONE, 1, null);
        when(courseRepository.isPubliclySellable(1L)).thenReturn(true);
        when(courseRepository.findById(1L)).thenReturn(Optional.of(course));
        when(coursePackageRepository.findByCourseEntity_IdAndStatus(1L, CoursePackageStatusEnum.ACTIVE))
                .thenReturn(List.of(oneOnOne));
        when(courseAuthoringService.getLearningCurriculum(1L)).thenReturn(CourseCurriculumResponse.builder()
                .courseId(1L).courseName("Java").sections(List.of()).build());

        CourseDetailResponse.PackageItem result = service.getDetail(1L, null).getPackages().getFirst();

        assertFalse(result.getPurchasable());
        assertEquals("Gói học 1-1 chưa được cấu hình số buổi kèm riêng.", result.getUnavailableReason());
    }

    /** Gói group/1-1 đang sở hữu phải làm gói tự học cùng khóa thành quyền lợi đã có. */
    @Test
    void getDetailMarksSelfStudyIncludedByOwnedEnhancedPackage() {
        CourseEntity course = CourseEntity.builder().id(1L).code("C-01").name("Java")
                .link("java").status(CourseStatusEnum.ACTIVE).build();
        CoursePackageEntity selfStudy = packageWithoutClass(14L, DeliveryModeEnum.SELF_STUDY, null, null);
        CoursePackageEntity ownedGroup = packageWithoutClass(15L, DeliveryModeEnum.GROUP_CLASS, 20, null);
        EnrollmentPackageEntity owned = EnrollmentPackageEntity.builder()
                .id(20L).coursePackageEntity(ownedGroup).build();
        when(courseRepository.isPubliclySellable(1L)).thenReturn(true);
        when(courseRepository.findById(1L)).thenReturn(Optional.of(course));
        when(enrollmentPackageRepository.findActiveOwnedByUserAndCourse(
                org.mockito.ArgumentMatchers.eq(9L), org.mockito.ArgumentMatchers.eq(1L),
                org.mockito.ArgumentMatchers.any())).thenReturn(List.of(owned));
        when(enrollmentPackageRepository.existsActiveCourseAccess(
                org.mockito.ArgumentMatchers.eq(9L), org.mockito.ArgumentMatchers.eq(1L),
                org.mockito.ArgumentMatchers.any())).thenReturn(true);
        when(coursePackageRepository.findByCourseEntity_IdAndStatus(1L, CoursePackageStatusEnum.ACTIVE))
                .thenReturn(List.of(selfStudy));
        when(courseAuthoringService.getLearningCurriculum(1L)).thenReturn(CourseCurriculumResponse.builder()
                .courseId(1L).courseName("Java").sections(List.of()).build());

        CourseDetailResponse.PackageItem result = service.getDetail(1L, 9L).getPackages().getFirst();

        assertTrue(result.getOwned());
        assertFalse(result.getPurchasable());
        assertEquals("Bạn đã có quyền tự học từ gói group/1-1 đang sở hữu.", result.getUnavailableReason());
    }

    /** Kiểm tra thông tin tiểu sử (bio) của giảng viên biên soạn được ánh xạ đầy đủ. */
    @Test
    void getDetailMapsCreatorBioCorrectly() {
        CourseEntity course = CourseEntity.builder().id(1L).code("C-01").name("Java")
                .link("java").status(CourseStatusEnum.ACTIVE).createdBy(100L).build();
        UserEntity creator = UserEntity.builder().id(100L).fullName("Trần Thanh Lan").username("lan.tt").build();
        EmployeeEntity employee = EmployeeEntity.builder().userId(100L).employeeCode("EP-2608-64D7F8")
                .position("Giảng viên chính").bio("Giảng viên với 10 năm kinh nghiệm dạy lập trình.").build();

        when(courseRepository.isPubliclySellable(1L)).thenReturn(true);
        when(courseRepository.findById(1L)).thenReturn(Optional.of(course));
        when(userRepository.findById(100L)).thenReturn(Optional.of(creator));
        when(employeeRepository.findById(100L)).thenReturn(Optional.of(employee));
        when(coursePackageRepository.findByCourseEntity_IdAndStatus(1L, CoursePackageStatusEnum.ACTIVE))
                .thenReturn(List.of());
        when(courseAuthoringService.getLearningCurriculum(1L)).thenReturn(CourseCurriculumResponse.builder()
                .courseId(1L).courseName("Java").sections(List.of()).build());

        CourseDetailResponse result = service.getDetail(1L, null);

        assertNotNull(result.getCreator());
        assertEquals("Trần Thanh Lan", result.getCreator().getFullName());
        assertEquals("EP-2608-64D7F8", result.getCreator().getCode());
        assertEquals("Giảng viên chính", result.getCreator().getTitle());
        assertEquals("Giảng viên với 10 năm kinh nghiệm dạy lập trình.", result.getCreator().getBio());
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
