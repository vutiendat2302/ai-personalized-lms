package com.ailms.service;

import com.ailms.entity.enums.SalaryStatusEnum;
import com.ailms.request.CreateSalaryRequest;
import com.ailms.request.GenerateSalaryPeriodRequest;
import com.ailms.request.SalarySearchRequest;
import com.ailms.request.UpdateSalaryRequest;
import com.ailms.response.PageResponse;
import com.ailms.response.SalaryResponse;
import com.ailms.response.SalarySummaryResponse;

import java.time.YearMonth;
import java.util.List;

/**
 * Service quản lý và tính toán bảng lương nhân viên.
 */
public interface ISalaryService {

    PageResponse<SalaryResponse> search(SalarySearchRequest request);

    List<SalaryResponse> getAll();

    SalaryResponse getById(Long id);

    List<SalaryResponse> getByEmployeeId(Long employeeId);

    SalaryResponse create(CreateSalaryRequest request);

    SalaryResponse update(Long id, UpdateSalaryRequest request);

    void delete(Long id);

    SalaryResponse approve(Long id);

    SalaryResponse pay(Long id);

    SalarySummaryResponse getSummary(YearMonth period);

    int generatePeriod(GenerateSalaryPeriodRequest request);

    void bulkApprove(List<Long> ids);

    SalaryResponse markPaid(Long id);

    void bulkMarkPaid(List<Long> ids);

    byte[] exportCsv(YearMonth period, Long departmentId, SalaryStatusEnum status);
}
