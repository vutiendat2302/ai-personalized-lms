package com.ailms.service;

import com.ailms.entity.enums.SalaryStatusEnum;
import com.ailms.request.CreateSalaryRequest;
import com.ailms.request.GenerateSalaryPeriodRequest;
import com.ailms.request.SalarySearchRequest;
import com.ailms.request.UpdateSalaryRequest;
import com.ailms.response.PageResponse;
import com.ailms.response.SalaryResponse;
import com.ailms.response.SalarySummaryResponse;
import com.ailms.response.PayrollBatchResponse;

import java.time.YearMonth;
import java.util.List;

/**
 * Service quản lý và tính toán bảng lương nhân viên.
 */
public interface ISalaryService {

    /** Tìm kiếm phiếu lương có phân trang. */
    PageResponse<SalaryResponse> search(SalarySearchRequest request);

    /** Lấy toàn bộ phiếu lương. */
    List<SalaryResponse> getAll();

    /** Lấy chi tiết phiếu lương. */
    SalaryResponse getById(Long id);

    /** Lấy lương theo nhân viên. */
    List<SalaryResponse> getByEmployeeId(Long employeeId);

    /** Tạo phiếu lương. */
    SalaryResponse create(CreateSalaryRequest request);

    /** Cập nhật phiếu lương. */
    SalaryResponse update(Long id, UpdateSalaryRequest request);

    /** Xóa mềm phiếu lương. */
    void delete(Long id);

    /** Duyệt phiếu lương. */
    SalaryResponse approve(Long id);

    /** Thanh toán phiếu lương. */
    SalaryResponse pay(Long id);

    /** Thống kê một kỳ lương. */
    SalarySummaryResponse getSummary(YearMonth period);

    /** Thống kê nhiều kỳ lương. */
    SalarySummaryResponse getSummaryRange(YearMonth periodFrom, YearMonth periodTo);

    /** Tính lương cho một kỳ. */
    int generatePeriod(GenerateSalaryPeriodRequest request);

    /** Duyệt nhiều phiếu lương. */
    void bulkApprove(List<Long> ids);

    /** Đánh dấu một phiếu đã trả. */
    SalaryResponse markPaid(Long id);

    /** Đánh dấu nhiều phiếu đã trả. */
    void bulkMarkPaid(List<Long> ids);

    /** Xuất CSV một kỳ lương. */
    byte[] exportCsv(YearMonth period, Long departmentId, SalaryStatusEnum status);

    /** Xuất CSV theo khoảng kỳ. */
    byte[] exportCsvRange(YearMonth periodFrom, YearMonth periodTo, Long departmentId, SalaryStatusEnum status);

    /** Lấy danh sách bảng lương. */
    List<PayrollBatchResponse> getPayrollBatches(YearMonth periodFrom, YearMonth periodTo);

    /** Gửi bảng lương chờ duyệt. */
    int submitPayroll(YearMonth period);

    /** Hủy gửi bảng lương. */
    int cancelPayrollSubmission(YearMonth period);

    /** Duyệt bảng lương. */
    int approvePayroll(YearMonth period);

    /** Xóa bảng lương nháp. */
    int deleteDraftPayroll(YearMonth period);

    /** Xóa bảng lương đã duyệt. */
    int deleteApprovedPayroll(YearMonth period);

    /** Xuất danh sách chuyển khoản. */
    byte[] exportTransferList(YearMonth period);

    /** Xác nhận bảng lương đã trả. */
    int markPayrollPaid(YearMonth period);

    /** Từ chối bảng lương. */
    int rejectPayroll(YearMonth period, String reason);

    /** Gửi lại bảng lương. */
    int resubmitPayroll(YearMonth period);

    /** Lấy bảng lương trong thùng rác. */
    List<SalaryResponse> getTrash();

    /** Khôi phục bảng lương. */
    int restorePayroll(YearMonth period);

    /** Xóa vĩnh viễn bảng lương. */
    int hardDeletePayroll(YearMonth period);
}
