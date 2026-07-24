package com.ailms.mapper;

import com.ailms.entity.TeachingSessionPaymentEntity;
import com.ailms.request.CreateTeachingSessionPaymentRequest;
import com.ailms.request.UpdateTeachingSessionPaymentRequest;
import com.ailms.response.TeachingSessionPaymentResponse;
import org.mapstruct.*;

import java.util.List;

@Mapper(componentModel = "spring")
public interface TeachingSessionPaymentMapper {

    @Mapping(target = "employeeId", source = "employee.userId")
    @Mapping(target = "rateId", source = "teachingRate.id")
    @Mapping(target = "classOnlineId", source = "classOnline.id")
    TeachingSessionPaymentResponse toResponse(TeachingSessionPaymentEntity entity);

    List<TeachingSessionPaymentResponse> toResponseList(List<TeachingSessionPaymentEntity> list);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "employee", ignore = true)
    @Mapping(target = "teachingRate", ignore = true)
    @Mapping(target = "classOnline", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "updatedBy", ignore = true)
    @Mapping(target = "status", ignore = true)
    TeachingSessionPaymentEntity toEntity(CreateTeachingSessionPaymentRequest request);

    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "employee", ignore = true)
    @Mapping(target = "teachingRate", ignore = true)
    @Mapping(target = "classOnline", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "updatedBy", ignore = true)
    void updateFromRequest(UpdateTeachingSessionPaymentRequest request, @MappingTarget TeachingSessionPaymentEntity entity);
}
