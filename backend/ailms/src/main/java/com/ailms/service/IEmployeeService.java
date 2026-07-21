package com.ailms.service;

import com.ailms.request.CreateEmployeeContractRequest;
import com.ailms.request.CreateEmployeeRequest;
import com.ailms.request.EmployeeSearchRequest;
import com.ailms.request.UpdateEmployeeRequest;
import com.ailms.response.EmployeeResponse;
import com.ailms.response.PageResponse;

import java.util.List;

public interface IEmployeeService {

    PageResponse<EmployeeResponse> search(EmployeeSearchRequest request);
    List<EmployeeResponse> getAll();
    EmployeeResponse getById(Long id);
    EmployeeResponse create(CreateEmployeeRequest request);
    EmployeeResponse update(Long id, UpdateEmployeeRequest request);
    void softDelete(Long id);

    /**
     * Chấm dứt hợp đồng / cho nhân viên nghỉ việc (Terminate)
     * @param id ID của nhân viên cần terminate
     * @return {@link EmployeeResponse} sau khi terminate
     */
    EmployeeResponse terminate(Long id);


    /**
     * Đánh giá kết thúc thời gian thử việc cho nhân viên
     * @param id ID của nhân viên được đánh giá
     * @param pass {@code true} nếu đạt yêu cầu thử việc, {@code false} nếu không đạt
     * @param newContractRequest Thông tin hợp đồng mới (bắt buộc khi pass = true)
     * @return {@link EmployeeResponse} sau khi đánh giá
     */
    EmployeeResponse probationReview(Long id, boolean pass, CreateEmployeeContractRequest newContractRequest);
}
