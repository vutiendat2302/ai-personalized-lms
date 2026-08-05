package com.ailms.service.imp;
import com.ailms.repository.specification.ClassOnlineSpecification;
import com.ailms.request.ClassOnlineSearchRequest;
import com.ailms.request.UpdateClassOnlineRequest;
import com.ailms.service.IClassOnlineService;


import com.ailms.entity.ClassEntity;
import com.ailms.entity.ClassOnlineEntity;
import com.ailms.entity.TeachingRateEntity;
import com.ailms.entity.TeachingSessionPaymentEntity;
import com.ailms.entity.UserEntity;
import com.ailms.entity.enums.BaseStatusEnum;
import com.ailms.exception.BusinessException;
import com.ailms.exception.ResourceNotFoundException;
import com.ailms.mapper.ClassOnlineMapper;
import com.ailms.repository.ClassOnlineRepository;
import com.ailms.repository.ClassRepository;
import com.ailms.repository.TeachingRateRepository;
import com.ailms.repository.TeachingSessionPaymentRepository;
import com.ailms.repository.UserRepository;
import com.ailms.request.CreateClassOnlineRequest;
import com.ailms.response.ClassOnlineResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import com.ailms.response.PageResponse;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Comparator;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class ClassOnlineService implements IClassOnlineService {

    private static final String DEFAULT_MEETING_PROVIDER = "GOOGLE_MEET";
    private static final String DEFAULT_GOOGLE_MEET_URL = "https://meet.google.com/new";

    private final ClassOnlineRepository classOnlineRepository;
    private final ClassRepository classRepository;
    private final UserRepository userRepository;
    private final ClassOnlineMapper classOnlineMapper;
    private final TeachingRateRepository teachingRateRepository;
    private final TeachingSessionPaymentRepository teachingSessionPaymentRepository;

    private static final String RESOURCE_NAME = "ClassOnline";

    public List<ClassOnlineResponse> getAll() {
        log.info("Getting all online classes");
        return enrichResponses(classOnlineRepository.findAll());
    }

    public ClassOnlineResponse getById(Long id) {
        log.info("Getting online class by id: {}", id);
        ClassOnlineEntity entity = classOnlineRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of(RESOURCE_NAME, id));
        return enrichResponse(entity);
    }

    public List<ClassOnlineResponse> getByClassId(Long classId) {
        log.info("Getting online classes by class id: {}", classId);
        return enrichResponses(classOnlineRepository.findByClassEntity_Id(classId));
    }

    public List<ClassOnlineResponse> getByTeacherId(Long teacherId) {
        log.info("Getting online classes by teacher id: {}", teacherId);
        return enrichResponses(classOnlineRepository.findByTeacherEntity_Id(teacherId));
    }

    @Transactional
    public ClassOnlineResponse create(CreateClassOnlineRequest request) {
        log.info("Creating online class for class: {}", request.getClassId());
        ClassOnlineEntity entity = classOnlineMapper.toEntity(request);
        applyRelations(entity, request);
        applyMeetingDefaults(entity);

        ClassOnlineEntity saved = classOnlineRepository.save(entity);
        return enrichResponse(saved);
    }

    @Transactional
    public ClassOnlineResponse update(Long id, UpdateClassOnlineRequest request) {
        log.info("Updating online class: {}", id);
        ClassOnlineEntity existing = classOnlineRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of(RESOURCE_NAME, id));

        classOnlineMapper.updateFromRequest(request, existing);
        applyStatus(existing, request.getStatus());
        applyMeetingDefaults(existing);

        ClassOnlineEntity updated = classOnlineRepository.save(existing);
        return enrichResponse(updated);
    }

    @Transactional
    public void delete(Long id) {
        log.info("Deleting online class: {}", id);
        if (!classOnlineRepository.existsById(id)) {
            throw ResourceNotFoundException.of(RESOURCE_NAME, id);
        }
        classOnlineRepository.deleteById(id);
    }

    private void applyRelations(ClassOnlineEntity entity, CreateClassOnlineRequest request) {
        ClassEntity classEntity = classRepository.findById(request.getClassId())
                .orElseThrow(() -> ResourceNotFoundException.of("Class", request.getClassId()));
        UserEntity teacher = userRepository.findById(request.getTeacherId())
                .orElseThrow(() -> ResourceNotFoundException.of("User", request.getTeacherId()));

        entity.setClassEntity(classEntity);
        entity.setTeacherEntity(teacher);
    }

    @Override
    public PageResponse<ClassOnlineResponse> search(ClassOnlineSearchRequest request) {
        log.info("Searching ClassOnline via specification");
        validateSearchRange(request);
        Specification<ClassOnlineEntity> spec = ClassOnlineSpecification.filterAndSearch(request);
        Pageable pageable = request.toPageable();
        if (hasLifecycleFilter(request)) {
            List<ClassOnlineEntity> filtered = filterByLifecycle(
                    classOnlineRepository.findAll(spec, pageable.getSort()),
                    request.getLifecycleStatus());
            int start = Math.min(pageable.getPageNumber() * pageable.getPageSize(), filtered.size());
            int end = Math.min(start + pageable.getPageSize(), filtered.size());
            List<ClassOnlineResponse> content = enrichResponses(filtered.subList(start, end));
            int totalPages = (int) Math.ceil((double) filtered.size() / pageable.getPageSize());
            return PageResponse.<ClassOnlineResponse>builder()
                    .content(content)
                    .pageNumber(pageable.getPageNumber())
                    .pageSize(pageable.getPageSize())
                    .totalElements(filtered.size())
                    .totalPages(totalPages)
                    .first(pageable.getPageNumber() == 0)
                    .last(pageable.getPageNumber() >= totalPages - 1)
                    .build();
        }
        Page<ClassOnlineEntity> page = classOnlineRepository.findAll(spec, pageable);
        return PageResponse.from(page.map(this::enrichResponse));
    }

    @Override
    public PageResponse<ClassOnlineResponse> getSessionsPage(Long classId, String keyword, String status, int page, int size, String sortDirection) {
        List<ClassOnlineEntity> allSessions = classOnlineRepository.findByClassEntity_Id(classId);

        LocalDateTime now = LocalDateTime.now();

        List<ClassOnlineEntity> filtered = allSessions.stream().filter(s -> {
            if (status != null && !status.isBlank()) {
                String reqStatus = status.toUpperCase();
                String sessionStatus = s.getStatus() != null ? s.getStatus().name() : "";
                boolean isCancelled = "DELETED".equalsIgnoreCase(sessionStatus)
                        || "DELETE".equalsIgnoreCase(sessionStatus)
                        || "CANCELLED".equalsIgnoreCase(sessionStatus);
                if ("COMPLETED".equals(reqStatus)) {
                    boolean isCompleted = !isCancelled
                            && ((s.getScheduledAt() != null && s.getScheduledAt().isBefore(now))
                            || "INACTIVE".equalsIgnoreCase(sessionStatus));
                    if (!isCompleted) return false;
                } else if ("UPCOMING".equals(reqStatus)) {
                    boolean isUpcoming = (s.getScheduledAt() != null && !s.getScheduledAt().isBefore(now))
                            && (s.getStatus() == null || "ACTIVE".equalsIgnoreCase(sessionStatus));
                    if (!isUpcoming) return false;
                } else if ("CANCELLED".equals(reqStatus)) {
                    if (!isCancelled) return false;
                }
            }
            if (keyword != null && !keyword.isBlank()) {
                String kw = keyword.toLowerCase();
                String title = s.getTitle() != null ? s.getTitle().toLowerCase() : "";
                String dateStr = s.getScheduledAt() != null ? s.getScheduledAt().toString() : "";
                return title.contains(kw) || dateStr.contains(kw);
            }
            return true;
        }).collect(Collectors.toList());

        // Sort by scheduledAt
        filtered.sort((a, b) -> {
            if (a.getScheduledAt() == null || b.getScheduledAt() == null) return 0;
            if ("ASC".equalsIgnoreCase(sortDirection)) {
                return a.getScheduledAt().compareTo(b.getScheduledAt());
            } else {
                return b.getScheduledAt().compareTo(a.getScheduledAt());
            }
        });

        int start = Math.min(page * size, filtered.size());
        int end = Math.min(start + size, filtered.size());
        List<ClassOnlineResponse> pageContent = enrichResponses(filtered.subList(start, end));

        int totalPages = (int) Math.ceil((double) filtered.size() / size);

        return PageResponse.<ClassOnlineResponse>builder()
                .content(pageContent)
                .pageNumber(page)
                .pageSize(size)
                .totalElements((long) filtered.size())
                .totalPages(totalPages)
                .first(page == 0)
                .last(page >= totalPages - 1)
                .build();
    }

    private void applyMeetingDefaults(ClassOnlineEntity entity) {
        if (entity.getMeetingProvider() == null || entity.getMeetingProvider().isBlank()) {
            entity.setMeetingProvider(DEFAULT_MEETING_PROVIDER);
        }
        if (entity.getMeetingUrl() == null || entity.getMeetingUrl().isBlank()) {
            entity.setMeetingUrl(DEFAULT_GOOGLE_MEET_URL);
        }
    }

    private void applyStatus(ClassOnlineEntity entity, String status) {
        if (status == null || status.isBlank()) {
            return;
        }
        String normalized = status.trim().toUpperCase();
        if ("CANCELLED".equals(normalized) || "INACTIVE".equals(normalized) || "DELETE".equals(normalized) || "DELETED".equals(normalized)) {
            entity.setStatus(BaseStatusEnum.INACTIVE);
            return;
        }
        entity.setStatus(BaseStatusEnum.ACTIVE);
    }

    private List<ClassOnlineResponse> enrichResponses(List<ClassOnlineEntity> sessions) {
        return sessions.stream().map(this::enrichResponse).toList();
    }

    private ClassOnlineResponse enrichResponse(ClassOnlineEntity entity) {
        ClassOnlineResponse response = classOnlineMapper.toResponse(entity);
        response.setLifecycleStatus(resolveLifecycleStatus(entity));

        findDisplayPayment(entity.getId()).ifPresentOrElse(payment -> {
            response.setTeachingRatePerHour(payment.getRateApplied());
            response.setActualDurationMin(payment.getActualDurationMin());
            response.setRemuneration(payment.getAmount());
            response.setPaymentStatus(payment.getStatus() != null ? payment.getStatus().name() : null);
            if ((response.getTeacherNotes() == null || response.getTeacherNotes().isBlank()) && payment.getDescription() != null) {
                response.setTeacherNotes(payment.getDescription());
            }
        }, () -> applyCalculatedRemuneration(entity, response));

        return response;
    }

    private void applyCalculatedRemuneration(ClassOnlineEntity entity, ClassOnlineResponse response) {
        if (entity.getTeacherEntity() == null || entity.getClassEntity() == null || entity.getScheduledAt() == null) {
            return;
        }

        teachingRateRepository.findByEmployeeEntity_UserId(entity.getTeacherEntity().getId()).stream()
                .filter(rate -> rate.getClassEntity() != null && rate.getClassEntity().getId().equals(entity.getClassEntity().getId()))
                .filter(rate -> rate.getStatus() == BaseStatusEnum.ACTIVE)
                .filter(rate -> rate.getEffectiveFrom() == null || !rate.getEffectiveFrom().isAfter(entity.getScheduledAt()))
                .filter(rate -> rate.getEffectiveTo() == null || !rate.getEffectiveTo().isBefore(entity.getScheduledAt()))
                .max(Comparator.comparing(rate -> rate.getEffectiveFrom() != null ? rate.getEffectiveFrom() : LocalDateTime.MIN))
                .ifPresent(rate -> {
                    int durationMin = entity.getDurationMin() != null ? entity.getDurationMin() : 0;
                    response.setTeachingRatePerHour(rate.getRate());
                    response.setActualDurationMin(durationMin);
                    response.setRemuneration(calculateAmount(rate, durationMin));
                });
    }

    private BigDecimal calculateAmount(TeachingRateEntity rate, int durationMin) {
        if (rate.getRate() == null || durationMin <= 0) {
            return BigDecimal.ZERO;
        }
        return rate.getRate()
                .multiply(BigDecimal.valueOf(durationMin))
                .divide(BigDecimal.valueOf(60), 2, RoundingMode.HALF_UP);
    }

    private String resolveLifecycleStatus(ClassOnlineEntity entity) {
        BaseStatusEnum status = entity.getStatus();
        if (status == BaseStatusEnum.INACTIVE || status == BaseStatusEnum.DELETE || status == BaseStatusEnum.DELETED) {
            return "CANCELLED";
        }

        LocalDateTime scheduledAt = entity.getScheduledAt();
        if (scheduledAt == null) {
            return "UPCOMING";
        }

        int durationMin = entity.getDurationMin() != null ? entity.getDurationMin() : 60;
        LocalDateTime endAt = scheduledAt.plusMinutes(Math.max(durationMin, 1));
        LocalDateTime now = LocalDateTime.now();
        if (!now.isBefore(scheduledAt) && now.isBefore(endAt)) {
            return "IN_PROGRESS";
        }
        if (!now.isBefore(endAt)) {
            return "COMPLETED";
        }
        return "UPCOMING";
    }

    private List<ClassOnlineEntity> filterByLifecycle(List<ClassOnlineEntity> sessions, String lifecycleStatus) {
        if (lifecycleStatus == null || lifecycleStatus.isBlank()) {
            return sessions;
        }
        String normalized = lifecycleStatus.trim().toUpperCase();
        String targetLifecycleStatus = "ACTIVE".equals(normalized) ? "UPCOMING" : normalized;
        return sessions.stream()
                .filter(session -> targetLifecycleStatus.equals(resolveLifecycleStatus(session)))
                .toList();
    }

    private boolean hasLifecycleFilter(ClassOnlineSearchRequest request) {
        return request.getLifecycleStatus() != null && !request.getLifecycleStatus().isBlank();
    }

    private Optional<TeachingSessionPaymentEntity> findDisplayPayment(Long classOnlineId) {
        return teachingSessionPaymentRepository.findByClassOnlineIdOrderByUpdatedAtDescCreatedAtDescIdDesc(classOnlineId)
                .stream()
                .findFirst();
    }

    private void validateSearchRange(ClassOnlineSearchRequest request) {
        if (request.getScheduledFrom() != null
                && request.getScheduledTo() != null
                && request.getScheduledFrom().isAfter(request.getScheduledTo())) {
            throw new BusinessException("scheduledFrom must be before or equal to scheduledTo.");
        }
        if (request.getCreatedFrom() != null
                && request.getCreatedTo() != null
                && request.getCreatedFrom().isAfter(request.getCreatedTo())) {
            throw new BusinessException("createdFrom must be before or equal to createdTo.");
        }
    }
}
