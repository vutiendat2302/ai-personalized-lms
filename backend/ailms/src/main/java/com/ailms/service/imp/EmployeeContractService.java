package com.ailms.service.imp;

import java.util.stream.Collectors;
import java.util.LinkedHashMap;
import com.ailms.common.converter.SimpleJsonWriter;
import com.ailms.entity.*;
import com.ailms.entity.enums.*;
import com.ailms.event.AuditLogEvent;
import com.ailms.exception.BusinessException;
import com.ailms.exception.ResourceNotFoundException;
import com.ailms.mapper.EmployeeContractMapper;
import com.ailms.repository.*;
import com.ailms.repository.specification.EmployeeContractSpecification;
import com.ailms.request.CreateEmployeeContractRequest;
import com.ailms.request.EmployeeContractSearchRequest;
import com.ailms.request.GenerateEmployeeContractRequest;
import com.ailms.request.TerminateContractRequest;
import com.ailms.request.UpdateEmployeeContractRequest;
import com.ailms.response.ActiveContractCheckResponse;
import com.ailms.response.EmployeeContractResponse;
import com.ailms.response.PageResponse;
import com.ailms.security.CustomUserDetails;
import com.ailms.service.IApprovalRequestService;
import com.ailms.service.IEmailService;
import com.ailms.service.IEmployeeContractService;
import com.ailms.service.IFileService;
import com.openhtmltopdf.pdfboxout.PdfRendererBuilder;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.concurrent.CompletableFuture;

/**
 * Service thực thi toàn bộ quy tắc nghiệp vụ quản lý hợp đồng lao động nhân viên (Active check, Chấm dứt, Nhánh A upload file, Nhánh B sinh PDF).
 */
@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class EmployeeContractService implements IEmployeeContractService {

    private final EmployeeContractRepository employeeContractRepository;
    private final EmployeeRepository employeeRepository;
    private final ContractTemplateRepository contractTemplateRepository;
    private final FileMetadataRepository fileMetadataRepository;
    private final SalaryRepository salaryRepository;
    private final AuditLogRepository auditLogRepository;
    private final EmployeeContractMapper employeeContractMapper;
    private final IApprovalRequestService approvalRequestService;
    private final IEmailService emailService;
    private final IFileService fileService;
    private final MinioFileStorageService fileStorageService;
    private final ApplicationEventPublisher applicationEventPublisher;

    @org.springframework.beans.factory.annotation.Value("${app.frontend-url:http://localhost:5173}")
    private String frontendUrl;

    private static final String RESOURCE_NAME = "EmployeeContract";
    private static final long MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // Giới hạn tối đa 10MB

    /** Bộ lưu trữ OTP 6 chữ số tạm thời trong bộ nhớ kèm thông tin giới hạn thử sai. */
    private static class OtpData {
        final String code;
        final LocalDateTime expiresAt;
        int failedAttempts;

        OtpData(String code, LocalDateTime expiresAt) {
            this.code = code;
            this.expiresAt = expiresAt;
            this.failedAttempts = 0;
        }
    }

    private final Map<String, OtpData> otpStorage = new java.util.concurrent.ConcurrentHashMap<>();

    /**
     * Lấy toàn bộ danh sách hợp đồng kèm Presigned URL tải file từ MinIO.
     */
    @Override
    public List<EmployeeContractResponse> getAll() {
        log.info("Getting all employee contracts");
        return employeeContractRepository.findAll().stream()
                .map(this::enrichDownloadUrl)
                .toList();
    }

    /**
     * Lấy chi tiết hợp đồng theo ID (có kiểm tra quyền truy cập).
     */
    @Override
    public EmployeeContractResponse getById(Long id) {
        log.info("Getting contract by id: {}", id);
        EmployeeContractEntity entity = employeeContractRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of(RESOURCE_NAME, id));
        verifyContractAccess(entity);
        return enrichDownloadUrl(entity);
    }

    /**
     * Lấy danh sách tất cả các hợp đồng của 1 nhân viên theo employeeId.
     */
    @Override
    public List<EmployeeContractResponse> getByEmployeeId(Long employeeId) {
        log.info("Getting contracts for employee: {}", employeeId);
        verifyEmployeeAccess(employeeId);
        return employeeContractRepository.findByEmployee_UserId(employeeId).stream()
                .map(this::enrichDownloadUrl)
                .toList();
    }

    /**
     * [Quy tắc 1.1] Kiểm tra nhân viên hiện có hợp đồng nào đang ACTIVE không.
     * @return ActiveContractCheckResponse chứa status hasActiveContract và activeContractId nếu có.
     */
    @Override
    public ActiveContractCheckResponse checkActiveContract(Long employeeId) {
        log.info("Checking active contract for employee: {}", employeeId);
        verifyEmployeeAccess(employeeId);

        Optional<EmployeeContractEntity> activeOpt = employeeContractRepository.findByEmployee_UserId(employeeId).stream()
                .filter(c -> c.getStatus() == BaseStatusEnum.ACTIVE)
                .findFirst();

        if (activeOpt.isPresent()) {
            EmployeeContractEntity activeContract = activeOpt.get();
            return ActiveContractCheckResponse.builder()
                    .hasActiveContract(true)
                    .activeContractId(activeContract.getId())
                    .activeContractType(activeContract.getContractTypeEnum())
                    .startDate(activeContract.getStartDate())
                    .build();
        }

        return ActiveContractCheckResponse.builder()
                .hasActiveContract(false)
                .activeContractId(null)
                .build();
    }

    /**
     * [Quy tắc 1.2] API Chấm dứt hợp đồng cũ.
     * Chuyển status = TERMINATED, set terminatedAt = now(), lưu lý do và ghi Audit Log.
     */
    @Override
    @Transactional
    public EmployeeContractResponse terminateContract(Long id, TerminateContractRequest request) {
        log.info("Terminating contract: {}", id);
        EmployeeContractEntity entity = employeeContractRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of(RESOURCE_NAME, id));

        verifyContractAccess(entity);

        if (entity.getStatus() == BaseStatusEnum.TERMINATED) {
            throw new BusinessException("Hợp đồng này đã ở trạng thái TERMINATED.");
        }

        String oldValue = SimpleJsonWriter.toJson(entity);

        entity.setStatus(BaseStatusEnum.TERMINATED);
        entity.setTerminatedAt(LocalDateTime.now());
        if (request != null && StringUtils.hasText(request.getTerminationReason())) {
            entity.setTerminationReason(request.getTerminationReason().trim());
        }

        EmployeeContractEntity saved = employeeContractRepository.save(entity);
        String newValue = SimpleJsonWriter.toJson(saved);

        // Ghi Audit Log cho hành động chấm dứt
        applicationEventPublisher.publishEvent(new AuditLogEvent(this, "TERMINATE", "EMPLOYEE_CONTRACT", id, oldValue, newValue));

        return enrichDownloadUrl(saved);
    }

    /**
     * [Nhánh A — Bước A1] Tạo record hợp đồng ở trạng thái ACTIVE (chưa đính kèm file).
     * Kiểm tra không trùng hợp đồng ACTIVE khác trước khi tạo.
     */
    @Override
    @Transactional
    public EmployeeContractResponse create(CreateEmployeeContractRequest request) {
        log.info("Creating contract (Branch A) for employee: {}", request.getEmployeeId());

        EmployeeEntity employee = employeeRepository.findById(request.getEmployeeId())
                .orElseThrow(() -> ResourceNotFoundException.of("Employee", request.getEmployeeId()));

        if (employee.getUserEntity().getStatus() == UserStatusEnum.DELETED) {
            throw new BusinessException("Nhân viên đã bị xóa khỏi hệ thống. Không thể tạo hợp đồng.");
        }

        // Quy tắc 1.1: Chặn nếu nhân viên đang có hợp đồng ACTIVE
        ActiveContractCheckResponse activeCheck = checkActiveContract(request.getEmployeeId());
        if (activeCheck.isHasActiveContract()) {
            throw new BusinessException("Nhân viên đang có hợp đồng hiệu lực (ID: " + activeCheck.getActiveContractId() + "). Vui lòng chấm dứt hợp đồng hiện tại trước khi tạo mới.");
        }

        if (request.getEndDate() != null && !request.getEndDate().isAfter(request.getStartDate())) {
            throw new BusinessException("Ngày kết thúc hợp đồng phải sau ngày bắt đầu.");
        }

        EmployeeContractEntity entity = employeeContractMapper.toEntity(request);
        entity.setEmployee(employee);
        entity.setStatus(BaseStatusEnum.ACTIVE);

        EmployeeContractEntity saved = employeeContractRepository.save(entity);

        applicationEventPublisher.publishEvent(new AuditLogEvent(this, "CREATE", "EMPLOYEE_CONTRACT", saved.getId(), null, saved));

        return enrichDownloadUrl(saved);
    }

    /**
     * [Nhánh A — Bước A2] Upload file đính kèm sẵn có (.pdf / .docx, max 10MB).
     * Đưa file lên MinIO, tạo FileMetadataEntity và gán liên kết file vào bản ghi hợp đồng.
     */
    @Override
    @Transactional
    public EmployeeContractResponse uploadContractFile(Long id, MultipartFile file) {
        log.info("Uploading file for contract: {}", id);

        EmployeeContractEntity contract = employeeContractRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of(RESOURCE_NAME, id));

        verifyContractAccess(contract);

        if (file == null || file.isEmpty()) {
            throw new BusinessException("Tệp hợp đồng đính kèm không được để trống.");
        }

        // Validate dung lượng tối đa 10MB
        if (file.getSize() > MAX_FILE_SIZE_BYTES) {
            throw new BusinessException("Dung lượng tệp hợp đồng vượt quá giới hạn cho phép (Tối đa 10MB).");
        }

        // Validate định dạng file (.pdf, .docx)
        String originalName = StringUtils.cleanPath(file.getOriginalFilename());
        String lowerName = originalName.toLowerCase();
        if (!lowerName.endsWith(".pdf") && !lowerName.endsWith(".docx")) {
            throw new BusinessException("Định dạng tệp không hợp lệ. Chỉ chấp nhận tập tin .pdf hoặc .docx");
        }

        String extension = lowerName.endsWith(".pdf") ? ".pdf" : ".docx";
        String objectKey = "contracts/contract_" + contract.getId() + "_" + UUID.randomUUID() + extension;

        try {
            // Upload vật lý lên MinIO
            fileStorageService.upload(file, objectKey);

            // Lưu thông tin FileMetadataEntity trong DB
            FileMetadataEntity metadataEntity = FileMetadataEntity.builder()
                    .fileKey(objectKey)
                    .originalName(originalName)
                    .fileSize(file.getSize())
                    .contentType(file.getContentType())
                    .fileType(FileTypeEnum.DOCUMENT)
                    .status(BaseStatusEnum.ACTIVE)
                    .build();

            FileMetadataEntity savedMetadata = fileMetadataRepository.save(metadataEntity);

            // Gán fileMetadata vào hợp đồng
            contract.setFileMetadata(savedMetadata);
            contract.setFileKey(objectKey);
            EmployeeContractEntity updatedContract = employeeContractRepository.save(contract);

            applicationEventPublisher.publishEvent(new AuditLogEvent(this, "UPLOAD_FILE", "EMPLOYEE_CONTRACT", updatedContract.getId(), null, updatedContract));

            return enrichDownloadUrl(updatedContract);
        } catch (Exception e) {
            log.error("Error uploading contract file to MinIO for contract {}", id, e);
            throw new BusinessException("Lỗi upload tệp hợp đồng lên MinIO: " + e.getMessage());
        }
    }

    /**
     * [Nhánh B — Bước B3] Sinh file PDF từ HTML template và tạo hợp đồng mới trong cùng 1 Transaction.
     * Quy trình:
     * 1. Validate không có hợp đồng active.
     * 2. Validate templateId phải khớp contractTypeEnum.
     * 3. Điền dữ liệu nhân viên vào HTML template -> Render PDF qua OpenHTMLToPDF.
     * 4. Upload file PDF vừa sinh lên MinIO -> Lưu FileMetadataEntity -> Lưu EmployeeContractEntity status ACTIVE.
     */
    @Override
    @Transactional
    public EmployeeContractResponse generateContract(GenerateEmployeeContractRequest request) {
        log.info("Generating contract (Branch B) for employee: {}", request.getEmployeeId());

        EmployeeEntity employee = employeeRepository.findById(request.getEmployeeId())
                .orElseThrow(() -> ResourceNotFoundException.of("Employee", request.getEmployeeId()));

        if (employee.getUserEntity().getStatus() == UserStatusEnum.DELETED) {
            throw new BusinessException("Nhân viên đã bị xóa khỏi hệ thống. Không thể tạo hợp đồng.");
        }

        // 1. Double-check không có hợp đồng ACTIVE khác
        ActiveContractCheckResponse activeCheck = checkActiveContract(request.getEmployeeId());
        if (activeCheck.isHasActiveContract()) {
            throw new BusinessException("Nhân viên đang có hợp đồng hiệu lực (ID: " + activeCheck.getActiveContractId() + "). Vui lòng chấm dứt hợp đồng hiện tại trước khi tạo mới.");
        }

        if (request.getEndDate() != null && !request.getEndDate().isAfter(request.getStartDate())) {
            throw new BusinessException("Ngày kết thúc hợp đồng phải sau ngày bắt đầu.");
        }

        // 2. Validate template ID tồn tại và thuộc đúng contractTypeEnum chọn
        ContractTemplateEntity templateEntity = contractTemplateRepository.findById(request.getTemplateId())
                .orElseThrow(() -> ResourceNotFoundException.of("ContractTemplate", request.getTemplateId()));

        if (templateEntity.getContractTypeEnum() != request.getContractTypeEnum()) {
            throw new BusinessException("Mẫu hợp đồng được chọn (ID: " + request.getTemplateId() + ") không phù hợp với loại hợp đồng " + request.getContractTypeEnum());
        }

        // 3. Thay thế biến placeholder và render HTML sang PDF binary
        String htmlContent = buildContractHtml(templateEntity.getTemplateContent(), employee, request);
        byte[] pdfBytes;
        try {
            // Sanitize HTML và ép kiểu cấu trúc XML (XHTML) chuẩn để OpenHTMLToPDF không bị lỗi XML SAX
            Document doc = Jsoup.parse(htmlContent);
            doc.outputSettings().syntax(Document.OutputSettings.Syntax.xml);
            String cleanXmlContent = doc.html();

            ByteArrayOutputStream os = new ByteArrayOutputStream();
            PdfRendererBuilder builder = new PdfRendererBuilder();
            builder.useFastMode();

            // Đăng ký font tiếng Việt Unicode đầy đủ (Source Sans 3) cho OpenHTMLToPDF
            try {
                byte[] regFont = getClass().getResourceAsStream("/fonts/SourceSans3-Regular.ttf").readAllBytes();
                byte[] boldFont = getClass().getResourceAsStream("/fonts/SourceSans3-Bold.ttf").readAllBytes();
                byte[] italicFont = getClass().getResourceAsStream("/fonts/SourceSans3-Italic.ttf").readAllBytes();
                byte[] boldItalicFont = getClass().getResourceAsStream("/fonts/SourceSans3-BoldItalic.ttf").readAllBytes();

                builder.useFont(() -> new ByteArrayInputStream(regFont), "Source Sans 3", 400, PdfRendererBuilder.FontStyle.NORMAL, true);
                builder.useFont(() -> new ByteArrayInputStream(boldFont), "Source Sans 3", 700, PdfRendererBuilder.FontStyle.NORMAL, true);
                builder.useFont(() -> new ByteArrayInputStream(italicFont), "Source Sans 3", 400, PdfRendererBuilder.FontStyle.ITALIC, true);
                builder.useFont(() -> new ByteArrayInputStream(boldItalicFont), "Source Sans 3", 700, PdfRendererBuilder.FontStyle.ITALIC, true);
            } catch (Exception fontEx) {
                log.warn("Failed to load Source Sans 3 font resources, falling back to system fonts", fontEx);
            }

            builder.withHtmlContent(cleanXmlContent, null);
            builder.toStream(os);
            builder.run();
            pdfBytes = os.toByteArray();
        } catch (Exception e) {
            log.error("Failed to render HTML contract to PDF for employee {}", request.getEmployeeId(), e);
            throw new BusinessException("Lỗi sinh tập tin PDF từ HTML template: " + e.getMessage());
        }

        // 4. Upload PDF lên MinIO
        String objectKey = "contracts/contract_gen_" + request.getEmployeeId() + "_" + UUID.randomUUID() + ".pdf";
        String fileName = "Hop_Dong_" + (employee.getUserEntity() != null ? employee.getUserEntity().getFullName().replaceAll("\\s+", "_") : request.getEmployeeId()) + ".pdf";

        try {
            ByteArrayInputStream inputStream = new ByteArrayInputStream(pdfBytes);
            fileStorageService.upload(inputStream, objectKey, "application/pdf", pdfBytes.length);
        } catch (Exception e) {
            log.error("Failed to upload generated PDF to MinIO", e);
            throw new BusinessException("Không thể lưu tệp PDF vừa sinh lên lưu trữ MinIO: " + e.getMessage());
        }

        // 5. Lưu FileMetadataEntity và EmployeeContractEntity
        FileMetadataEntity metadataEntity = FileMetadataEntity.builder()
                .fileKey(objectKey)
                .originalName(fileName)
                .fileSize((long) pdfBytes.length)
                .contentType("application/pdf")
                .fileType(FileTypeEnum.DOCUMENT)
                .status(BaseStatusEnum.ACTIVE)
                .build();
        FileMetadataEntity savedMetadata = fileMetadataRepository.save(metadataEntity);

        EmployeeContractEntity contractEntity = EmployeeContractEntity.builder()
                .employee(employee)
                .contractTypeEnum(request.getContractTypeEnum())
                .startDate(request.getStartDate())
                .endDate(request.getEndDate())
                .baseSalary(request.getBaseSalary())
                .salaryTypeEnum(request.getSalaryTypeEnum())
                .signedAt(request.getSignedAt() != null ? request.getSignedAt() : LocalDateTime.now())
                .status(BaseStatusEnum.ACTIVE)
                .fileKey(objectKey)
                .fileMetadata(savedMetadata)
                .build();

        EmployeeContractEntity savedContract = employeeContractRepository.save(contractEntity);

        applicationEventPublisher.publishEvent(new AuditLogEvent(this, "GENERATE_CONTRACT", "EMPLOYEE_CONTRACT", savedContract.getId(), null, savedContract));

        // 6. Gửi email thông báo bất đồng bộ
        CompletableFuture.runAsync(() -> {
            try {
                String toEmail = employee.getUserEntity().getEmail();
                String fullName = employee.getUserEntity().getFullName();
                String contractType = savedContract.getContractTypeEnum() != null ? savedContract.getContractTypeEnum().name() : "N/A";
                String downloadUrl = fileStorageService.getPresignedUrl(objectKey, Duration.ofDays(7));
                emailService.sendContractNotificationEmail(toEmail, fullName, contractType, downloadUrl);
            } catch (Exception e) {
                log.error("Async sending contract email failed", e);
            }
        });

        return enrichDownloadUrl(savedContract);
    }

    /**
     * Lấy Presigned URL có thời hạn 24 tiếng từ MinIO để xem hoặc tải tệp hợp đồng.
     */
    @Override
    public String getContractDownloadUrl(Long id) {
        EmployeeContractEntity contract = employeeContractRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of(RESOURCE_NAME, id));
        verifyContractAccess(contract);

        if (contract.getFileMetadata() != null) {
            return fileStorageService.getPresignedUrl(contract.getFileMetadata().getFileKey(), Duration.ofHours(24));
        } else if (StringUtils.hasText(contract.getFileKey())) {
            return fileStorageService.getPresignedUrl(contract.getFileKey(), Duration.ofHours(24));
        }

        throw new BusinessException("Hợp đồng này chưa có tệp đính kèm nào.");
    }

    /**
     * Cập nhật thông tin hợp đồng.
     */
    @Override
    @Transactional
    public EmployeeContractResponse update(Long id, UpdateEmployeeContractRequest request) {
        log.info("Updating contract: {}", id);

        if (approvalRequestService.isLocked("CONTRACT", id)) {
            throw new BusinessException("Hợp đồng đang trong quá trình phê duyệt, không thể chỉnh sửa.");
        }

        EmployeeContractEntity existing = employeeContractRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of(RESOURCE_NAME, id));
        String oldValue = SimpleJsonWriter.toJson(existing);

        if (request.getBaseSalary() != null && request.getBaseSalary().compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessException("Mức lương cơ bản phải lớn hơn 0.");
        }

        LocalDate newStart = request.getStartDate() != null ? request.getStartDate() : existing.getStartDate();
        LocalDate newEnd = request.getEndDate() != null ? request.getEndDate() : existing.getEndDate();

        if (newEnd != null && !newEnd.isAfter(newStart)) {
            throw new BusinessException("Ngày kết thúc hợp đồng phải sau ngày bắt đầu.");
        }

        employeeContractMapper.updateFromRequest(request, existing);

        EmployeeContractEntity updated = employeeContractRepository.save(existing);
        String newValue = SimpleJsonWriter.toJson(updated);

        applicationEventPublisher.publishEvent(new AuditLogEvent(this, "UPDATE", "EMPLOYEE_CONTRACT", id, oldValue, newValue));
        return enrichDownloadUrl(updated);
    }

    /**
     * Xóa hợp đồng khỏi hệ thống (kiểm tra xem đã dùng tính lương chưa).
     */
    @Override
    @Transactional
    public void delete(Long id) {
        log.info("Deleting contract: {}", id);

        if (approvalRequestService.isLocked("CONTRACT", id)) {
            throw new BusinessException("Hợp đồng đang trong quá trình phê duyệt, không thể xóa.");
        }

        EmployeeContractEntity contract = employeeContractRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of(RESOURCE_NAME, id));

        String oldValue = SimpleJsonWriter.toJson(contract);
        List<SalaryEntity> salaries = salaryRepository.findByEmployee_UserId(contract.getEmployee().getUserId());
        for (SalaryEntity salary : salaries) {
            boolean overlaps = !salary.getPeriod().atEndOfMonth().isBefore(contract.getStartDate())
                    && (contract.getEndDate() == null || !salary.getPeriod().atDay(1).isAfter(contract.getEndDate()));
            if (overlaps) {
                throw new BusinessException("Hợp đồng đã được sử dụng để tính lương cho kỳ " + salary.getPeriod() + ". Không thể xóa.");
            }
        }

        employeeContractRepository.delete(contract);
        applicationEventPublisher.publishEvent(new AuditLogEvent(this, "DELETE", "EMPLOYEE_CONTRACT", id, oldValue, null));
    }

    /**
     * Tìm kiếm và phân trang hợp đồng theo Specification.
     */
    @Override
    public PageResponse<EmployeeContractResponse> search(EmployeeContractSearchRequest request) {
        log.info("Searching EmployeeContract via specification");
        Specification<EmployeeContractEntity> spec = EmployeeContractSpecification.filterAndSearch(request);
        spec = spec.and(getContractSecuritySpecification());
        Pageable pageable = request.toPageable();
        Page<EmployeeContractEntity> page = employeeContractRepository.findAll(spec, pageable);
        return PageResponse.from(page.map(this::enrichDownloadUrl));
    }

    /**
     * Hàm trợ giúp bổ sung Presigned Download URL vào DTO Response trước khi trả về client.
     */
    private EmployeeContractResponse enrichDownloadUrl(EmployeeContractEntity entity) {
        EmployeeContractResponse res = employeeContractMapper.toResponse(entity);
        if (entity.getFileMetadata() != null && StringUtils.hasText(entity.getFileMetadata().getFileKey())) {
            res.setDownloadUrl(fileStorageService.getPresignedUrl(entity.getFileMetadata().getFileKey(), Duration.ofHours(24)));
        } else if (StringUtils.hasText(entity.getFileKey())) {
            res.setDownloadUrl(fileStorageService.getPresignedUrl(entity.getFileKey(), Duration.ofHours(24)));
        }

        if (entity.getOriginalFileMetadata() != null && StringUtils.hasText(entity.getOriginalFileMetadata().getFileKey())) {
            res.setOriginalFileDownloadUrl(fileStorageService.getPresignedUrl(entity.getOriginalFileMetadata().getFileKey(), Duration.ofHours(24)));
        }
        return res;
    }

    /**
     * Hàm trợ giúp điền các dữ liệu biến động (nhân viên, công ty, lương, ngày tháng) vào chuỗi HTML template.
     */
    private String buildContractHtml(String templateContent, EmployeeEntity employee, GenerateEmployeeContractRequest request) {
        String content = templateContent != null ? templateContent : "";
        Map<String, String> values = new HashMap<>();

        LocalDate now = LocalDate.now();
        values.put("contractNumber", "HDLD-" + (employee.getEmployeeCode() != null ? employee.getEmployeeCode() : employee.getUserId()) + "/" + (request.getContractTypeEnum() != null ? request.getContractTypeEnum().name() : "2026"));
        values.put("currentDay", String.format("%02d", now.getDayOfMonth()));
        values.put("currentMonth", String.format("%02d", now.getMonthValue()));
        values.put("currentYear", String.valueOf(now.getYear()));

        values.put("companyName", "CÔNG TY CỔ PHẦN GIÁO DỤC AILMS");
        values.put("companyAddress", "Số 1 Đại Cồ Việt, Hai Bà Trưng, Hà Nội");
        values.put("companyTaxCode", "0101234567");
        values.put("companyRepresentative", "Nguyễn Văn Admin");
        values.put("companyRepresentativeTitle", "Giám Đốc Điều Hành");
        values.put("companyPhone", "1900 6868");
        values.put("companyEmail", "hr@ailms.edu.vn");

        values.put("employeeName", employee.getUserEntity() != null ? employee.getUserEntity().getFullName() : "");
        Integer genderInt = employee.getUserEntity() != null ? employee.getUserEntity().getGender() : null;
        String genderStr = (genderInt != null && genderInt == 1) ? "Nữ" : (genderInt != null && genderInt == 2) ? "Khác" : "Nam";
        values.put("gender", genderStr);
        values.put("dateOfBirth", employee.getUserEntity() != null && employee.getUserEntity().getDateOfBirth() != null ? employee.getUserEntity().getDateOfBirth().format(DateTimeFormatter.ofPattern("dd/MM/yyyy")) : "01/01/1995");
        values.put("nationality", "Việt Nam");
        values.put("citizenId", "001090123456");
        values.put("citizenIssueDate", "15/08/2021");
        values.put("citizenIssuePlace", "Cục Cảnh sát QLHC về trật tự xã hội");
        values.put("address", employee.getUserEntity() != null && StringUtils.hasText(employee.getAddress()) ? employee.getAddress() : "Hà Nội, Việt Nam");
        values.put("phone", employee.getUserEntity() != null ? employee.getUserEntity().getPhone() : "");
        values.put("email", employee.getUserEntity() != null ? employee.getUserEntity().getEmail() : "");
        values.put("position", employee.getPosition() != null ? employee.getPosition() : "Chuyên viên");
        values.put("department", employee.getDepartment() != null ? employee.getDepartment().getName() : "Phòng Công Nghệ Thông Tin");

        values.put("contractType", request.getContractTypeEnum() != null ? request.getContractTypeEnum().name() : "PROBATION");
        values.put("contractStartDate", request.getStartDate() != null ? request.getStartDate().format(DateTimeFormatter.ofPattern("dd/MM/yyyy")) : now.format(DateTimeFormatter.ofPattern("dd/MM/yyyy")));
        values.put("contractEndDate", request.getEndDate() != null ? request.getEndDate().format(DateTimeFormatter.ofPattern("dd/MM/yyyy")) : "Vô thời hạn");
        values.put("startDate", request.getStartDate() != null ? request.getStartDate().format(DateTimeFormatter.ofPattern("dd/MM/yyyy")) : now.format(DateTimeFormatter.ofPattern("dd/MM/yyyy")));
        values.put("endDate", request.getEndDate() != null ? request.getEndDate().format(DateTimeFormatter.ofPattern("dd/MM/yyyy")) : "Vô thời hạn");
        values.put("probationPeriod", "02 tháng");
        values.put("workingLocation", "Văn phòng Công ty Cổ phần Giáo dục AILMS - Số 1 Đại Cồ Việt, Hai Bà Trưng, Hà Nội");
        values.put("salary", request.getBaseSalary() != null ? String.format("%,.0f", request.getBaseSalary()) + " VNĐ" : "15.000.000 VNĐ");
        values.put("baseSalary", request.getBaseSalary() != null ? String.format("%,.0f", request.getBaseSalary()) + " VNĐ" : "15.000.000 VNĐ");
        values.put("salaryType", request.getSalaryTypeEnum() != null ? request.getSalaryTypeEnum().name() : "MONTHLY");
        values.put("payDay", "05");
        values.put("allowance", "Phụ cấp ăn trưa 730.000 VNĐ/tháng, phụ cấp xăng xe 500.000 VNĐ/tháng");
        values.put("workingHours", "08 giờ/ngày (từ 08h00 đến 17h00, từ Thứ Hai đến Thứ Sáu)");
        values.put("noticePeriod", "30");
        values.put("signedAt", request.getSignedAt() != null ? request.getSignedAt().format(DateTimeFormatter.ofPattern("dd/MM/yyyy")) : now.format(DateTimeFormatter.ofPattern("dd/MM/yyyy")));

        if (request.getCustomPlaceholders() != null) {
            values.putAll(request.getCustomPlaceholders());
        }

        for (Map.Entry<String, String> entry : values.entrySet()) {
            String rawVal = entry.getValue() != null ? entry.getValue() : "";
            content = content.replace("{{" + entry.getKey() + "}}", escapeXml(rawVal));
        }

        // Clean XML-incompatible entities (like &nbsp;) to prevent SAXParseException in OpenHTMLToPDF
        content = content.replace("&nbsp;", "&#160;");

        // Đảm bảo CSS luôn dùng font 'Source Sans 3' cho hiển thị tiếng Việt có dấu
        if (!content.contains("Source Sans 3")) {
            content = content.replace("<head>", "<head><style>body, * { font-family: 'Source Sans 3', sans-serif; }</style>");
        }

        return content;
    }

    /**
     * Escape các ký tự đặc biệt trong XML (&, <, >) cho dữ liệu đầu vào động.
     */
    private String escapeXml(String input) {
        if (input == null) return "";
        return input.replace("&", "&amp;")
                    .replace("<", "&lt;")
                    .replace(">", "&gt;");
    }

    /**
     * Lấy ID người dùng đang đăng nhập trong SecurityContext.
     */
    private Long getCurrentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated() && auth.getPrincipal() instanceof CustomUserDetails userDetails) {
            return userDetails.getUser().getId();
        }
        throw new BusinessException("User is not authenticated");
    }

    /**
     * Lấy danh sách Roles của người dùng đang đăng nhập.
     */
    private List<String> getCurrentUserRoles() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            return java.util.Collections.emptyList();
        }
        return auth.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .toList();
    }

    /**
     * Kiểm tra quyền truy cập thông tin nhân viên (chỉ HR/Admin hoặc chính nhân viên mới có quyền).
     */
    private void verifyEmployeeAccess(Long employeeId) {
        Long currentUserId = getCurrentUserId();
        List<String> roles = getCurrentUserRoles();

        if (roles.contains("ROLE_HR") || roles.contains("ROLE_ADMIN")) {
            return;
        }

        if (currentUserId.equals(employeeId)) {
            return;
        }

        throw new BusinessException("Access denied to requested employee data");
    }

    /**
     * Kiểm tra quyền truy cập thông tin hợp đồng.
     */
    private void verifyContractAccess(EmployeeContractEntity contract) {
        verifyEmployeeAccess(contract.getEmployee().getUserId());
    }

    /**
     * Phân quyền bảo mật truy cập dữ liệu (Data Access Control Specification).
     */
    /**
     * [Ký điện tử - Bước 1] Đại diện HR/Admin ký phía công ty.
     */
    @Override
    @Transactional
    public EmployeeContractResponse signCompany(Long id, com.ailms.request.SignCompanyRequest request) {
        log.info("Company signing contract: {}", id);
        EmployeeContractEntity contract = employeeContractRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of(RESOURCE_NAME, id));

        verifyContractAccess(contract);

        if (contract.getSigningStatus() == SigningStatusEnum.FULLY_SIGNED) {
            throw new BusinessException("Hợp đồng này đã được ký hoàn tất bởi cả hai bên.");
        }

        if (contract.getFileMetadata() == null && !StringUtils.hasText(contract.getFileKey())) {
            throw new BusinessException("Hợp đồng chưa có tập tin PDF đính kèm. Vui lòng upload file hoặc sinh PDF từ mẫu trước khi ký.");
        }

        String oldValue = SimpleJsonWriter.toJson(contract);

        String signingToken = UUID.randomUUID().toString();
        LocalDateTime expiresAt = LocalDateTime.now().plusDays(7);

        contract.setSigningStatus(SigningStatusEnum.PENDING_EMPLOYEE_SIGN);
        contract.setSigningToken(signingToken);
        contract.setSigningTokenExpiresAt(expiresAt);

        EmployeeContractEntity saved = employeeContractRepository.save(contract);
        String newValue = SimpleJsonWriter.toJson(saved);

        applicationEventPublisher.publishEvent(new AuditLogEvent(this, "CONTRACT_SIGNED_COMPANY", "EmployeeContract", id, oldValue, newValue));

        // Gửi email cho nhân viên bất đồng bộ
        CompletableFuture.runAsync(() -> {
            try {
                String toEmail = saved.getEmployee().getUserEntity().getEmail();
                String employeeName = saved.getEmployee().getUserEntity().getFullName();
                String signingLink = frontendUrl + "/contracts/sign/" + signingToken;
                emailService.sendContractSigningLinkEmail(toEmail, employeeName, signingLink, expiresAt);
            } catch (Exception e) {
                log.error("Failed to send signing link email for contract {}", id, e);
            }
        });

        return enrichDownloadUrl(saved);
    }

    /**
     * [Ký điện tử - Bước 2] Lấy thông tin cho link công khai của nhân viên & Tự động gửi OTP.
     */
    @Override
    public com.ailms.response.ContractSigningLinkResponse getPublicSigningInfo(String signingToken) {
        log.info("Public fetching signing info for token: {}", signingToken);
        EmployeeContractEntity contract = employeeContractRepository.findBySigningToken(signingToken)
                .orElseThrow(() -> new ResourceNotFoundException("Hợp đồng không tồn tại hoặc link ký không hợp lệ."));

        if (contract.getSigningStatus() == SigningStatusEnum.FULLY_SIGNED) {
            throw new BusinessException("Hợp đồng này đã được ký hoàn tất bởi cả hai bên.");
        }

        if (contract.getSigningTokenExpiresAt() != null && LocalDateTime.now().isAfter(contract.getSigningTokenExpiresAt())) {
            throw new BusinessException("Liên kết ký hợp đồng đã hết hạn (hạn dùng 7 ngày). Vui lòng liên hệ HR để được cấp lại link mới.");
        }

        // Tự động sinh & gửi mã OTP 6 chữ số qua Email
        String otp = String.format("%06d", new Random().nextInt(1000000));
        otpStorage.put(signingToken, new OtpData(otp, LocalDateTime.now().plusMinutes(5)));

        String toEmail = contract.getEmployee().getUserEntity().getEmail();
        String employeeName = contract.getEmployee().getUserEntity().getFullName();

        CompletableFuture.runAsync(() -> {
            try {
                emailService.sendContractSigningOtpEmail(toEmail, employeeName, otp);
            } catch (Exception e) {
                log.error("Failed to send signing OTP email to {}", toEmail, e);
            }
        });

        String fileUrl = enrichDownloadUrl(contract).getDownloadUrl();

        return com.ailms.response.ContractSigningLinkResponse.builder()
                .employeeName(employeeName)
                .employeeEmail(toEmail)
                .employeePhone(contract.getEmployee().getUserEntity().getPhone())
                .contractTypeEnum(contract.getContractTypeEnum())
                .baseSalary(contract.getBaseSalary())
                .startDate(contract.getStartDate())
                .endDate(contract.getEndDate())
                .signingStatus(contract.getSigningStatus())
                .companySignedFileUrl(fileUrl)
                .tokenExpiresAt(contract.getSigningTokenExpiresAt())
                .otpSent(true)
                .build();
    }

    /**
     * [Ký điện tử - Bước 3] Nhân viên xác nhận ký hợp đồng qua mã OTP và chữ ký vẽ tay.
     */
    @Override
    @Transactional
    public EmployeeContractResponse confirmEmployeeSigning(String signingToken, com.ailms.request.SignEmployeeConfirmRequest request, String ipAddress, String userAgent) {
        log.info("Confirming employee signing for token: {}", signingToken);
        EmployeeContractEntity contract = employeeContractRepository.findBySigningToken(signingToken)
                .orElseThrow(() -> new ResourceNotFoundException("Hợp đồng không tồn tại hoặc link ký không hợp lệ."));

        if (contract.getSigningStatus() == SigningStatusEnum.FULLY_SIGNED) {
            throw new BusinessException("Hợp đồng này đã được ký hoàn tất trước đó.");
        }

        if (contract.getSigningTokenExpiresAt() != null && LocalDateTime.now().isAfter(contract.getSigningTokenExpiresAt())) {
            throw new BusinessException("Liên kết ký hợp đồng đã hết hạn.");
        }

        // Validate OTP
        OtpData otpData = otpStorage.get(signingToken);
        if (otpData == null || LocalDateTime.now().isAfter(otpData.expiresAt)) {
            throw new BusinessException("Mã OTP đã hết hạn hoặc chưa được tạo. Vui lòng làm mới trang để nhận OTP mới.");
        }

        if (otpData.failedAttempts >= 5) {
            throw new BusinessException("Bạn đã nhập sai mã OTP quá 5 lần. Mã OTP đã bị khóa.");
        }

        if (!otpData.code.equals(request.getOtp().trim())) {
            otpData.failedAttempts++;
            throw new BusinessException("Mã OTP không chính xác. Số lần thử còn lại: " + (5 - otpData.failedAttempts));
        }

        // OTP hợp lệ -> Xóa khỏi bộ nhớ
        otpStorage.remove(signingToken);

        String oldValue = SimpleJsonWriter.toJson(contract);

        // Lưu giữ file gốc nếu chưa được lưu
        if (contract.getOriginalFileMetadata() == null && contract.getFileMetadata() != null) {
            contract.setOriginalFileMetadata(contract.getFileMetadata());
        }

        // Render chèn khối chứng nhận ký điện tử vào PDF
        String employeeName = contract.getEmployee().getUserEntity().getFullName();
        String signedTimeString = LocalDateTime.now().format(DateTimeFormatter.ofPattern("HH:mm:ss dd/MM/yyyy"));

        byte[] finalPdfBytes;
        try {
            String stampHtml = """
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8"/>
                    <style>
                        @page { size: A4; margin: 20mm 15mm 20mm 15mm; }
                        body { font-family: 'Source Sans 3', sans-serif; font-size: 13pt; line-height: 1.5; color: #000; }
                        .stamp-box { border: 2px dashed #16a34a; background-color: #f0fdf4; padding: 15px; border-radius: 8px; margin-top: 30px; }
                        .stamp-title { font-weight: bold; color: #15803d; font-size: 14pt; margin-bottom: 6px; }
                    </style>
                </head>
                <body>
                    <div style="page-break-before: auto;">
                        <div class="stamp-box">
                            <div class="stamp-title">&#10004; CHỨNG NHẬN KÝ ĐIỆN TỬ NỘI BỘ (E-SIGNATURE VERIFIED)</div>
                            <p style="margin: 4px 0;"><strong>Bên ký:</strong> %s (Nhân viên)</p>
                            <p style="margin: 4px 0;"><strong>Thời điểm ký:</strong> %s</p>
                            <p style="margin: 4px 0;"><strong>Địa chỉ IP:</strong> %s</p>
                            <p style="margin: 4px 0;"><strong>Phương thức xác thực:</strong> OTP Email + e-Signature Canvas</p>
                            <p style="margin: 4px 0; font-size: 11px; color: #64748b;">Hợp đồng được giao kết điện tử theo khoản 1 Điều 14 Bộ luật Lao động 2019 và được niêm phong chống chỉnh sửa trên hệ thống AILMS.</p>
                        </div>
                    </div>
                </body>
                </html>
                """.formatted(employeeName, signedTimeString, ipAddress != null ? ipAddress : "127.0.0.1");

            org.jsoup.nodes.Document doc = Jsoup.parse(stampHtml);
            doc.outputSettings().syntax(org.jsoup.nodes.Document.OutputSettings.Syntax.xml);
            String cleanXmlContent = doc.html();

            ByteArrayOutputStream os = new ByteArrayOutputStream();
            PdfRendererBuilder builder = new PdfRendererBuilder();
            builder.useFastMode();

            try {
                byte[] regFont = getClass().getResourceAsStream("/fonts/SourceSans3-Regular.ttf").readAllBytes();
                byte[] boldFont = getClass().getResourceAsStream("/fonts/SourceSans3-Bold.ttf").readAllBytes();
                builder.useFont(() -> new ByteArrayInputStream(regFont), "Source Sans 3", 400, PdfRendererBuilder.FontStyle.NORMAL, true);
                builder.useFont(() -> new ByteArrayInputStream(boldFont), "Source Sans 3", 700, PdfRendererBuilder.FontStyle.NORMAL, true);
            } catch (Exception fontEx) {
                log.warn("Failed to load Source Sans 3 font", fontEx);
            }

            builder.withHtmlContent(cleanXmlContent, null);
            builder.toStream(os);
            builder.run();
            finalPdfBytes = os.toByteArray();
        } catch (Exception e) {
            log.error("Failed to render final signed contract PDF", e);
            throw new BusinessException("Lỗi sinh tệp PDF chứng nhận ký điện tử: " + e.getMessage());
        }

        // Upload final PDF lên MinIO
        String objectKey = "contracts/contract_signed_" + contract.getId() + "_" + UUID.randomUUID() + ".pdf";
        String fileName = "Hop_Dong_Da_Ky_" + employeeName.replaceAll("\\s+", "_") + ".pdf";

        try {
            ByteArrayInputStream inputStream = new ByteArrayInputStream(finalPdfBytes);
            fileStorageService.upload(inputStream, objectKey, "application/pdf", finalPdfBytes.length);
        } catch (Exception e) {
            log.error("Failed to upload final signed PDF to MinIO", e);
            throw new BusinessException("Lỗi lưu trữ tệp hợp đồng đã ký lên MinIO: " + e.getMessage());
        }

        FileMetadataEntity metadataEntity = FileMetadataEntity.builder()
                .fileKey(objectKey)
                .originalName(fileName)
                .fileSize((long) finalPdfBytes.length)
                .contentType("application/pdf")
                .fileType(FileTypeEnum.DOCUMENT)
                .status(BaseStatusEnum.ACTIVE)
                .build();
        FileMetadataEntity savedMetadata = fileMetadataRepository.save(metadataEntity);

        contract.setFileMetadata(savedMetadata);
        contract.setFileKey(objectKey);
        contract.setSigningStatus(SigningStatusEnum.FULLY_SIGNED);
        contract.setSignedAt(LocalDateTime.now());
        contract.setSigningToken(null); // Vô hiệu hóa token lập tức
        contract.setSigningTokenExpiresAt(null);

        EmployeeContractEntity saved = employeeContractRepository.save(contract);
        String newValue = SimpleJsonWriter.toJson(saved);

        // Ghi AuditLog
        Map<String, String> auditData = new HashMap<>();
        auditData.put("signingStatus", "FULLY_SIGNED");
        auditData.put("signerFullName", employeeName);
        auditData.put("otpVerifiedVia", "EMAIL");
        auditData.put("ipAddress", ipAddress);
        auditData.put("userAgent", userAgent);

        applicationEventPublisher.publishEvent(new AuditLogEvent(this, "CONTRACT_SIGNED_EMPLOYEE", "EmployeeContract", saved.getId(), oldValue, SimpleJsonWriter.toJson(auditData)));

        return enrichDownloadUrl(saved);
    }

    /**
     * Lấy danh sách lịch sử nhật ký kiểm toán ký điện tử của 1 hợp đồng.
     */
    @Override
    public List<com.ailms.response.SigningHistoryResponse> getSigningHistory(Long id) {
        log.info("Getting signing history for contract: {}", id);
        List<AuditLogEntity> logs = auditLogRepository.findByEntityTypeAndEntityIdOrderByOccurredAtDesc("EmployeeContract", id);
        if (logs.isEmpty()) {
            logs = auditLogRepository.findByEntityTypeAndEntityIdOrderByOccurredAtDesc("EMPLOYEE_CONTRACT", id);
        }

        return logs.stream()
                .filter(l -> l.getAction() != null && l.getAction().startsWith("CONTRACT_SIGNED"))
                .map(l -> com.ailms.response.SigningHistoryResponse.builder()
                        .id(l.getId())
                        .action(l.getAction())
                        .signerFullName(l.getUser() != null ? l.getUser().getFullName() : "Nhân viên (Xác thực OTP)")
                        .signerEmail(l.getUser() != null ? l.getUser().getEmail() : "")
                        .ipAddress(l.getIpAddress())
                        .userAgent(l.getUserAgent())
                        .occurredAt(l.getOccurredAt())
                        .detailsJson(l.getNewValue())
                        .build())
                .toList();
    }

    /**
     * Sinh lại token ký mới cho nhân viên.
     */
    @Override
    @Transactional
    public EmployeeContractResponse resendSigningLink(Long id) {
        log.info("Resending signing link for contract: {}", id);
        EmployeeContractEntity contract = employeeContractRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of(RESOURCE_NAME, id));

        verifyContractAccess(contract);

        if (contract.getSigningStatus() == SigningStatusEnum.FULLY_SIGNED) {
            throw new BusinessException("Hợp đồng này đã được ký hoàn tất, không cần sinh lại link.");
        }

        return signCompany(id, null);
    }

    /**
     * Lấy các chỉ số thống kê tổng hợp hợp đồng cho Dashboard Admin/HR.
     */
    @Override
    @Transactional(readOnly = true)
    public com.ailms.response.ContractDashboardStatsResponse getDashboardStats() {
        log.info("Generating contract dashboard stats");
        Specification<EmployeeContractEntity> spec = getContractSecuritySpecification();
        List<EmployeeContractEntity> allContracts = employeeContractRepository.findAll(spec);

        LocalDate today = LocalDate.now();
        String currentMonthStr = String.format("%04d-%02d", today.getYear(), today.getMonthValue());

        long totalContracts = allContracts.size();
        long activeContracts = allContracts.stream().filter(c -> c.getStatus() == BaseStatusEnum.ACTIVE).count();

        long expiringSoonContracts = allContracts.stream().filter(c -> {
            if (c.getStatus() != BaseStatusEnum.ACTIVE) return false;
            LocalDate end = c.getEndDate();
            if (end == null) return false;
            long days = java.time.temporal.ChronoUnit.DAYS.between(today, end);
            return days >= 0 && days <= 30;
        }).count();

        long probationExpiringContracts = allContracts.stream().filter(c -> {
            if (c.getContractTypeEnum() != ContractTypeEnum.PROBATION) return false;
            if (c.getStatus() != BaseStatusEnum.ACTIVE) return false;
            LocalDate end = c.getEndDate();
            if (end == null) return false;
            long days = java.time.temporal.ChronoUnit.DAYS.between(today, end);
            return days >= 0 && days <= 30;
        }).count();

        long signedThisMonthContracts = allContracts.stream().filter(c -> {
            if (c.getSignedAt() != null) {
                return c.getSignedAt().toString().startsWith(currentMonthStr);
            }
            if (c.getStartDate() != null) {
                return c.getStartDate().toString().startsWith(currentMonthStr);
            }
            return c.getCreatedAt() != null && c.getCreatedAt().toString().startsWith(currentMonthStr);
        }).count();

        long terminatedThisMonthContracts = allContracts.stream().filter(c -> {
            if (c.getStatus() != BaseStatusEnum.TERMINATED) return false;
            if (c.getTerminatedAt() != null) {
                return c.getTerminatedAt().toString().startsWith(currentMonthStr);
            }
            return c.getUpdatedAt() != null && c.getUpdatedAt().toString().startsWith(currentMonthStr);
        }).count();

        long missingFileContracts = allContracts.stream().filter(c -> 
            c.getStatus() == BaseStatusEnum.ACTIVE && 
            !org.springframework.util.StringUtils.hasText(c.getFileKey()) && 
            c.getFileMetadata() == null
        ).count();

        long unsignedContracts = allContracts.stream().filter(c -> 
            c.getStatus() != BaseStatusEnum.TERMINATED && 
            c.getSigningStatus() != SigningStatusEnum.FULLY_SIGNED
        ).count();

        long pendingCompanySignCount = allContracts.stream().filter(c -> 
            c.getStatus() != BaseStatusEnum.TERMINATED && 
            (c.getSigningStatus() == null || c.getSigningStatus() == SigningStatusEnum.PENDING_COMPANY_SIGN)
        ).count();

        long pendingEmployeeSignCount = allContracts.stream().filter(c -> 
            c.getStatus() != BaseStatusEnum.TERMINATED && 
            c.getSigningStatus() == SigningStatusEnum.PENDING_EMPLOYEE_SIGN
        ).count();

        long fullySignedCount = allContracts.stream().filter(c -> 
            c.getSigningStatus() == SigningStatusEnum.FULLY_SIGNED
        ).count();

        // Contract Type Distribution
        Map<String, Long> contractTypeDist = allContracts.stream()
                .filter(c -> c.getContractTypeEnum() != null)
                .collect(Collectors.groupingBy(c -> c.getContractTypeEnum().name(), Collectors.counting()));

        // Salary Type Distribution
        Map<String, Long> salaryTypeDist = allContracts.stream()
                .filter(c -> c.getSalaryTypeEnum() != null)
                .collect(Collectors.groupingBy(c -> c.getSalaryTypeEnum().name(), Collectors.counting()));

        // Department Distribution
        Map<String, Long> departmentDist = allContracts.stream()
                .filter(c -> c.getEmployee() != null && c.getEmployee().getDepartment() != null)
                .collect(Collectors.groupingBy(c -> c.getEmployee().getDepartment().getName(), Collectors.counting()));

        // Expiry Timeline Next 6 Months
        Map<String, Long> expiryTimeline = new LinkedHashMap<>();
        for (int i = 0; i < 6; i++) {
            LocalDate mDate = today.plusMonths(i);
            String monthKey = String.format("%04d-%02d", mDate.getYear(), mDate.getMonthValue());
            long count = allContracts.stream().filter(c -> {
                LocalDate end = c.getEndDate();
                if (end == null) return false;
                return end.getYear() == mDate.getYear() && end.getMonthValue() == mDate.getMonthValue();
            }).count();
            expiryTimeline.put(monthKey, count);
        }

        return com.ailms.response.ContractDashboardStatsResponse.builder()
                .totalContracts(totalContracts)
                .activeContracts(activeContracts)
                .expiringSoonContracts(expiringSoonContracts)
                .probationExpiringContracts(probationExpiringContracts)
                .signedThisMonthContracts(signedThisMonthContracts)
                .terminatedThisMonthContracts(terminatedThisMonthContracts)
                .missingFileContracts(missingFileContracts)
                .unsignedContracts(unsignedContracts)
                .pendingCompanySignCount(pendingCompanySignCount)
                .pendingEmployeeSignCount(pendingEmployeeSignCount)
                .fullySignedCount(fullySignedCount)
                .contractTypeDistribution(contractTypeDist)
                .salaryTypeDistribution(salaryTypeDist)
                .departmentDistribution(departmentDist)
                .expiryTimeline6Months(expiryTimeline)
                .build();
    }

    /**
     * Phân quyền bảo mật truy cập dữ liệu (Data Access Control Specification).
     */
    private Specification<EmployeeContractEntity> getContractSecuritySpecification() {
        Long currentUserId = getCurrentUserId();
        List<String> roles = getCurrentUserRoles();

        if (roles.contains("ROLE_HR") || roles.contains("ROLE_ADMIN")) {
            return (root, query, cb) -> cb.conjunction();
        }

        Specification<EmployeeContractEntity> spec = (root, query, cb) -> cb.disjunction();
        spec = spec.or((root, query, cb) -> cb.equal(root.get("employee").get("userId"), currentUserId));
        return spec;
    }
}
