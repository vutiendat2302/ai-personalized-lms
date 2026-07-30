package com.ailms.service.imp;
import com.ailms.service.IAuditLogService;


import com.ailms.common.converter.SimpleJsonWriter;
import com.ailms.entity.AuditLogEntity;
import com.ailms.exception.ResourceNotFoundException;
import com.ailms.mapper.AuditLogMapper;
import com.ailms.repository.AuditLogRepository;
import com.ailms.repository.UserRepository;
import com.ailms.repository.specification.AuditLogSpecification;
import com.ailms.request.AuditLogSearchRequest;
import com.ailms.response.AuditLogResponse;
import com.ailms.security.CustomUserDetails;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import com.ailms.response.PageResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.request.RequestContextHolder;
import java.time.LocalDateTime;
import java.util.List;
import java.util.function.Function;
import com.ailms.common.util.CsvBuilder;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuditLogService implements IAuditLogService{

    private final AuditLogRepository auditLogRepository;
    private final UserRepository userRepository;
    private final HttpServletRequest request;
    private final AuditLogMapper auditLogMapper;


    // Tạo transaction mới độc lập để đảm bảo Audit Log vẫn được lưu
    // ngay cả khi transaction nghiệp vụ chính bị rollback.
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    @Override
    public void log(String action, String entityType, Long entityId, Object oldValue, Object newValue) {
        Long actorId = getCurrentUserIdFromSecurityContext();
        try {
            AuditLogEntity auditLog = new AuditLogEntity();
            auditLog.setAction(action);
            auditLog.setEntityType(entityType);
            auditLog.setEntityId(entityId);
            auditLog.setOccurredAt(LocalDateTime.now());

            if (actorId != null) {
                userRepository.findById(actorId).ifPresent(auditLog::setUser);
            }

            enrichRequestMetadata(auditLog);
            serializeChanges(auditLog, oldValue, newValue);

            auditLogRepository.save(auditLog);
        } catch (Exception e) {
            log.error("Failed to save audit log: {}", e.getMessage(), e);
        }
    }

    private Long getCurrentUserIdFromSecurityContext() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof CustomUserDetails userDetails) {
            return userDetails.getUser().getId();
        }
        return null;
    }

    /**
     * Thu thập metadata từ HTTP request.
     */
    private void enrichRequestMetadata(AuditLogEntity auditLog) {
        if (RequestContextHolder.getRequestAttributes() == null) {
            return;
        }
        String ip = request.getHeader("X-Forwarded-For");
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getRemoteAddr();
        }
        auditLog.setIpAddress(ip);
        auditLog.setUserAgent(request.getHeader("User-Agent"));
    }

    /**
     * Chuyển đổi dữ liệu trước và sau thay đổi thành JSON
     * để lưu vào Audit Log.
     */
    private void serializeChanges(AuditLogEntity auditLog, Object oldValue, Object newValue) {
        if (oldValue != null) {
            auditLog.setOldValue(safeWriteValueAsString(oldValue));
        }
        if (newValue != null) {
            auditLog.setNewValue(safeWriteValueAsString(newValue));
        }
    }

    /**
     * Chuyển đổi đối tượng thành chuỗi JSON an toàn.
     *
     * @param value Đối tượng cần serialize
     * @return Chuỗi JSON hoặc null nếu xảy ra lỗi.
     */
    private String safeWriteValueAsString(Object value) {
        try {
            return SimpleJsonWriter.toJson(value);
        } catch (Exception e) {
            log.warn("Failed to serialize audit log value: {}", e.getMessage());
            return null;
        }
    }

    @Transactional(readOnly = true)
    @Override
    public AuditLogResponse getByLogId(Long id) {
        AuditLogEntity entity = auditLogRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of("AuditLog", id));
        return auditLogMapper.toResponse(entity);
    }

    @Transactional(readOnly = true)
    @Override
    public PageResponse<AuditLogResponse> getAuditLogs(AuditLogSearchRequest request) {
        Specification<AuditLogEntity> spec = AuditLogSpecification.filterAndSearch(request);
        Page<AuditLogEntity> page = auditLogRepository.findAll(spec, request.toPageable());
        return PageResponse.from(page.map(auditLogMapper::toResponse));
    }

    @Override
    public List<AuditLogResponse> getAllAuditLogs() {
        return auditLogRepository.findAll().stream().map(auditLogMapper::toResponse).toList();
    }

    @Transactional(readOnly = true)
    @Override
    public PageResponse<AuditLogResponse> getAuditLogsByUserId(Long userId, AuditLogSearchRequest request) {
        if (!userRepository.existsById(userId)) {
            throw ResourceNotFoundException.of("User", userId);
        }
        if (request == null) {
            request = new AuditLogSearchRequest();
        }
        request.setUserId(userId);
        return getAuditLogs(request);
    }

    @Transactional(readOnly = true)
    @Override
    public PageResponse<AuditLogResponse> getAuditLogsByEntity(String entityType, Long entityId, AuditLogSearchRequest request) {
        if (request == null) {
            request = new AuditLogSearchRequest();
        }
        request.setEntityType(entityType);
        request.setEntityId(entityId);
        return getAuditLogs(request);
    }

    @Transactional(readOnly = true)
    @Override
    public byte[] exportAuditLogs(AuditLogSearchRequest request) {
        log.info("Xuất file danh sách audit log qua CsvBuilder");
        if (request != null) {
            request.setSize(100000); // Giới hạn tối đa 100k bản ghi khi xuất báo cáo
        }
        List<AuditLogResponse> logs = getAuditLogs(request).getContent();

        List<String> headers = List.of(
                "ID", "Thời gian", "Tài khoản tác động", "Email", "Hành động",
                "Thực thể", "ID Thực thể", "Địa chỉ IP", "User Agent", "Giá trị cũ", "Giá trị mới"
        );

        List<Function<AuditLogResponse, Object>> extractors = List.of(
                AuditLogResponse::getId,
                l -> l.getOccurredAt() != null ? l.getOccurredAt().toString() : "",
                l -> l.getUserFullName() != null ? l.getUserFullName() : "N/A",
                l -> l.getUserEmail() != null ? l.getUserEmail() : "N/A",
                AuditLogResponse::getAction,
                AuditLogResponse::getEntityType,
                AuditLogResponse::getEntityId,
                AuditLogResponse::getIpAddress,
                AuditLogResponse::getUserAgent,
                l -> l.getOldValue() != null ? l.getOldValue() : "",
                l -> l.getNewValue() != null ? l.getNewValue() : ""
        );

        return CsvBuilder.create()
                .tableFromList(headers, logs, extractors, "Không có dữ liệu nhật ký")
                .build();
    }

    @Transactional(readOnly = true)
    @Override
    public byte[] exportSingleAuditLogToCsv(Long id) {
        log.info("Xuất file CSV chi tiết cho audit log ID: {}", id);
        AuditLogEntity entity = auditLogRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of("AuditLog", id));
        AuditLogResponse logResponse = auditLogMapper.toResponse(entity);

        List<String> headers = List.of(
                "ID", "Thời gian", "Tài khoản tác động", "Email", "Hành động",
                "Thực thể", "ID Thực thể", "Địa chỉ IP", "User Agent", "Giá trị cũ", "Giá trị mới"
        );

        List<java.util.function.Function<AuditLogResponse, Object>> extractors = List.of(
                AuditLogResponse::getId,
                l -> l.getOccurredAt() != null ? l.getOccurredAt().toString() : "",
                l -> l.getUserFullName() != null ? l.getUserFullName() : "N/A",
                l -> l.getUserEmail() != null ? l.getUserEmail() : "N/A",
                AuditLogResponse::getAction,
                AuditLogResponse::getEntityType,
                AuditLogResponse::getEntityId,
                AuditLogResponse::getIpAddress,
                AuditLogResponse::getUserAgent,
                l -> l.getOldValue() != null ? l.getOldValue() : "",
                l -> l.getNewValue() != null ? l.getNewValue() : ""
        );

        return CsvBuilder.create()
                .tableFromList(headers, List.of(logResponse), extractors, "Không có dữ liệu nhật ký")
                .build();
    }

    @Transactional
    @Override
    public void deleteAuditLog(Long id) {
        log.info("Deleting audit log ID: {}", id);
        if (!auditLogRepository.existsById(id)) {
            throw ResourceNotFoundException.of("AuditLog", id);
        }
        auditLogRepository.deleteById(id);
    }

    @Transactional
    @Override
    public void bulkDeleteAuditLogs(List<Long> ids) {
        log.info("Bulk deleting audit logs: {}", ids);
        if (ids != null) {
            auditLogRepository.deleteAllById(ids);
        }
    }
}
