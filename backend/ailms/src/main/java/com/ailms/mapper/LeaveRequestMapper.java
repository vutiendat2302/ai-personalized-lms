package com.ailms.mapper;

import com.ailms.entity.LeaveRequestEntity;
import com.ailms.request.CreateLeaveRequest;
import com.ailms.request.UpdateLeaveRequest;
import com.ailms.response.LeaveRequestResponse;
import org.mapstruct.*;

import java.util.List;

@Mapper(componentModel = "spring")
public interface LeaveRequestMapper {

    @Mapping(source = "employee.userId", target = "employeeId")
    @Mapping(source = "employee.userEntity.fullName", target = "employeeName")
    @Mapping(source = "employee.employeeCode", target = "employeeCode")
    @Mapping(source = "approver.id", target = "approverId")
    @Mapping(source = "approver.fullName", target = "approverName")
    LeaveRequestResponse toResponse(LeaveRequestEntity entity);

    List<LeaveRequestResponse> toResponseList(List<LeaveRequestEntity> list);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "employee", ignore = true)
    @Mapping(target = "status", ignore = true)
    @Mapping(target = "approver", ignore = true)
    @Mapping(target = "approvedAt", ignore = true)
    @Mapping(target = "rejectionReason", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "updatedBy", ignore = true)
    LeaveRequestEntity toEntity(CreateLeaveRequest request);

    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "employee", ignore = true)
    @Mapping(target = "approver", ignore = true)
    @Mapping(target = "approvedAt", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "updatedBy", ignore = true)
    void updateFromRequest(UpdateLeaveRequest request, @MappingTarget LeaveRequestEntity entity);
}
