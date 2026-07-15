package com.ailms.service;

import org.springframework.data.domain.Page;
import com.ailms.request.AttendanceSearchRequest;
import com.ailms.response.AttendanceResponse;


import com.ailms.entity.AttendanceEntity;
import com.ailms.entity.EmployeeEntity;
import com.ailms.exception.ResourceNotFoundException;
import com.ailms.mapper.AttendanceMapper;
import com.ailms.repository.AttendanceRepository;
import com.ailms.repository.EmployeeRepository;
import com.ailms.request.AttendanceRequest;
import com.ailms.response.AttendanceResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

public interface IAttendanceService {
    Page<AttendanceResponse> search(AttendanceSearchRequest request);
    List<AttendanceResponse> getAll();
    AttendanceResponse getById(Long id);
    List<AttendanceResponse> getByEmployeeId(Long employeeId);
    AttendanceResponse create(AttendanceRequest request);
    AttendanceResponse update(Long id, AttendanceRequest request);
    void delete(Long id);
}
