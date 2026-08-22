package com.ailms.service.imp;

import java.io.*;
import java.security.SecureRandom;
import java.text.Normalizer;
import java.time.temporal.ChronoUnit;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;
import java.util.LinkedHashMap;
import com.ailms.common.converter.SimpleJsonWriter;
import com.ailms.entity.*;
import com.ailms.entity.enums.*;
import com.ailms.event.AuditLogEvent;
import com.ailms.event.ContractKnowledgeChangedEvent;
import com.ailms.exception.BusinessException;
import com.ailms.exception.ResourceNotFoundException;
import com.ailms.mapper.EmployeeContractMapper;
import com.ailms.repository.*;
import com.ailms.repository.specification.EmployeeContractSpecification;
import com.ailms.request.*;
import com.ailms.response.*;
import com.ailms.security.CustomUserDetails;
import com.ailms.service.IApprovalRequestService;
import com.ailms.service.IEmailService;
import com.ailms.service.IEmployeeContractService;
import com.ailms.service.IFileService;
import com.openhtmltopdf.pdfboxout.PdfRendererBuilder;
import com.openhtmltopdf.svgsupport.BatikSVGDrawer;
import org.apache.pdfbox.io.MemoryUsageSetting;
import org.apache.pdfbox.multipdf.PDFMergerUtility;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.graphics.image.PDImageXObject;
import org.apache.pdfbox.text.PDFTextStripper;
import org.apache.pdfbox.text.TextPosition;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.apache.batik.transcoder.TranscoderInput;
import org.apache.batik.transcoder.TranscoderOutput;
import org.apache.batik.transcoder.image.PNGTranscoder;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.concurrent.CompletableFuture;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

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
    private final UserRepository userRepository;
    private final UserRoleRepository userRoleRepository;
    private final EmployeeContractMapper employeeContractMapper;
    private final IApprovalRequestService approvalRequestService;
    private final IEmailService emailService;
    private final MinioFileStorageService fileStorageService;
    private final ApplicationEventPublisher applicationEventPublisher;

    @Value("${app.frontend.url:http://localhost:5173}")
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

    private final Map<String, OtpData> otpStorage = new ConcurrentHashMap<>();

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

        EmployeeEntity employee = entity.getEmployee();
        employee.setStatus(EmployeeStatusEnum.TERMINATED);
        employee.setEndDate(LocalDateTime.now());
        employeeRepository.save(employee);

        EmployeeContractEntity saved = employeeContractRepository.save(entity);
        publishKnowledgeUpsert(saved.getId());
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
        publishKnowledgeUpsert(saved.getId());
        employee.setStatus(request.getContractTypeEnum() == ContractTypeEnum.PROBATION
                ? EmployeeStatusEnum.PROBATION : EmployeeStatusEnum.ACTIVE);
        employee.setEndDate(null);
        employeeRepository.save(employee);

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
                    .usageType(FileUsageTypeEnum.CONTRACT)
                    .referenceEntityId(contract.getId())
                    .referenceEntityType("EmployeeContract")
                    .status(BaseStatusEnum.ACTIVE)
                    .build();

            FileMetadataEntity savedMetadata = fileMetadataRepository.save(metadataEntity);

            // Gán fileMetadata vào hợp đồng
            contract.setFileMetadata(savedMetadata);
            contract.setFileKey(objectKey);
            EmployeeContractEntity updatedContract = employeeContractRepository.save(contract);
            publishKnowledgeUpsert(updatedContract.getId());

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
            rasterizeSvgElements(doc);
            doc.outputSettings().syntax(Document.OutputSettings.Syntax.xml);
            String cleanXmlContent = doc.html();

            ByteArrayOutputStream os = new ByteArrayOutputStream();
            PdfRendererBuilder builder = new PdfRendererBuilder();
            builder.useFastMode();
            builder.useSVGDrawer(new BatikSVGDrawer());

            // Đăng ký Noto Sans Unicode đầy đủ cho OpenHTMLToPDF.
            try {
                byte[] regFont = getClass().getResourceAsStream("/fonts/NotoSans-Regular.ttf").readAllBytes();
                byte[] boldFont = getClass().getResourceAsStream("/fonts/NotoSans-Bold.ttf").readAllBytes();
                byte[] italicFont = getClass().getResourceAsStream("/fonts/NotoSans-Italic.ttf").readAllBytes();
                byte[] boldItalicFont = getClass().getResourceAsStream("/fonts/NotoSans-BoldItalic.ttf").readAllBytes();

                builder.useFont(() -> new ByteArrayInputStream(regFont), "Noto Sans", 400, PdfRendererBuilder.FontStyle.NORMAL, true);
                builder.useFont(() -> new ByteArrayInputStream(boldFont), "Noto Sans", 700, PdfRendererBuilder.FontStyle.NORMAL, true);
                builder.useFont(() -> new ByteArrayInputStream(italicFont), "Noto Sans", 400, PdfRendererBuilder.FontStyle.ITALIC, true);
                builder.useFont(() -> new ByteArrayInputStream(boldItalicFont), "Noto Sans", 700, PdfRendererBuilder.FontStyle.ITALIC, true);
            } catch (Exception fontEx) {
                log.warn("Failed to load Noto Sans font resources", fontEx);
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
        String fileName = "Hop_Dong_" + employeeDisplayName(employee).replaceAll("\\s+", "_") + ".pdf";

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
                .usageType(FileUsageTypeEnum.CONTRACT)
                .referenceEntityType("EmployeeContract")
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
        publishKnowledgeUpsert(savedContract.getId());
        employee.setStatus(request.getContractTypeEnum() == ContractTypeEnum.PROBATION
                ? EmployeeStatusEnum.PROBATION : EmployeeStatusEnum.ACTIVE);
        employee.setEndDate(null);
        employeeRepository.save(employee);

        // Update referenceEntityId for savedMetadata
        savedMetadata.setReferenceEntityId(savedContract.getId());
        fileMetadataRepository.save(savedMetadata);

        applicationEventPublisher.publishEvent(new AuditLogEvent(this, "GENERATE_CONTRACT", "EMPLOYEE_CONTRACT", savedContract.getId(), null, savedContract));

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
        publishKnowledgeUpsert(updated.getId());
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
        publishKnowledgeDelete(id);
        applicationEventPublisher.publishEvent(new AuditLogEvent(this, "DELETE", "EMPLOYEE_CONTRACT", id, oldValue, null));
    }

    @Override
    @Transactional
    public void deleteAllByEmployeeId(Long employeeId) {
        List<EmployeeContractEntity> contracts = employeeContractRepository.findByEmployee_UserId(employeeId);
        if (contracts.isEmpty()) {
            throw ResourceNotFoundException.of("EmployeeContract", employeeId);
        }
        if (contracts.stream().anyMatch(contract -> contract.getStatus() != BaseStatusEnum.TERMINATED)) {
            throw new BusinessException("Chỉ được xóa khi tất cả hợp đồng của nhân viên đã ở trạng thái TERMINATED.");
        }

        for (EmployeeContractEntity contract : contracts) {
            if (approvalRequestService.isLocked("CONTRACT", contract.getId())) {
                throw new BusinessException("Có hợp đồng đang trong quá trình phê duyệt, không thể xóa.");
            }
        }

        Set<FileMetadataEntity> metadataToDelete = new LinkedHashSet<>();
        Set<String> fileKeys = new LinkedHashSet<>();
        for (EmployeeContractEntity contract : contracts) {
            if (contract.getFileMetadata() != null) metadataToDelete.add(contract.getFileMetadata());
            if (contract.getOriginalFileMetadata() != null) metadataToDelete.add(contract.getOriginalFileMetadata());
            if (StringUtils.hasText(contract.getFileKey())) fileKeys.add(contract.getFileKey());
        }
        metadataToDelete.stream().map(FileMetadataEntity::getFileKey).filter(StringUtils::hasText).forEach(fileKeys::add);

        // Xóa vật lý trước; nếu MinIO lỗi thì dừng và giữ nguyên dữ liệu DB.
        for (String fileKey : fileKeys) {
            fileStorageService.delete(fileKey);
        }

        contracts.forEach(contract -> {
            contract.setFileMetadata(null);
            contract.setOriginalFileMetadata(null);
            contract.setFileKey(null);
        });
        employeeContractRepository.saveAll(contracts);
        employeeContractRepository.flush();
        employeeContractRepository.deleteAll(contracts);
        employeeContractRepository.flush();
        fileMetadataRepository.deleteAll(metadataToDelete);
        contracts.forEach(contract -> publishKnowledgeDelete(contract.getId()));

        applicationEventPublisher.publishEvent(new AuditLogEvent(
                this, "DELETE_ALL", "EMPLOYEE_CONTRACT", employeeId,
                "{\"contractCount\":" + contracts.size() + "}", null));
    }

    /** Gửi nhắc hạn hợp đồng theo lô và trả về thống kê kết quả gửi. */
    @Override
    public Map<String, Object> sendBulkExpirationReminder(BulkContractReminderRequest request) {
        List<EmployeeContractEntity> contracts = employeeContractRepository.findAllById(request.getIds());
        if (contracts.isEmpty()) throw new BusinessException("Không tìm thấy hợp đồng đã chọn.");

        List<UserEntity> recipients = userRepository.findAllById(request.getRecipientUserIds()).stream()
                .filter(user -> userRoleRepository.findByUserEntity_Id(user.getId()).stream()
                        .map(role -> role.getRoleEntity().getCode().toUpperCase())
                        .map(code -> code.replaceFirst("^(ROLE_)+", ""))
                        .anyMatch(code -> code.equals("HR")))
                .filter(user -> StringUtils.hasText(user.getEmail()))
                .toList();
        if (recipients.isEmpty()) throw new BusinessException("Không có người nhận nào mang vai trò HR hợp lệ.");

        String contractSummary = contracts.stream()
                .map(contract -> "• #" + contract.getId() + " - "
                        + employeeDisplayName(contract.getEmployee()) + " - hết hạn: "
                        + (contract.getEndDate() != null ? contract.getEndDate().format(DateTimeFormatter.ofPattern("dd/MM/yyyy")) : "Không thời hạn"))
                .collect(Collectors.joining("\n"));
        String content = "<div style=\"font-family:Arial,sans-serif;line-height:1.6\">"
                + "<p>" + escapeXml(request.getContent().trim()).replace("\n", "<br/>") + "</p>"
                + "<p><strong>Danh sách hợp đồng:</strong><br/>"
                + escapeXml(contractSummary).replace("\n", "<br/>") + "</p></div>";
        String subject = StringUtils.hasText(request.getSubject())
                ? request.getSubject().trim() : "Nhắc nhở xử lý hợp đồng lao động";
        emailService.sendBulkEmail(recipients.stream().map(UserEntity::getEmail).toList(), subject, content);

        applicationEventPublisher.publishEvent(new AuditLogEvent(this, "BULK_REMINDER", "EMPLOYEE_CONTRACT",
                contracts.getFirst().getId(), null, Map.of("contractIds", request.getIds(), "recipientUserIds", request.getRecipientUserIds())));
        return Map.of("recipientCount", recipients.size(), "contractCount", contracts.size());
    }

    @Override
    public List<Map<String, Object>> getReminderRecipients() {
        return userRoleRepository.findHrUsers().stream()
                .filter(user -> user.getStatus() == UserStatusEnum.ACTIVE)
                .filter(user -> StringUtils.hasText(user.getEmail()))
                .sorted(Comparator.comparing(user -> Optional.ofNullable(user.getFullName()).orElse(""),
                        String.CASE_INSENSITIVE_ORDER))
                .map(user -> {
                    Map<String, Object> item = new LinkedHashMap<>();
                    item.put("id", user.getId());
                    item.put("fullName", StringUtils.hasText(user.getFullName()) ? user.getFullName() : user.getUsername());
                    item.put("email", user.getEmail());
                    return item;
                })
                .toList();
    }

    @Override
    public List<EmployeeContractResponse> getExpiringProbationContracts() {
        LocalDate today = LocalDate.now();
        return employeeContractRepository.findExpiringProbationContracts(today, today.plusDays(7)).stream()
                .map(this::enrichDownloadUrl)
                .toList();
    }

    /** Đóng gói các tệp hợp đồng hợp lệ thành một tệp ZIP. */
    @Override
    public byte[] downloadContractsZip(List<Long> ids) {
        if (ids == null || ids.isEmpty()) throw new BusinessException("Vui lòng chọn ít nhất một hợp đồng.");
        List<EmployeeContractEntity> contracts = employeeContractRepository.findAllById(ids);
        try (ByteArrayOutputStream output = new ByteArrayOutputStream();
             ZipOutputStream zip = new ZipOutputStream(output)) {
            Set<String> usedNames = new HashSet<>();
            int added = 0;
            for (EmployeeContractEntity contract : contracts) {
                if (!StringUtils.hasText(contract.getFileKey()) || !fileStorageService.exists(contract.getFileKey())) continue;
                String originalName = contract.getFileMetadata() != null
                        ? contract.getFileMetadata().getOriginalName() : "hop_dong_" + contract.getId() + ".pdf";
                String safeName = originalName.replaceAll("[\\\\/:*?\"<>|]", "_");
                if (!usedNames.add(safeName)) safeName = contract.getId() + "_" + safeName;
                zip.putNextEntry(new ZipEntry(safeName));
                try (InputStream input = fileStorageService.download(contract.getFileKey())) {
                    input.transferTo(zip);
                }
                zip.closeEntry();
                added++;
            }
            if (added == 0) throw new BusinessException("Các hợp đồng đã chọn không có file hợp lệ để tải.");
            zip.finish();
            return output.toByteArray();
        } catch (BusinessException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new BusinessException("Không thể tạo file ZIP hợp đồng: " + ex.getMessage());
        }
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
        if (entity == null) return null;
        EmployeeContractResponse res = employeeContractMapper.toResponse(entity);
        if ((!StringUtils.hasText(res.getAvatarUrl())) && entity.getEmployee() != null) {
            if (entity.getEmployee().getUserEntity() != null && StringUtils.hasText(entity.getEmployee().getUserEntity().getAvatarUrl())) {
                res.setAvatarUrl(entity.getEmployee().getUserEntity().getAvatarUrl());
            }
        }
        try {
            if (entity.getFileMetadata() != null && StringUtils.hasText(entity.getFileMetadata().getFileKey())) {
                res.setDownloadUrl(fileStorageService.getPresignedUrl(entity.getFileMetadata().getFileKey(), Duration.ofHours(24)));
            } else if (StringUtils.hasText(entity.getFileKey())) {
                res.setDownloadUrl(fileStorageService.getPresignedUrl(entity.getFileKey(), Duration.ofHours(24)));
            }

            if (entity.getOriginalFileMetadata() != null && StringUtils.hasText(entity.getOriginalFileMetadata().getFileKey())) {
                res.setOriginalFileDownloadUrl(fileStorageService.getPresignedUrl(entity.getOriginalFileMetadata().getFileKey(), Duration.ofHours(24)));
            }
        } catch (Exception e) {
            log.warn("Unable to generate presigned download URL for contract ID {}: {}", entity.getId(), e.getMessage());
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
        // Bên A dùng danh xưng doanh nghiệp mặc định, không lấy tên tài khoản HR đang thao tác.
        // Dấu đỏ và chữ ký đại diện trong template vẫn được giữ nguyên.
        values.put("companyRepresentative", "ĐẠI DIỆN CÔNG TY");
        values.put("companyRepresentativeTitle", "GIÁM ĐỐC");
        values.put("companyPhone", "1900 6868");
        values.put("companyEmail", "hr@ailms.edu.vn");

        // Không suy diễn họ tên/chữ ký từ email. Vùng ký chỉ được hoàn thiện ở bước nhân viên ký điện tử.
        values.put("employeeName", employee.getUserEntity() != null
                && StringUtils.hasText(employee.getUserEntity().getFullName())
                ? employee.getUserEntity().getFullName() : "");
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
        String salaryText = request.getBaseSalary() != null
                ? String.format("%,.0f", request.getBaseSalary()) + " VNĐ"
                : "Theo đơn giá giảng dạy áp dụng cho từng lớp";
        values.put("salary", salaryText);
        values.put("baseSalary", salaryText);
        values.put("salaryType", request.getSalaryTypeEnum() != null ? request.getSalaryTypeEnum().name() : "MONTHLY");
        values.put("payDay", "05");
        values.put("allowance", "Phụ cấp ăn trưa 730.000 VNĐ/tháng, phụ cấp xăng xe 500.000 VNĐ/tháng");
        values.put("workingHours", "08 giờ/ngày (từ 08h00 đến 17h00, từ Thứ Hai đến Thứ Sáu)");
        String noticeDays = request.getContractTypeEnum() == ContractTypeEnum.INDEFINITE
                ? "45"
                : (request.getEndDate() != null && request.getStartDate() != null
                    && request.getStartDate().plusMonths(12).isAfter(request.getEndDate()) ? "3" : "30");
        values.put("noticePeriod", noticeDays);
        values.put("signedAt", request.getSignedAt() != null ? request.getSignedAt().format(DateTimeFormatter.ofPattern("dd/MM/yyyy")) : now.format(DateTimeFormatter.ofPattern("dd/MM/yyyy")));

        if (request.getCustomPlaceholders() != null) {
            values.putAll(request.getCustomPlaceholders());
        }

        for (Map.Entry<String, String> entry : values.entrySet()) {
            String rawVal = entry.getValue() != null ? entry.getValue() : "";
            content = content.replace("{{" + entry.getKey() + "}}", escapeXml(rawVal));
        }

        Set<String> roleCodes = userRoleRepository.findByUserEntity_IdWithRole(employee.getUserId()).stream()
                .map(userRole -> userRole.getRoleEntity().getCode())
                .filter(Objects::nonNull)
                .map(code -> code.toUpperCase(Locale.ROOT))
                .collect(Collectors.toSet());
        String roleTerms;
        if (roleCodes.contains("TA")) {
            roleTerms = """
                <div class="article"><span class="article-title">Điều khoản riêng đối với Trợ giảng bán thời gian:</span><br/>
                1. Bên B hỗ trợ lớp học, quản lý học liệu, điểm danh, giải đáp và các nhiệm vụ chuyên môn theo phân công từng lớp; không tự ý thay đổi nội dung đào tạo.<br/>
                2. Thời giờ làm việc được bố trí theo lịch lớp và tổng số giờ thực tế; Bên A thông báo lịch, thay đổi hoặc hủy buổi trong thời gian hợp lý. Thời gian làm thêm chỉ thực hiện khi có thỏa thuận và thanh toán theo pháp luật.<br/>
                3. Thù lao được tính theo số giờ thực tế đã xác nhận nhân với đơn giá Teaching Rate của từng lớp. Đơn giá, thời điểm áp dụng và điều chỉnh được ghi nhận tại phụ lục/phân công lớp; dữ liệu thanh toán từng buổi là căn cứ đối soát.<br/>
                4. Người lao động không trọn thời gian được bảo đảm bình đẳng về quyền, nghĩa vụ, cơ hội, an toàn vệ sinh lao động và không bị phân biệt đối xử so với người lao động trọn thời gian.<br/>
                5. Bên B phải bảo mật thông tin học viên, tài liệu, bài kiểm tra và chỉ xử lý dữ liệu trong phạm vi nhiệm vụ được giao.</div>
                """;
        } else if (roleCodes.contains("TEACHER")) {
            roleTerms = """
                <div class="article"><span class="article-title">Điều khoản riêng đối với Giảng viên:</span><br/>
                1. Bên B chịu trách nhiệm giảng dạy đúng chương trình, chuẩn đầu ra, lịch lớp; chuẩn bị bài, đánh giá kết quả học tập và hoàn thiện hồ sơ chuyên môn theo phân công.<br/>
                2. Thù lao giảng dạy được tính theo số giờ thực tế đã xác nhận và Teaching Rate của từng lớp. Đơn giá lớp không được suy ra từ giá bán khóa học và phải được hai bên xác nhận trước khi giảng dạy.<br/>
                3. Công việc ngoài giờ giảng như họp chuyên môn, xây dựng học liệu hoặc chấm bài phải được mô tả, ghi nhận thời lượng và thỏa thuận cách trả lương rõ ràng.<br/>
                4. Bên B tôn trọng quyền tác giả, bảo mật dữ liệu học viên và không sao chép, phát tán học liệu trái phép.</div>
                """;
        } else {
            roleTerms = """
                <div class="article"><span class="article-title">Điều khoản riêng đối với Nhân sự HR toàn thời gian:</span><br/>
                1. Bên B thực hiện tuyển dụng, hồ sơ lao động, chấm công, chế độ và công việc nhân sự theo mô tả công việc, phân quyền và quy trình của Bên A.<br/>
                2. Tiền lương, phụ cấp, kỳ hạn và phương thức trả lương thực hiện theo hợp đồng; mọi khấu trừ chỉ được thực hiện đúng căn cứ và giới hạn pháp luật.<br/>
                3. Bên B bảo mật hồ sơ nhân sự và dữ liệu cá nhân; chỉ truy cập, sử dụng hoặc cung cấp dữ liệu đúng mục đích và thẩm quyền.<br/>
                4. Thời giờ làm việc, nghỉ hằng tuần, nghỉ lễ, nghỉ phép, làm thêm giờ và an toàn vệ sinh lao động thực hiện theo pháp luật và nội quy hợp pháp của Bên A.</div>
                """;
        }
        String noticeText = request.getContractTypeEnum() == ContractTypeEnum.INDEFINITE
                ? "ít nhất 45 ngày, trừ trường hợp pháp luật quy định không phải báo trước"
                : (request.getEndDate() != null && request.getStartDate() != null
                    && request.getStartDate().plusMonths(12).isAfter(request.getEndDate())
                    ? "ít nhất 03 ngày làm việc, trừ trường hợp pháp luật quy định không phải báo trước"
                    : "ít nhất 30 ngày, trừ trường hợp pháp luật quy định không phải báo trước");
        String legalTerms = roleTerms + "<div class=\"article\"><span class=\"article-title\">Thời hạn báo trước:</span> "
                + "Khi đơn phương chấm dứt hợp đồng, Bên B thực hiện báo trước " + noticeText
                + "; quyền chấm dứt không cần báo trước được áp dụng theo các trường hợp luật định.</div>";
        if (content.contains("<div class=\"signature-container\">")) {
            content = content.replace("<div class=\"signature-container\">", legalTerms + "<div class=\"signature-container\">");
        } else {
            content = content.replace("</body>", legalTerms + "</body>");
        }

        // Clean XML-incompatible entities (like &nbsp;) to prevent SAXParseException in OpenHTMLToPDF
        content = content.replace("&nbsp;", "&#160;");

        // Ép font Unicode tiếng Việt cho cả template cũ; !important ngăn CSS Times/Arial cũ ghi đè.
        String vietnameseFontCss = "<style>html, body { font-family: 'Noto Sans', Arial, sans-serif !important; }"
                + "body { text-rendering: optimizeLegibility; }</style>";
        if (content.matches("(?is).*<head[^>]*>.*")) {
            content = content.replaceFirst("(?i)<head([^>]*)>", "<head$1><meta charset=\"UTF-8\"/>" + vietnameseFontCss);
        } else {
            content = "<!DOCTYPE html><html><head><meta charset=\"UTF-8\"/>" + vietnameseFontCss
                    + "</head><body>" + content + "</body></html>";
        }

        return content;
    }

    private String employeeDisplayName(EmployeeEntity employee) {
        if (employee != null && employee.getUserEntity() != null
                && StringUtils.hasText(employee.getUserEntity().getFullName())) {
            return employee.getUserEntity().getFullName().trim();
        }
        return "Người lao động";
    }

    /**
     * Batik/OpenHTMLToPDF không ổn định với textPath và CSS transform trong con dấu SVG.
     * Raster hóa SVG thành PNG data URI trước khi dựng PDF để giữ nguyên màu đỏ và bố cục.
     */
    private void rasterizeSvgElements(Document document) {
        for (Element svg : new ArrayList<>(document.select("svg"))) {
            try {
                if (!svg.hasAttr("xmlns")) svg.attr("xmlns", "http://www.w3.org/2000/svg");
                svg.attr("xmlns:xlink", "http://www.w3.org/1999/xlink");
                String svgMarkup = svg.outerHtml()
                        .replace("viewbox=", "viewBox=")
                        .replace("<textpath", "<textPath")
                        .replace("</textpath>", "</textPath>")
                        .replace("startoffset=", "startOffset=")
                        .replace(" href=", " xlink:href=");
                PNGTranscoder transcoder = new PNGTranscoder();
                transcoder.addTranscodingHint(PNGTranscoder.KEY_WIDTH, 560f);
                transcoder.addTranscodingHint(PNGTranscoder.KEY_HEIGHT, 560f);
                ByteArrayOutputStream pngOutput = new ByteArrayOutputStream();
                transcoder.transcode(
                        new TranscoderInput(new StringReader(svgMarkup)),
                        new TranscoderOutput(pngOutput));

                Element image = new Element("img");
                image.attr("alt", "Con dấu công ty");
                image.attr("src", "data:image/png;base64," + Base64.getEncoder().encodeToString(pngOutput.toByteArray()));
                image.attr("style", "position:absolute;top:-10px;left:50%;margin-left:-70px;width:140px;height:140px;");
                svg.replaceWith(image);
            } catch (Exception exception) {
                log.warn("Không thể raster hóa SVG con dấu, giữ nguyên SVG để renderer xử lý", exception);
            }
        }
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
            return Collections.emptyList();
        }
        return auth.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .toList();
    }

    private boolean hasManagementRole(List<String> authorities) {
        return authorities.stream()
                .map(String::toUpperCase)
                .map(role -> role.replaceFirst("^(ROLE_)+", ""))
                .anyMatch(role -> role.equals("ADMIN") || role.equals("HR"));
    }

    /**
     * Kiểm tra quyền truy cập thông tin nhân viên (chỉ HR/Admin hoặc chính nhân viên mới có quyền).
     */
    private void verifyEmployeeAccess(Long employeeId) {
        Long currentUserId = getCurrentUserId();
        List<String> roles = getCurrentUserRoles();

        if (hasManagementRole(roles)) {
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
        if (contract == null || contract.getEmployee() == null) {
            return;
        }
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
    public EmployeeContractResponse signCompany(Long id, SignCompanyRequest request) {
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
        if (contract.getFileMetadata() != null
                && !"application/pdf".equalsIgnoreCase(contract.getFileMetadata().getContentType())) {
            throw new BusinessException("Luồng ký điện tử chỉ hỗ trợ hợp đồng PDF. Vui lòng tải lên file PDF trước khi ký.");
        }
        String recipientEmail = contract.getEmployee().getUserEntity().getEmail();
        String recipientName = employeeDisplayName(contract.getEmployee());
        if (!StringUtils.hasText(recipientEmail)) {
            throw new BusinessException("Nhân viên chưa có email để nhận liên kết ký.");
        }

        String oldValue = SimpleJsonWriter.toJson(contract);

        String signingToken = UUID.randomUUID().toString();
        LocalDateTime expiresAt = LocalDateTime.now().plusDays(7);

        contract.setSigningStatus(SigningStatusEnum.PENDING_EMPLOYEE_SIGN);
        contract.setSigningToken(signingToken);
        contract.setSigningTokenExpiresAt(expiresAt);

        EmployeeContractEntity saved = employeeContractRepository.save(contract);
        publishKnowledgeUpsert(saved.getId());
        String newValue = SimpleJsonWriter.toJson(saved);

        applicationEventPublisher.publishEvent(new AuditLogEvent(this, "CONTRACT_SIGNED_COMPANY", "EmployeeContract", id, oldValue, newValue));

        Runnable sendSigningEmail = () -> CompletableFuture.runAsync(() -> {
            try {
                String signingBaseUrl = frontendUrl.split(",")[0].trim();
                String signingLink = signingBaseUrl + "/contracts/sign/" + signingToken;
                // Email mời ký chỉ chứa link. OTP chỉ được phát hành khi người lao động
                // chủ động chuyển sang bước "Ký và xác thực OTP".
                emailService.sendContractSigningLinkEmail(recipientEmail, recipientName, signingLink, null,
                        request != null ? request.getSetPasswordToken() : null, expiresAt);
            } catch (Exception e) {
                log.error("Failed to send signing link email for contract {}", id, e);
            }
        });
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    sendSigningEmail.run();
                }
            });
        } else {
            sendSigningEmail.run();
        }

        return enrichDownloadUrl(saved);
    }

    /**
     * [Ký điện tử - Bước 2] Lấy thông tin cho link công khai, không tự sinh/gửi OTP.
     */
    @Override
    public ContractSigningLinkResponse getPublicSigningInfo(String signingToken) {
        log.info("Public fetching signing info for token: {}", signingToken);
        EmployeeContractEntity contract = employeeContractRepository.findBySigningToken(signingToken)
                .orElseThrow(() -> new ResourceNotFoundException("Hợp đồng không tồn tại hoặc link ký không hợp lệ."));

        if (contract.getSigningStatus() == SigningStatusEnum.FULLY_SIGNED) {
            throw new BusinessException("Hợp đồng này đã được ký hoàn tất bởi cả hai bên.");
        }

        if (contract.getSigningTokenExpiresAt() != null && LocalDateTime.now().isAfter(contract.getSigningTokenExpiresAt())) {
            throw new BusinessException("Liên kết ký hợp đồng đã hết hạn (hạn dùng 7 ngày). Vui lòng liên hệ HR để được cấp lại link mới.");
        }

        String toEmail = contract.getEmployee().getUserEntity().getEmail();
        String employeeName = StringUtils.hasText(contract.getEmployee().getUserEntity().getFullName())
                ? contract.getEmployee().getUserEntity().getFullName() : "Người lao động";
        String fileUrl = enrichDownloadUrl(contract).getDownloadUrl();

        return ContractSigningLinkResponse.builder()
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
                .otpSent(otpStorage.containsKey(signingToken))
                .build();
    }

    @Override
    public void resendSigningOtp(String signingToken) {
        EmployeeContractEntity contract = employeeContractRepository.findBySigningToken(signingToken)
                .orElseThrow(() -> new ResourceNotFoundException("Hợp đồng không tồn tại hoặc link ký không hợp lệ."));
        if (contract.getSigningStatus() != SigningStatusEnum.PENDING_EMPLOYEE_SIGN) {
            throw new BusinessException("Hợp đồng không ở trạng thái chờ nhân viên ký.");
        }
        if (contract.getSigningTokenExpiresAt() != null && LocalDateTime.now().isAfter(contract.getSigningTokenExpiresAt())) {
            throw new BusinessException("Liên kết ký hợp đồng đã hết hạn.");
        }
        issueSigningOtp(signingToken, contract.getEmployee().getUserEntity().getEmail(),
                employeeDisplayName(contract.getEmployee()), true);
    }

    /** Tạo và gửi OTP ký hợp đồng, có thể buộc cấp mã mới khi gửi lại. */
    private void issueSigningOtp(String signingToken, String email, String employeeName, boolean forceNew) {
        if (!StringUtils.hasText(email)) throw new BusinessException("Nhân viên chưa có email nhận OTP.");
        OtpData current = otpStorage.get(signingToken);
        if (!forceNew && current != null && LocalDateTime.now().isBefore(current.expiresAt)) return;
        String otp = String.format("%06d", new SecureRandom().nextInt(1_000_000));
        otpStorage.put(signingToken, new OtpData(otp, LocalDateTime.now().plusMinutes(5)));
        CompletableFuture.runAsync(() -> emailService.sendContractSigningOtpEmail(email, employeeName, otp));
    }

    /**
     * [Ký điện tử - Bước 3] Nhân viên xác nhận ký hợp đồng qua mã OTP và chữ ký vẽ tay.
     */
    @Override
    @Transactional
    public EmployeeContractResponse confirmEmployeeSigning(String signingToken,SignEmployeeConfirmRequest request, String ipAddress, String userAgent) {
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

        String oldValue = SimpleJsonWriter.toJson(contract);

        String signatureImage = request.getSignatureImageBase64().trim();
        if (!signatureImage.matches("^data:image/png;base64,[A-Za-z0-9+/=\\r\\n]+$")) {
            throw new BusinessException("Dữ liệu chữ ký không hợp lệ. Vui lòng xóa và vẽ lại chữ ký.");
        }
        if (signatureImage.length() > 2_800_000) {
            throw new BusinessException("Ảnh chữ ký vượt quá dung lượng cho phép (2MB).");
        }

        FileMetadataEntity oldMetadata = contract.getFileMetadata();
        String oldObjectKey = contract.getFileKey();

        // Đóng chữ ký trực tiếp vào ô Bên B trên trang cuối của PDF.
        String employeeName = request.getSignerFullName().trim().replaceAll("\\s+", " ");
        contract.getEmployee().getUserEntity().setFullName(employeeName);
        String signedTimeString = LocalDateTime.now().format(DateTimeFormatter.ofPattern("HH:mm:ss dd/MM/yyyy"));

        byte[] finalPdfBytes;
        try {
            try (InputStream originalPdf = fileStorageService.download(contract.getFileKey())) {
                byte[] signedContract = stampEmployeeSignature(originalPdf.readAllBytes(), signatureImage,
                        employeeName, signedTimeString, ipAddress);
                finalPdfBytes = appendSigningCertificate(signedContract, signatureImage, employeeName,
                        signedTimeString, ipAddress);
            }
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
                .usageType(FileUsageTypeEnum.CONTRACT)
                .referenceEntityId(contract.getId())
                .referenceEntityType("EmployeeContract")
                .status(BaseStatusEnum.ACTIVE)
                .build();
        FileMetadataEntity savedMetadata = fileMetadataRepository.save(metadataEntity);

        contract.setFileMetadata(savedMetadata);
        contract.setOriginalFileMetadata(null);
        contract.setFileKey(objectKey);
        contract.setSigningStatus(SigningStatusEnum.FULLY_SIGNED);
        contract.setSignedAt(LocalDateTime.now());
        contract.setSigningToken(null); // Vô hiệu hóa token lập tức
        contract.setSigningTokenExpiresAt(null);

        EmployeeContractEntity saved = employeeContractRepository.saveAndFlush(contract);
        publishKnowledgeUpsert(saved.getId());
        if (oldMetadata != null && !Objects.equals(oldMetadata.getId(), savedMetadata.getId())) {
            fileMetadataRepository.delete(oldMetadata);
        }
        deleteOldContractObjectAfterCommit(oldObjectKey, objectKey);
        // Chỉ vô hiệu OTP sau khi PDF cuối đã dựng, upload và lưu DB thành công.
        otpStorage.remove(signingToken);
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

    /** Đóng dấu chữ ký nhân viên vào vị trí neo trên bản PDF hợp đồng. */
    private byte[] stampEmployeeSignature(byte[] sourcePdf, String signatureDataUrl, String employeeName,
                                          String signedAt, String ipAddress) throws IOException {
        byte[] signatureBytes = Base64.getDecoder().decode(signatureDataUrl.substring(signatureDataUrl.indexOf(',') + 1));
        try (PDDocument document = PDDocument.load(sourcePdf); ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            // OpenHTMLToPDF can leave a trailing blank page when the signature table is
            // pushed near a page boundary. Remove only blank pages after a real text page,
            // then stamp Bên B on the actual final contract page.
            PDFTextStripper textStripper = new PDFTextStripper();
            int lastContentPage = -1;
            for (int pageIndex = 0; pageIndex < document.getNumberOfPages(); pageIndex++) {
                textStripper.setStartPage(pageIndex + 1);
                textStripper.setEndPage(pageIndex + 1);
                if (StringUtils.hasText(textStripper.getText(document))) lastContentPage = pageIndex;
            }
            if (lastContentPage >= 0) {
                while (document.getNumberOfPages() - 1 > lastContentPage) {
                    document.removePage(document.getNumberOfPages() - 1);
                }
            }
            SignatureAnchor anchor = findSignatureAnchor(document);
            PDPage page = document.getPage(anchor.pageIndex());
            float pageWidth = page.getMediaBox().getWidth();
            float employeeColumnCenter = pageWidth * 0.75f;
            float signatureWidth = Math.min(190, pageWidth / 2 - 50);
            float signatureX = employeeColumnCenter - signatureWidth / 2;
            float pageHeight = page.getMediaBox().getHeight();
            float y = anchor.yFromTop() > 0 ? pageHeight - anchor.yFromTop() - 68 : 62;
            PDImageXObject signature = PDImageXObject.createFromByteArray(document, signatureBytes, "employee-signature");
            try (PDPageContentStream stream = new PDPageContentStream(document, page,
                    PDPageContentStream.AppendMode.APPEND, true, true)) {
                stream.drawImage(signature, signatureX, y + 16, signatureWidth, 58);
                String pdfEmployeeName = safePdfText(employeeName);
                float nameFontSize = 9;
                float nameWidth = PDType1Font.HELVETICA_BOLD.getStringWidth(pdfEmployeeName) / 1000f * nameFontSize;
                float nameX = employeeColumnCenter - nameWidth / 2;
                stream.setFont(PDType1Font.HELVETICA_BOLD, nameFontSize);
                stream.beginText();
                stream.newLineAtOffset(nameX, y + 2);
                stream.showText(pdfEmployeeName);
                stream.endText();
            }
            document.save(output);
            return output.toByteArray();
        }
    }

    /** Tìm vị trí phần ký của người lao động trong nội dung PDF. */
    private SignatureAnchor findSignatureAnchor(PDDocument document) throws IOException {
        SignatureAnchor fallback = new SignatureAnchor(document.getNumberOfPages() - 1, -1);
        for (int pageIndex = 0; pageIndex < document.getNumberOfPages(); pageIndex++) {
            final float[] markerY = {-1};
            final float[] benBY = {-1};
            PDFTextStripper locator = new PDFTextStripper() {
                @Override
                protected void writeString(String text, List<TextPosition> positions) throws IOException {
                    if (!positions.isEmpty()) {
                        if (text.contains("AILMS_EMPLOYEE_SIGNATURE_ANCHOR")) markerY[0] = positions.getFirst().getYDirAdj();
                        if (text.contains("BÊN B") || text.contains("BEN B")) benBY[0] = positions.getFirst().getYDirAdj() + 24;
                    }
                    super.writeString(text, positions);
                }
            };
            locator.setStartPage(pageIndex + 1);
            locator.setEndPage(pageIndex + 1);
            locator.getText(document);
            if (markerY[0] > 0) return new SignatureAnchor(pageIndex, markerY[0]);
            if (benBY[0] > 0) fallback = new SignatureAnchor(pageIndex, benBY[0]);
        }
        return fallback;
    }

    private record SignatureAnchor(int pageIndex, float yFromTop) {}

    /** Gắn trang chứng nhận chứa thông tin xác thực vào cuối hợp đồng đã ký. */
    private byte[] appendSigningCertificate(byte[] signedPdf, String signatureImage, String employeeName,
                                             String signedAt, String ipAddress) throws Exception {
        String certificateHtml = """
            <!DOCTYPE html><html><head><meta charset="UTF-8"/>
            <style>
              @page { size:A4; margin:20mm 15mm; }
              body { font-family:'Noto Sans',Arial,sans-serif; font-size:12pt; color:#0f172a; }
              .box { border:2px dashed #16a34a; background:#f0fdf4; padding:18px; border-radius:8px; margin-top:30px; }
              .title { font-weight:700; color:#15803d; font-size:14pt; margin-bottom:10px; }
              p { margin:5px 0; } .signature { width:220px; height:90px; object-fit:contain; border-bottom:1px solid #94a3b8; }
              .foot { margin-top:10px; font-size:9pt; color:#64748b; }
            </style></head><body>
              <div class="box">
                <div class="title">&#10004; CHỨNG NHẬN KÝ ĐIỆN TỬ NỘI BỘ (E-SIGNATURE VERIFIED)</div>
                <p><strong>Bên ký:</strong> %s (Người lao động)</p>
                <p><strong>Thời điểm ký:</strong> %s</p>
                <p><strong>Địa chỉ IP:</strong> %s</p>
                <p><strong>Phương thức xác thực:</strong> Link ký bảo mật + OTP Email + e-Signature Canvas</p>
                <p style="margin-top:12px"><strong>Chữ ký người lao động:</strong></p>
                <img class="signature" src="%s" alt="Chữ ký người lao động"/>
                <p class="foot">Chữ ký đã được đóng vào ô Bên B của hợp đồng. Trang này là chứng nhận kiểm toán bổ sung và là một phần của tệp PDF đã ký trên AILMS.</p>
              </div>
            </body></html>
            """.formatted(escapeXml(employeeName), escapeXml(signedAt),
                escapeXml(ipAddress != null ? ipAddress : "N/A"), signatureImage);

        org.jsoup.nodes.Document doc = Jsoup.parse(certificateHtml);
        doc.outputSettings().syntax(org.jsoup.nodes.Document.OutputSettings.Syntax.xml);
        ByteArrayOutputStream certificateOutput = new ByteArrayOutputStream();
        PdfRendererBuilder renderer = new PdfRendererBuilder();
        renderer.useFastMode();
        byte[] regularFont = Objects.requireNonNull(getClass().getResourceAsStream("/fonts/NotoSans-Regular.ttf")).readAllBytes();
        byte[] boldFont = Objects.requireNonNull(getClass().getResourceAsStream("/fonts/NotoSans-Bold.ttf")).readAllBytes();
        renderer.useFont(() -> new ByteArrayInputStream(regularFont), "Noto Sans", 400,
                PdfRendererBuilder.FontStyle.NORMAL, true);
        renderer.useFont(() -> new ByteArrayInputStream(boldFont), "Noto Sans", 700,
                PdfRendererBuilder.FontStyle.NORMAL, true);
        renderer.withHtmlContent(doc.html(), null);
        renderer.toStream(certificateOutput);
        renderer.run();

        PDFMergerUtility merger = new PDFMergerUtility();
        ByteArrayOutputStream merged = new ByteArrayOutputStream();
        merger.setDestinationStream(merged);
        merger.addSource(new ByteArrayInputStream(signedPdf));
        merger.addSource(new ByteArrayInputStream(certificateOutput.toByteArray()));
        merger.mergeDocuments(MemoryUsageSetting.setupMainMemoryOnly());
        return merged.toByteArray();
    }

    private String safePdfText(String value) {
        if (value == null) return "N/A";
        return Normalizer.normalize(value, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .replaceAll("[^\\x20-\\x7E]", "");
    }

    private void deleteOldContractObjectAfterCommit(String oldObjectKey, String newObjectKey) {
        if (!StringUtils.hasText(oldObjectKey) || Objects.equals(oldObjectKey, newObjectKey)) return;
        Runnable cleanup = () -> {
            try {
                fileStorageService.delete(oldObjectKey);
            } catch (Exception e) {
                log.error("Signed PDF saved but old contract object could not be deleted: {}", oldObjectKey, e);
            }
        };
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override public void afterCommit() { cleanup.run(); }
            });
        } else {
            cleanup.run();
        }
    }

    /**
     * Lấy danh sách lịch sử nhật ký kiểm toán ký điện tử của 1 hợp đồng.
     */
    @Override
    public List<SigningHistoryResponse> getSigningHistory(Long id) {
        log.info("Getting signing history for contract: {}", id);
        List<AuditLogEntity> logs = auditLogRepository.findByEntityTypeAndEntityIdOrderByOccurredAtDesc("EmployeeContract", id);
        if (logs.isEmpty()) {
            logs = auditLogRepository.findByEntityTypeAndEntityIdOrderByOccurredAtDesc("EMPLOYEE_CONTRACT", id);
        }

        return logs.stream()
                .filter(l -> l.getAction() != null && l.getAction().startsWith("CONTRACT_SIGNED"))
                .map(l -> SigningHistoryResponse.builder()
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
    public ContractDashboardStatsResponse getDashboardStats() {
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
            long days = ChronoUnit.DAYS.between(today, end);
            return days >= 0 && days <= 30;
        }).count();

        long probationExpiringContracts = allContracts.stream().filter(c -> {
            if (c.getContractTypeEnum() != ContractTypeEnum.PROBATION) return false;
            if (c.getStatus() != BaseStatusEnum.ACTIVE) return false;
            LocalDate end = c.getEndDate();
            if (end == null) return false;
            long days = ChronoUnit.DAYS.between(today, end);
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

        return ContractDashboardStatsResponse.builder()
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

        if (hasManagementRole(roles)) {
            return (root, query, cb) -> cb.conjunction();
        }

        Specification<EmployeeContractEntity> spec = (root, query, cb) -> cb.disjunction();
        spec = spec.or((root, query, cb) -> cb.equal(root.get("employee").get("userId"), currentUserId));
        return spec;
    }

    /** Phát sự kiện upsert RAG bằng chính Snowflake ID của hợp đồng. */
    private void publishKnowledgeUpsert(Long contractId) {
        applicationEventPublisher.publishEvent(new ContractKnowledgeChangedEvent(
                contractId, ContractKnowledgeChangedEvent.Operation.UPSERT));
    }

    /** Phát sự kiện xóa nguồn RAG sau khi hợp đồng bị xóa khỏi MySQL. */
    private void publishKnowledgeDelete(Long contractId) {
        applicationEventPublisher.publishEvent(new ContractKnowledgeChangedEvent(
                contractId, ContractKnowledgeChangedEvent.Operation.DELETE));
    }
}
