package com.ailms.service.imp;

import com.ailms.entity.*;
import com.ailms.event.AuditLogEvent;
import com.ailms.exception.DuplicateResourceException;
import com.ailms.exception.ResourceNotFoundException;
import com.ailms.mapper.StudentProfileMapper;
import com.ailms.repository.InterestRepository;
import com.ailms.repository.StudentInterestRepository;
import com.ailms.repository.StudentProfileRepository;
import com.ailms.repository.UserRepository;
import com.ailms.repository.specification.StudentProfileSpecification;
import com.ailms.request.OnboardingRequest;
import com.ailms.request.StudentProfileRequest;
import com.ailms.request.StudentProfileSearchRequest;
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

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class StudentProfileService implements IStudentProfileService {

    private final StudentProfileRepository studentProfileRepository;
    private final UserRepository userRepository;
    private final InterestRepository interestRepository;
    private final StudentInterestRepository studentInterestRepository;
    private final IStudyGoalService studyGoalService;
    private final StudentProfileMapper studentProfileMapper;
    private final ApplicationEventPublisher applicationEventPublisher;

    private static final String RESOURCE_NAME = "StudentProfile";

    @Override
    public PageResponse<StudentProfileResponse> search(StudentProfileSearchRequest request) {
        log.info("Searching StudentProfile via specification");
        Specification<StudentProfileEntity> spec = StudentProfileSpecification.filterAndSearch(request);
        Pageable pageable = request.toPageable();
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
    public StudentProfileResponse create(StudentProfileRequest request) {
        log.info("Creating student profile for user: {}", request.getUserId());

        UserEntity user = userRepository.findById(request.getUserId())
                .orElseThrow(() -> ResourceNotFoundException.of("User", request.getUserId()));

        if (studentProfileRepository.existsById(request.getUserId())) {
            throw new DuplicateResourceException("Student profile already exists for user ID: " + request.getUserId());
        }

        if (studentProfileRepository.existsByStudentCode(request.getStudentCode())) {
            throw DuplicateResourceException.of(RESOURCE_NAME, "studentCode", request.getStudentCode());
        }

        StudentProfileEntity entity = studentProfileMapper.toEntity(request);
        entity.setUserEntity(user);
        if (entity.getHasGoal() == null) {
            entity.setHasGoal(false);
        }

        StudentProfileEntity saved = studentProfileRepository.save(entity);
        applicationEventPublisher.publishEvent(new AuditLogEvent(this, "CREATE", "STUDENT_PROFILE", saved.getUserId(), null, saved));
        return studentProfileMapper.toResponse(saved);
    }

    @Transactional
    public StudentProfileResponse update(Long id, StudentProfileRequest request) {
        log.info("Updating student profile: {}", id);

        StudentProfileEntity existing = studentProfileRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of(RESOURCE_NAME, id));

        if (!existing.getStudentCode().equals(request.getStudentCode()) &&
                studentProfileRepository.existsByStudentCode(request.getStudentCode())) {
            throw DuplicateResourceException.of(RESOURCE_NAME, "studentCode", request.getStudentCode());
        }

        studentProfileMapper.updateFromRequest(request, existing);
        StudentProfileEntity updated = studentProfileRepository.save(existing);
        applicationEventPublisher.publishEvent(new AuditLogEvent(this, "UPDATE", "STUDENT_PROFILE", id, null, updated));
        return studentProfileMapper.toResponse(updated);
    }

    @Transactional
    public void delete(Long id) {
        log.info("Deleting student profile: {}", id);
        if (!studentProfileRepository.existsById(id)) {
            throw ResourceNotFoundException.of(RESOURCE_NAME, id);
        }
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
}
