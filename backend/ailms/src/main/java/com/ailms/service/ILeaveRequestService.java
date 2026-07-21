package com.ailms.service;

import com.ailms.request.CreateLeaveRequest;
import com.ailms.request.LeaveRequestSearchRequest;
import com.ailms.request.UpdateLeaveRequest;
import com.ailms.response.LeaveRequestResponse;
import com.ailms.response.PageResponse;

import java.util.List;

public interface ILeaveRequestService {
    PageResponse<LeaveRequestResponse> search(LeaveRequestSearchRequest request);
    List<LeaveRequestResponse> getAll();
    LeaveRequestResponse getById(Long id);
    List<LeaveRequestResponse> getByEmployeeId(Long employeeId);
    LeaveRequestResponse create(CreateLeaveRequest request);
    LeaveRequestResponse update(Long id, UpdateLeaveRequest request);
    LeaveRequestResponse approve(Long id, boolean approve, String rejectionReason);
    void cancel(Long id);
}
