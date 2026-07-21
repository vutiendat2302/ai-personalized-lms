package com.ailms.mapper;

import com.ailms.entity.InterestEntity;
import com.ailms.request.CreateInterestRequest;
import com.ailms.request.UpdateInterestRequest;
import com.ailms.response.InterestResponse;
import org.mapstruct.*;

@Mapper(componentModel = "spring")
public interface InterestMapper {

    InterestResponse toInterestResponse(InterestEntity entity);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "status", ignore = true)
    @Mapping(target = "studentInterests", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "updatedBy", ignore = true)
    InterestEntity toInterestEntity(CreateInterestRequest request);

    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "studentInterests", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "updatedBy", ignore = true)
    @Mapping(target = "code", ignore = true)
    void updateInterestEntity(@MappingTarget InterestEntity entity, UpdateInterestRequest request);
}
