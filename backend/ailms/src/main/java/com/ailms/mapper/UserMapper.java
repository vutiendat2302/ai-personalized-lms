package com.ailms.mapper;

import com.ailms.entity.UserEntity;
import com.ailms.response.UserResponse;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import java.util.List;

@Mapper(componentModel = "spring")
public interface UserMapper {
    @Mapping(target = "roles", ignore = true) // Will be mapped in Service manually if needed
    UserResponse toUserResponse(UserEntity userEntity);
    
    List<UserResponse> toUserResponseList(List<UserEntity> userEntities);
}
