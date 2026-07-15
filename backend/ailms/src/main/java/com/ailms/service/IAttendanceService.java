package com.ailms.service;

import com.ailms.request.CreateAttendanceRequest;
import com.ailms.request.UpdateAttendanceRequest;
import org.springframework.data.domain.Page;
import com.ailms.request.AttendanceSearchRequest;
import com.ailms.response.AttendanceResponse;
import java.util.List;

public interface IAttendanceService {
    Page<AttendanceResponse> search(AttendanceSearchRequest request);
    List<AttendanceResponse> getAll();
    AttendanceResponse getById(Long id);
    List<AttendanceResponse> getByEmployeeId(Long employeeId);
    AttendanceResponse create(CreateAttendanceRequest request);
    AttendanceResponse update(Long id, UpdateAttendanceRequest request);
    void delete(Long id);
}
