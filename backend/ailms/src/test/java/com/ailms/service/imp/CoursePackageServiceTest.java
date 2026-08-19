package com.ailms.service.imp;

import com.ailms.entity.CourseEntity;
import com.ailms.entity.CoursePackageEntity;
import com.ailms.entity.enums.CoursePackageStatusEnum;
import com.ailms.entity.enums.CourseStatusEnum;
import com.ailms.entity.enums.DeliveryModeEnum;
import com.ailms.exception.BusinessException;
import com.ailms.mapper.CoursePackageMapper;
import com.ailms.repository.ClassRepository;
import com.ailms.repository.CoursePackageRepository;
import com.ailms.repository.CourseRepository;
import com.ailms.request.CreateCoursePackageRequest;
import com.ailms.request.CoursePackageStatusRequest;
import com.ailms.search.MeilisearchCourseService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;

import java.math.BigDecimal;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CoursePackageServiceTest {

    @Mock private CoursePackageRepository coursePackageRepository;
    @Mock private CourseRepository courseRepository;
    @Mock private ClassRepository classRepository;
    @Mock private CoursePackageMapper coursePackageMapper;
    @Mock private ApplicationEventPublisher applicationEventPublisher;
    @Mock private MeilisearchCourseService meilisearchCourseService;
    @InjectMocks private CoursePackageService service;

    /** Chặn tạo gói 1-1 không có số buổi để lỗi không bị dồn đến checkout học viên. */
    @Test
    void createRejectsOneOnOneWithoutTutorSessions() {
        CourseEntity course = CourseEntity.builder().id(1L).status(CourseStatusEnum.ACTIVE).build();
        when(courseRepository.findById(1L)).thenReturn(Optional.of(course));
        CreateCoursePackageRequest request = CreateCoursePackageRequest.builder()
                .courseId(1L).name("Kèm riêng").deliveryMode(DeliveryModeEnum.ONE_ON_ONE)
                .price(BigDecimal.valueOf(1_000_000)).originalPrice(BigDecimal.valueOf(1_200_000))
                .includedTutorSessions(0).build();

        BusinessException exception = assertThrows(BusinessException.class, () -> service.create(request));

        assertEquals("Gói ONE_ON_ONE phải có ít nhất một buổi kèm riêng.", exception.getMessage());
    }

    /** Chặn kích hoạt lại gói 1-1 cũ nếu dữ liệu số buổi vẫn chưa được sửa. */
    @Test
    void updateStatusRejectsInvalidOneOnOnePackage() {
        CoursePackageEntity existing = CoursePackageEntity.builder().id(10L)
                .deliveryMode(DeliveryModeEnum.ONE_ON_ONE).includedTutorSessions(null)
                .status(CoursePackageStatusEnum.INACTIVE).build();
        when(coursePackageRepository.findById(10L)).thenReturn(Optional.of(existing));
        CoursePackageStatusRequest request = new CoursePackageStatusRequest();
        request.setStatus(CoursePackageStatusEnum.ACTIVE);

        BusinessException exception = assertThrows(
                BusinessException.class, () -> service.updateStatus(10L, request));

        assertEquals("Gói ONE_ON_ONE phải có ít nhất một buổi kèm riêng.", exception.getMessage());
    }
}
