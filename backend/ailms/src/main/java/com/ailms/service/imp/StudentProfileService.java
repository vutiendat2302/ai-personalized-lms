package com.ailms.service.imp;

import com.ailms.entity.*;
import com.ailms.entity.enums.UserStatusEnum;
import com.ailms.entity.enums.StudyGoalStatusEnum;
import com.ailms.event.AuditLogEvent;
import com.ailms.common.util.CodeGenerator;
import com.ailms.common.util.SortFieldResolver;
import com.ailms.exception.ResourceNotFoundException;
import com.ailms.mapper.StudentProfileMapper;
import com.ailms.repository.InterestRepository;
import com.ailms.repository.StudentInterestRepository;
import com.ailms.repository.StudentProfileRepository;
import com.ailms.repository.UserRepository;
import com.ailms.repository.StudyGoalRepository;
import com.ailms.repository.GuardianRepository;
import com.ailms.repository.LearningActivityLogRepository;
import com.ailms.repository.LearningSessionRepository;
import com.ailms.repository.EnrollmentRepository;
import com.ailms.repository.specification.StudentProfileSpecification;
import com.ailms.request.AssignInterestsRequest;
import com.ailms.request.OnboardingRequest;
import com.ailms.request.UpdateHasGoalRequest;
import com.ailms.request.UpdateIsMinorRequest;
import com.ailms.request.CreateStudentProfileRequest;
import com.ailms.request.StudentProfileSearchRequest;
import com.ailms.request.UpdateStudentProfileRequest;
import com.ailms.response.PageResponse;
import com.ailms.response.StudentProfileResponse;
import com.ailms.service.IStudentProfileService;
import com.ailms.service.IStudyGoalService;
import com.ailms.service.calculator.LearningStreakCalculator;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import jakarta.persistence.EntityManager;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.Period;
import java.util.*;
import java.util.function.BiFunction;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class StudentProfileService implements IStudentProfileService {

    private final StudentProfileRepository studentProfileRepository;
    private final UserRepository userRepository;
    private final InterestRepository interestRepository;
    private final StudentInterestRepository studentInterestRepository;
    private final StudyGoalRepository studyGoalRepository;
    private final GuardianRepository guardianRepository;
    private final LearningActivityLogRepository learningActivityLogRepository;
    private final LearningSessionRepository learningSessionRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final IStudyGoalService studyGoalService;
    private final StudentProfileMapper studentProfileMapper;
    private final SortFieldResolver sortFieldResolver;
    private final ApplicationEventPublisher applicationEventPublisher;
    private final EntityManager entityManager;
    private final LearningStreakCalculator learningStreakCalculator;

    private static final String RESOURCE_NAME = "StudentProfile";

    @Override
    public PageResponse<StudentProfileResponse> search(StudentProfileSearchRequest request) {
        log.info("Searching StudentProfile via specification");
        Specification<StudentProfileEntity> spec = StudentProfileSpecification.filterAndSearch(request);
        Pageable pageable = request.toPageable();
        if (pageable.getSort().isSorted()) {
            Sort managementSort = Sort.by(pageable.getSort().stream()
                    .map(order -> switch (order.getProperty()) {
                        case "fullName" -> order.withProperty("userEntity.fullName");
                        case "dateOfBirth" -> order.withProperty("userEntity.dateOfBirth");
                        case "status" -> order.withProperty("userEntity.status");
                        default -> order;
                    }).toList());
            pageable = PageRequest.of(
                    pageable.getPageNumber(),
                    pageable.getPageSize(),
                    sortFieldResolver.resolve(managementSort, StudentProfileEntity.class)
            );
        }
        Page<StudentProfileEntity> page = studentProfileRepository.findAll(spec, pageable);
        return PageResponse.from(page.map(this::toManagementResponse));
    }

    public List<StudentProfileResponse> getAll() {
        log.info("Getting all student profiles");
        return studentProfileRepository.findAll().stream().map(this::toManagementResponse).toList();
    }

    public StudentProfileResponse getById(Long id) {
        log.info("Getting student profile by id: {}", id);
        StudentProfileEntity entity = studentProfileRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of(RESOURCE_NAME, id));
        return toManagementResponse(entity);
    }

    @Transactional
    public StudentProfileResponse create(CreateStudentProfileRequest request) {
        log.info("Creating or updating student profile for user: {}", request.getUserId());

        UserEntity user = userRepository.findById(request.getUserId())
                .orElseThrow(() -> ResourceNotFoundException.of("User", request.getUserId()));

        Optional<StudentProfileEntity> existingOpt = studentProfileRepository.findById(request.getUserId());
        StudentProfileEntity entity;
        boolean isNew = existingOpt.isEmpty();

        if (isNew) {
            entity = new StudentProfileEntity();
            entity.setUserEntity(user);
            entity.setStudentCode(CodeGenerator.generate("ST", studentProfileRepository::existsByStudentCode));
        } else {
            entity = existingOpt.get();
        }

        if (request.getEducationLevel() != null) {
            entity.setEducationLevel(request.getEducationLevel());
        }
        if (request.getDescription() != null) {
            entity.setDescription(request.getDescription());
        }
        if (request.getGoal() != null) {
            entity.setGoal(request.getGoal());
        }
        if (request.getSchoolName() != null) {
            entity.setSchoolName(request.getSchoolName());
        }
        if (entity.getHasGoal() == null) {
            entity.setHasGoal(false);
        }

        // Calculate isMinor based on user's birth date
        LocalDateTime dob = user.getDateOfBirth();
        boolean isMinor = false;
        if (dob != null) {
            Period period = Period.between(dob.toLocalDate(), LocalDate.now());
            if (period.getYears() < 18) {
                isMinor = true;
            }
        }
        entity.setIsMinor(isMinor);

        if (isNew) {
            entityManager.persist(entity);
        } else {
            entity = entityManager.merge(entity);
        }
        entityManager.flush();

        applicationEventPublisher.publishEvent(new AuditLogEvent(this, "CREATE", "STUDENT_PROFILE", entity.getUserId(), null, entity));
        return toResponseWithStreak(entity);
    }

    @Transactional
    public StudentProfileResponse update(Long id, UpdateStudentProfileRequest request) {
        log.info("Updating student profile: {}", id);

        StudentProfileEntity existing = studentProfileRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of(RESOURCE_NAME, id));

        studentProfileMapper.updateFromRequest(request, existing);

        // Recalculate isMinor based on user's birth date
        UserEntity user = existing.getUserEntity();
        if (user != null) {
            LocalDateTime dob = user.getDateOfBirth();
            boolean isMinor = false;
            if (dob != null) {
                Period period = Period.between(dob.toLocalDate(), LocalDate.now());
                if (period.getYears() < 18) {
                    isMinor = true;
                }
            }
            existing.setIsMinor(isMinor);
        }

        StudentProfileEntity updated = studentProfileRepository.save(existing);
        applicationEventPublisher.publishEvent(new AuditLogEvent(this, "UPDATE", "STUDENT_PROFILE", id, null, updated));
        return toResponseWithStreak(updated);
    }

    @Transactional
    public void delete(Long id) {
        log.info("Deleting student profile and cascading user data for user ID: {}", id);
        if (!studentProfileRepository.existsById(id)) {
            throw ResourceNotFoundException.of(RESOURCE_NAME, id);
        }

        // Cascading deletes for all user-related entities
        studentInterestRepository.deleteByStudentProfile_UserId(id);
        guardianRepository.deleteByStudentProfile_UserId(id);
        studyGoalRepository.deleteByUserId(id);
        learningActivityLogRepository.deleteByUserId(id);
        learningSessionRepository.deleteByUserId(id);

        studentProfileRepository.deleteById(id);
        applicationEventPublisher.publishEvent(new AuditLogEvent(this, "DELETE", "STUDENT_PROFILE", id, null, null));
    }

    @Transactional
    @Override
    public StudentProfileResponse completeOnboarding(OnboardingRequest request) {
        log.info("Completing onboarding for student user: {}", request.getUserId());

        StudentProfileEntity profile = studentProfileRepository.findById(request.getUserId())
                .orElseThrow(() -> ResourceNotFoundException.of(RESOURCE_NAME, request.getUserId()));

        // 1. Create study goal if goal data provided
        if (request.getGoal() != null) {
            request.getGoal().setUserId(request.getUserId());
            studyGoalService.create(request.getGoal());
        }

        // 2. Create student interest entries if interest IDs provided
        if (request.getInterestIds() != null && !request.getInterestIds().isEmpty()) {
            for (Long interestId : request.getInterestIds()) {
                InterestEntity interest = interestRepository.findById(interestId)
                        .orElseThrow(() -> ResourceNotFoundException.of("Interest", interestId));

                StudentInterestId id = new StudentInterestId(profile.getUserId(), interest.getId());
                if (!studentInterestRepository.existsById(id)) {
                    StudentInterestEntity studentInterest = StudentInterestEntity.builder()
                            .id(id)
                            .studentProfile(profile)
                            .interest(interest)
                            .build();
                    studentInterestRepository.save(studentInterest);
                }
            }
        }

        // 3. Mark hasGoal = true (always performed)
        profile.setHasGoal(true);
        StudentProfileEntity saved = studentProfileRepository.save(profile);
        applicationEventPublisher.publishEvent(new AuditLogEvent(this, "ONBOARDING_COMPLETE", "STUDENT_PROFILE", saved.getUserId(), null, saved));
        return toResponseWithStreak(saved);
    }

    @Transactional
    @Override
    public StudentProfileResponse skipOnboarding(Long userId) {
        log.info("Skipping onboarding for student user: {}", userId);

        StudentProfileEntity profile = studentProfileRepository.findById(userId)
                .orElseThrow(() -> ResourceNotFoundException.of(RESOURCE_NAME, userId));

        profile.setHasGoal(true);
        StudentProfileEntity saved = studentProfileRepository.save(profile);
        applicationEventPublisher.publishEvent(new AuditLogEvent(this, "ONBOARDING_SKIP", "STUDENT_PROFILE", userId, null, saved));
        return toResponseWithStreak(saved);
    }

    @Transactional
    @Override
    public void assignInterests(Long userId, AssignInterestsRequest request) {
        log.info("Assigning interests to student user: {}", userId);

        UserEntity user = userRepository.findById(userId)
                .orElseThrow(() -> ResourceNotFoundException.of("User", userId));

        Optional<StudentProfileEntity> existingOpt = studentProfileRepository.findById(userId);
        StudentProfileEntity profile;

        if (existingOpt.isEmpty()) {
            profile = new StudentProfileEntity();
            profile.setUserEntity(user);
            profile.setStudentCode(CodeGenerator.generate("ST", studentProfileRepository::existsByStudentCode));
            profile.setHasGoal(false);
            entityManager.persist(profile);
            entityManager.flush();
        } else {
            profile = existingOpt.get();
        }

        studentInterestRepository.deleteByStudentProfile_UserId(userId);

        if (request.getInterestIds() != null && !request.getInterestIds().isEmpty()) {
            for (Long interestId : request.getInterestIds()) {
                InterestEntity interest = interestRepository.findById(interestId)
                        .orElseThrow(() -> ResourceNotFoundException.of("Interest", interestId));

                StudentInterestId id = new StudentInterestId(userId, interestId);
                StudentInterestEntity studentInterest = StudentInterestEntity.builder()
                        .id(id)
                        .studentProfile(profile)
                        .interest(interest)
                        .build();
                studentInterestRepository.save(studentInterest);
            }
        }

        applicationEventPublisher.publishEvent(new AuditLogEvent(this, "ASSIGN_INTERESTS", "STUDENT_PROFILE", userId, null, profile));
    }

    @Transactional
    @Override
    public StudentProfileResponse updateHasGoal(Long id, UpdateHasGoalRequest request) {
        log.info("Updating hasGoal status for student profile: {}", id);
        StudentProfileEntity existing = studentProfileRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of(RESOURCE_NAME, id));
        existing.setHasGoal(request.getHasGoal());
        StudentProfileEntity saved = studentProfileRepository.save(existing);
        applicationEventPublisher.publishEvent(new AuditLogEvent(this, "UPDATE_HAS_GOAL", "STUDENT_PROFILE", id, null, saved));
        return toResponseWithStreak(saved);
    }

    @Transactional
    @Override
    public StudentProfileResponse updateIsMinor(Long id, UpdateIsMinorRequest request) {
        log.info("Updating isMinor status for student profile: {}", id);
        StudentProfileEntity existing = studentProfileRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of(RESOURCE_NAME, id));
        existing.setIsMinor(request.getIsMinor());
        StudentProfileEntity saved = studentProfileRepository.save(existing);
        applicationEventPublisher.publishEvent(new AuditLogEvent(this, "UPDATE_IS_MINOR", "STUDENT_PROFILE", id, null, saved));
        return toResponseWithStreak(saved);
    }

    @Override
    public long countStudents() {
        log.info("Counting all student profiles");
        return studentProfileRepository.count();
    }

    @Override
    public StudentProfileResponse findByIdOrNull(Long id) {
        log.info("Getting student profile by id or null: {}", id);
        return studentProfileRepository.findById(id)
                .map(this::toManagementResponse)
                .orElse(null);
    }

    private StudentProfileResponse toManagementResponse(StudentProfileEntity entity) {
        StudentProfileResponse response = studentProfileMapper.toResponse(entity);
        UserEntity user = entity.getUserEntity();
        response.setId(entity.getUserId());
        if (user != null) {
            response.setFullName(user.getFullName());
            response.setEmail(user.getEmail());
            response.setPhone(user.getPhone());
            response.setAvatarUrl(user.getAvatarUrl());
            response.setGender(user.getGender());
            response.setDateOfBirth(user.getDateOfBirth());
            response.setStatus(user.getStatus() != null ? user.getStatus().name() : null);
        }
        applyStreak(response, entity.getUserId());
        response.setGoalTypes(studyGoalRepository.findByUserId(entity.getUserId()).stream()
                .map(StudyGoalEntity::getStudyGoalTypeEnum)
                .filter(Objects::nonNull)
                .map(Enum::name)
                .distinct()
                .toList());
        response.setLastActiveAt(learningActivityLogRepository.findFirstByUserIdOrderByOccurredAtDesc(entity.getUserId())
                .map(LearningActivityLogEntity::getOccurredAt).orElse(null));
        response.setHasGuardian(!guardianRepository.findByStudentProfile_UserId(entity.getUserId()).isEmpty());
        response.setEnrolledCourseName(enrollmentRepository.findByUserEntity_Id(entity.getUserId()).stream()
                .filter(enrollment -> enrollment.getCourseEntity() != null)
                .map(enrollment -> enrollment.getCourseEntity().getName())
                .findFirst().orElse(null));
        return response;
    }

    private void applyStreak(StudentProfileResponse response, Long userId) {
        LearningStreakCalculator.StreakResult streak = learningStreakCalculator.calculate(userId, LocalDate.now());
        response.setCurrentStreak(streak.currentStreak());
        response.setLongestStreak(streak.longestStreak());
    }

    private StudentProfileResponse toResponseWithStreak(StudentProfileEntity entity) {
        StudentProfileResponse response = studentProfileMapper.toResponse(entity);
        applyStreak(response, entity.getUserId());
        return response;
    }

    public Map<String, Object> getStudentOverviewStats() {
        log.info("Getting student overview stats");
        Map<String, Object> map = new HashMap<>();
        map.put("totalActiveStudents", studentProfileRepository.countStudentsByStatus(UserStatusEnum.ACTIVE));
        LocalDateTime firstDayOfMonth = LocalDate.now().withDayOfMonth(1).atStartOfDay();
        map.put("newStudentsThisMonth", studentProfileRepository.countNewStudentsSince(UserStatusEnum.ACTIVE, firstDayOfMonth));
        map.put("minorWithoutGuardian", studentProfileRepository.countMinorWithoutGuardian(UserStatusEnum.ACTIVE));
        map.put("minorWithoutEnrollment", studentProfileRepository.countMinorWithoutEnrollment(UserStatusEnum.ACTIVE));
        Map<String, Long> gender = new LinkedHashMap<>();
        studentProfileRepository.countByGenderExcluding(UserStatusEnum.DELETED).forEach(row -> gender.put(row[0] == null ? "UNKNOWN" : row[0].toString(), ((Number) row[1]).longValue()));
        Map<String, Long> statuses = new LinkedHashMap<>();
        studentProfileRepository.countByUserStatusExcluding(UserStatusEnum.DELETED).forEach(row -> statuses.put(String.valueOf(row[0]), ((Number) row[1]).longValue()));
        Map<Integer, Long> monthly = new LinkedHashMap<>();
        for (int month = 1; month <= 12; month++) monthly.put(month, 0L);
        studentProfileRepository.countMonthlyNewStudents(LocalDate.now().getYear())
                .forEach(row -> monthly.put(((Number) row[0]).intValue(), ((Number) row[1]).longValue()));
        map.put("genderDistribution", gender);
        map.put("statusDistribution", statuses);
        map.put("monthlyNewStudents", monthly);
        return map;
    }

    @Override
    public Map<String, Long> getStudentOnboardingStats() {
        log.info("Getting student onboarding stats");
        Map<String, Long> map = new HashMap<>();
        List<Object[]> rows = studentProfileRepository.countOnboardingStatus(UserStatusEnum.ACTIVE);
        for (Object[] r : rows) {
            Boolean hasGoal = (Boolean) r[0];
            Long count = (Long) r[1];
            if (Boolean.TRUE.equals(hasGoal)) {
                map.put("COMPLETED", count);
            } else {
                map.put("NOT_COMPLETED", count);
            }
        }
        return map;
    }

    @Override
    public Map<String, Long> getStudentGoalTypeStats() {
        log.info("Getting student goal type stats");
        Map<String, Long> map = new HashMap<>();
        List<Object[]> rows = studyGoalRepository.countGoalsByTypeAndStatus(StudyGoalStatusEnum.IN_PROGRESS);
        for (Object[] r : rows) {
            if (r[0] != null) {
                map.put(r[0].toString(), (Long) r[1]);
            }
        }
        return map;
    }

    @Override
    public Map<String, Object> getStudentStreakLeaderboard() {
        log.info("Getting student streak leaderboard");
        Map<String, Object> map = new HashMap<>();
        List<StudentProfileResponse> students = studentProfileRepository.findAll().stream().map(this::toManagementResponse).toList();
        BiFunction<StudentProfileResponse, Integer, Map<String, Object>> item = (student, streak) -> {
            Map<String, Object> value = new LinkedHashMap<>();
            value.put("studentCode", student.getStudentCode());
            value.put("userId", student.getUserId());
            value.put("fullName", student.getFullName());
            value.put("avatarUrl", student.getAvatarUrl());
            value.put("streak", streak);
            return value;
        };
        map.put("currentStreakTop", students.stream()
                .sorted(Comparator.comparing(StudentProfileResponse::getCurrentStreak, Comparator.nullsLast(Comparator.reverseOrder())))
                .limit(5).map(student -> item.apply(student, Optional.ofNullable(student.getCurrentStreak()).orElse(0))).toList());
        map.put("longestStreakTop", students.stream()
                .sorted(Comparator.comparing(StudentProfileResponse::getLongestStreak, Comparator.nullsLast(Comparator.reverseOrder())))
                .limit(5).map(student -> item.apply(student, Optional.ofNullable(student.getLongestStreak()).orElse(0))).toList());
        return map;
    }

    @Override
    public Map<String, Long> getStudentActivityTrend30Days() {
        log.info("Getting student 30-day activity trend");
        Map<String, Long> trendMap = new LinkedHashMap<>();
        LocalDate today =   LocalDate.now();
        for (int i = 29; i >= 0; i--) trendMap.put(today.minusDays(i).toString(), 0L);
        for (Object[] row : learningActivityLogRepository.countActivityByDaySince(today.minusDays(29).atStartOfDay())) {
            trendMap.put(String.valueOf(row[0]), ((Number) row[1]).longValue());
        }
        return trendMap;
    }

    @Override
    public List<Map<String, Object>> getStudentActivityDetails(LocalDate date) {
        LocalDate selectedDate = Optional.ofNullable(date).orElse(LocalDate.now());
        return learningActivityLogRepository
                .findByOccurredAtGreaterThanEqualAndOccurredAtLessThanOrderByOccurredAtDesc(
                        selectedDate.atStartOfDay(), selectedDate.plusDays(1).atStartOfDay())
                .stream().map(activity -> {
                    Map<String, Object> item = new LinkedHashMap<>();
                    item.put("id", activity.getId());
                    item.put("userId", activity.getUserId());
                    userRepository.findById(activity.getUserId()).ifPresent(user -> {
                        item.put("fullName", user.getFullName());
                        item.put("email", user.getEmail());
                    });
                    item.put("eventType", activity.getEventType());
                    item.put("entityType", activity.getEntityType());
                    item.put("entityId", activity.getEntityId());
                    if (activity.getEntityId() != null && "LESSON".equalsIgnoreCase(activity.getEntityType())) {
                        LessonEntity lesson = entityManager.find(LessonEntity.class, activity.getEntityId());
                        if (lesson != null) {
                            item.put("entityName", lesson.getName());
                            if (lesson.getCourseSectionEntity() != null && lesson.getCourseSectionEntity().getCourseEntity() != null) {
                                CourseEntity course = lesson.getCourseSectionEntity().getCourseEntity();
                                item.put("courseId", course.getId()); item.put("courseName", course.getName());
                            }
                        }
                    } else if (activity.getEntityId() != null && "COURSE".equalsIgnoreCase(activity.getEntityType())) {
                        CourseEntity course = entityManager.find(CourseEntity.class, activity.getEntityId());
                        if (course != null) { item.put("entityName", course.getName()); item.put("courseId", course.getId()); item.put("courseName", course.getName()); }
                    } else if (activity.getEntityId() != null && "CLASS".equalsIgnoreCase(activity.getEntityType())) {
                        ClassEntity clazz = entityManager.find(ClassEntity.class, activity.getEntityId());
                        if (clazz != null) { item.put("entityName", clazz.getName()); item.put("className", clazz.getName());
                            if (clazz.getCourseEntity() != null) { item.put("courseId", clazz.getCourseEntity().getId()); item.put("courseName", clazz.getCourseEntity().getName()); }
                        }
                    } else if (activity.getEntityId() != null && "QUIZ".equalsIgnoreCase(activity.getEntityType())) {
                        QuizEntity quiz = entityManager.find(QuizEntity.class, activity.getEntityId());
                        if (quiz != null) { item.put("entityName", quiz.getTitle()); item.put("courseId", quiz.getCourseId());
                            if (quiz.getCourseId() != null) { CourseEntity course = entityManager.find(CourseEntity.class, quiz.getCourseId()); if (course != null) item.put("courseName", course.getName()); }
                        }
                    }
                    item.put("metadata", activity.getMetadata());
                    item.put("device", activity.getDevice());
                    item.put("occurredAt", activity.getOccurredAt());
                    return item;
                }).toList();
    }

    @Override
    public long getInactiveStudentCount(int days) {
        log.info("Getting inactive student count over {} days", days);
        LocalDateTime cutoff = LocalDateTime.now().minusDays(Math.max(1, days));
        return studentProfileRepository.findAll().stream()
                .filter(student -> student.getUserEntity() != null && student.getUserEntity().getStatus() == UserStatusEnum.ACTIVE)
                .filter(student -> learningActivityLogRepository.findFirstByUserIdOrderByOccurredAtDesc(student.getUserId())
                        .map(logEntry -> logEntry.getOccurredAt() == null || logEntry.getOccurredAt().isBefore(cutoff)).orElse(true))
                .count();
    }

    @Override
    public Map<String, Long> getTopStudentInterests() {
        log.info("Getting complete student interest distribution");
        Map<String, Long> selectedCounts = new HashMap<>();
        List<Object[]> rows = studentInterestRepository.countInterestsGroupedByName();
        for (Object[] r : rows) {
            String name = (String) r[0];
            long count = ((Number) r[1]).longValue();
            selectedCounts.put(name, count);
        }

        Map<String, Long> map = new LinkedHashMap<>();
        interestRepository.findAll().stream()
                .filter(interest -> interest.getName() != null && !interest.getName().isBlank())
                .sorted(Comparator
                        .comparingLong((InterestEntity interest) ->
                                selectedCounts.getOrDefault(interest.getName(), 0L))
                        .reversed()
                        .thenComparing(InterestEntity::getName, String.CASE_INSENSITIVE_ORDER))
                .forEach(interest -> map.put(interest.getName(), selectedCounts.getOrDefault(interest.getName(), 0L)));
        return map;
    }

    @Override
    public List<String> getStudentInterestNames(Long userId) {
        return studentInterestRepository.findByStudentProfile_UserId(userId).stream()
                .filter(item -> item.getInterest() != null && item.getInterest().getName() != null)
                .map(item -> item.getInterest().getName())
                .sorted(String.CASE_INSENSITIVE_ORDER)
                .toList();
    }
}
