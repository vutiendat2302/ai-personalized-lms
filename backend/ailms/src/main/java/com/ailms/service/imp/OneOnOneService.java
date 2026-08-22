package com.ailms.service.imp;

import com.ailms.common.util.CodeGenerator;
import com.ailms.entity.*;
import com.ailms.entity.enums.*;
import com.ailms.event.AuditLogEvent;
import com.ailms.exception.BusinessException;
import com.ailms.exception.ForbiddenException;
import com.ailms.exception.ResourceNotFoundException;
import com.ailms.repository.*;
import com.ailms.request.*;
import com.ailms.response.OneOnOneInstructorCandidateResponse;
import com.ailms.response.OneOnOneRequestResponse;
import com.ailms.service.INotificationService;
import com.ailms.service.IOneOnOneService;
import com.ailms.service.IOrderService;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.*;

/** Triển khai state machine 1-1 với khóa pessimistic tại mọi transition tranh chấp. */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class OneOnOneService implements IOneOnOneService {

    private final OneOnOneRequestRepository requestRepository;
    private final OneOnOneRejectedInstructorRepository rejectedInstructorRepository;
    private final TeacherCategoryRepository teacherCategoryRepository;
    private final ClassRepository classRepository;
    private final ClassMemberRepository classMemberRepository;
    private final ClassOnlineRepository classOnlineRepository;
    private final UserRepository userRepository;
    private final UserRoleRepository userRoleRepository;
    private final INotificationService notificationService;
    private final IOrderService orderService;
    private final ApplicationEventPublisher eventPublisher;

    /** Lấy danh sách yêu cầu do đúng học viên sở hữu. */
    @Override
    public List<OneOnOneRequestResponse> getStudentRequests(Long studentId) {
        return requestRepository.findByStudentEntity_IdOrderByCreatedAtDesc(studentId).stream()
                .map(this::toResponse).toList();
    }

    /** Lọc yêu cầu đang mở theo danh mục chuyên môn và lịch sử bị từ chối. */
    @Override
    public List<OneOnOneRequestResponse> getSuggestions(Long instructorId) {
        Set<Long> categoryIds = teacherCategoryRepository
                .findByEmployee_UserIdAndStatus(instructorId, BaseStatusEnum.ACTIVE).stream()
                .map(item -> item.getCategory().getId())
                .collect(java.util.stream.Collectors.toSet());
        if (categoryIds.isEmpty()) return List.of();
        return requestRepository.findByStatusInOrderByCreatedAtDesc(List.of(
                        OneOnOneRequestStatusEnum.WAITING_INSTRUCTOR,
                        OneOnOneRequestStatusEnum.REMATCHING)).stream()
                .filter(item -> categoryIds.contains(getCategoryId(item)))
                .filter(item -> !rejectedInstructorRepository
                        .existsByRequestEntity_IdAndInstructorEntity_Id(item.getId(), instructorId))
                .map(this::toResponse).toList();
    }

    /** Lấy các yêu cầu đã được phân công cho đúng người dạy hiện tại. */
    @Override
    public List<OneOnOneRequestResponse> getAssignedRequests(Long instructorId) {
        return requestRepository.findByAssignedInstructorEntity_IdOrderByCreatedAtDesc(instructorId).stream()
                .filter(item -> item.getStatus() != OneOnOneRequestStatusEnum.CANCELLED
                        && item.getStatus() != OneOnOneRequestStatusEnum.REMATCHING)
                .map(this::toResponse).toList();
    }

    /** Khóa yêu cầu để chỉ một giáo viên/trợ giảng có thể nhận thành công. */
    @Override
    @Transactional
    public OneOnOneRequestResponse accept(Long instructorId, Long requestId) {
        OneOnOneRequestEntity request = getForUpdate(requestId);
        requireState(request, OneOnOneRequestStatusEnum.WAITING_INSTRUCTOR, OneOnOneRequestStatusEnum.REMATCHING);
        if (!teacherCategoryRepository.existsByEmployee_UserIdAndCategory_IdAndStatus(
                instructorId, getCategoryId(request), BaseStatusEnum.ACTIVE)) {
            throw new ForbiddenException("Bạn không thuộc danh mục chuyên môn của yêu cầu này.");
        }
        if (rejectedInstructorRepository.existsByRequestEntity_IdAndInstructorEntity_Id(requestId, instructorId)) {
            throw new ForbiddenException("Bạn không thể nhận lại yêu cầu đã bị học viên từ chối.");
        }
        UserEntity instructor = userRepository.findById(instructorId)
                .orElseThrow(() -> ResourceNotFoundException.of("Instructor", instructorId));
        request.setAssignedInstructorEntity(instructor);
        request.setStatus(OneOnOneRequestStatusEnum.INSTRUCTOR_ACCEPTED);
        request.setAcceptedAt(LocalDateTime.now());
        OneOnOneRequestEntity saved = requestRepository.save(request);
        notifyUser(request.getStudentEntity(), "Đã có người nhận yêu cầu 1-1",
                "Một giáo viên/trợ giảng phù hợp đã nhận yêu cầu học 1-1 của bạn.", requestId);
        notifyHr("Có người nhận yêu cầu 1-1", "Yêu cầu 1-1 #" + requestId + " đã có người nhận.", requestId);
        audit("ACCEPT_ONE_ON_ONE", saved);
        return toResponse(saved);
    }

    /** Tạo lớp thử và buổi TRIAL duy nhất, đồng thời kiểm tra trùng lịch hai bên. */
    @Override
    @Transactional
    public OneOnOneRequestResponse createTrialClass(
            Long instructorId, Long requestId, OneOnOneTrialClassRequest payload) {
        OneOnOneRequestEntity request = getForUpdate(requestId);
        requireAssignedInstructor(request, instructorId);
        requireState(request, OneOnOneRequestStatusEnum.CONTACTED);
        if (request.getTrialClassEntity() != null || request.getTrialSessionEntity() != null) {
            throw new BusinessException("Yêu cầu đã có lớp hoặc buổi học thử đang hoạt động.");
        }
        LocalDateTime startAt = resolveTrialStart(request, payload.getStartAt());
        LocalDateTime endAt = resolveTrialEnd(startAt, payload.getEndAt());
        if (!endAt.isAfter(startAt)) {
            throw new BusinessException("Thời gian kết thúc phải sau thời gian bắt đầu.");
        }
        checkScheduleCollision(instructorId, request.getStudentEntity().getId(), startAt, endAt);

        CourseEntity course = getPackage(request).getCourseEntity();
        ClassEntity trialClass = classRepository.save(ClassEntity.builder()
                .courseEntity(course)
                .categoryEntity(course.getCategoryEntity())
                .name(payload.getClassName())
                .code(CodeGenerator.generate("LT", classRepository::existsByCode))
                .packageType(DeliveryModeEnum.ONE_ON_ONE)
                .classKind(ClassKindEnum.ONE_ON_ONE_TRIAL)
                .maxMembers(1)
                .currentMemberCount(1)
                .status(BaseStatusEnum.TRIAL)
                .startDate(startAt)
                .endDate(endAt)
                .description(payload.getNotes())
                .registrationOpen(false)
                .allowLateEnrollment(false)
                .build());
        addTrialMember(trialClass, request.getStudentEntity(), ClassMemberRole.STUDENT);
        addTrialMember(trialClass, request.getAssignedInstructorEntity(),
                resolveInstructorRole(request.getAssignedInstructorEntity().getId()));

        int durationMin = Math.toIntExact(Duration.between(startAt, endAt).toMinutes());
        ClassOnlineEntity session = classOnlineRepository.save(ClassOnlineEntity.builder()
                .classEntity(trialClass)
                .teacherEntity(request.getAssignedInstructorEntity())
                .title("Buổi học thử - " + payload.getClassName())
                .meetingProvider(payload.getLearningMode())
                .meetingUrl(payload.getLinkOrLocation())
                .scheduledAt(startAt)
                .durationMin(durationMin)
                .status(BaseStatusEnum.ACTIVE)
                .code(CodeGenerator.generate("BT", classOnlineRepository::existsByCode))
                .teacherNotes(payload.getNotes())
                .sessionKind(SessionKindEnum.TRIAL)
                .countsTowardPackage(false)
                .payable(false)
                .build());
        request.setTrialClassEntity(trialClass);
        request.setTrialSessionEntity(session);
        request.setStatus(OneOnOneRequestStatusEnum.TRIAL_SCHEDULED);
        OneOnOneRequestEntity saved = requestRepository.save(request);
        notifyUser(request.getStudentEntity(), "Đã có lịch học thử",
                "Buổi học thử của bạn đã được lên lịch vào " + startAt + ".", requestId);
        audit("CREATE_ONE_ON_ONE_TRIAL", saved);
        return toResponse(saved);
    }

    /** Trả yêu cầu đã có buổi thử và tuyệt đối không tạo thêm buổi thứ hai. */
    @Override
    public OneOnOneRequestResponse getOrCreateTrialSession(Long instructorId, Long requestId) {
        OneOnOneRequestEntity request = requestRepository.findById(requestId)
                .orElseThrow(() -> ResourceNotFoundException.of("OneOnOneRequest", requestId));
        requireAssignedInstructor(request, instructorId);
        if (request.getTrialSessionEntity() == null) {
            throw new BusinessException("Hãy tạo lớp thử; hệ thống sẽ tạo buổi thử trong cùng transaction.");
        }
        return toResponse(request);
    }

    /** Hoàn thành đúng buổi thử và yêu cầu học viên xác nhận kết quả. */
    @Override
    @Transactional
    public OneOnOneRequestResponse reviewTrial(
            Long instructorId, Long requestId, OneOnOneTrialReviewRequest payload) {
        OneOnOneRequestEntity request = getForUpdate(requestId);
        requireAssignedInstructor(request, instructorId);
        requireState(request, OneOnOneRequestStatusEnum.TRIAL_SCHEDULED);
        ClassOnlineEntity session = request.getTrialSessionEntity();
        if (session == null) throw new BusinessException("Không tìm thấy buổi học thử.");
        LocalDateTime endsAt = session.getScheduledAt().plusMinutes(session.getDurationMin());
        LocalDateTime now = businessNow();
        if (now.isBefore(endsAt)) {
            throw new BusinessException("Chưa thể hoàn thành nhận xét trước khi buổi thử kết thúc.");
        }
        if (now.isAfter(endsAt.plusHours(24))) {
            throw new BusinessException("Đã quá hạn 24 giờ nhận xét; hệ thống sẽ tìm người dạy khác cho học viên.");
        }
        session.setStatus(BaseStatusEnum.COMPLETED);
        session.setTeacherNotes(payload.getAdditionalNotes());
        classOnlineRepository.save(session);
        request.setReviewCurrentLevel(payload.getCurrentLevel());
        request.setReviewWeakAreas(payload.getWeakAreas());
        request.setReviewAttitude(payload.getLearningAttitude());
        request.setReviewRecommendedPath(payload.getRecommendedPath());
        request.setReviewNotes(payload.getAdditionalNotes());
        request.setTrialCompletedAt(now);
        request.setStatus(OneOnOneRequestStatusEnum.TRIAL_COMPLETED);
        OneOnOneRequestEntity saved = requestRepository.save(request);
        notifyUser(request.getStudentEntity(), "Buổi học thử đã hoàn thành",
                "Vui lòng xác nhận tiếp tục học hoặc yêu cầu tìm người dạy khác.", requestId);
        audit("REVIEW_ONE_ON_ONE_TRIAL", saved);
        return toResponse(saved);
    }

    /** Chuyển lớp thử thành chính thức hoặc đóng lớp và mở lại matching tự động. */
    @Override
    @Transactional
    public OneOnOneRequestResponse submitTrialResult(
            Long studentId, Long requestId, OneOnOneTrialResultRequest payload) {
        OneOnOneRequestEntity request = getForUpdate(requestId);
        if (!request.getStudentEntity().getId().equals(studentId)) {
            throw new ForbiddenException("Bạn không sở hữu yêu cầu 1-1 này.");
        }
        requireState(request, OneOnOneRequestStatusEnum.TRIAL_COMPLETED);
        if (Boolean.TRUE.equals(payload.getContinueLearning())) {
            request.setStatus(OneOnOneRequestStatusEnum.MATCHED);
            request.getTrialClassEntity().setClassKind(ClassKindEnum.ONE_ON_ONE);
            request.getTrialClassEntity().setStatus(BaseStatusEnum.ACTIVE);
            request.getTrialClassEntity().setEndDate(null);
            classRepository.save(request.getTrialClassEntity());
            notifyUser(request.getAssignedInstructorEntity(), "Học viên đồng ý tiếp tục",
                    "Học viên đã đồng ý tiếp tục học; lớp thử đã chuyển thành lớp 1-1 chính thức.", requestId);
            notifyUser(request.getStudentEntity(), "Lớp 1-1 đã được kích hoạt",
                    "Lớp thử đã chuyển thành lớp học 1-1 chính thức.", requestId);
            notifyHr("Matching 1-1 thành công", "Yêu cầu #" + requestId + " đã chuyển thành lớp chính thức.", requestId);
        } else {
            UserEntity rejected = request.getAssignedInstructorEntity();
            if (rejected != null && !rejectedInstructorRepository
                    .existsByRequestEntity_IdAndInstructorEntity_Id(requestId, rejected.getId())) {
                rejectedInstructorRepository.save(OneOnOneRejectedInstructorEntity.builder()
                        .requestEntity(request)
                        .instructorEntity(rejected)
                        .build());
            }
            if (request.getTrialClassEntity() != null) {
                request.getTrialClassEntity().setStatus(BaseStatusEnum.INACTIVE);
                classRepository.save(request.getTrialClassEntity());
            }
            request.setStatus(OneOnOneRequestStatusEnum.REMATCHING);
            request.setAssignedInstructorEntity(null);
            request.setTrialClassEntity(null);
            request.setTrialSessionEntity(null);
            if (rejected != null) {
                notifyUser(rejected, "Học viên yêu cầu đổi người dạy",
                        "Yêu cầu 1-1 đã được mở lại để tìm người dạy khác.", requestId);
            }
            notifyHr("Học viên yêu cầu đổi người dạy",
                    "Yêu cầu #" + requestId + " đã tự động chuyển sang REMATCHING.", requestId);
        }
        OneOnOneRequestEntity saved = requestRepository.save(request);
        audit("SUBMIT_ONE_ON_ONE_TRIAL_RESULT", saved);
        return toResponse(saved);
    }

    /** HR lấy toàn bộ yêu cầu để giám sát, không biến HR thành bước phê duyệt. */
    @Override
    public List<OneOnOneRequestResponse> getHrRequests() {
        return requestRepository.findAll().stream()
                .sorted(Comparator.comparing(OneOnOneRequestEntity::getCreatedAt,
                        Comparator.nullsLast(Comparator.reverseOrder())))
                .map(this::toResponse).toList();
    }

    /** HR xác nhận kết nối và tạo lớp cùng buổi thử trong một transaction. */
    @Override
    @Transactional
    public OneOnOneRequestResponse markContacted(Long requestId, OneOnOneTrialClassRequest payload) {
        OneOnOneRequestEntity request = getForUpdate(requestId);
        requireState(request, OneOnOneRequestStatusEnum.INSTRUCTOR_ACCEPTED);
        request.setStatus(OneOnOneRequestStatusEnum.CONTACTED);
        request.setContactedAt(LocalDateTime.now());
        requestRepository.save(request);
        OneOnOneRequestResponse scheduled = createTrialClass(
                request.getAssignedInstructorEntity().getId(), requestId, payload);
        notificationService.createSystemNotification(request.getStudentEntity(), NotificationTypeEnum.GENERAL,
                "HR đã kết nối hai bên", "HR đã tạo lớp và lịch học thử cho bạn.",
                requestId, "/student/schedule");
        notificationService.createSystemNotification(request.getAssignedInstructorEntity(), NotificationTypeEnum.GENERAL,
                "HR đã kết nối hai bên", "HR đã tạo lớp học thử với học viên.",
                requestId, "/teacher/classes/" + scheduled.getTrialClassId());
        return scheduled;
    }

    /** HR đổi lịch buổi thử hiện tại sau khi kiểm tra lại trùng lịch hai bên. */
    @Override
    @Transactional
    public OneOnOneRequestResponse rescheduleTrialClass(Long requestId, OneOnOneTrialClassRequest payload) {
        OneOnOneRequestEntity request = getForUpdate(requestId);
        requireState(request, OneOnOneRequestStatusEnum.TRIAL_SCHEDULED);
        if (request.getAssignedInstructorEntity() == null || request.getTrialSessionEntity() == null) {
            throw new BusinessException("Yêu cầu chưa có buổi học thử để đổi lịch.");
        }
        LocalDateTime startAt = resolveTrialStart(request, payload.getStartAt());
        LocalDateTime endAt = resolveTrialEnd(startAt, payload.getEndAt());
        if (!endAt.isAfter(startAt)) throw new BusinessException("Thời gian kết thúc phải sau thời gian bắt đầu.");
        ClassOnlineEntity session = request.getTrialSessionEntity();
        session.setStatus(BaseStatusEnum.CANCELLED);
        checkScheduleCollision(request.getAssignedInstructorEntity().getId(), request.getStudentEntity().getId(), startAt, endAt);
        int durationMin = Math.toIntExact(Duration.between(startAt, endAt).toMinutes());
        session.setScheduledAt(startAt);
        session.setDurationMin(durationMin);
        session.setMeetingProvider(payload.getLearningMode());
        session.setMeetingUrl(payload.getLinkOrLocation());
        session.setTeacherNotes(payload.getNotes());
        session.setStatus(BaseStatusEnum.ACTIVE);
        classOnlineRepository.save(session);
        ClassEntity trialClass = request.getTrialClassEntity();
        if (trialClass != null) {
            trialClass.setStartDate(startAt);
            trialClass.setEndDate(endAt);
            trialClass.setDescription(payload.getNotes());
            classRepository.save(trialClass);
        }
        notifyUser(request.getStudentEntity(), "Lịch học thử đã được đổi", "HR đã cập nhật lịch học thử vào " + startAt + ".", requestId);
        notifyUser(request.getAssignedInstructorEntity(), "Lịch học thử đã được đổi", "HR đã cập nhật lịch học thử vào " + startAt + ".", requestId);
        audit("RESCHEDULE_ONE_ON_ONE_TRIAL", request);
        return toResponse(request);
    }

    /** Tự động mở lại matching khi giáo viên không nhận xét trong 24 giờ sau trial. */
    @Override
    @Transactional
    public int expireUnreviewedTrials() {
        LocalDateTime now = LocalDateTime.now();
        int expired = 0;
        for (OneOnOneRequestEntity candidate : requestRepository.findByStatusInOrderByCreatedAtDesc(
                List.of(OneOnOneRequestStatusEnum.TRIAL_SCHEDULED))) {
            OneOnOneRequestEntity request = getForUpdate(candidate.getId());
            ClassOnlineEntity session = request.getTrialSessionEntity();
            if (session == null || session.getScheduledAt() == null || session.getDurationMin() == null
                    || now.isBefore(session.getScheduledAt().plusMinutes(session.getDurationMin()).plusHours(24))) continue;
            UserEntity previous = request.getAssignedInstructorEntity();
            closeCurrentTrialArtifacts(request);
            if (previous != null && !rejectedInstructorRepository.existsByRequestEntity_IdAndInstructorEntity_Id(request.getId(), previous.getId())) {
                rejectedInstructorRepository.save(OneOnOneRejectedInstructorEntity.builder().requestEntity(request).instructorEntity(previous).build());
            }
            request.setAssignedInstructorEntity(null);
            request.setTrialClassEntity(null);
            request.setTrialSessionEntity(null);
            request.setStatus(OneOnOneRequestStatusEnum.REMATCHING);
            requestRepository.save(request);
            notifyUser(request.getStudentEntity(), "Hệ thống đang tìm giáo viên khác", "Giáo viên cũ chưa nhận xét trong 24 giờ, yêu cầu đã được ghép lại.", request.getId());
            notifyHr("Trial 1-1 quá hạn nhận xét", "Yêu cầu #" + request.getId() + " đã chuyển sang REMATCHING.", request.getId());
            notifyCandidateUsers(request, eligibleInstructorCandidates(request).stream().map(OneOnOneInstructorCandidateResponse::getInstructorId).toList());
            audit("EXPIRE_ONE_ON_ONE_TRIAL_REVIEW", request);
            expired++;
        }
        return expired;
    }

    /** Học viên hủy ghép hiện tại, cập nhật nhu cầu và mở lại hàng đợi matching. */
    @Override
    @Transactional
    public OneOnOneRequestResponse rematch(Long studentId, Long requestId, OneOnOneRematchRequest payload) {
        OneOnOneRequestEntity request = getForUpdate(requestId);
        if (!request.getStudentEntity().getId().equals(studentId)) {
            throw new ForbiddenException("Bạn không sở hữu yêu cầu 1-1 này.");
        }
        if (request.getStatus() == OneOnOneRequestStatusEnum.CANCELLED) {
            throw new BusinessException("Yêu cầu đã hủy không thể ghép lại.");
        }
        if (request.getStatus() == OneOnOneRequestStatusEnum.INSTRUCTOR_ACCEPTED
                || request.getStatus() == OneOnOneRequestStatusEnum.CONTACTED
                || request.getStatus() == OneOnOneRequestStatusEnum.TRIAL_SCHEDULED) {
            throw new BusinessException("Chỉ được đổi giáo viên sau khi buổi học thử kết thúc và đã có nhận xét.");
        }
        UserEntity previousInstructor = request.getAssignedInstructorEntity();
        if (previousInstructor != null && !rejectedInstructorRepository
                .existsByRequestEntity_IdAndInstructorEntity_Id(requestId, previousInstructor.getId())) {
            rejectedInstructorRepository.save(OneOnOneRejectedInstructorEntity.builder()
                    .requestEntity(request).instructorEntity(previousInstructor).build());
        }
        closeCurrentTrialArtifacts(request);
        applyUpdatedNeeds(request, payload.getNeeds());
        request.setAdditionalNotes(appendReason(request.getAdditionalNotes(), payload.getReason().trim()));
        request.setAssignedInstructorEntity(null);
        request.setAcceptedAt(null);
        request.setContactedAt(null);
        request.setTrialClassEntity(null);
        request.setTrialSessionEntity(null);
        request.setTrialCompletedAt(null);
        request.setStatus(OneOnOneRequestStatusEnum.REMATCHING);
        clearTrialReview(request);
        OneOnOneRequestEntity saved = requestRepository.save(request);
        if (previousInstructor != null) {
            notifyInstructor(previousInstructor, "Học viên yêu cầu đổi người dạy",
                    "Yêu cầu 1-1 đã được mở lại để tìm người dạy khác.", requestId);
        }
        notifyUser(request.getStudentEntity(), "Đã cập nhật nhu cầu học 1-1",
                "Hệ thống đang tìm người dạy mới theo thông tin bạn vừa cập nhật.", requestId);
        notifyHr("Học viên yêu cầu ghép lại",
                "Yêu cầu #" + requestId + " đã cập nhật nhu cầu và chuyển sang REMATCHING.", requestId);
        notifyCandidateUsers(saved, eligibleInstructorCandidates(saved).stream()
                .map(OneOnOneInstructorCandidateResponse::getInstructorId).toList());
        audit("STUDENT_REMATCH_ONE_ON_ONE", saved);
        return toResponse(saved);
    }

    /** HR từ chối kết nối hiện tại, chặn người vừa nhận và phân phối lại cho người phù hợp khác. */
    @Override
    @Transactional
    public OneOnOneRequestResponse rejectConnection(Long requestId, String reason) {
        if (reason == null || reason.trim().length() < 5) {
            throw new BusinessException("Lý do từ chối kết nối phải có ít nhất 5 ký tự.");
        }
        OneOnOneRequestEntity request = getForUpdate(requestId);
        requireState(request, OneOnOneRequestStatusEnum.INSTRUCTOR_ACCEPTED);
        UserEntity rejected = request.getAssignedInstructorEntity();
        if (rejected == null) throw new BusinessException("Yêu cầu chưa có người dạy để từ chối kết nối.");
        if (!rejectedInstructorRepository.existsByRequestEntity_IdAndInstructorEntity_Id(requestId, rejected.getId())) {
            rejectedInstructorRepository.save(OneOnOneRejectedInstructorEntity.builder()
                    .requestEntity(request)
                    .instructorEntity(rejected)
                    .build());
        }
        request.setAssignedInstructorEntity(null);
        request.setAcceptedAt(null);
        request.setContactedAt(null);
        request.setStatus(OneOnOneRequestStatusEnum.REMATCHING);
        OneOnOneRequestEntity saved = requestRepository.save(request);
        notifyInstructor(rejected, "HR từ chối kết nối lớp 1-1",
                "HR chưa phê duyệt kết nối yêu cầu #" + requestId + ". Lý do: " + reason.trim(), requestId);
        notifyUser(request.getStudentEntity(), "Đang tìm người dạy khác",
                "HR chưa phê duyệt kết nối hiện tại và đã mở lại yêu cầu để tìm người dạy phù hợp khác.", requestId);
        List<OneOnOneInstructorCandidateResponse> candidates = eligibleInstructorCandidates(saved);
        notifyCandidateUsers(saved, candidates.stream().map(OneOnOneInstructorCandidateResponse::getInstructorId).toList());
        eventPublisher.publishEvent(new AuditLogEvent(
                this, "REJECT_ONE_ON_ONE_CONNECTION", "ONE_ON_ONE_REQUEST", requestId,
                Map.of("rejectedInstructorId", rejected.getId(), "reason", reason.trim()), toResponse(saved)));
        return toResponse(saved);
    }

    /** Lấy Teacher/TA ACTIVE đúng chuyên môn và chưa bị từ chối cho yêu cầu này. */
    @Override
    public List<OneOnOneInstructorCandidateResponse> getInstructorCandidates(Long requestId) {
        OneOnOneRequestEntity request = requestRepository.findById(requestId)
                .orElseThrow(() -> ResourceNotFoundException.of("OneOnOneRequest", requestId));
        requireState(request, OneOnOneRequestStatusEnum.WAITING_INSTRUCTOR, OneOnOneRequestStatusEnum.REMATCHING);
        return eligibleInstructorCandidates(request);
    }

    /** Xác thực danh sách HR chọn rồi gửi thông báo nhận lớp cho từng Teacher/TA. */
    @Override
    @Transactional
    public void notifyInstructors(Long requestId, List<Long> instructorIds) {
        OneOnOneRequestEntity request = getForUpdate(requestId);
        requireState(request, OneOnOneRequestStatusEnum.WAITING_INSTRUCTOR, OneOnOneRequestStatusEnum.REMATCHING);
        Set<Long> selectedIds = instructorIds == null ? Set.of() : new LinkedHashSet<>(instructorIds);
        if (selectedIds.isEmpty()) throw new BusinessException("Vui lòng chọn ít nhất một giáo viên hoặc trợ giảng.");
        Set<Long> eligibleIds = eligibleInstructorCandidates(request).stream()
                .map(OneOnOneInstructorCandidateResponse::getInstructorId).collect(java.util.stream.Collectors.toSet());
        if (!eligibleIds.containsAll(selectedIds)) {
            throw new BusinessException("Danh sách có người dạy không còn phù hợp với danh mục hoặc trạng thái yêu cầu.");
        }
        notifyCandidateUsers(request, selectedIds.stream().toList());
        eventPublisher.publishEvent(new AuditLogEvent(
                this, "NOTIFY_ONE_ON_ONE_CANDIDATES", "ONE_ON_ONE_REQUEST", requestId,
                null, Map.of("instructorIds", selectedIds)));
    }

    /** HR hủy yêu cầu và đóng lớp thử nếu có. */
    @Override
    @Transactional
    public OneOnOneRequestResponse cancel(Long requestId, String reason) {
        OneOnOneRequestEntity request = getForUpdate(requestId);
        if (request.getStatus() == OneOnOneRequestStatusEnum.MATCHED
                || request.getStatus() == OneOnOneRequestStatusEnum.CANCELLED) {
            throw new BusinessException("Không thể hủy yêu cầu ở trạng thái hiện tại.");
        }
        request.setStatus(OneOnOneRequestStatusEnum.CANCELLED);
        request.setAdditionalNotes(appendReason(request.getAdditionalNotes(), reason));
        if (request.getTrialClassEntity() != null) {
            request.getTrialClassEntity().setStatus(BaseStatusEnum.CANCELLED);
            classRepository.save(request.getTrialClassEntity());
        }
        OneOnOneRequestEntity saved = requestRepository.save(request);
        notifyUser(request.getStudentEntity(), "Yêu cầu 1-1 đã bị hủy",
                "Yêu cầu học 1-1 đã bị hủy. Vui lòng liên hệ HR nếu cần hỗ trợ.", requestId);
        audit("CANCEL_ONE_ON_ONE", saved);
        return toResponse(saved);
    }

    /** HR hoàn tiền order gốc và chuyển matching request sang CANCELLED. */
    @Override
    @Transactional
    public OneOnOneRequestResponse refund(Long requestId, String reason) {
        OneOnOneRequestEntity request = getForUpdate(requestId);
        Long orderId = request.getEnrollmentPackageEntity().getOrderItemEntity().getOrderEntity().getId();
        orderService.refundOrder(orderId, RefundRequest.builder().reason(reason).build());
        request.setStatus(OneOnOneRequestStatusEnum.CANCELLED);
        request.setAdditionalNotes(appendReason(request.getAdditionalNotes(), reason));
        OneOnOneRequestEntity saved = requestRepository.save(request);
        audit("REFUND_ONE_ON_ONE", saved);
        return toResponse(saved);
    }

    /** Thêm thành viên lớp thử theo composite key. */
    private void addTrialMember(ClassEntity clazz, UserEntity user, ClassMemberRole role) {
        classMemberRepository.save(ClassMemberEntity.builder()
                .id(new ClassMemberId(clazz.getId(), user.getId()))
                .classEntity(clazz)
                .userEntity(user)
                .roleInClass(role)
                .status(ClassMemberStatusEnum.ACTIVE)
                .joinedAt(LocalDateTime.now())
                .build());
    }

    /** Xác định vai trò TEACHER hoặc TA còn hiệu lực của người được phân công. */
    private ClassMemberRole resolveInstructorRole(Long instructorId) {
        return "Trợ giảng".equals(instructorRoleLabel(instructorId))
                ? ClassMemberRole.TA : ClassMemberRole.TEACHER;
    }

    /** Chọn thời điểm mặc định theo khung giờ học viên đã khai báo, cho phép HR ghi đè. */
    private LocalDateTime resolveTrialStart(OneOnOneRequestEntity request, LocalDateTime requestedStart) {
        if (requestedStart != null) return requestedStart;
        LocalTime preferred = LocalTime.of(19, 0);
        String raw = request.getPreferredTimes();
        if (raw != null) {
            java.util.regex.Matcher matcher = java.util.regex.Pattern.compile("(\\d{1,2}):(\\d{2})").matcher(raw);
            if (matcher.find()) preferred = LocalTime.of(Integer.parseInt(matcher.group(1)), Integer.parseInt(matcher.group(2)));
        }
        LocalDateTime candidate = LocalDateTime.now().plusDays(1).with(preferred).withSecond(0).withNano(0);
        return candidate.isAfter(LocalDateTime.now()) ? candidate : candidate.plusDays(1);
    }

    /** Lấy thời điểm nghiệp vụ theo múi giờ Việt Nam, khớp lịch hiển thị frontend. */
    private LocalDateTime businessNow() {
        return LocalDateTime.now(ZoneId.of("Asia/Ho_Chi_Minh"));
    }

    /** Chọn thời điểm kết thúc mặc định với buổi thử dài 60 phút nếu HR chưa nhập. */
    private LocalDateTime resolveTrialEnd(LocalDateTime startAt, LocalDateTime requestedEnd) {
        return requestedEnd != null ? requestedEnd : startAt.plusMinutes(60);
    }

    /** Hoàn tất buổi thử đã hết giờ để học viên có thể tự xác nhận kết quả. */
    private void completeElapsedTrial(OneOnOneRequestEntity request) {
        if (request.getStatus() == OneOnOneRequestStatusEnum.TRIAL_COMPLETED) return;
        ClassOnlineEntity session = request.getTrialSessionEntity();
        if (session == null || session.getScheduledAt() == null || session.getDurationMin() == null) {
            throw new BusinessException("Không tìm thấy lịch học thử hợp lệ.");
        }
        if (LocalDateTime.now().isBefore(session.getScheduledAt().plusMinutes(session.getDurationMin()))) {
            throw new BusinessException("Chỉ có thể xác nhận sau khi buổi học thử kết thúc.");
        }
        session.setStatus(BaseStatusEnum.COMPLETED);
        classOnlineRepository.save(session);
        request.setTrialCompletedAt(LocalDateTime.now());
        request.setStatus(OneOnOneRequestStatusEnum.TRIAL_COMPLETED);
    }

    /** Đóng lớp và buổi thử/chính thức cũ trước khi ghép người dạy khác. */
    private void closeCurrentTrialArtifacts(OneOnOneRequestEntity request) {
        if (request.getTrialSessionEntity() != null) {
            request.getTrialSessionEntity().setStatus(BaseStatusEnum.CANCELLED);
            classOnlineRepository.save(request.getTrialSessionEntity());
        }
        if (request.getTrialClassEntity() != null) {
            request.getTrialClassEntity().setStatus(BaseStatusEnum.CANCELLED);
            classRepository.save(request.getTrialClassEntity());
        }
    }

    /** Ghi đè các thông tin nhu cầu bằng dữ liệu học viên vừa xác nhận. */
    private void applyUpdatedNeeds(OneOnOneRequestEntity request, OneOnOneNeedsRequest needs) {
        request.setAvailablePeriod(needs.getAvailablePeriod());
        request.setAvailableDays(needs.getAvailableDays());
        request.setPreferredTimes(needs.getPreferredTimes());
        request.setCurrentLevel(needs.getCurrentLevel());
        request.setLearningSituation(needs.getLearningSituation());
        request.setLearningGoals(needs.getLearningGoals());
        request.setWeakAreas(needs.getWeakAreas());
        request.setInstructorPreferences(needs.getInstructorPreferences());
        request.setAdditionalNotes(needs.getAdditionalNotes());
    }

    /** Xóa nhận xét của lần học thử cũ khi bắt đầu một vòng matching mới. */
    private void clearTrialReview(OneOnOneRequestEntity request) {
        request.setReviewCurrentLevel(null);
        request.setReviewWeakAreas(null);
        request.setReviewAttitude(null);
        request.setReviewRecommendedPath(null);
        request.setReviewNotes(null);
    }

    /** Chặn trùng lịch của cả người dạy và học viên trên các buổi đang hoạt động. */
    private void checkScheduleCollision(
            Long instructorId, Long studentId, LocalDateTime startAt, LocalDateTime endAt) {
        List<ClassOnlineEntity> sessions = new ArrayList<>(classOnlineRepository.findByTeacherEntity_Id(instructorId));
        Set<Long> studentClassIds = classMemberRepository.findById_UserId(studentId).stream()
                .filter(item -> item.getStatus() == ClassMemberStatusEnum.ACTIVE)
                .map(item -> item.getClassEntity().getId())
                .collect(java.util.stream.Collectors.toSet());
        studentClassIds.forEach(classId -> sessions.addAll(classOnlineRepository.findByClassEntity_Id(classId)));
        boolean conflict = sessions.stream()
                .filter(item -> item.getStatus() == BaseStatusEnum.ACTIVE || item.getStatus() == BaseStatusEnum.TRIAL)
                .anyMatch(item -> overlaps(item, startAt, endAt));
        if (conflict) throw new BusinessException("Giáo viên/trợ giảng hoặc học viên bị trùng lịch học.");
    }

    /** Kiểm tra hai khoảng thời gian buổi học giao nhau. */
    private boolean overlaps(ClassOnlineEntity session, LocalDateTime startAt, LocalDateTime endAt) {
        if (session.getScheduledAt() == null || session.getDurationMin() == null) return false;
        LocalDateTime existingEnd = session.getScheduledAt().plusMinutes(session.getDurationMin());
        return session.getScheduledAt().isBefore(endAt) && existingEnd.isAfter(startAt);
    }

    /** Lấy request có pessimistic lock cho state transition. */
    private OneOnOneRequestEntity getForUpdate(Long requestId) {
        return requestRepository.findByIdForUpdate(requestId)
                .orElseThrow(() -> ResourceNotFoundException.of("OneOnOneRequest", requestId));
    }

    /** Bắt buộc người gọi là đúng assignee hiện tại. */
    private void requireAssignedInstructor(OneOnOneRequestEntity request, Long instructorId) {
        if (request.getAssignedInstructorEntity() == null
                || !request.getAssignedInstructorEntity().getId().equals(instructorId)) {
            throw new ForbiddenException("Chỉ người dạy được gán mới được thực hiện thao tác này.");
        }
    }

    /** Xác minh state hiện tại thuộc tập trạng thái cho phép. */
    private void requireState(OneOnOneRequestEntity request, OneOnOneRequestStatusEnum... allowed) {
        if (Arrays.stream(allowed).noneMatch(state -> state == request.getStatus())) {
            throw new BusinessException("Trạng thái yêu cầu không hợp lệ cho thao tác này: " + request.getStatus());
        }
    }

    /** Lấy gói khóa học đã thanh toán của matching request. */
    private CoursePackageEntity getPackage(OneOnOneRequestEntity request) {
        return request.getEnrollmentPackageEntity().getCoursePackageEntity();
    }

    /** Lấy category ID của khóa học yêu cầu. */
    private Long getCategoryId(OneOnOneRequestEntity request) {
        CourseEntity course = getPackage(request).getCourseEntity();
        return course.getCategoryEntity() != null ? course.getCategoryEntity().getId() : null;
    }

    /** Tạo danh sách người dạy hợp lệ từ phân công danh mục, trạng thái nhân sự và vai trò hiện hành. */
    private List<OneOnOneInstructorCandidateResponse> eligibleInstructorCandidates(OneOnOneRequestEntity request) {
        Long categoryId = getCategoryId(request);
        if (categoryId == null) return List.of();
        Map<Long, EmployeeEntity> eligible = new LinkedHashMap<>();
        teacherCategoryRepository.findByCategory_IdAndStatus(categoryId, BaseStatusEnum.ACTIVE).stream()
                .map(TeacherCategoryEntity::getEmployee)
                .filter(Objects::nonNull)
                .filter(employee -> employee.getStatus() == EmployeeStatusEnum.ACTIVE)
                .filter(employee -> employee.getUserEntity() != null)
                .filter(employee -> userRoleRepository.hasActiveInstructorRole(employee.getUserId(), LocalDateTime.now()))
                .filter(employee -> !rejectedInstructorRepository
                        .existsByRequestEntity_IdAndInstructorEntity_Id(request.getId(), employee.getUserId()))
                .forEach(employee -> eligible.putIfAbsent(employee.getUserId(), employee));
        return eligible.values().stream().map(employee -> OneOnOneInstructorCandidateResponse.builder()
                .instructorId(employee.getUserId())
                .instructorName(employee.getUserEntity().getFullName())
                .employeeCode(employee.getEmployeeCode())
                .role(instructorRoleLabel(employee.getUserId()))
                .build()).toList();
    }

    /** Gửi thông báo nhận lớp 1-1 tới đúng danh sách người dạy đã được xác thực. */
    private void notifyCandidateUsers(OneOnOneRequestEntity request, List<Long> instructorIds) {
        if (instructorIds.isEmpty()) return;
        Map<Long, UserEntity> users = userRepository.findAllById(instructorIds).stream()
                .collect(java.util.stream.Collectors.toMap(UserEntity::getId, user -> user));
        String courseName = getPackage(request).getCourseEntity().getName();
        instructorIds.stream().map(users::get).filter(Objects::nonNull).forEach(user -> notifyInstructor(
                user,
                "Có lớp 1-1 phù hợp chuyên môn",
                "HR đã gửi yêu cầu học 1-1 #" + request.getId() + " của khóa " + courseName + " đến bạn.",
                request.getId()));
    }

    /** Hiển thị vai trò Teacher hoặc TA còn hiệu lực của ứng viên. */
    private String instructorRoleLabel(Long userId) {
        LocalDateTime now = LocalDateTime.now();
        boolean isTa = userRoleRepository.findByUserEntity_IdWithRole(userId).stream()
                .filter(role -> role.getAssignedAt() == null || !role.getAssignedAt().isAfter(now))
                .filter(role -> role.getExpiredAt() == null || role.getExpiredAt().isAfter(now))
                .map(role -> role.getRoleEntity().getCode().toUpperCase(Locale.ROOT))
                .anyMatch(code -> code.equals("TA") || code.equals("ROLE_TA"));
        return isTa ? "Trợ giảng" : "Giáo viên";
    }

    /** Gửi thông báo hệ thống tới một người dùng nếu tồn tại. */
    private void notifyUser(UserEntity user, String title, String content, Long requestId) {
        if (user != null) notificationService.createSystemNotification(
                user, NotificationTypeEnum.GENERAL, title, content, requestId, "/one-on-one/requests/" + requestId);
    }

    /** Gửi thông báo nhận lớp tới trang gợi ý dành cho Teacher/TA. */
    private void notifyInstructor(UserEntity user, String title, String content, Long requestId) {
        if (user != null) notificationService.createSystemNotification(
                user, NotificationTypeEnum.GENERAL, title, content, requestId, "/teacher/suggested-classes");
    }

    /** Gửi thông báo theo dõi cho toàn bộ HR. */
    private void notifyHr(String title, String content, Long requestId) {
        userRoleRepository.findHrUsers().forEach(user -> notificationService.createSystemNotification(
                user,
                NotificationTypeEnum.GENERAL,
                title,
                content,
                requestId,
                "/admin/approval-center"));
    }

    /** Ghi audit cho mọi transition thay đổi dữ liệu 1-1. */
    private void audit(String action, OneOnOneRequestEntity request) {
        eventPublisher.publishEvent(new AuditLogEvent(
                this, action, "ONE_ON_ONE_REQUEST", request.getId(), null, toResponse(request)));
    }

    /** Nối lý do can thiệp HR vào ghi chú hiện có. */
    private String appendReason(String current, String reason) {
        if (reason == null || reason.isBlank()) return current;
        return (current == null || current.isBlank()) ? reason : current + "\n" + reason;
    }

    /** Chuyển entity sang response không lộ thông tin liên hệ cá nhân. */
    private OneOnOneRequestResponse toResponse(OneOnOneRequestEntity request) {
        CoursePackageEntity pkg = getPackage(request);
        CourseEntity course = pkg.getCourseEntity();
        UserEntity assigned = request.getAssignedInstructorEntity();
        return OneOnOneRequestResponse.builder()
                .id(request.getId())
                .orderId(request.getEnrollmentPackageEntity().getOrderItemEntity() != null
                        && request.getEnrollmentPackageEntity().getOrderItemEntity().getOrderEntity() != null
                        ? request.getEnrollmentPackageEntity().getOrderItemEntity().getOrderEntity().getId() : null)
                .studentId(request.getStudentEntity().getId())
                .studentName(request.getStudentEntity().getFullName())
                .courseId(course.getId())
                .courseName(course.getName())
                .categoryId(course.getCategoryEntity() != null ? course.getCategoryEntity().getId() : null)
                .categoryName(course.getCategoryEntity() != null ? course.getCategoryEntity().getName() : null)
                .coursePackageId(pkg.getId())
                .packageName(pkg.getName())
                .includedTutorSessions(pkg.getIncludedTutorSessions())
                .status(request.getStatus())
                .assignedInstructorId(assigned != null ? assigned.getId() : null)
                .assignedInstructorName(assigned != null ? assigned.getFullName() : null)
                .trialClassId(request.getTrialClassEntity() != null ? request.getTrialClassEntity().getId() : null)
                .trialSessionId(request.getTrialSessionEntity() != null ? request.getTrialSessionEntity().getId() : null)
                .trialStartAt(request.getTrialSessionEntity() != null
                        ? request.getTrialSessionEntity().getScheduledAt() : null)
                .trialEndAt(request.getTrialSessionEntity() != null
                        && request.getTrialSessionEntity().getScheduledAt() != null
                        && request.getTrialSessionEntity().getDurationMin() != null
                        ? request.getTrialSessionEntity().getScheduledAt()
                                .plusMinutes(request.getTrialSessionEntity().getDurationMin()) : null)
                .trialMeetingUrl(request.getTrialSessionEntity() != null
                        ? request.getTrialSessionEntity().getMeetingUrl() : null)
                .availablePeriod(request.getAvailablePeriod())
                .availableDays(request.getAvailableDays())
                .preferredTimes(request.getPreferredTimes())
                .currentLevel(request.getCurrentLevel())
                .learningSituation(request.getLearningSituation())
                .learningGoals(request.getLearningGoals())
                .weakAreas(request.getWeakAreas())
                .instructorPreferences(request.getInstructorPreferences())
                .additionalNotes(request.getAdditionalNotes())
                .reviewCurrentLevel(request.getReviewCurrentLevel())
                .reviewWeakAreas(request.getReviewWeakAreas())
                .reviewAttitude(request.getReviewAttitude())
                .reviewRecommendedPath(request.getReviewRecommendedPath())
                .reviewNotes(request.getReviewNotes())
                .createdAt(request.getCreatedAt())
                .build();
    }
}
