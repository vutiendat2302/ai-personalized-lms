package com.ailms.service.imp;

import com.ailms.common.converter.SimpleJsonWriter;
import com.ailms.entity.ClassOnlineEntity;
import com.ailms.entity.EmployeeEntity;
import com.ailms.entity.TeachingRateEntity;
import com.ailms.entity.TeachingSessionPaymentEntity;
import com.ailms.entity.enums.*;
import com.ailms.event.AuditLogEvent;
import com.ailms.exception.BusinessException;
import com.ailms.exception.ResourceNotFoundException;
import com.ailms.mapper.TeachingSessionPaymentMapper;
import com.ailms.repository.ClassOnlineRepository;
import com.ailms.repository.EmployeeRepository;
import com.ailms.repository.TeachingRateRepository;
import com.ailms.repository.TeachingSessionPaymentRepository;
import com.ailms.repository.specification.TeachingSessionPaymentSpecification;
import com.ailms.request.CreateTeachingSessionPaymentRequest;
import com.ailms.request.TeachingSessionPaymentSearchRequest;
import com.ailms.request.UpdateTeachingSessionPaymentRequest;
import com.ailms.response.PageResponse;
import com.ailms.response.TeachingSessionPaymentResponse;
import com.ailms.security.CustomUserDetails;
import com.ailms.service.IApprovalRequestService;
import com.ailms.service.ITeachingSessionPaymentService;
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

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.Comparator;
import java.util.Collections;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class TeachingSessionPaymentService implements ITeachingSessionPaymentService {

    private final TeachingSessionPaymentRepository teachingSessionPaymentRepository;
    private final EmployeeRepository employeeRepository;
    private final TeachingRateRepository teachingRateRepository;
    private final TeachingSessionPaymentMapper teachingSessionPaymentMapper;
    private final ClassOnlineRepository classOnlineRepository;
    private final IApprovalRequestService approvalRequestService;
    private final ApplicationEventPublisher applicationEventPublisher;

    private static final String RESOURCE_NAME = "TeachingSessionPayment";

    @Override
    public List<TeachingSessionPaymentResponse> getAll() {
        log.info("Getting all session payments");
        return teachingSessionPaymentMapper.toResponseList(teachingSessionPaymentRepository.findAll());
    }

    @Override
    public TeachingSessionPaymentResponse getById(Long id) {
        log.info("Getting session payment by id: {}", id);
        TeachingSessionPaymentEntity entity = teachingSessionPaymentRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of(RESOURCE_NAME, id));
        verifyPaymentAccess(entity);
        return teachingSessionPaymentMapper.toResponse(entity);
    }

    @Override
    public List<TeachingSessionPaymentResponse> getByEmployeeId(Long employeeId) {
        log.info("Getting session payments for employee: {}", employeeId);
        verifyEmployeeAccess(employeeId);
        return teachingSessionPaymentMapper.toResponseList(teachingSessionPaymentRepository.findByEmployee_UserId(employeeId));
    }

    @Transactional
    @Override
    public TeachingSessionPaymentResponse create(CreateTeachingSessionPaymentRequest request) {
        return createDraftForSession(request.getClassOnlineId(), request.getEmployeeId(), request.getActualDurationMin());
    }

    @Transactional
    @Override
    public TeachingSessionPaymentResponse createDraftForSession(Long classOnlineId, Long employeeId, int durationMin) {
        log.info("Creating draft session payment for employee: {} and class online: {}", employeeId, classOnlineId);

        EmployeeEntity employee = employeeRepository.findById(employeeId)
                .orElseThrow(() -> ResourceNotFoundException.of("Employee", employeeId));

        if (employee.getUserEntity().getStatus() == UserStatusEnum.DELETED) {
            throw new BusinessException("Employee is deleted. Cannot create payment.");
        }

        ClassOnlineEntity classOnline = classOnlineRepository.findById(classOnlineId)
                .orElseThrow(() -> ResourceNotFoundException.of("ClassOnline", classOnlineId));

        if (!Boolean.TRUE.equals(classOnline.getPayable())
                || classOnline.getSessionKind() == SessionKindEnum.TRIAL) {
            throw new BusinessException("Buổi học thử 1-1 không được tính lương.");
        }

        if (teachingSessionPaymentRepository.findByClassOnlineIdAndEmployee_UserId(classOnlineId, employeeId).isPresent()) {
            throw new BusinessException("Payment already exists for this employee and online class session.");
        }

        // Resolve teaching rate active at the time of session
        List<TeachingRateEntity> activeRates = teachingRateRepository.findByEmployeeEntity_UserId(employeeId).stream()
                .filter(r -> r.getClassEntity() != null && r.getClassEntity().getId().equals(classOnline.getClassEntity().getId()))
                .filter(r -> r.getStatus() == BaseStatusEnum.ACTIVE)
                .filter(r -> !r.getEffectiveFrom().isAfter(classOnline.getScheduledAt()))
                .filter(r -> r.getEffectiveTo() == null || !r.getEffectiveTo().isBefore(classOnline.getScheduledAt()))
                .toList();

        if (activeRates.isEmpty()) {
            throw new BusinessException("Chưa có đơn giá áp dụng cho giáo viên này tại thời điểm buổi dạy");
        }

        TeachingRateEntity rate = activeRates.stream()
                .max(Comparator.comparing(TeachingRateEntity::getEffectiveFrom))
                .get();

        int actualDurationMin = classOnline.getDurationMin() != null ? classOnline.getDurationMin() : durationMin;
        BigDecimal amount = rate.getRate().multiply(BigDecimal.valueOf(actualDurationMin))
                .divide(BigDecimal.valueOf(60), 2, RoundingMode.HALF_UP);

        TeachingSessionPaymentEntity entity = TeachingSessionPaymentEntity.builder()
                .employee(employee)
                .teachingRate(rate)
                .classOnline(classOnline)
                .rateApplied(rate.getRate())
                .actualDurationMin(actualDurationMin)
                .amount(amount)
                .status(SessionPaymentStatusEnum.DRAFT)
                .description("Buổi dạy tạo tự động dạng DRAFT")
                .build();

        TeachingSessionPaymentEntity saved = teachingSessionPaymentRepository.save(entity);
        applicationEventPublisher.publishEvent(new AuditLogEvent(this, "CREATE", "TEACHING_SESSION_PAYMENT", entity.getId(), null, entity));
        return teachingSessionPaymentMapper.toResponse(saved);
    }

    @Transactional
    @Override
    public TeachingSessionPaymentResponse submitTaEvaluation(Long id, String evaluationNote) {
        log.info("TA submitting evaluation for session payment: {}", id);
        TeachingSessionPaymentEntity entity = teachingSessionPaymentRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of(RESOURCE_NAME, id));

        if (entity.getStatus() != SessionPaymentStatusEnum.DRAFT) {
            throw new BusinessException("Session payment must be in DRAFT status for TA evaluation.");
        }

        String existingDesc = entity.getDescription() != null ? entity.getDescription() : "";
        entity.setDescription(existingDesc + " | TA Evaluation: " + evaluationNote);
        entity.setStatus(SessionPaymentStatusEnum.PENDING);

        TeachingSessionPaymentEntity saved = teachingSessionPaymentRepository.save(entity);
        applicationEventPublisher.publishEvent(new AuditLogEvent(this, "SUBMIT_TA_EVALUATION", "TEACHING_SESSION_PAYMENT", id, null, saved));
        return teachingSessionPaymentMapper.toResponse(saved);
    }

    @Transactional
    @Override
    public TeachingSessionPaymentResponse confirmPayment(Long id) {
        log.info("Confirming session payment quality: {}", id);
        TeachingSessionPaymentEntity entity = teachingSessionPaymentRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of(RESOURCE_NAME, id));

        if (entity.getStatus() != SessionPaymentStatusEnum.PENDING) {
            throw new BusinessException("Session payment must be in PENDING status to be confirmed.");
        }

        entity.setStatus(SessionPaymentStatusEnum.CONFIRMED);
        TeachingSessionPaymentEntity saved = teachingSessionPaymentRepository.save(entity);
        applicationEventPublisher.publishEvent(new AuditLogEvent(this, "CONFIRM", "TEACHING_SESSION_PAYMENT", id, null, saved));
        return teachingSessionPaymentMapper.toResponse(saved);
    }

    @Transactional
    @Override
    public TeachingSessionPaymentResponse update(Long id, UpdateTeachingSessionPaymentRequest request) {
        log.info("Updating session payment: {}", id);

        if (approvalRequestService.isLocked("TEACHING_PAYMENT", id)) {
            throw new BusinessException("Yêu cầu thanh toán buổi dạy đang trong quá trình phê duyệt, không thể chỉnh sửa.");
        }

        TeachingSessionPaymentEntity existing = teachingSessionPaymentRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of(RESOURCE_NAME, id));
        String oldValue = SimpleJsonWriter.toJson(existing);

        if (existing.getStatus() != SessionPaymentStatusEnum.PENDING && existing.getStatus() != SessionPaymentStatusEnum.DRAFT) {
            throw new BusinessException("Only DRAFT or PENDING payments can be updated.");
        }

        if (request.getClassOnlineId() != null && !request.getClassOnlineId().equals(existing.getClassOnline().getId())) {
            throw new BusinessException("Cannot change classOnlineId. Please create a new payment instead.");
        }

        if (request.getEmployeeId() != null && !request.getEmployeeId().equals(existing.getEmployee().getUserId())) {
            EmployeeEntity newEmployee = employeeRepository.findById(request.getEmployeeId())
                    .orElseThrow(() -> ResourceNotFoundException.of("Employee", request.getEmployeeId()));
            if (newEmployee.getUserEntity().getStatus() == UserStatusEnum.DELETED) {
                throw new BusinessException("New employee is deleted. Cannot update payment.");
            }
            existing.setEmployee(newEmployee);

            List<TeachingRateEntity> activeRates = teachingRateRepository.findByEmployeeEntity_UserId(newEmployee.getUserId()).stream()
                    .filter(r -> r.getClassEntity() != null && r.getClassEntity().getId().equals(existing.getClassOnline().getClassEntity().getId()))
                    .filter(r -> r.getStatus() == BaseStatusEnum.ACTIVE)
                    .filter(r -> !r.getEffectiveFrom().isAfter(existing.getClassOnline().getScheduledAt()))
                    .filter(r -> r.getEffectiveTo() == null || !r.getEffectiveTo().isBefore(existing.getClassOnline().getScheduledAt()))
                    .toList();

            if (activeRates.isEmpty()) {
                throw new BusinessException("Chưa có đơn giá áp dụng cho giáo viên mới tại thời điểm buổi dạy");
            }

            TeachingRateEntity rate = activeRates.stream()
                    .max(Comparator.comparing(TeachingRateEntity::getEffectiveFrom))
                    .get();

            existing.setTeachingRate(rate);
            existing.setRateApplied(rate.getRate());
        }

        if (request.getRateId() != null && (existing.getTeachingRate() == null || !request.getRateId().equals(existing.getTeachingRate().getId()))) {
            TeachingRateEntity rate = teachingRateRepository.findById(request.getRateId())
                    .orElseThrow(() -> ResourceNotFoundException.of("TeachingRate", request.getRateId()));
            existing.setTeachingRate(rate);
            existing.setRateApplied(rate.getRate());
        }

        teachingSessionPaymentMapper.updateFromRequest(request, existing);

        int duration = existing.getActualDurationMin();
        BigDecimal amount = existing.getRateApplied().multiply(BigDecimal.valueOf(duration))
                .divide(BigDecimal.valueOf(60), 2, RoundingMode.HALF_UP);
        existing.setAmount(amount);

        TeachingSessionPaymentEntity updated = teachingSessionPaymentRepository.save(existing);
        applicationEventPublisher.publishEvent(new AuditLogEvent(this, "UPDATE", "TEACHING_SESSION_PAYMENT", id, oldValue, updated));
        return teachingSessionPaymentMapper.toResponse(updated);
    }

    @Transactional
    @Override
    public void delete(Long id) {
        log.info("Deleting (cancelling) session payment: {}", id);

        if (approvalRequestService.isLocked("TEACHING_PAYMENT", id)) {
            throw new BusinessException("Yêu cầu thanh toán buổi dạy đang trong quá trình phê duyệt, không thể xóa.");
        }

        TeachingSessionPaymentEntity existing = teachingSessionPaymentRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of(RESOURCE_NAME, id));
        String oldValue = SimpleJsonWriter.toJson(existing);

        existing.setStatus(SessionPaymentStatusEnum.CANCELLED);
        applicationEventPublisher.publishEvent(new AuditLogEvent(this, "DELETE", "TEACHING_SESSION_PAYMENT", id, oldValue, null));
        teachingSessionPaymentRepository.save(existing);
    }

    @Override
    public PageResponse<TeachingSessionPaymentResponse> search(TeachingSessionPaymentSearchRequest request) {
        log.info("Searching TeachingSessionPayment via specification");
        Specification<TeachingSessionPaymentEntity> spec = TeachingSessionPaymentSpecification.filterAndSearch(request);
        spec = spec.and(getPaymentSecuritySpecification());
        Pageable pageable = request.toPageable();
        Page<TeachingSessionPaymentEntity> page = teachingSessionPaymentRepository.findAll(spec, pageable);
        return PageResponse.from(page.map(teachingSessionPaymentMapper::toResponse));
    }

    private Long getCurrentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated() && auth.getPrincipal() instanceof CustomUserDetails userDetails) {
            return userDetails.getUser().getId();
        }
        throw new BusinessException("User is not authenticated");
    }

    private List<String> getCurrentUserRoles() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            return Collections.emptyList();
        }
        return auth.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .toList();
    }

    private void verifyEmployeeAccess(Long employeeId) {
        Long currentUserId = getCurrentUserId();
        List<String> roles = getCurrentUserRoles();

        if (roles.contains("ROLE_ADMIN") || roles.contains("ROLE_HR")) {
            return;
        }

        if (currentUserId.equals(employeeId)) {
            return;
        }

        throw new BusinessException("Access denied to requested employee data");
    }

    private void verifyPaymentAccess(TeachingSessionPaymentEntity payment) {
        verifyEmployeeAccess(payment.getEmployee().getUserId());
    }

    private Specification<TeachingSessionPaymentEntity> getPaymentSecuritySpecification() {
        Long currentUserId = getCurrentUserId();
        List<String> roles = getCurrentUserRoles();

        if (roles.contains("ROLE_ADMIN") || roles.contains("ROLE_HR")) {
            return (root, query, cb) -> cb.conjunction();
        }

        Specification<TeachingSessionPaymentEntity> spec = (root, query, cb) -> cb.disjunction();
        spec = spec.or((root, query, cb) -> cb.equal(root.get("employee").get("userId"), currentUserId));

        return spec;
    }
}
