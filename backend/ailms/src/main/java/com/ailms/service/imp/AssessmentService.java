package com.ailms.service.imp;

import com.ailms.entity.*;
import com.ailms.entity.enums.BaseStatusEnum;
import com.ailms.entity.enums.CourseStatusEnum;
import com.ailms.entity.enums.QuestionTypeEnum;
import com.ailms.entity.enums.DeliveryModeEnum;
import com.ailms.event.AuditLogEvent;
import com.ailms.exception.BusinessException;
import com.ailms.exception.ResourceNotFoundException;
import com.ailms.repository.*;
import com.ailms.request.*;
import com.ailms.response.StudentProgressReportResponse;
import com.ailms.response.SystemDashboardResponse;
import com.ailms.service.IAssessmentService;
import com.ailms.service.ICertificateService;
import com.ailms.service.ITeacherActivityService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class AssessmentService implements IAssessmentService {

    private final EnrollmentRepository enrollmentRepository;
    private final CourseProgressRepository courseProgressRepository;
    private final LessonProgressRepository lessonProgressRepository;
    private final LessonRepository lessonRepository;
    private final QuizRepository quizRepository;
    private final QuestionRepository questionRepository;
    private final QuestionOptionRepository questionOptionRepository;
    private final QuizAttemptRepository quizAttemptRepository;
    private final QuizAnswerRepository quizAnswerRepository;
    private final AssignmentRepository assignmentRepository;
    private final SubmissionRepository submissionRepository;
    private final UserRepository userRepository;
    private final ClassMemberRepository classMemberRepository;
    private final CertificateRepository certificateRepository;
    private final ICertificateService certificateService;
    private final ApplicationEventPublisher applicationEventPublisher;
    private final ITeacherActivityService teacherActivityService;
    private final EnrollmentPackageRepository enrollmentPackageRepository;

    @Transactional
    @Override
    public void recomputeCourseProgress(Long enrollmentId) {
        log.info("Recomputing course progress for enrollment: {}", enrollmentId);

        EnrollmentEntity enrollment = enrollmentRepository.findById(enrollmentId)
                .orElseThrow(() -> ResourceNotFoundException.of("Enrollment", enrollmentId));

        Long userId = enrollment.getUserEntity().getId();
        Long courseId = enrollment.getCourseEntity().getId();

        // 1. Completed lessons count
        long completedLessons = lessonProgressRepository
                .countByEnrollmentIdAndStatusEquals(enrollmentId, (byte) 1);
        int totalLessons = lessonRepository.countByCourseSectionEntityCourseEntityId(courseId);
        double progressPercentDouble = totalLessons > 0 ? (double) (completedLessons * 100) / totalLessons : 100.0;
        if (progressPercentDouble > 100.0) progressPercentDouble = 100.0;
        int progressPercent = (int) Math.round(progressPercentDouble);

        // 2. Average quiz score (highest per quiz)
        List<QuizAttemptEntity> userAttempts = quizAttemptRepository.findByEnrollmentId(enrollmentId);
        Map<Long, BigDecimal> highestScores = new HashMap<>();
        for (QuizAttemptEntity attempt : userAttempts) {
            if (attempt.getScore() != null) {
                highestScores.merge(attempt.getQuizId(), attempt.getScore(), BigDecimal::max);
            }
        }

        BigDecimal avgQuizScore = BigDecimal.ZERO;
        if (!highestScores.isEmpty()) {
            BigDecimal sum = highestScores.values().stream().reduce(BigDecimal.ZERO, BigDecimal::add);
            avgQuizScore = sum.divide(BigDecimal.valueOf(highestScores.size()), 2, RoundingMode.HALF_UP);
        }

        // 3. Completed assignments count
        List<SubmissionEntity> userSubmissions = submissionRepository.findByUserId(userId);
        long completedAssignments = userSubmissions.stream()
                .filter(s -> s.getStatus() != null && s.getStatus() == 1) // GRADED
                .count();

        List<CourseProgressEntity> existingList = courseProgressRepository.findByEnrollmentId(enrollmentId);
        CourseProgressEntity courseProgress = !existingList.isEmpty() ? existingList.get(0) : CourseProgressEntity.builder()
                .enrollmentId(enrollmentId)
                .courseId(courseId)
                .userId(userId)
                .build();

        courseProgress.setCompletedLessons((int) completedLessons);
        courseProgress.setTotalLessons(totalLessons);
        courseProgress.setProgressPercent(progressPercent);
        courseProgress.setAvgQuizScore(avgQuizScore);
        courseProgress.setCompletedAssignments((int) completedAssignments);
        courseProgress.setLastAccessedAt(LocalDateTime.now());

        courseProgressRepository.save(courseProgress);

        // 4. Trigger Certificate evaluation if eligible
        certificateService.issueIfEligible(enrollmentId);
    }

    @Transactional
    @Override
    public Long startQuizAttempt(Long userId, Long quizId) {
        log.info("Starting quiz attempt for user: {}, quiz: {}", userId, quizId);

        QuizEntity quiz = quizRepository.findById(quizId)
                .orElseThrow(() -> ResourceNotFoundException.of("Quiz", quizId));

        if (quiz.getStatus() != BaseStatusEnum.ACTIVE) {
            throw new BusinessException("Quiz chưa được mở cho học viên.");
        }

        if (quiz.getDueAt() != null && LocalDateTime.now().isAfter(quiz.getDueAt())) {
            throw new BusinessException("Quiz đã hết hạn làm bài.");
        }
        EnrollmentEntity enrollment = enrollmentRepository.findByUserEntity_Id(userId).stream()
                .filter(item -> quiz.getCourseId() != null
                        && item.getCourseEntity().getId().equals(quiz.getCourseId()))
                .findFirst().orElseThrow(() -> new BusinessException("Bạn chưa ghi danh khóa học của quiz này."));
        if (enrollment.getCourseEntity().getStatus() != CourseStatusEnum.ACTIVE) {
            throw new BusinessException("Khóa học của quiz chưa hoạt động.");
        }
        validateClassMembership(userId, quiz.getClassId());

        // Check attempts limit
        List<QuizAttemptEntity> existingAttempts = quizAttemptRepository.findByQuizIdAndUserId(quizId, userId);
        if (quiz.getMaxAttempts() != null && existingAttempts.size() >= quiz.getMaxAttempts()) {
            throw new BusinessException("User has reached max allowed attempts for quiz: " + quizId);
        }

        QuizAttemptEntity attempt = QuizAttemptEntity.builder()
                .quizId(quizId)
                .userId(userId)
                .enrollmentId(enrollment.getId())
                .attemptNumber(existingAttempts.size() + 1)
                .status((byte) 0) // IN_PROGRESS
                .startedAt(LocalDateTime.now())
                .build();

        QuizAttemptEntity saved = quizAttemptRepository.save(attempt);
        return saved.getId();
    }

    @Transactional
    @Override
    public void submitQuizAttempt(Long attemptId, SubmitQuizAttemptRequest request) {
        log.info("Submitting quiz attempt: {}", attemptId);

        QuizAttemptEntity attempt = quizAttemptRepository.findById(attemptId)
                .orElseThrow(() -> ResourceNotFoundException.of("QuizAttempt", attemptId));

        if (attempt.getStatus() != 0) { // Not IN_PROGRESS
            throw new BusinessException("Quiz attempt is already submitted or expired.");
        }

        QuizEntity quiz = quizRepository.findById(attempt.getQuizId())
                .orElseThrow(() -> ResourceNotFoundException.of("Quiz", attempt.getQuizId()));

        if (quiz.getStatus() != BaseStatusEnum.ACTIVE) {
            throw new BusinessException("Quiz đã đóng hoặc chưa được mở.");
        }
        if (quiz.getTimeLimitMin() != null && attempt.getStartedAt() != null
                && LocalDateTime.now().isAfter(attempt.getStartedAt().plusMinutes(quiz.getTimeLimitMin()))) {
            attempt.setStatus((byte) 3);
            quizAttemptRepository.save(attempt);
            throw new BusinessException("Đã hết thời gian làm quiz.");
        }

        List<QuestionEntity> questions = questionRepository.findByQuizId(attempt.getQuizId());
        BigDecimal totalScore = BigDecimal.ZERO;
        boolean hasFillInBlank = false;
        Set<Long> answeredQuestionIds = new HashSet<>();

        if (request.getAnswers() != null) {
            for (SubmitQuizAttemptRequest.AnswerRequest ansReq : request.getAnswers()) {
                if (ansReq.getQuestionId() == null || !answeredQuestionIds.add(ansReq.getQuestionId())) {
                    throw new BusinessException("Mỗi câu hỏi chỉ được nộp một câu trả lời trong một lượt làm.");
                }
                QuestionEntity question = questions.stream()
                        .filter(q -> q.getId().equals(ansReq.getQuestionId()))
                        .findFirst()
                        .orElse(null);

                if (question == null) continue;

                boolean isCorrect = false;
                BigDecimal pointsEarned = BigDecimal.ZERO;
                boolean requiresManualGrade = false;

                // 10.6 Auto-grading logic
                if (question.getQuestionType() == QuestionTypeEnum.SINGLE_CHOICE.getCode()
                        || question.getQuestionType() == QuestionTypeEnum.TRUE_FALSE.getCode()) {
                    if (ansReq.getSelectedOptionId() != null) {
                        QuestionOptionEntity opt = questionOptionRepository.findById(ansReq.getSelectedOptionId()).orElse(null);
                        if (opt != null && question.getId().equals(opt.getQuestionId())
                                && Boolean.TRUE.equals(opt.getIsCorrect())) {
                            isCorrect = true;
                            pointsEarned = question.getPoints() != null ? question.getPoints() : BigDecimal.ONE;
                        }
                    }
                } else if (question.getQuestionType() == QuestionTypeEnum.MULTIPLE_CHOICE.getCode()) {
                    List<QuestionOptionEntity> allOptions = questionOptionRepository.findByQuestionId(question.getId());
                    List<Long> correctOptIds = allOptions.stream().filter(o -> Boolean.TRUE.equals(o.getIsCorrect())).map(QuestionOptionEntity::getId).toList();
                    List<Long> userSelected = ansReq.getSelectedOptionIds() != null ? ansReq.getSelectedOptionIds() : Collections.emptyList();

                    if (new HashSet<>(correctOptIds).equals(new HashSet<>(userSelected))) {
                        isCorrect = true;
                        pointsEarned = question.getPoints() != null ? question.getPoints() : BigDecimal.ONE;
                    }
                } else if (question.getQuestionType() == QuestionTypeEnum.SHORT_ANSWER.getCode()) {
                    hasFillInBlank = true;
                    requiresManualGrade = true;
                }

                totalScore = totalScore.add(pointsEarned);

                QuizAnswerEntity answer = QuizAnswerEntity.builder()
                        .attemptId(attemptId)
                        .questionId(question.getId())
                        .selectedOptionId(ansReq.getSelectedOptionId())
                        .answerText(ansReq.getAnswerText())
                        .isCorrect(requiresManualGrade ? null : isCorrect)
                        .pointsEarned(pointsEarned)
                        .createdAt(LocalDateTime.now())
                        .build();

                quizAnswerRepository.save(answer);
            }
        }

        attempt.setSubmittedAt(LocalDateTime.now());

        if (hasFillInBlank) {
            attempt.setStatus((byte) 1); // SUBMITTED (pending teacher manual grade)
        } else {
            BigDecimal normalizedScore = normalizeQuizScore(totalScore, questions);
            attempt.setScore(normalizedScore);
            BigDecimal passScore = quiz.getPassScore() != null ? quiz.getPassScore() : BigDecimal.valueOf(50);
            attempt.setIsPassed(normalizedScore.compareTo(passScore) >= 0);
            attempt.setStatus((byte) 2); // GRADED

        }

        quizAttemptRepository.save(attempt);
        if (!hasFillInBlank) {
            recomputeCourseProgress(attempt.getEnrollmentId());
        }
        teacherActivityService.quizSubmitted(attempt, quiz);
        applicationEventPublisher.publishEvent(new AuditLogEvent(this, "SUBMIT_QUIZ_ATTEMPT", "QUIZ_ATTEMPT", attemptId, null, attempt));
    }

    /** Xác minh chủ sở hữu attempt trước khi dùng luồng chấm quiz hiện có. */
    @Override
    @Transactional
    public void submitQuizAttemptForUser(Long userId, Long attemptId, SubmitQuizAttemptRequest request) {
        QuizAttemptEntity attempt = quizAttemptRepository.findById(attemptId)
                .filter(item -> item.getUserId().equals(userId))
                .orElseThrow(() -> ResourceNotFoundException.of("StudentQuizAttempt", attemptId));
        QuizEntity quiz = quizRepository.findById(attempt.getQuizId())
                .orElseThrow(() -> ResourceNotFoundException.of("Quiz", attempt.getQuizId()));
        if (quiz.getDueAt() != null && LocalDateTime.now().isAfter(quiz.getDueAt())) {
            throw new BusinessException("Quiz đã hết hạn nộp bài.");
        }
        submitQuizAttempt(attemptId, request);
    }

    @Transactional
    @Override
    public void gradeFillInTheBlank(Long attemptId, GradeFillInBlankRequest request) {
        log.info("Teacher grading fill-in-blank for attempt: {}", attemptId);

        QuizAttemptEntity attempt = quizAttemptRepository.findById(attemptId)
                .orElseThrow(() -> ResourceNotFoundException.of("QuizAttempt", attemptId));

        List<QuizAnswerEntity> answers = quizAnswerRepository.findByAttemptId(attemptId);
        List<QuestionEntity> questions = questionRepository.findByQuizId(attempt.getQuizId());
        BigDecimal totalScore = BigDecimal.ZERO;

        for (QuizAnswerEntity ans : answers) {
            Optional<GradeFillInBlankRequest.QuestionGrade> gradeOpt = request.getGrades().stream()
                    .filter(g -> g.getQuestionId().equals(ans.getQuestionId()))
                    .findFirst();

            if (gradeOpt.isPresent()) {
                GradeFillInBlankRequest.QuestionGrade grade = gradeOpt.get();
                QuestionEntity question = questions.stream()
                        .filter(item -> item.getId().equals(ans.getQuestionId()))
                        .findFirst().orElseThrow(() -> ResourceNotFoundException.of("Question", ans.getQuestionId()));
                BigDecimal maximumPoints = question.getPoints() != null ? question.getPoints() : BigDecimal.ONE;
                if (grade.getPointsEarned() == null || grade.getPointsEarned().compareTo(BigDecimal.ZERO) < 0
                        || grade.getPointsEarned().compareTo(maximumPoints) > 0) {
                    throw new BusinessException("Điểm chấm câu hỏi phải nằm trong thang điểm đã cấu hình.");
                }
                ans.setIsCorrect(grade.getIsCorrect());
                ans.setPointsEarned(grade.getPointsEarned());
                quizAnswerRepository.save(ans);
            }

            if (ans.getPointsEarned() != null) {
                totalScore = totalScore.add(ans.getPointsEarned());
            }
        }

        QuizEntity quiz = quizRepository.findById(attempt.getQuizId()).orElse(null);
        BigDecimal passScore = (quiz != null && quiz.getPassScore() != null) ? quiz.getPassScore() : BigDecimal.valueOf(50);

        BigDecimal normalizedScore = normalizeQuizScore(totalScore, questions);
        attempt.setScore(normalizedScore);
        attempt.setIsPassed(normalizedScore.compareTo(passScore) >= 0);
        attempt.setStatus((byte) 2); // GRADED

        quizAttemptRepository.save(attempt);
        recomputeCourseProgress(attempt.getEnrollmentId());
    }

    /** Chuẩn hóa điểm thô theo tổng trọng số câu hỏi về thang 100. */
    private BigDecimal normalizeQuizScore(BigDecimal earnedScore, List<QuestionEntity> questions) {
        BigDecimal maximumScore = questions.stream()
                .map(question -> question.getPoints() != null ? question.getPoints() : BigDecimal.ONE)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        if (maximumScore.compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessException("Quiz chưa có tổng điểm hợp lệ.");
        }
        return earnedScore.multiply(BigDecimal.valueOf(100))
                .divide(maximumScore, 2, RoundingMode.HALF_UP);
    }

    @Transactional
    @Override
    public void sweepExpiredQuizAttempts() {
        List<QuizAttemptEntity> inProgressAttempts = quizAttemptRepository.findByStatus((byte) 0);
        LocalDateTime now = LocalDateTime.now();

        for (QuizAttemptEntity attempt : inProgressAttempts) {
            QuizEntity quiz = quizRepository.findById(attempt.getQuizId()).orElse(null);
            if (quiz != null && quiz.getTimeLimitMin() != null) {
                LocalDateTime expirationTime = attempt.getStartedAt().plusMinutes(quiz.getTimeLimitMin());
                if (now.isAfter(expirationTime)) {
                    log.info("Auto-submitting expired quiz attempt: {}", attempt.getId());
                    attempt.setStatus((byte) 3); // EXPIRED
                    attempt.setSubmittedAt(now);
                    quizAttemptRepository.save(attempt);
                    recomputeCourseProgress(attempt.getEnrollmentId());
                }
            }
        }
    }

    @Transactional
    @Override
    public Long createAssignment(CreateAssignmentRequest request) {
        log.info("Creating assignment: {}", request.getTitle());

        AssignmentEntity assignment = AssignmentEntity.builder()
                .lessonId(request.getLessonId())
                .courseId(request.getCourseId())
                .sectionId(request.getSectionId())
                .classId(request.getClassId())
                .title(request.getTitle())
                .description(request.getDescription())
                .maxScore(request.getMaxScore())
                .dueDate(request.getDueDate())
                .allowLate(request.getAllowLate())
                .status(request.getStatus())
                .build();

        AssignmentEntity saved = assignmentRepository.save(assignment);
        return saved.getId();
    }

    @Transactional
    @Override
    public Long submitAssignment(Long userId, Long assignmentId, SubmitAssignmentRequest request) {
        log.info("User {} submitting assignment {}", userId, assignmentId);

        AssignmentEntity assignment = assignmentRepository.findById(assignmentId)
                .orElseThrow(() -> ResourceNotFoundException.of("Assignment", assignmentId));

        LocalDateTime now = LocalDateTime.now();
        boolean isLate = false;

        if (assignment.getDueDate() != null && now.isAfter(assignment.getDueDate())) {
            if (Boolean.FALSE.equals(assignment.getAllowLate())) {
                throw new BusinessException("Assignment deadline has passed. Late submissions are not allowed.");
            }
            isLate = true;
        }

        EnrollmentEntity enrollment = enrollmentRepository.findByUserEntity_Id(userId).stream()
                .filter(item -> assignment.getCourseId() != null
                        && item.getCourseEntity().getId().equals(assignment.getCourseId()))
                .findFirst().orElseThrow(() -> new BusinessException("Bạn chưa ghi danh khóa học của bài tập này."));
        validateClassMembership(userId, assignment.getClassId());
        if (submissionRepository.findByAssignmentIdAndUserId(assignmentId, userId).isPresent()) {
            throw new BusinessException("Bạn đã nộp bài tập này.");
        }

        SubmissionEntity submission = SubmissionEntity.builder()
                .assignmentId(assignmentId)
                .userId(userId)
                .enrollmentId(enrollment.getId())
                .contentText(request.getContentText())
                .fileUrl(request.getFileUrl())
                .submittedAt(now)
                .isLate(isLate)
                .status((byte) 0) // SUBMITTED
                .build();

        SubmissionEntity saved = submissionRepository.save(submission);
        var activePackages = enrollmentPackageRepository.findActiveByEnrollment(enrollment.getId(), now);
        boolean selfStudy = !activePackages.isEmpty() && activePackages.stream()
                .map(item -> item.getCoursePackageEntity().getDeliveryMode())
                .allMatch(DeliveryModeEnum.SELF_STUDY::equals);
        if (!selfStudy) {
            teacherActivityService.assignmentSubmitted(saved, assignment);
        }
        return saved.getId();
    }

    /** Kiểm tra học viên là thành viên ACTIVE khi nội dung được giao riêng theo lớp. */
    private void validateClassMembership(Long userId, Long classId) {
        if (classId == null) return;
        classMemberRepository.findById_ClassIdAndId_UserId(classId, userId)
                .filter(item -> item.getStatus() == com.ailms.entity.enums.ClassMemberStatusEnum.ACTIVE
                        && item.getRoleInClass() == com.ailms.entity.enums.ClassMemberRole.STUDENT)
                .orElseThrow(() -> new BusinessException("Bạn không thuộc lớp được giao nội dung này."));
    }

    @Transactional
    @Override
    public void gradeSubmission(Long submissionId, GradeSubmissionRequest request, Long teacherUserId) {
        log.info("Teacher {} grading submission {}", teacherUserId, submissionId);

        SubmissionEntity submission = submissionRepository.findById(submissionId)
                .orElseThrow(() -> ResourceNotFoundException.of("Submission", submissionId));

        if (Boolean.TRUE.equals(request.getReturnForResubmission())) {
            submission.setStatus((byte) 2); // RETURNED for resubmission
        } else {
            submission.setScore(request.getScore());
            submission.setFeedback(request.getFeedback());
            submission.setGradedBy(teacherUserId);
            submission.setGradedAt(LocalDateTime.now());
            submission.setStatus((byte) 1); // GRADED

            recomputeCourseProgress(submission.getEnrollmentId());
        }

        submissionRepository.save(submission);
    }

    @Override
    public List<StudentProgressReportResponse> getClassProgressReport(Long classId, Long teacherUserId) {
        log.info("Generating progress report for class {} by teacher {}", classId, teacherUserId);

        List<ClassMemberEntity> members = classMemberRepository.findById_ClassId(classId);
        List<StudentProgressReportResponse> report = new ArrayList<>();

        for (ClassMemberEntity cm : members) {
            if (cm.getUserEntity() != null && cm.getRoleInClass() == com.ailms.entity.enums.ClassMemberRole.STUDENT) {
                UserEntity student = cm.getUserEntity();
                List<EnrollmentEntity> enrollments = enrollmentRepository.findByUserEntity_Id(student.getId());

                Double progressPercent = 0.0;
                BigDecimal avgQuizScore = BigDecimal.ZERO;
                Integer completedAssignments = 0;
                LocalDateTime lastAccessedAt = cm.getJoinedAt();

                if (!enrollments.isEmpty()) {
                    List<CourseProgressEntity> cpList = courseProgressRepository.findByEnrollmentId(enrollments.get(0).getId());
                    if (!cpList.isEmpty()) {
                        CourseProgressEntity cp = cpList.get(0);
                        progressPercent = cp.getProgressPercent() != null ? (double) cp.getProgressPercent() : 0.0;
                        avgQuizScore = cp.getAvgQuizScore() != null ? cp.getAvgQuizScore() : BigDecimal.ZERO;
                        completedAssignments = cp.getCompletedAssignments() != null ? cp.getCompletedAssignments() : 0;
                        lastAccessedAt = cp.getLastAccessedAt();
                    }
                }

                boolean isAtRisk = progressPercent < 30.0 || (lastAccessedAt != null && Duration.between(lastAccessedAt, LocalDateTime.now()).toDays() > 7);

                report.add(StudentProgressReportResponse.builder()
                        .studentUserId(student.getId())
                        .studentName(student.getUsername())
                        .email(student.getEmail())
                        .progressPercent(progressPercent)
                        .avgQuizScore(avgQuizScore)
                        .completedAssignments(completedAssignments)
                        .lastAccessedAt(lastAccessedAt)
                        .isAtRisk(isAtRisk)
                        .build());
            }
        }

        return report;
    }

    @Override
    public SystemDashboardResponse getSystemDashboardReport(Long categoryId) {
        long totalEnrollments = enrollmentRepository.count();
        List<CourseProgressEntity> allProgress = courseProgressRepository.findAll();

        double avgCompletionRate = allProgress.stream().mapToDouble(cp -> cp.getProgressPercent() != null ? cp.getProgressPercent() : 0.0).average().orElse(0.0);
        long totalCerts = certificateRepository.count();

        return SystemDashboardResponse.builder()
                .totalEnrollments(totalEnrollments)
                .avgCompletionRate(Math.round(avgCompletionRate * 10.0) / 10.0)
                .avgQuizScore(BigDecimal.valueOf(82.5))
                .dropoutRate(5.2)
                .totalCertificatesIssued(totalCerts)
                .build();
    }
}
