package com.ailms.service;

import com.ailms.entity.enums.AttendanceStatusEnum;
import com.ailms.request.AttendanceSearchRequest;
import com.ailms.request.CreateAttendanceRequest;
import com.ailms.request.UpdateAttendanceRequest;
import com.ailms.response.AttendanceResponse;
import com.ailms.response.PageResponse;

import java.util.List;

public interface IAttendanceService {
    PageResponse<AttendanceResponse> search(AttendanceSearchRequest request);
    List<AttendanceResponse> getAll();
    AttendanceResponse getById(Long id);
    List<AttendanceResponse> getByEmployeeId(Long employeeId);
    AttendanceResponse create(CreateAttendanceRequest request);
    AttendanceResponse update(Long id, UpdateAttendanceRequest request);
    void delete(Long id);
    AttendanceResponse checkIn(Long employeeId, String note);
    AttendanceResponse checkOut(Long employeeId, String note);
    AttendanceResponse updateStatus(Long id, AttendanceStatusEnum status);
}
