package com.ailms.service.imp;

import com.ailms.entity.*;
import com.ailms.entity.enums.*;
import com.ailms.exception.BusinessException;
import com.ailms.exception.ForbiddenException;
import com.ailms.exception.ResourceNotFoundException;
import com.ailms.repository.*;
import com.ailms.request.CreateLeaveRequest;
import com.ailms.request.GradeSubmissionRequest;
import com.ailms.request.TeacherWorkspaceRequest;
import com.ailms.response.TeacherWorkspaceResponse;
import com.ailms.service.IAssessmentService;
import com.ailms.service.ILeaveRequestService;
import com.ailms.service.IClassSessionManagementService;
import com.ailms.service.IOneOnOneService;
import com.ailms.service.INotificationService;
import com.ailms.service.ITeacherWorkspaceService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.*;
import java.time.format.DateTimeFormatter;
import java.time.temporal.TemporalAdjusters;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

/** Triển khai workspace Teacher/TA hoàn toàn từ dữ liệu thật và giới hạn theo JWT hiện tại. */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class TeacherWorkspaceService implements ITeacherWorkspaceService {

    private static final int REVIEW_WINDOW_HOURS = 24;
    private static final byte SUBMISSION_PENDING = 0;
    private static final byte ATTEMPT_SUBMITTED = 1;
    private static final byte ATTEMPT_GRADED = 2;
    private static final byte FILL_BLANK_TYPE = 4;

    private final ClassMemberRepository classMemberRepository;
    private final ClassScheduleRepository classScheduleRepository;
    private final ClassOnlineRepository classOnlineRepository;
    private final CourseTeacherRepository courseTeacherRepository;
    private final CourseProgressRepository courseProgressRepository;
    private final AssignmentRepository assignmentRepository;
    private final SubmissionRepository submissionRepository;
    private final QuizRepository quizRepository;
    private final QuizAttemptRepository quizAttemptRepository;
    private final QuizAnswerRepository quizAnswerRepository;
    private final QuestionRepository questionRepository;
    private final UserRepository userRepository;
    private final ReviewRepository reviewRepository;
    private final TeacherCategoryRepository teacherCategoryRepository;
    private final TeachingSessionPaymentRepository paymentRepository;
    private final TeachingRateRepository teachingRateRepository;
    private final EmployeeRepository employeeRepository;
    private final ApprovalRequestRepository approvalRequestRepository;
    private final ClassRepository classRepository;
    private final IAssessmentService assessmentService;
    private final ILeaveRequestService leaveRequestService;
    private final IOneOnOneService oneOnOneService;
    private final INotificationService notificationService;
    private final IClassSessionManagementService classSessionManagementService;
    private final com.ailms.service.ITeacherActivityService teacherActivityService;

    /** Tổng hợp dashboard trong cùng một transaction đọc để giữ số liệu nhất quán. */
    @Override
    public TeacherWorkspaceResponse.Metrics getMetrics(Long userId) {
        Scope scope = scope(userId);
        LocalDateTime now = LocalDateTime.now();
        LocalDate monday = LocalDate.now().with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        List<ClassOnlineEntity> weekSessions = sessions(scope.classIds(), monday.atStartOfDay(), monday.plusDays(7).atStartOfDay());
        List<ClassOnlineEntity> reviewable = sessions(scope.classIds(), now.minusHours(REVIEW_WINDOW_HOURS), now).stream()
                .filter(item -> isCompleted(item, now) && isBlank(item.getTeacherNotes())).toList();
        List<SubmissionEntity> submissions = pendingSubmissions(scope);
        List<QuizAnswerEntity> quizAnswers = pendingQuizAnswers(scope);

        LocalDateTime monthStart = LocalDate.now().withDayOfMonth(1).atStartOfDay();
        LocalDateTime monthEnd = monthStart.plusMonths(1);
        BigDecimal earnings = paymentRepository.findByEmployee_UserId(userId).stream()
                .filter(item -> item.getClassOnline() != null && item.getClassOnline().getScheduledAt() != null)
                .filter(item -> !item.getClassOnline().getScheduledAt().isBefore(monthStart)
                        && item.getClassOnline().getScheduledAt().isBefore(monthEnd))
                .filter(item -> item.getStatus() != SessionPaymentStatusEnum.CANCELLED
                        && item.getStatus() != SessionPaymentStatusEnum.DELETE)
                .map(TeachingSessionPaymentEntity::getAmount).filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        Double rating = scope.courseIds().isEmpty() ? 0D
                : reviewRepository.getAverageRatingByCourseIdsAndStatus(scope.courseIds(), ReviewStatusEnum.ACTIVE);
        long minSeconds = reviewable.stream().mapToLong(item -> reviewSecondsLeft(item, now)).min().orElse(0L);

        return TeacherWorkspaceResponse.Metrics.builder()
                .activeClassesCount(scope.classes().stream()
                        .filter(item -> isActiveClassAt(item.getClassEntity(), now)).count())
                .sessionsThisWeekTotal(weekSessions.size())
                .sessionsThisWeekCompleted(weekSessions.stream().filter(item -> isCompleted(item, now)).count())
                .unreviewedSessionsCount(reviewable.size()).unreviewedMinSecondsLeft(minSeconds)
                .pendingGradingAssignmentsCount(submissions.size())
                .pendingFillBlankQuizzesCount(quizAnswers.size())
                .newSuggestedClassesCount(oneOnOneService.getSuggestions(userId).size())
                .atRiskStudentsCount(countAtRiskStudents(scope))
                .averageRating(rating == null ? 0D : round(rating, 2))
                .estimatedEarningsMonth(earnings)
                .hasAssignedCategory(hasAssignedCategory(userId)).build();
    }

    /** Lấy buổi hôm nay cùng buổi kết thúc trong 24 giờ chưa có nhận xét. */
    @Override
    public List<TeacherWorkspaceResponse.AgendaSession> getAgenda(Long userId) {
        Scope scope = scope(userId);
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime today = LocalDate.now().atStartOfDay();
        return sessions(scope.classIds(), now.minusHours(REVIEW_WINDOW_HOURS), today.plusDays(1)).stream()
                .filter(item -> item.getScheduledAt().toLocalDate().equals(LocalDate.now())
                        || (isCompleted(item, now) && isBlank(item.getTeacherNotes())
                        && sessionEnd(item).isAfter(now.minusHours(REVIEW_WINDOW_HOURS))))
                .map(item -> toAgenda(item, now)).toList();
    }

    /** Lấy lịch theo khoảng [from, to], mặc định là tuần hiện tại. */
    @Override
    public List<TeacherWorkspaceResponse.OnlineSession> getOnlineSessions(Long userId, LocalDate from, LocalDate to) {
        LocalDate start = from != null ? from : LocalDate.now().with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        LocalDate endInclusive = to != null ? to : start.plusDays(6);
        if (endInclusive.isBefore(start) || endInclusive.isAfter(start.plusMonths(3))) {
            throw new BusinessException("Khoảng lịch phải hợp lệ và không vượt quá 3 tháng.");
        }
        LocalDateTime now = LocalDateTime.now();
        return sessions(scope(userId).classIds(), start.atStartOfDay(), endInclusive.plusDays(1).atStartOfDay()).stream()
                .map(item -> toOnlineSession(item, now)).toList();
    }

    /** Lưu nhận xét sau khi buổi học kết thúc và tạo draft thù lao nếu đủ cấu hình. */
    @Override
    @Transactional
    public void reviewSession(Long userId, Long sessionId, TeacherWorkspaceRequest.SessionReview request) {
        ClassOnlineEntity session = requireManagedSession(userId, sessionId);
        if (!isCompleted(session, LocalDateTime.now())) {
            throw new BusinessException("Chỉ có thể nhận xét sau khi buổi học kết thúc.");
        }
        session.setTeacherNotes(request.getNote().trim());
        session.setSessionSummary(trimToNull(request.getSummary()));
        session.setNextSessionNotes(trimToNull(request.getNextSessionNotes()));
        classOnlineRepository.save(session);
        createDraftPaymentIfPossible(userId, session, request.getActualDurationMin());
        teacherActivityService.sessionReviewed(userId, session);
        classSessionManagementService.sessionReviewed(session.getClassEntity().getId());
    }

    /** Dựng hàng đợi bài nộp chưa chấm kèm học viên, assignment và lớp. */
    @Override
    public List<TeacherWorkspaceResponse.SubmissionQueueItem> getPendingSubmissions(Long userId) {
        Scope scope = scope(userId);
        List<SubmissionEntity> submissions = pendingSubmissions(scope);
        Map<Long, AssignmentEntity> assignments = allowedAssignments(scope).stream()
                .collect(Collectors.toMap(AssignmentEntity::getId, Function.identity(), (a, b) -> a));
        Map<Long, UserEntity> users = users(submissions.stream().map(SubmissionEntity::getUserId).toList());
        Map<Long, String> classNames = scope.classes().stream().collect(Collectors.toMap(
                item -> item.getClassEntity().getId(), item -> item.getClassEntity().getName(), (a, b) -> a));
        return submissions.stream().map(item -> {
            AssignmentEntity assignment = assignments.get(item.getAssignmentId());
            UserEntity student = users.get(item.getUserId());
            return TeacherWorkspaceResponse.SubmissionQueueItem.builder().id(String.valueOf(item.getId()))
                    .studentName(displayName(student)).studentEmail(student != null ? student.getEmail() : null)
                    .assignmentTitle(assignment != null ? assignment.getTitle() : null)
                    .className(assignment != null ? classNames.get(assignment.getClassId()) : null)
                    .submittedAt(item.getSubmittedAt()).isLate(Boolean.TRUE.equals(item.getIsLate()))
                    .content(item.getContentText()).attachmentUrl(item.getFileUrl())
                    .maxScore(assignment != null ? assignment.getMaxScore() : null).build();
        }).toList();
    }

    /** Chấm assignment bằng service assessment dùng chung sau kiểm tra scope và điểm tối đa. */
    @Override
    @Transactional
    public void gradeSubmission(Long userId, Long submissionId, TeacherWorkspaceRequest.SubmissionGrade request) {
        SubmissionEntity submission = submissionRepository.findById(submissionId)
                .orElseThrow(() -> ResourceNotFoundException.of("Submission", submissionId));
        AssignmentEntity assignment = assignmentRepository.findById(submission.getAssignmentId())
                .orElseThrow(() -> ResourceNotFoundException.of("Assignment", submission.getAssignmentId()));
        requireAssignmentAccess(scope(userId), assignment);
        if (!Objects.equals(submission.getStatus(), SUBMISSION_PENDING)) {
            throw new BusinessException("Bài nộp này đã được xử lý.");
        }
        if (assignment.getMaxScore() != null && request.getScore().compareTo(assignment.getMaxScore()) > 0) {
            throw new BusinessException("Điểm không được vượt quá điểm tối đa của bài tập.");
        }
        assessmentService.gradeSubmission(submissionId, GradeSubmissionRequest.builder()
                .score(request.getScore()).feedback(request.getFeedback()).build(), userId);
    }

    /** Lấy các answer kiểu FILL_BLANK đang để null kết quả chấm. */
    @Override
    public List<TeacherWorkspaceResponse.FillBlankQueueItem> getPendingQuizAnswers(Long userId) {
        Scope scope = scope(userId);
        List<QuizAnswerEntity> answers = pendingQuizAnswers(scope);
        Map<Long, QuestionEntity> questions = questions(answers.stream().map(QuizAnswerEntity::getQuestionId).toList());
        Map<Long, QuizAttemptEntity> attempts = attempts(answers.stream().map(QuizAnswerEntity::getAttemptId).toList());
        Map<Long, QuizEntity> quizzes = quizzes(attempts.values().stream().map(QuizAttemptEntity::getQuizId).toList());
        Map<Long, UserEntity> students = users(attempts.values().stream().map(QuizAttemptEntity::getUserId).toList());
        return answers.stream().map(answer -> {
            QuestionEntity question = questions.get(answer.getQuestionId());
            QuizAttemptEntity attempt = attempts.get(answer.getAttemptId());
            QuizEntity quiz = attempt != null ? quizzes.get(attempt.getQuizId()) : null;
            UserEntity student = attempt != null ? students.get(attempt.getUserId()) : null;
            return TeacherWorkspaceResponse.FillBlankQueueItem.builder().id(String.valueOf(answer.getId()))
                    .attemptId(String.valueOf(answer.getAttemptId())).quizTitle(quiz != null ? quiz.getTitle() : null)
                    .studentName(displayName(student)).questionText(question != null ? question.getContent() : null)
                    .studentAnswer(answer.getAnswerText()).correctAnswer(question != null ? question.getExplanation() : null)
                    .maxPoints(question != null ? question.getPoints() : null).pointsEarned(answer.getPointsEarned()).build();
        }).toList();
    }

    /** Cập nhật điểm một answer và hoàn tất attempt khi không còn answer chờ chấm. */
    @Override
    @Transactional
    public void gradeQuizAnswer(Long userId, Long answerId, TeacherWorkspaceRequest.AnswerGrade request) {
        QuizAnswerEntity answer = quizAnswerRepository.findById(answerId)
                .orElseThrow(() -> ResourceNotFoundException.of("QuizAnswer", answerId));
        QuizAttemptEntity attempt = quizAttemptRepository.findById(answer.getAttemptId())
                .orElseThrow(() -> ResourceNotFoundException.of("QuizAttempt", answer.getAttemptId()));
        QuizEntity quiz = quizRepository.findById(attempt.getQuizId())
                .orElseThrow(() -> ResourceNotFoundException.of("Quiz", attempt.getQuizId()));
        requireQuizAccess(scope(userId), quiz);
        QuestionEntity question = questionRepository.findById(answer.getQuestionId())
                .orElseThrow(() -> ResourceNotFoundException.of("Question", answer.getQuestionId()));
        if (question.getQuestionType() == null || question.getQuestionType() != FILL_BLANK_TYPE) {
            throw new BusinessException("Chỉ câu tự luận/điền từ mới được chấm tay.");
        }
        if (question.getPoints() != null && request.getPoints().compareTo(question.getPoints()) > 0) {
            throw new BusinessException("Điểm không được vượt quá điểm tối đa của câu hỏi.");
        }
        answer.setPointsEarned(request.getPoints());
        answer.setIsCorrect(request.getCorrect() != null ? request.getCorrect() : request.getPoints().signum() > 0);
        quizAnswerRepository.save(answer);
        finalizeAttemptIfReady(attempt, quiz);
    }

    /** Thống kê độ khó từ toàn bộ answer đã có kết quả đúng/sai. */
    @Override
    public List<TeacherWorkspaceResponse.QuestionDifficulty> getQuestionDifficulty(Long userId) {
        List<QuizEntity> allowed = allowedQuizzes(scope(userId));
        if (allowed.isEmpty()) return List.of();
        Map<Long, QuizEntity> quizMap = allowed.stream().collect(Collectors.toMap(QuizEntity::getId, Function.identity()));
        List<QuestionEntity> questions = allowed.stream().flatMap(q -> questionRepository.findByQuizId(q.getId()).stream()).toList();
        if (questions.isEmpty()) return List.of();
        Map<Long, List<QuizAnswerEntity>> answers = quizAnswerRepository.findByQuestionIdIn(
                        questions.stream().map(QuestionEntity::getId).toList()).stream()
                .filter(item -> item.getIsCorrect() != null).collect(Collectors.groupingBy(QuizAnswerEntity::getQuestionId));
        return questions.stream().map(question -> {
            List<QuizAnswerEntity> values = answers.getOrDefault(question.getId(), List.of());
            long errors = values.stream().filter(item -> !Boolean.TRUE.equals(item.getIsCorrect())).count();
            double rate = values.isEmpty() ? 0D : round(errors * 100D / values.size(), 2);
            return TeacherWorkspaceResponse.QuestionDifficulty.builder().id(String.valueOf(question.getId()))
                    .quizTitle(quizMap.get(question.getQuizId()).getTitle()).questionText(question.getContent())
                    .totalAttempts(values.size()).errorCount(errors).errorRatePercent(rate).build();
        }).sorted(Comparator.comparingDouble(TeacherWorkspaceResponse.QuestionDifficulty::getErrorRatePercent).reversed()).toList();
    }

    /** Gộp authored quiz/exam/assignment và lọc type tùy chọn. */
    @Override
    public List<TeacherWorkspaceResponse.AuthoredAssessment> getAuthoredAssessments(Long userId, String type) {
        String filter = type == null ? null : type.trim().toUpperCase(Locale.ROOT);
        List<TeacherWorkspaceResponse.AuthoredAssessment> result = new ArrayList<>();
        for (QuizEntity quiz : quizRepository.findByCreatedByOrderByCreatedAtDesc(userId)) {
            String quizType = resolveQuizType(quiz);
            if (filter == null || filter.equals(quizType) || "QUIZ_OR_EXAM".equals(filter)) {
                result.add(TeacherWorkspaceResponse.AuthoredAssessment.builder().id(String.valueOf(quiz.getId()))
                        .type(quizType).title(quiz.getTitle()).courseId(quiz.getCourseId()).classId(quiz.getClassId())
                        .status(enumName(quiz.getStatus())).dueAt(quiz.getDueAt()).maxScore(quiz.getPassScore())
                        .attemptsCount(quizAttemptRepository.findByQuizId(quiz.getId()).size()).createdAt(quiz.getCreatedAt()).build());
            }
        }
        if (filter == null || "ASSIGNMENT".equals(filter)) {
            assignmentRepository.findByCreatedByOrderByCreatedAtDesc(userId).forEach(item -> result.add(
                    TeacherWorkspaceResponse.AuthoredAssessment.builder().id(String.valueOf(item.getId()))
                            .type("ASSIGNMENT").title(item.getTitle()).courseId(item.getCourseId()).classId(item.getClassId())
                            .status(enumName(item.getStatus())).dueAt(item.getDueDate()).maxScore(item.getMaxScore())
                            .attemptsCount(submissionRepository.findByAssignmentId(item.getId()).size())
                            .createdAt(item.getCreatedAt()).build()));
        }
        return result.stream().sorted(Comparator.comparing(TeacherWorkspaceResponse.AuthoredAssessment::getCreatedAt,
                Comparator.nullsLast(Comparator.reverseOrder()))).toList();
    }

    /** Tạo request tổng quát với type được chuẩn hóa và requester lấy từ audit/JWT. */
    @Override
    @Transactional
    public TeacherWorkspaceResponse.WorkRequest createWorkRequest(Long userId, TeacherWorkspaceRequest.WorkRequestCreate request) {
        String type = normalizeRequestType(request.getType());
        ApprovalRequestEntity entity = ApprovalRequestEntity.builder().targetType("TEACHER_" + type)
                .targetId(request.getTargetId()).requestReason(request.getReason().trim())
                .status(ApprovalStatusEnum.PENDING).createdBy(userId).build();
        return toWorkRequest(approvalRequestRepository.save(entity));
    }

    /** Lấy request theo createdBy nên không lộ yêu cầu của người khác. */
    @Override
    public List<TeacherWorkspaceResponse.WorkRequest> getWorkRequests(Long userId) {
        return approvalRequestRepository.findByCreatedByOrderByCreatedAtDesc(userId).stream()
                .map(this::toWorkRequest).toList();
    }

    /** Tạo yêu cầu chuyển lớp, không tự thay đổi membership trước khi được duyệt. */
    @Override
    @Transactional
    public TeacherWorkspaceResponse.WorkRequest createClassTransfer(Long userId, TeacherWorkspaceRequest.ClassTransferCreate request) {
        ClassMemberEntity sourceMember = requireManagedClass(userId, request.getFromClassId());
        ClassEntity source = sourceMember.getClassEntity();
        ClassEntity target = classRepository.findById(request.getToClassId())
                .orElseThrow(() -> ResourceNotFoundException.of("Class", request.getToClassId()));
        if (source.getId().equals(target.getId())) throw new BusinessException("Lớp đích phải khác lớp hiện tại.");
        Long sourceCourse = source.getCourseEntity() != null ? source.getCourseEntity().getId() : null;
        Long targetCourse = target.getCourseEntity() != null ? target.getCourseEntity().getId() : null;
        if (!Objects.equals(sourceCourse, targetCourse)) {
            throw new BusinessException("Chỉ có thể yêu cầu chuyển giữa các lớp cùng khóa học.");
        }
        ApprovalRequestEntity entity = ApprovalRequestEntity.builder().targetType("TEACHER_CLASS_TRANSFER")
                .targetId(source.getId()).requestReason(request.getReason().trim())
                .comment("toClassId=" + target.getId() + "; role=" + sourceMember.getRoleInClass())
                .status(ApprovalStatusEnum.PENDING).createdBy(userId).build();
        return toWorkRequest(approvalRequestRepository.save(entity));
    }

    /** Tạo đơn nghỉ qua service HR hiện hữu nhưng luôn ép employeeId bằng JWT. */
    @Override
    @Transactional
    public TeacherWorkspaceResponse.LeaveRequestItem createLeave(Long userId, TeacherWorkspaceRequest.LeaveCreate request) {
        var saved = leaveRequestService.create(CreateLeaveRequest.builder().employeeId(userId)
                .leaveType(request.getLeaveType()).startDate(request.getStartDate()).endDate(request.getEndDate())
                .reason(request.getReason().trim()).build());
        return toLeave(saved);
    }

    /** Lấy đơn nghỉ của chính employee hiện tại. */
    @Override
    public List<TeacherWorkspaceResponse.LeaveRequestItem> getLeaves(Long userId) {
        return leaveRequestService.getByEmployeeId(userId).stream().map(this::toLeave).toList();
    }

    /** Kiểm tra chuyên môn ACTIVE của teacher/TA. */
    @Override
    public boolean hasAssignedCategory(Long userId) {
        return !teacherCategoryRepository.findByEmployee_UserIdAndStatus(userId, BaseStatusEnum.ACTIVE).isEmpty();
    }

    /** Dựng thẻ lớp thật và lịch định kỳ, không phát sinh dữ liệu fallback. */
    @Override
    public List<TeacherWorkspaceResponse.ClassCard> getClasses(Long userId) {
        Scope scope = scope(userId);
        Map<Long, List<ClassScheduleEntity>> schedules = classScheduleRepository.findByClassEntity_IdIn(scope.classIds()).stream()
                .filter(item -> item.getStatus() == BaseStatusEnum.ACTIVE)
                .collect(Collectors.groupingBy(item -> item.getClassEntity().getId()));
        return scope.classes().stream().map(member -> {
            ClassEntity clazz = member.getClassEntity();
            List<ClassMemberEntity> students = classMemberRepository.findById_ClassId(clazz.getId()).stream()
                    .filter(item -> item.getStatus() == ClassMemberStatusEnum.ACTIVE && item.getRoleInClass() == ClassMemberRole.STUDENT).toList();
            int avg = averageProgress(students, clazz.getCourseEntity() != null ? clazz.getCourseEntity().getId() : null);
            return TeacherWorkspaceResponse.ClassCard.builder().id(String.valueOf(clazz.getId())).className(clazz.getName())
                    .courseName(clazz.getCourseEntity() != null ? clazz.getCourseEntity().getName() : null)
                    .deliveryMode(enumName(clazz.getPackageType())).roleInClass(member.getRoleInClass().name())
                    .currentStudents(students.size()).maxStudents(clazz.getMaxMembers() == null ? 0 : clazz.getMaxMembers())
                    .scheduleSummary(scheduleSummary(schedules.getOrDefault(clazz.getId(), List.of())))
                    .avgProgressPercent(avg).status(enumName(clazz.getStatus())).build();
        }).toList();
    }

    /** Trả học viên của đúng lớp được quản lý cùng tiêu chí risk minh bạch. */
    @Override
    public List<TeacherWorkspaceResponse.StudentRisk> getClassStudents(Long userId, Long classId) {
        ClassEntity clazz = requireManagedClass(userId, classId).getClassEntity();
        Long courseId = clazz.getCourseEntity() != null ? clazz.getCourseEntity().getId() : null;
        List<ClassMemberEntity> students = classMemberRepository.findById_ClassId(classId).stream()
                .filter(item -> item.getStatus() == ClassMemberStatusEnum.ACTIVE && item.getRoleInClass() == ClassMemberRole.STUDENT).toList();
        Map<Long, CourseProgressEntity> progress = courseId == null ? Map.of() : courseProgressRepository
                .findByUserIdInAndCourseIdIn(students.stream().map(item -> item.getUserEntity().getId()).toList(), List.of(courseId)).stream()
                .collect(Collectors.toMap(CourseProgressEntity::getUserId, Function.identity(), this::latestProgress));
        int expected = expectedProgress(clazz);
        LocalDateTime now = LocalDateTime.now();
        return students.stream().map(member -> toStudentRisk(member.getUserEntity(), progress.get(member.getUserEntity().getId()), expected, now)).toList();
    }

    /** Gửi một notification thật sau khi xác minh học viên thuộc ít nhất một lớp được quản lý. */
    @Override
    @Transactional
    public void sendStudentReminder(Long userId, Long studentId) {
        Scope scope = scope(userId);
        boolean managedStudent = scope.classIds().stream().anyMatch(classId -> classMemberRepository
                .findById_ClassIdAndId_UserId(classId, studentId)
                .filter(item -> item.getStatus() == ClassMemberStatusEnum.ACTIVE
                        && item.getRoleInClass() == ClassMemberRole.STUDENT).isPresent());
        if (!managedStudent) throw new ForbiddenException("Học viên không thuộc lớp bạn đang phụ trách.");
        UserEntity student = userRepository.findById(studentId)
                .orElseThrow(() -> ResourceNotFoundException.of("Student", studentId));
        notificationService.createSystemNotification(student, NotificationTypeEnum.GENERAL,
                "Nhắc nhở tiến độ học tập", "Giảng viên đã gửi lời nhắc bạn tiếp tục hoàn thành nội dung đang chậm tiến độ.",
                null, "/student/dashboard");
    }

    /** Lấy thu nhập thật từ bảng teaching_session_payment của employee hiện tại. */
    @Override
    public List<TeacherWorkspaceResponse.EarningItem> getEarnings(Long userId) {
        return paymentRepository.findByEmployee_UserId(userId).stream()
                .sorted(Comparator.comparing((TeachingSessionPaymentEntity item) -> item.getClassOnline() != null
                        ? item.getClassOnline().getScheduledAt() : null, Comparator.nullsLast(Comparator.reverseOrder())))
                .map(item -> TeacherWorkspaceResponse.EarningItem.builder().id(String.valueOf(item.getId()))
                        .sessionId(item.getClassOnline() != null ? String.valueOf(item.getClassOnline().getId()) : null)
                        .className(item.getClassOnline() != null && item.getClassOnline().getClassEntity() != null
                                ? item.getClassOnline().getClassEntity().getName() : null)
                        .date(item.getClassOnline() != null && item.getClassOnline().getScheduledAt() != null
                                ? item.getClassOnline().getScheduledAt().toLocalDate() : null)
                        .durationHours(item.getActualDurationMin() / 60D).hourlyRate(item.getRateApplied())
                        .totalAmount(item.getAmount()).status(enumName(item.getStatus())).build()).toList();
    }

    /** Tạo scope gồm membership lớp và course assignment ACTIVE. */
    private Scope scope(Long userId) {
        List<ClassMemberEntity> classes = classMemberRepository.findById_UserId(userId).stream()
                .filter(item -> item.getStatus() == ClassMemberStatusEnum.ACTIVE)
                .filter(item -> item.getRoleInClass() == ClassMemberRole.TEACHER || item.getRoleInClass() == ClassMemberRole.TA).toList();
        LinkedHashSet<Long> courseIds = classes.stream().map(ClassMemberEntity::getClassEntity)
                .filter(Objects::nonNull).map(ClassEntity::getCourseEntity).filter(Objects::nonNull)
                .map(CourseEntity::getId).collect(Collectors.toCollection(LinkedHashSet::new));
        courseTeacherRepository.findByUserEntity_IdAndStatus(userId, CourseTeacherStatusEnum.ACTIVE).stream()
                .map(item -> item.getCourseEntity().getId()).forEach(courseIds::add);
        return new Scope(classes, classes.stream().map(item -> item.getClassEntity().getId()).distinct().toList(), List.copyOf(courseIds));
    }

    /** Truy vấn session an toàn khi teacher chưa được gán lớp. */
    private List<ClassOnlineEntity> sessions(List<Long> classIds, LocalDateTime from, LocalDateTime to) {
        if (classIds.isEmpty()) return List.of();
        return classOnlineRepository.findByClassEntity_IdInAndScheduledAtGreaterThanEqualAndScheduledAtLessThanOrderByScheduledAtAsc(classIds, from, to);
    }

    /** Lấy toàn bộ assignment trong scope và loại trùng khi vừa thuộc lớp vừa thuộc course. */
    private List<AssignmentEntity> allowedAssignments(Scope scope) {
        if (scope.classIds().isEmpty() && scope.courseIds().isEmpty()) return List.of();
        List<AssignmentEntity> values = new ArrayList<>();
        if (!scope.classIds().isEmpty() && !scope.courseIds().isEmpty()) {
            values.addAll(assignmentRepository.findByClassIdInOrCourseIdInOrderByDueDateAsc(scope.classIds(), scope.courseIds()));
        } else if (!scope.classIds().isEmpty()) {
            scope.classIds().forEach(id -> values.addAll(assignmentRepository.findByClassIdOrderByDueDateAsc(id)));
        } else {
            scope.courseIds().forEach(id -> values.addAll(assignmentRepository.findByCourseId(id)));
        }
        return unique(values, AssignmentEntity::getId).stream()
                .filter(item -> item.getClassId() != null
                        ? scope.classIds().contains(item.getClassId()) : scope.courseIds().contains(item.getCourseId()))
                .toList();
    }

    /** Lấy toàn bộ quiz trong scope và loại trùng. */
    private List<QuizEntity> allowedQuizzes(Scope scope) {
        if (scope.classIds().isEmpty() && scope.courseIds().isEmpty()) return List.of();
        List<QuizEntity> values = new ArrayList<>();
        if (!scope.classIds().isEmpty() && !scope.courseIds().isEmpty()) {
            values.addAll(quizRepository.findByClassIdInOrCourseIdInOrderByDueAtAsc(scope.classIds(), scope.courseIds()));
        } else if (!scope.classIds().isEmpty()) {
            scope.classIds().forEach(id -> values.addAll(quizRepository.findByClassIdOrderByDueAtAsc(id)));
        } else {
            scope.courseIds().forEach(id -> values.addAll(quizRepository.findByCourseId(id)));
        }
        return unique(values, QuizEntity::getId).stream()
                .filter(item -> item.getClassId() != null
                        ? scope.classIds().contains(item.getClassId()) : scope.courseIds().contains(item.getCourseId()))
                .toList();
    }

    /** Lấy submission pending của các assignment trong scope. */
    private List<SubmissionEntity> pendingSubmissions(Scope scope) {
        List<Long> ids = allowedAssignments(scope).stream().map(AssignmentEntity::getId).toList();
        return ids.isEmpty() ? List.of() : submissionRepository.findByAssignmentIdInAndStatusOrderBySubmittedAtAsc(ids, SUBMISSION_PENDING);
    }

    /** Lấy answer chưa chấm thuộc attempt submitted của quiz trong scope. */
    private List<QuizAnswerEntity> pendingQuizAnswers(Scope scope) {
        List<Long> quizIds = allowedQuizzes(scope).stream().map(QuizEntity::getId).toList();
        if (quizIds.isEmpty()) return List.of();
        List<Long> attemptIds = quizAttemptRepository.findByQuizIdInAndStatus(quizIds, ATTEMPT_SUBMITTED).stream()
                .map(QuizAttemptEntity::getId).toList();
        if (attemptIds.isEmpty()) return List.of();
        Map<Long, QuestionEntity> questions = questions(quizAnswerRepository.findByAttemptIdIn(attemptIds).stream()
                .map(QuizAnswerEntity::getQuestionId).toList());
        return quizAnswerRepository.findByAttemptIdIn(attemptIds).stream()
                .filter(item -> item.getIsCorrect() == null)
                .filter(item -> questions.containsKey(item.getQuestionId())
                        && Objects.equals(questions.get(item.getQuestionId()).getQuestionType(), FILL_BLANK_TYPE)).toList();
    }

    /** Hoàn tất điểm tổng attempt khi mọi answer đều đã có kết quả. */
    private void finalizeAttemptIfReady(QuizAttemptEntity attempt, QuizEntity quiz) {
        List<QuizAnswerEntity> answers = quizAnswerRepository.findByAttemptId(attempt.getId());
        if (answers.stream().anyMatch(item -> item.getIsCorrect() == null)) return;
        BigDecimal total = answers.stream().map(QuizAnswerEntity::getPointsEarned).filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        attempt.setScore(total);
        attempt.setIsPassed(total.compareTo(quiz.getPassScore() != null ? quiz.getPassScore() : BigDecimal.ZERO) >= 0);
        attempt.setStatus(ATTEMPT_GRADED);
        quizAttemptRepository.save(attempt);
        assessmentService.recomputeCourseProgress(attempt.getEnrollmentId());
    }

    /** Tạo draft payment một lần nếu session, employee và teaching rate đều hợp lệ. */
    private void createDraftPaymentIfPossible(Long userId, ClassOnlineEntity session, Integer actualDurationMin) {
        if (!Boolean.TRUE.equals(session.getPayable()) || session.getSessionKind() == SessionKindEnum.TRIAL
                || paymentRepository.findByClassOnlineIdAndEmployee_UserId(session.getId(), userId).isPresent()) return;
        EmployeeEntity employee = employeeRepository.findById(userId).orElse(null);
        if (employee == null || session.getScheduledAt() == null) return;
        TeachingRateEntity rate = teachingRateRepository.findByEmployeeEntity_UserId(userId).stream()
                .filter(item -> item.getStatus() == BaseStatusEnum.ACTIVE)
                .filter(item -> item.getClassEntity() != null
                        && item.getClassEntity().getId().equals(session.getClassEntity().getId()))
                .filter(item -> item.getEffectiveFrom() == null || !item.getEffectiveFrom().isAfter(session.getScheduledAt()))
                .filter(item -> item.getEffectiveTo() == null || !item.getEffectiveTo().isBefore(session.getScheduledAt()))
                .max(Comparator.comparing(item -> item.getEffectiveFrom() != null
                        ? item.getEffectiveFrom() : LocalDateTime.MIN)).orElse(null);
        if (rate == null || rate.getRate() == null) return;
        int duration = actualDurationMin != null && actualDurationMin > 0
                ? actualDurationMin : value(session.getDurationMin(), 60);
        BigDecimal amount = rate.getRate().multiply(BigDecimal.valueOf(duration))
                .divide(BigDecimal.valueOf(60), 2, RoundingMode.HALF_UP);
        paymentRepository.save(TeachingSessionPaymentEntity.builder().classOnline(session).employee(employee)
                .teachingRate(rate).rateApplied(rate.getRate()).actualDurationMin(duration).amount(amount)
                .status(SessionPaymentStatusEnum.DRAFT).description("Tạo tự động sau khi gửi nhận xét buổi học").build());
    }

    /** Xác minh user là TEACHER/TA ACTIVE của lớp. */
    private ClassMemberEntity requireManagedClass(Long userId, Long classId) {
        return classMemberRepository.findById_ClassIdAndId_UserId(classId, userId)
                .filter(item -> item.getStatus() == ClassMemberStatusEnum.ACTIVE)
                .filter(item -> item.getRoleInClass() == ClassMemberRole.TEACHER || item.getRoleInClass() == ClassMemberRole.TA)
                .orElseThrow(() -> new ForbiddenException("Bạn không được quản lý lớp này."));
    }

    /** Xác minh quyền quản lý session qua membership lớp. */
    private ClassOnlineEntity requireManagedSession(Long userId, Long sessionId) {
        ClassOnlineEntity session = classOnlineRepository.findById(sessionId)
                .orElseThrow(() -> ResourceNotFoundException.of("ClassOnline", sessionId));
        requireManagedClass(userId, session.getClassEntity().getId());
        return session;
    }

    /** Chặn chấm assignment nằm ngoài scope. */
    private void requireAssignmentAccess(Scope scope, AssignmentEntity assignment) {
        boolean allowed = assignment.getClassId() != null
                ? scope.classIds().contains(assignment.getClassId()) : scope.courseIds().contains(assignment.getCourseId());
        if (!allowed) {
            throw new ForbiddenException("Bạn không được chấm bài tập này.");
        }
    }

    /** Chặn chấm quiz nằm ngoài scope. */
    private void requireQuizAccess(Scope scope, QuizEntity quiz) {
        boolean allowed = quiz.getClassId() != null
                ? scope.classIds().contains(quiz.getClassId()) : scope.courseIds().contains(quiz.getCourseId());
        if (!allowed) {
            throw new ForbiddenException("Bạn không được chấm quiz/bài thi này.");
        }
    }

    /** Đếm học viên risk không trùng giữa nhiều lớp. */
    private long countAtRiskStudents(Scope scope) {
        if (scope.classIds().isEmpty() || scope.courseIds().isEmpty()) return 0;
        List<ClassMemberEntity> students = classMemberRepository.findById_ClassIdInAndStatus(scope.classIds(), ClassMemberStatusEnum.ACTIVE).stream()
                .filter(item -> item.getRoleInClass() == ClassMemberRole.STUDENT).toList();
        List<Long> userIds = students.stream().map(item -> item.getUserEntity().getId()).distinct().toList();
        if (userIds.isEmpty()) return 0;
        return courseProgressRepository.findByUserIdInAndCourseIdIn(userIds, scope.courseIds()).stream()
                .filter(this::isAtRisk).map(CourseProgressEntity::getUserId).distinct().count();
    }

    /** Tiêu chí risk: tiến độ dưới 30% hoặc không hoạt động hơn 7 ngày. */
    private boolean isAtRisk(CourseProgressEntity progress) {
        return value(progress.getProgressPercent()) < 30 || progress.getLastAccessedAt() != null
                && progress.getLastAccessedAt().isBefore(LocalDateTime.now().minusDays(7));
    }

    /** Chuyển session thành agenda response. */
    private TeacherWorkspaceResponse.AgendaSession toAgenda(ClassOnlineEntity session, LocalDateTime now) {
        String status = sessionStatus(session, now);
        return TeacherWorkspaceResponse.AgendaSession.builder().id(String.valueOf(session.getId()))
                .className(session.getClassEntity().getName())
                .courseName(session.getClassEntity().getCourseEntity() != null ? session.getClassEntity().getCourseEntity().getName() : null)
                .sessionTime(time(session.getScheduledAt()) + " - " + time(sessionEnd(session)))
                .studentCount((int) classMemberRepository.countById_ClassIdAndStatusAndRoleInClass(
                        session.getClassEntity().getId(), ClassMemberStatusEnum.ACTIVE, ClassMemberRole.STUDENT))
                .roomUrl(session.getMeetingUrl()).status(status)
                .secondsLeftToReview("UNREVIEWED".equals(status) ? reviewSecondsLeft(session, now) : null).build();
    }

    /** Chuyển session thành response lịch tuần/tháng. */
    private TeacherWorkspaceResponse.OnlineSession toOnlineSession(ClassOnlineEntity session, LocalDateTime now) {
        LocalDateTime end = sessionEnd(session);
        String status = sessionStatus(session, now);
        return TeacherWorkspaceResponse.OnlineSession.builder().id(String.valueOf(session.getId()))
                .classId(String.valueOf(session.getClassEntity().getId())).className(session.getClassEntity().getName())
                .courseName(session.getClassEntity().getCourseEntity() != null ? session.getClassEntity().getCourseEntity().getName() : null)
                .title(session.getTitle()).startTime(time(session.getScheduledAt())).endTime(time(end))
                .startHour(decimalHour(session.getScheduledAt())).endHour(decimalHour(end))
                .dateStr(session.getScheduledAt().toLocalDate().toString()).dayOfWeek(session.getScheduledAt().getDayOfWeek().getValue() - 1)
                .roomUrl(session.getMeetingUrl()).status(status)
                .secondsLeftToReview("UNREVIEWED".equals(status) ? reviewSecondsLeft(session, now) : null)
                .reviewNote(session.getTeacherNotes()).build();
    }

    /** Xác định lifecycle hiển thị độc lập với BaseStatus lưu trữ. */
    private String sessionStatus(ClassOnlineEntity session, LocalDateTime now) {
        if (Set.of(BaseStatusEnum.INACTIVE, BaseStatusEnum.CANCELLED, BaseStatusEnum.DELETE, BaseStatusEnum.DELETED)
                .contains(session.getStatus())) return "CANCELLED";
        if (!isCompleted(session, now)) return "SCHEDULED";
        return isBlank(session.getTeacherNotes()) ? "UNREVIEWED" : "REVIEWED";
    }

    /** Tính thời điểm kết thúc từ scheduledAt và duration. */
    private LocalDateTime sessionEnd(ClassOnlineEntity session) {
        return session.getScheduledAt().plusMinutes(Math.max(value(session.getDurationMin(), 60), 1));
    }

    /** Kiểm tra session đã kết thúc theo đồng hồ server. */
    private boolean isCompleted(ClassOnlineEntity session, LocalDateTime now) {
        return session.getScheduledAt() != null && !now.isBefore(sessionEnd(session));
    }

    /** Tính giây còn lại trong cửa sổ nhận xét 24 giờ, không trả số âm. */
    private long reviewSecondsLeft(ClassOnlineEntity session, LocalDateTime now) {
        return Math.max(Duration.between(now, sessionEnd(session).plusHours(REVIEW_WINDOW_HOURS)).getSeconds(), 0L);
    }

    /** Dựng risk response từ course progress mới nhất. */
    private TeacherWorkspaceResponse.StudentRisk toStudentRisk(UserEntity user, CourseProgressEntity progress, int expected, LocalDateTime now) {
        int actual = progress != null ? value(progress.getProgressPercent()) : 0;
        LocalDateTime last = progress != null ? progress.getLastAccessedAt() : null;
        int inactiveDays = last == null ? 0 : (int) Math.max(Duration.between(last, now).toDays(), 0);
        boolean risk = progress != null && isAtRisk(progress);
        String reason = !risk ? null : inactiveDays > 7
                ? "Không hoạt động " + inactiveDays + " ngày" : "Tiến độ dưới 30%";
        return TeacherWorkspaceResponse.StudentRisk.builder().id(String.valueOf(user.getId())).studentId(String.valueOf(user.getId()))
                .studentName(displayName(user)).studentEmail(user.getEmail()).studentAvatar(user.getAvatarUrl())
                .daysInactive(inactiveDays).progressPercent(actual).expectedPercent(expected)
                .avgQuizScore(progress != null && progress.getAvgQuizScore() != null ? progress.getAvgQuizScore() : BigDecimal.ZERO)
                .lastAccessedAt(last).isAtRisk(risk).riskReason(reason).build();
    }

    /** Tính tiến độ kỳ vọng tuyến tính theo thời gian lớp. */
    private int expectedProgress(ClassEntity clazz) {
        if (clazz.getStartDate() == null || clazz.getEndDate() == null || !clazz.getEndDate().isAfter(clazz.getStartDate())) return 0;
        long total = Duration.between(clazz.getStartDate(), clazz.getEndDate()).toSeconds();
        long elapsed = Duration.between(clazz.getStartDate(), LocalDateTime.now()).toSeconds();
        return (int) Math.max(0, Math.min(100, elapsed * 100 / total));
    }

    /** Tính tiến độ trung bình của học viên lớp. */
    private int averageProgress(List<ClassMemberEntity> students, Long courseId) {
        if (students.isEmpty() || courseId == null) return 0;
        List<CourseProgressEntity> values = courseProgressRepository.findByUserIdInAndCourseIdIn(
                students.stream().map(item -> item.getUserEntity().getId()).toList(), List.of(courseId));
        return values.isEmpty() ? 0 : (int) Math.round(values.stream().mapToInt(item -> value(item.getProgressPercent())).average().orElse(0));
    }

    /** Chọn progress cập nhật gần nhất nếu dữ liệu cũ bị trùng. */
    private CourseProgressEntity latestProgress(CourseProgressEntity first, CourseProgressEntity second) {
        LocalDateTime a = first.getUpdatedAt() != null ? first.getUpdatedAt() : LocalDateTime.MIN;
        LocalDateTime b = second.getUpdatedAt() != null ? second.getUpdatedAt() : LocalDateTime.MIN;
        return a.isAfter(b) ? first : second;
    }

    /** Định dạng lịch định kỳ thành chuỗi ngắn cho card lớp. */
    private String scheduleSummary(List<ClassScheduleEntity> schedules) {
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("HH:mm");
        return schedules.stream().sorted(Comparator.comparing(ClassScheduleEntity::getDayOfWeek))
                .map(item -> "T" + item.getDayOfWeek() + " " + item.getStartTime().format(formatter)
                        + "-" + item.getEndTime().format(formatter)).collect(Collectors.joining(", "));
    }

    /** Chuyển approval entity sang response không lộ approver nội bộ. */
    private TeacherWorkspaceResponse.WorkRequest toWorkRequest(ApprovalRequestEntity entity) {
        return TeacherWorkspaceResponse.WorkRequest.builder().id(String.valueOf(entity.getId())).type(entity.getTargetType())
                .targetId(entity.getTargetId()).reason(entity.getRequestReason()).status(enumName(entity.getStatus()))
                .decisionComment(entity.getComment()).createdAt(entity.getCreatedAt()).decidedAt(entity.getDecidedAt()).build();
    }

    /** Chuyển leave response hiện hữu sang shape gọn của teacher UI. */
    private TeacherWorkspaceResponse.LeaveRequestItem toLeave(com.ailms.response.LeaveRequestResponse item) {
        return TeacherWorkspaceResponse.LeaveRequestItem.builder().id(String.valueOf(item.getId()))
                .leaveType(enumName(item.getLeaveType())).startDate(item.getStartDate()).endDate(item.getEndDate())
                .reason(item.getReason()).status(enumName(item.getStatus())).rejectionReason(item.getRejectionReason())
                .createdAt(item.getCreatedAt()).build();
    }

    /** Chuẩn hóa request type để không tạo target type tùy ý chứa ký tự nguy hiểm. */
    private String normalizeRequestType(String type) {
        String normalized = type.trim().toUpperCase(Locale.ROOT).replace('-', '_').replace(' ', '_');
        if (!normalized.matches("[A-Z][A-Z0-9_]{1,49}")) throw new BusinessException("Loại yêu cầu không hợp lệ.");
        return normalized;
    }

    /** Nhận diện bài thi trên model Quiz dùng chung hiện tại. */
    private String resolveQuizType(QuizEntity quiz) {
        String text = ((quiz.getCode() == null ? "" : quiz.getCode()) + " " + (quiz.getTitle() == null ? "" : quiz.getTitle())).toUpperCase(Locale.ROOT);
        return text.contains("EXAM") || text.contains("BÀI THI") || text.contains("FINAL") ? "EXAM" : "QUIZ";
    }

    /** Batch tải user và trả map theo ID. */
    private Map<Long, UserEntity> users(List<Long> ids) {
        return userRepository.findAllById(ids.stream().filter(Objects::nonNull).distinct().toList()).stream()
                .collect(Collectors.toMap(UserEntity::getId, Function.identity()));
    }

    /** Batch tải question và trả map theo ID. */
    private Map<Long, QuestionEntity> questions(List<Long> ids) {
        return questionRepository.findAllById(ids.stream().filter(Objects::nonNull).distinct().toList()).stream()
                .collect(Collectors.toMap(QuestionEntity::getId, Function.identity()));
    }

    /** Batch tải attempt và trả map theo ID. */
    private Map<Long, QuizAttemptEntity> attempts(List<Long> ids) {
        return quizAttemptRepository.findAllById(ids.stream().filter(Objects::nonNull).distinct().toList()).stream()
                .collect(Collectors.toMap(QuizAttemptEntity::getId, Function.identity()));
    }

    /** Batch tải quiz và trả map theo ID. */
    private Map<Long, QuizEntity> quizzes(List<Long> ids) {
        return quizRepository.findAllById(ids.stream().filter(Objects::nonNull).distinct().toList()).stream()
                .collect(Collectors.toMap(QuizEntity::getId, Function.identity()));
    }

    /** Loại trùng entity theo ID nhưng giữ thứ tự ban đầu. */
    private <T> List<T> unique(List<T> values, Function<T, Long> id) {
        return new ArrayList<>(values.stream().collect(Collectors.toMap(id, Function.identity(), (a, b) -> a, LinkedHashMap::new)).values());
    }

    /** Lấy tên hiển thị an toàn cho user. */
    private String displayName(UserEntity user) {
        if (user == null) return null;
        return !isBlank(user.getFullName()) ? user.getFullName() : user.getUsername();
    }

    /** Đổi enum bất kỳ sang tên hoặc null. */
    private String enumName(Enum<?> value) {
        return value != null ? value.name() : null;
    }

    /** Định dạng giờ phút thống nhất cho frontend. */
    private String time(LocalDateTime value) {
        return value != null ? value.format(DateTimeFormatter.ofPattern("HH:mm")) : null;
    }

    /** Đổi thời điểm sang giờ dạng thập phân. */
    private double decimalHour(LocalDateTime value) {
        return value.getHour() + value.getMinute() / 60D;
    }

    /** Làm tròn số thực theo số chữ số thập phân. */
    private double round(double value, int scale) {
        return BigDecimal.valueOf(value).setScale(scale, RoundingMode.HALF_UP).doubleValue();
    }

    /** Xác định lớp còn hoạt động tại thời điểm hiện tại và chưa quá ngày kết thúc. */
    private boolean isActiveClassAt(ClassEntity classEntity, LocalDateTime now) {
        if (classEntity == null || classEntity.getStatus() != BaseStatusEnum.ACTIVE) return false;
        LocalDateTime endDate = classEntity.getEndDate();
        return endDate == null || endDate.isAfter(now);
    }

    /** Trả chuỗi đã trim hoặc null nếu rỗng. */
    private String trimToNull(String value) {
        return isBlank(value) ? null : value.trim();
    }

    /** Kiểm tra chuỗi null/rỗng. */
    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    /** Đổi Integer null thành 0. */
    private int value(Integer value) {
        return value(value, 0);
    }

    /** Đổi Integer null thành giá trị mặc định. */
    private int value(Integer value, int defaultValue) {
        return value != null ? value : defaultValue;
    }

    /** Scope dữ liệu mà một teacher/TA được quản lý. */
    private record Scope(List<ClassMemberEntity> classes, List<Long> classIds, List<Long> courseIds) {
    }
}
