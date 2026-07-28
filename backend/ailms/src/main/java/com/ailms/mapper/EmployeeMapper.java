package com.ailms.mapper;

import com.ailms.entity.EmployeeEntity;
import com.ailms.entity.UserEntity;
import com.ailms.request.CreateEmployeeRequest;
import com.ailms.request.UpdateEmployeeRequest;
import com.ailms.response.EmployeeResponse;
import org.mapstruct.*;

import java.util.List;

@Mapper(componentModel = "spring")
public interface EmployeeMapper {

    @Mapping(source = "userId", target = "id")
    @Mapping(source = "department.id", target = "departmentId")
    @Mapping(source = "department.name", target = "departmentName")
    @Mapping(source = "department.code", target = "departmentCode")
    @Mapping(source = "userEntity.fullName", target = "fullName")
    @Mapping(source = "userEntity.email", target = "userEmail")
    @Mapping(source = "userEntity.username", target = "userName")
    @Mapping(source = "userEntity.avatarUrl", target = "avatarUrl")
    @Mapping(source = "userEntity.phone", target = "phone")
    @Mapping(source = "userEntity.gender", target = "gender")
    @Mapping(source = "userEntity.dateOfBirth", target = "dateOfBirth")
    @Mapping(source = "userEntity.status", target = "userStatus")
    @Mapping(target = "roles", ignore = true)
    @Mapping(target = "roleIds", ignore = true)
    EmployeeResponse toResponse(EmployeeEntity entity);

    List<EmployeeResponse> toResponseList(List<EmployeeEntity> list);

    @Mapping(target = "userId", ignore = true)
    @Mapping(target = "userEntity", ignore = true)
    @Mapping(target = "department", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "updatedBy", ignore = true)
    @Mapping(target = "status", ignore = true)
    EmployeeEntity toEntity(CreateEmployeeRequest request);

    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    @Mapping(target = "userId", ignore = true)
    @Mapping(target = "employeeCode", ignore = true)
    @Mapping(target = "userEntity", ignore = true)
    @Mapping(target = "department", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "updatedBy", ignore = true)
    void updateFromRequest(UpdateEmployeeRequest request, @MappingTarget EmployeeEntity entity);

    /**
     * Sau khi map các field thuộc EmployeeEntity xong,
     * tiếp tục propagate các field thuộc UserEntity (fullName, gender, phone, dateOfBirth).
     * MapStruct tự động gọi method này sau updateFromRequest().
     */
    @AfterMapping
    default void propagateToUserEntity(UpdateEmployeeRequest request,
                                       @MappingTarget EmployeeEntity entity) {
        UserEntity user = entity.getUserEntity();
        if (user == null) return;

        if (request.getFullName() != null && !request.getFullName().isBlank()) {
            user.setFullName(request.getFullName());
        }
        if (request.getGender() != null) {
            user.setGender(request.getGender());
        }
        if (request.getPhone() != null && !request.getPhone().isBlank()) {
            user.setPhone(request.getPhone());
        }
        if (request.getDateOfBirth() != null) {
            user.setDateOfBirth(request.getDateOfBirth());
        }
    }
}
