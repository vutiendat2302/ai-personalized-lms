package com.ailms.service;

import com.ailms.request.*;
import com.ailms.response.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

/**
 * Interface định nghĩa các dịch vụ quản lý hợp đồng lao động nhân viên.
 */
public interface IEmployeeContractService {

    /**
     * Tìm kiếm và phân trang danh sách hợp đồng theo tiêu chí lọc.
     */
    PageResponse<EmployeeContractResponse> search(EmployeeContractSearchRequest request);

    /**
     * Lấy toàn bộ danh sách hợp đồng trong hệ thống.
     */
    List<EmployeeContractResponse> getAll();

    /**
     * Lấy thông tin hợp đồng theo ID.
     */
    EmployeeContractResponse getById(Long id);

    /**
     * Lấy danh sách hợp đồng của 1 nhân viên cụ thể theo employeeId.
     */
    List<EmployeeContractResponse> getByEmployeeId(Long employeeId);

    /**
     * [Quy tắc 1.1] Kiểm tra nhân viên hiện có hợp đồng nào ở trạng thái ACTIVE hay không.
     * @param employeeId Mã định danh nhân viên
     * @return Kết quả kiểm tra { hasActiveContract, activeContractId, activeContractType, startDate }
     */
    ActiveContractCheckResponse checkActiveContract(Long employeeId);

    /**
     * [Quy tắc 1.2] Chấm dứt hợp đồng đang hiệu lực.
     * Cập nhật status = TERMINATED, terminatedAt = now(), lưu lý do chấm dứt và ghi Audit Log.
     */
    EmployeeContractResponse terminateContract(Long id, TerminateContractRequest request);

    /**
     * [Nhánh A - Bước A1] Tạo mới bản ghi hợp đồng ACTIVE (chưa đính kèm file).
     */
    EmployeeContractResponse create(CreateEmployeeContractRequest request);

    /**
     * [Nhánh A - Bước A2] Tải lên tập tin đính kèm cho hợp đồng (.pdf, .docx, max 10MB).
     * Tải file lên MinIO, tạo FileMetadataEntity và gán liên kết vào hợp đồng.
     */
    EmployeeContractResponse uploadContractFile(Long id, MultipartFile file);

    /**
     * [Nhánh B - Bước B3] Sinh file PDF từ mẫu HTML template và tạo hợp đồng trong cùng transaction.
     * Tự động điền dữ liệu placeholder, chuyển đổi HTML sang PDF qua OpenHTMLToPDF, upload MinIO và lưu DB.
     */
    EmployeeContractResponse generateContract(GenerateEmployeeContractRequest request);

    /**
     * Lấy Presigned URL thời hạn 24h để xem/tải tệp hợp đồng an toàn từ MinIO.
     */
    String getContractDownloadUrl(Long id);

    /**
     * Cập nhật thông tin hợp đồng lao động.
     */
    EmployeeContractResponse update(Long id, UpdateEmployeeContractRequest request);

    /**
     * Xóa hợp đồng khỏi hệ thống (kiểm tra không chồng lấn bảng lương).
     */
    void delete(Long id);

    /** Xóa vĩnh viễn toàn bộ hợp đồng và file MinIO của một nhân viên. */
    void deleteAllByEmployeeId(Long employeeId);

    Map<String, Object> sendBulkExpirationReminder(BulkContractReminderRequest request);

    byte[] downloadContractsZip(List<Long> ids);

    List<Map<String, Object>> getReminderRecipients();

    List<EmployeeContractResponse> getExpiringProbationContracts();

    /**
     * [Ký điện tử - Bước 1] Đại diện HR/Admin ký xác nhận phía công ty.
     * Chuyển signingStatus -> PENDING_EMPLOYEE_SIGN, sinh signingToken 7 ngày, gửi Email cho nhân viên.
     */
    EmployeeContractResponse signCompany(Long id, SignCompanyRequest request);

    /**
     * [Ký điện tử - Bước 2] Lấy thông tin hợp đồng cho link công khai của nhân viên.
     * Trả về tóm tắt thông tin, presigned URL xem trước PDF công ty đã ký và tự động gửi mã OTP xác thực.
     */
    ContractSigningLinkResponse getPublicSigningInfo(String signingToken);

    /**
     * [Ký điện tử - Bước 3] Nhân viên xác nhận ký hợp đồng qua mã OTP và chữ ký vẽ tay (canvas).
     * Verify OTP, render chèn khung chứng nhận ký điện tử vào PDF cuối, chuyển signingStatus -> FULLY_SIGNED, khóa hợp đồng.
     */
    EmployeeContractResponse confirmEmployeeSigning(String signingToken, SignEmployeeConfirmRequest request, String ipAddress, String userAgent);

    /**
     * Lấy danh sách lịch sử nhật ký kiểm toán (Audit Log) ký điện tử của 1 hợp đồng.
     */
    List<SigningHistoryResponse> getSigningHistory(Long id);

    /**
     * Sinh lại token ký mới cho nhân viên khi token cũ bị hết hạn.
     */
    EmployeeContractResponse resendSigningLink(Long id);

    void resendSigningOtp(String signingToken);

    /**
     * Lấy các chỉ số thống kê tổng hợp hợp đồng cho Dashboard Admin/HR.
     */
    ContractDashboardStatsResponse getDashboardStats();
}
