package com.ailms.service.imp;

import com.ailms.dto.GoalProgress;
import com.ailms.entity.StudyGoalEntity;
import com.ailms.entity.enums.StudyGoalStatusEnum;
import com.ailms.entity.enums.StudyGoalTypeEnum;
import com.ailms.event.AuditLogEvent;
import com.ailms.exception.ResourceNotFoundException;
import com.ailms.mapper.StudyGoalMapper;
import com.ailms.repository.StudyGoalRepository;
import com.ailms.repository.specification.StudyGoalSpecification;
import com.ailms.request.CreateStudyGoalRequest;
import com.ailms.request.StudyGoalSearchRequest;
import com.ailms.request.UpdateStudyGoalRequest;
import com.ailms.response.PageResponse;
import com.ailms.response.StudyGoalResponse;
import com.ailms.service.IStudyGoalService;
import com.ailms.service.calculator.StudyGoalProgressCalculator;

import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class StudyGoalService implements IStudyGoalService {

    private final StudyGoalRepository studyGoalRepository;
    private final StudyGoalMapper studyGoalMapper;
    private final List<StudyGoalProgressCalculator> calculatorList;
    private final ApplicationEventPublisher applicationEventPublisher;

    private Map<StudyGoalTypeEnum, StudyGoalProgressCalculator> calculatorMap;
    private static final String RESOURCE_NAME = "StudyGoal";

    /**
     * Gọi sau khi spring khởi tạo bean
     * Ánh xạ giữa từng loại mục tiêu học tập và tính toán tiến độ tương tứng
     */
    @PostConstruct
    public void init() {
        calculatorMap = new EnumMap<>(StudyGoalTypeEnum.class);
        for (StudyGoalProgressCalculator calc : calculatorList) {
            calculatorMap.put(calc.getType(), calc);
            log.info("Registered StudyGoalProgressCalculator for type: {}", calc.getType());
        }
    }

    @Override
    public PageResponse<StudyGoalResponse> search(StudyGoalSearchRequest request) {
        log.info("Searching StudyGoal via specification");
        Specification<StudyGoalEntity> spec = StudyGoalSpecification.filterAndSearch(request);
        Pageable pageable = request.toPageable();
        Page<StudyGoalEntity> page = studyGoalRepository.findAll(spec, pageable);
        return PageResponse.from(page.map(studyGoalMapper::toResponse));
    }

    @Override
    public List<StudyGoalResponse> getAll() {
        log.info("Getting all study goals");
        return studyGoalMapper.toResponseList(studyGoalRepository.findAll());
    }

    @Override
    public StudyGoalResponse getById(Long id) {
        log.info("Getting study goal by id: {}", id);
        StudyGoalEntity entity = studyGoalRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of(RESOURCE_NAME, id));
        return studyGoalMapper.toResponse(entity);
    }

    @Override
    public List<StudyGoalResponse> getByUserId(Long userId) {
        log.info("Getting study goals by user id: {}", userId);
        return studyGoalMapper.toResponseList(studyGoalRepository.findByUserId(userId));
    }

    @Override
    public List<StudyGoalResponse> getByCourseId(Long courseId) {
        log.info("Getting study goals by course id: {}", courseId);
        return studyGoalMapper.toResponseList(studyGoalRepository.findByCourseId(courseId));
    }

    @Transactional
    @Override
    public StudyGoalResponse create(CreateStudyGoalRequest request) {
        log.info("Creating study goal for user: {}", request.getUserId());
        StudyGoalEntity entity = studyGoalMapper.toEntity(request);
        StudyGoalEntity saved = studyGoalRepository.save(entity);
        applicationEventPublisher.publishEvent(new AuditLogEvent(this, "CREATE", "STUDY_GOAL", saved.getId(), null, saved));
        return studyGoalMapper.toResponse(saved);
    }

    @Transactional
    @Override
    public StudyGoalResponse update(Long id, UpdateStudyGoalRequest request) {
        log.info("Updating study goal: {}", id);
        StudyGoalEntity existing = studyGoalRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of(RESOURCE_NAME, id));
        studyGoalMapper.updateFromRequest(request, existing);
        StudyGoalEntity updated = studyGoalRepository.save(existing);
        applicationEventPublisher.publishEvent(new AuditLogEvent(this, "UPDATE", "STUDY_GOAL", id, null, updated));
        return studyGoalMapper.toResponse(updated);
    }

    @Transactional
    @Override
    public void delete(Long id) {
        log.info("Deleting study goal: {}", id);
        if (!studyGoalRepository.existsById(id)) {
            throw ResourceNotFoundException.of(RESOURCE_NAME, id);
        }
        studyGoalRepository.deleteById(id);
        applicationEventPublisher.publishEvent(new AuditLogEvent(this, "DELETE", "STUDY_GOAL", id, null, null));
    }

    // Đánh giá tiến độ và mục tiêu học tập
    @Transactional
    @Override
    public GoalProgress evaluateGoal(Long goalId) {
        log.info("Evaluating progress for study goal: {}", goalId);
        StudyGoalEntity goal = studyGoalRepository.findById(goalId)
                .orElseThrow(() -> ResourceNotFoundException.of(RESOURCE_NAME, goalId));


        StudyGoalProgressCalculator calc = calculatorMap.get(goal.getStudyGoalTypeEnum());

        // Nếu chưa đăng ký mục tiêu, trả về tiến độ mặc định
        if (calc == null) {
            log.warn("No calculator registered for goal type: {}", goal.getStudyGoalTypeEnum());
            return GoalProgress.builder().currentValue(0).targetValue(goal.getTargetValue()).isAchieved(false).build();
        }

        // Thực hiện tính toán tiến độ bằng Strategy tương ứng.
        GoalProgress progress = calc.calculateProgress(goal, LocalDateTime.now());

        // Update streak & status
        goal.setCurrentStreak(progress.getCurrentStreak());
        goal.setLongestStreak(progress.getLongestStreak());

        // Nếu đã đạt mục tiêu và trước đó chưa hoàn thành thì
        // cập nhật trạng thái sang COMPLETED.
        if (progress.isAchieved() && goal.getStatus() != StudyGoalStatusEnum.COMPLETED) {
            goal.setStatus(StudyGoalStatusEnum.COMPLETED);
            log.info("Study goal {} completed for user {}! Reward event published.", goalId, goal.getUserId());
        }

        studyGoalRepository.save(goal);
        return progress;
    }

    /**
     * Đánh giá lai tất cả mục tiêu của một người hcoj
     * @param userId
     * @return
     */
    @Transactional
    @Override
    public List<GoalProgress> evaluateUserGoals(Long userId) {
        log.info("Evaluating all active study goals for user: {}", userId);
        List<StudyGoalEntity> userGoals = studyGoalRepository.findByUserId(userId);
        List<GoalProgress> results = new ArrayList<>();

        for (StudyGoalEntity goal : userGoals) {
            results.add(evaluateGoal(goal.getId()));
        }
        return results;
    }
}
