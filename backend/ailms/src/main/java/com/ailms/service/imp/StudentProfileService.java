package com.ailms.service.imp;

import com.ailms.entity.*;
import com.ailms.event.AuditLogEvent;
import com.ailms.common.util.CodeGenerator;
import com.ailms.common.util.SortFieldResolver;
import com.ailms.exception.DuplicateResourceException;
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
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import jakarta.persistence.EntityManager;
import java.util.List;
import java.util.Optional;

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
    private final IStudyGoalService studyGoalService;
    private final StudentProfileMapper studentProfileMapper;
    private final SortFieldResolver sortFieldResolver;
    private final ApplicationEventPublisher applicationEventPublisher;
    private final EntityManager entityManager;

    private static final String RESOURCE_NAME = "StudentProfile";

    @Override
    public PageResponse<StudentProfileResponse> search(StudentProfileSearchRequest request) {
        log.info("Searching StudentProfile via specification");
        Specification<StudentProfileEntity> spec = StudentProfileSpecification.filterAndSearch(request);
        Pageable pageable = request.toPageable();
        if (pageable.getSort().isSorted()) {
            pageable = org.springframework.data.domain.PageRequest.of(
                    pageable.getPageNumber(),
                    pageable.getPageSize(),
                    sortFieldResolver.resolve(pageable.getSort(), StudentProfileEntity.class)
            );
        }
        Page<StudentProfileEntity> page = studentProfileRepository.findAll(spec, pageable);
        return PageResponse.from(page.map(studentProfileMapper::toResponse));
    }

    public List<StudentProfileResponse> getAll() {
        log.info("Getting all student profiles");
        return studentProfileMapper.toResponseList(studentProfileRepository.findAll());
    }

    public StudentProfileResponse getById(Long id) {
        log.info("Getting student profile by id: {}", id);
        StudentProfileEntity entity = studentProfileRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of(RESOURCE_NAME, id));
        return studentProfileMapper.toResponse(entity);
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
        java.time.LocalDateTime dob = user.getDateOfBirth();
        boolean isMinor = false;
        if (dob != null) {
            java.time.Period period = java.time.Period.between(dob.toLocalDate(), java.time.LocalDate.now());
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
        return studentProfileMapper.toResponse(entity);
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
            java.time.LocalDateTime dob = user.getDateOfBirth();
            boolean isMinor = false;
            if (dob != null) {
                java.time.Period period = java.time.Period.between(dob.toLocalDate(), java.time.LocalDate.now());
                if (period.getYears() < 18) {
                    isMinor = true;
                }
            }
            existing.setIsMinor(isMinor);
        }

        StudentProfileEntity updated = studentProfileRepository.save(existing);
        applicationEventPublisher.publishEvent(new AuditLogEvent(this, "UPDATE", "STUDENT_PROFILE", id, null, updated));
        return studentProfileMapper.toResponse(updated);
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
        return studentProfileMapper.toResponse(saved);
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
        return studentProfileMapper.toResponse(saved);
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
        return studentProfileMapper.toResponse(saved);
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
        return studentProfileMapper.toResponse(saved);
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
                .map(studentProfileMapper::toResponse)
                .orElse(null);
    }
}

