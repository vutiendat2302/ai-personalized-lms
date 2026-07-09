package com.ailms.mapper;

import com.ailms.entity.TeachingSessionPaymentEntity;
import com.ailms.request.TeachingSessionPaymentRequest;
import com.ailms.response.TeachingSessionPaymentResponse;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

import java.util.List;

@Mapper(componentModel = "spring")
public interface TeachingSessionPaymentMapper {

    @Mapping(target = "employeeId", source = "employee.userId")
    @Mapping(target = "rateId", source = "teachingRate.id")
    TeachingSessionPaymentResponse toResponse(TeachingSessionPaymentEntity entity);

    List<TeachingSessionPaymentResponse> toResponseList(List<TeachingSessionPaymentEntity> list);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "employee", ignore = true)
    @Mapping(target = "teachingRate", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "updatedBy", ignore = true)
    TeachingSessionPaymentEntity toEntity(TeachingSessionPaymentRequest request);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "employee", ignore = true)
    @Mapping(target = "teachingRate", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "updatedBy", ignore = true)
    void updateFromRequest(TeachingSessionPaymentRequest request, @MappingTarget TeachingSessionPaymentEntity entity);
}
