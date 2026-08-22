package com.ailms.service.imp;

import com.ailms.entity.*;
import com.ailms.entity.enums.*;
import com.ailms.event.AuditLogEvent;
import com.ailms.common.util.CodeGenerator;
import com.ailms.exception.BusinessException;
import com.ailms.exception.ResourceNotFoundException;
import com.ailms.exception.UnauthorizedException;
import com.ailms.mapper.*;
import com.ailms.repository.*;
import com.ailms.request.*;
import com.ailms.response.*;
import com.ailms.security.CustomUserDetails;
import com.ailms.service.ICourseAuthoringService;
import com.ailms.service.IEmailService;
import com.ailms.service.INotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class CourseAuthoringService implements ICourseAuthoringService {

    private static final String QUIZ_CODE_PREFIX = "QZ";

    private final CourseRepository courseRepository;
    private final CourseSectionRepository courseSectionRepository;
    private final LessonRepository lessonRepository;
    private final LessonProgressRepository lessonProgressRepository;
    private final QuizRepository quizRepository;
    private final QuestionRepository questionRepository;
    private final QuestionOptionRepository questionOptionRepository;
    private final AssignmentRepository assignmentRepository;
    private final SubmissionRepository submissionRepository;
    private final CourseInstructorRepository courseInstructorRepository;
    private final CourseTeacherRepository courseTeacherRepository;
    private final UserRepository userRepository;
    private final EmployeeRepository employeeRepository;
    private final INotificationService notificationService;
    private final IEmailService emailService;
    private final LessonMapper lessonMapper;
    private final CourseSectionMapper courseSectionMapper;
    private final QuizMapper quizMapper;
    private final AssignmentMapper assignmentMapper;
    private final CourseMapper courseMapper;
    private final SubmissionMapper submissionMapper;
    private final LessonResourceMapper lessonResourceMapper;
    private final FileService fileService;
    private final ApprovalRequestRepository approvalRequestRepository;
    private final UserRoleRepository userRoleRepository;
    private final ApplicationEventPublisher applicationEventPublisher;

    @Override
    public CourseCurriculumResponse getCurriculum(Long courseId) {
        return buildCurriculum(courseId, true);
    }

    /** Lấy curriculum học viên và loại bỏ cờ đáp án đúng khỏi mọi phương án. */
    @Override
    public CourseCurriculumResponse getLearningCurriculum(Long courseId) {
        return buildCurriculum(courseId, false);
    }

    /** Dựng curriculum theo ngữ cảnh tác giả hoặc học viên. */
    private CourseCurriculumResponse buildCurriculum(Long courseId, boolean includeCorrectAnswers) {
        log.info("Getting curriculum for courseId: {}", courseId);
        CourseEntity course = courseRepository.findById(courseId)
                .orElseThrow(() -> ResourceNotFoundException.of("Course", courseId));

        List<CourseSectionEntity> sections = courseSectionRepository.findByCourseEntity_IdOrderByOrderIndexAsc(courseId);

        // Final Exam Quizzes and Assignments (sectionId=null, lessonId=null)
        List<QuizEntity> finalQuizzes = quizRepository.findByCourseId(courseId).stream()
                .filter(q -> q.getSectionId() == null && q.getLessonId() == null)
                .filter(q -> includeCorrectAnswers || q.getStatus() == BaseStatusEnum.ACTIVE)
                .collect(Collectors.toList());
        List<AssignmentEntity> finalAssignments = assignmentRepository.findByCourseId(courseId).stream()
                .filter(a -> a.getSectionId() == null && a.getLessonId() == null)
                .filter(a -> includeCorrectAnswers || a.getStatus() == BaseStatusEnum.ACTIVE)
                .collect(Collectors.toList());

        List<CourseCurriculumResponse.SectionCurriculumItem> sectionItems = sections.stream()
                .map(section -> buildSectionItem(section, includeCorrectAnswers))
                .collect(Collectors.toList());

        int totalLessons = sectionItems.stream()
                .mapToInt(s -> s.getLessons() != null ? s.getLessons().size() : 0).sum();
        int totalDurationMin = sections.stream()
                .flatMap(s -> s.getLessonEntities().stream())
                .mapToInt(l -> l.getDurationMin() != null ? l.getDurationMin() : 0).sum();

        return CourseCurriculumResponse.builder()
                .courseId(courseId)
                .courseName(course.getName())
                .status(course.getStatus() != null ? course.getStatus().name() : null)
                .createdBy(course.getCreatedBy())
                .sections(sectionItems)
                .finalExamQuizzes(finalQuizzes.stream()
                        .map(quiz -> mapQuizToResponse(quiz, includeCorrectAnswers)).collect(Collectors.toList()))
                .finalExamAssignments(finalAssignments.stream().map(assignmentMapper::toResponse).collect(Collectors.toList()))
                .totalLessons(totalLessons)
                .totalDurationMin(totalDurationMin)
                .build();
    }

    /** Dựng một chương và truyền chính sách hiển thị đáp án xuống các quiz con. */
    private CourseCurriculumResponse.SectionCurriculumItem buildSectionItem(
            CourseSectionEntity section, boolean includeCorrectAnswers) {
        List<QuizEntity> chapterQuizzes = quizRepository.findBySectionId(section.getId()).stream()
                .filter(q -> q.getLessonId() == null)
                .filter(q -> includeCorrectAnswers || q.getStatus() == BaseStatusEnum.ACTIVE)
                .collect(Collectors.toList());
        List<AssignmentEntity> chapterAssignments = assignmentRepository.findBySectionId(section.getId()).stream()
                .filter(a -> a.getLessonId() == null)
                .filter(a -> includeCorrectAnswers || a.getStatus() == BaseStatusEnum.ACTIVE)
                .collect(Collectors.toList());

        List<CourseCurriculumResponse.LessonCurriculumItem> lessonItems = section.getLessonEntities().stream()
                .filter(l -> l.getStatus() == null || !BaseStatusEnum.INACTIVE.equals(l.getStatus()))
                .map(lesson -> buildLessonItem(lesson, includeCorrectAnswers))
                .collect(Collectors.toList());

        return CourseCurriculumResponse.SectionCurriculumItem.builder()
                .id(section.getId())
                .name(section.getName())
                .orderIndex(section.getOrderIndex())
                .status(section.getStatus() != null ? section.getStatus().name() : null)
                .chapterQuizzes(chapterQuizzes.stream()
                        .map(quiz -> mapQuizToResponse(quiz, includeCorrectAnswers)).collect(Collectors.toList()))
                .chapterAssignments(chapterAssignments.stream().map(assignmentMapper::toResponse).collect(Collectors.toList()))
                .lessons(lessonItems)
                .build();
    }

    /** Dựng lesson cùng assessment và tài nguyên theo ngữ cảnh truy cập. */
    private CourseCurriculumResponse.LessonCurriculumItem buildLessonItem(
            LessonEntity lesson, boolean includeCorrectAnswers) {
        QuizResponse linkedQuiz = null;
        AssignmentResponse linkedAssignment = null;

        List<QuizEntity> quizzes = quizRepository.findByLessonId(lesson.getId());
        linkedQuiz = quizzes.stream()
                .filter(quiz -> includeCorrectAnswers || quiz.getStatus() == BaseStatusEnum.ACTIVE)
                .findFirst().map(quiz -> mapQuizToResponse(quiz, includeCorrectAnswers)).orElse(null);

        List<AssignmentEntity> assignments = assignmentRepository.findByLessonId(lesson.getId());
        linkedAssignment = assignments.stream()
                .filter(assignment -> includeCorrectAnswers || assignment.getStatus() == BaseStatusEnum.ACTIVE)
                .findFirst().map(assignmentMapper::toResponse).orElse(null);

        List<ResourceResponse> resourceResponses = null;
        if (lesson.getResources() != null && !lesson.getResources().isEmpty()) {
            resourceResponses = lesson.getResources().stream()
                    .map(r -> {
                        ResourceResponse resp = lessonResourceMapper.toResponse(r);
                        if (r.getFileMetadata() != null) {
                            resp.setFileUrl(fileService.getDownloadUrl(r.getFileMetadata().getFileKey()));
                        }
                        return resp;
                    })
                    .collect(Collectors.toList());
        }

        return CourseCurriculumResponse.LessonCurriculumItem.builder()
                .id(lesson.getId())
                .name(lesson.getName())
                .contentType(lesson.getContentType())
                .contentUrl(lesson.getContentUrl())
                .description(lesson.getDescription())
                .durationMin(lesson.getDurationMin())
                .durationSec(lesson.getDurationSec())
                .orderIndex(lesson.getOrderIndex())
                .previewType(lesson.getPreviewType() != null ? lesson.getPreviewType().name() : null)
                .status(lesson.getStatus() != null ? lesson.getStatus().name() : null)
                .linkedQuiz(linkedQuiz)
                .linkedAssignment(linkedAssignment)
                .resources(resourceResponses)
                .build();
    }

    @Override
    @Transactional
    public SectionResponse addSection(Long courseId, CreateSectionRequest request) {
        log.info("Adding section to courseId: {}", courseId);
        CourseEntity course = requireEditableCourse(courseId);

        List<CourseSectionEntity> existingSections = courseSectionRepository.findByCourseEntity_IdOrderByOrderIndexAsc(courseId);
        long activeCount = existingSections.stream()
                .filter(s -> s.getStatus() == null || !BaseStatusEnum.INACTIVE.equals(s.getStatus()))
                .count();
        if (activeCount >= 20) {
            throw new BusinessException("Mỗi khóa học chỉ được phép tạo tối đa 20 chương học!");
        }

        int nextOrder = existingSections.size();
        CourseSectionEntity section = CourseSectionEntity.builder()
                .courseEntity(course)
                .name(request.getName())
                .orderIndex(nextOrder)
                .status(BaseStatusEnum.ACTIVE)
                .build();
        CourseSectionEntity saved = courseSectionRepository.save(section);
        return courseSectionMapper.toResponse(saved);
    }

    @Override
    @Transactional
    public SectionResponse updateSection(Long sectionId, UpdateSectionRequest request) {
        log.info("Updating sectionId: {}", sectionId);
        CourseSectionEntity section = courseSectionRepository.findById(sectionId)
                .orElseThrow(() -> ResourceNotFoundException.of("Section", sectionId));
        requireEditableCourse(section.getCourseEntity().getId());
        if (request.getName() != null) section.setName(request.getName());
        if (request.getStatus() != null) section.setStatus(request.getStatus());
        return courseSectionMapper.toResponse(courseSectionRepository.save(section));
    }

    @Override
    @Transactional
    public void deleteSection(Long sectionId) {
        log.info("Deleting sectionId: {}", sectionId);
        CourseSectionEntity section = courseSectionRepository.findById(sectionId)
                .orElseThrow(() -> ResourceNotFoundException.of("Section", sectionId));
        requireEditableCourse(section.getCourseEntity().getId());

        long activeLessons = section.getLessonEntities().stream()
                .filter(l -> !BaseStatusEnum.INACTIVE.equals(l.getStatus()))
                .count();
        if (activeLessons > 0) {
            throw new BusinessException("Không thể xóa chương học còn chứa bài học. Hãy xóa hết bài học trước.");
        }
        section.setStatus(BaseStatusEnum.INACTIVE);
        courseSectionRepository.save(section);
    }

    @Override
    @Transactional
    public void reorderSections(Long courseId, ReorderRequest request) {
        log.info("Reordering sections for courseId: {}", courseId);
        requireEditableCourse(courseId);
        List<Long> ids = request.getIds();
        for (int i = 0; i < ids.size(); i++) {
            final int order = i;
            courseSectionRepository.findById(ids.get(i)).ifPresent(s -> {
                s.setOrderIndex(order);
                courseSectionRepository.save(s);
            });
        }
    }

    @Override
    @Transactional
    public LessonResponse addLesson(Long sectionId, CreateLessonRequest request) {
        log.info("Adding lesson to sectionId: {}", sectionId);
        CourseSectionEntity section = courseSectionRepository.findById(sectionId)
                .orElseThrow(() -> ResourceNotFoundException.of("Section", sectionId));
        requireEditableCourse(section.getCourseEntity().getId());

        int nextOrder = lessonRepository.countByCourseSectionEntityId(sectionId);
        LessonEntity lesson = lessonMapper.toEntity(request);
        lesson.setCourseSectionEntity(section);
        if (lesson.getOrderIndex() == null) lesson.setOrderIndex(nextOrder);
        if (lesson.getStatus() == null) lesson.setStatus(BaseStatusEnum.ACTIVE);
        return lessonMapper.toResponse(lessonRepository.save(lesson));
    }

    @Override
    @Transactional
    public LessonResponse updateLesson(Long lessonId, UpdateLessonRequest request) {
        log.info("Updating lessonId: {}", lessonId);
        LessonEntity lesson = lessonRepository.findById(lessonId)
                .orElseThrow(() -> ResourceNotFoundException.of("Lesson", lessonId));
        requireEditableCourse(lesson.getCourseSectionEntity().getCourseEntity().getId());
        lessonMapper.updateEntityFromRequest(request, lesson);
        return lessonMapper.toResponse(lessonRepository.save(lesson));
    }

    @Override
    @Transactional
    public void deleteLesson(Long lessonId) {
        log.info("Deleting/deactivating lessonId: {}", lessonId);
        LessonEntity lesson = lessonRepository.findById(lessonId)
                .orElseThrow(() -> ResourceNotFoundException.of("Lesson", lessonId));
        requireEditableCourse(lesson.getCourseSectionEntity().getCourseEntity().getId());

        boolean hasProgress = !lessonProgressRepository.findByLessonId(lessonId).isEmpty();
        if (hasProgress) {
            lesson.setStatus(BaseStatusEnum.INACTIVE);
            lessonRepository.save(lesson);
            log.info("Lesson {} soft-deleted (INACTIVE) because lesson progress records exist", lessonId);
        } else {
            lessonRepository.delete(lesson);
            log.info("Lesson {} hard-deleted", lessonId);
        }
    }

    @Override
    @Transactional
    public void reorderLessons(Long sectionId, ReorderRequest request) {
        log.info("Reordering lessons in sectionId: {}", sectionId);
        CourseSectionEntity sourceSection = courseSectionRepository.findById(sectionId)
                .orElseThrow(() -> ResourceNotFoundException.of("Section", sectionId));
        requireEditableCourse(sourceSection.getCourseEntity().getId());
        List<Long> ids = request.getIds();
        for (int i = 0; i < ids.size(); i++) {
            final int order = i;
            lessonRepository.findById(ids.get(i)).ifPresent(l -> {
                l.setOrderIndex(order);
                if (request.getTargetSectionId() != null) {
                    courseSectionRepository.findById(request.getTargetSectionId())
                            .ifPresent(l::setCourseSectionEntity);
                }
                lessonRepository.save(l);
            });
        }
    }

    /** Ánh xạ quiz cùng câu hỏi và phương án từ các bảng quan hệ làm nguồn dữ liệu chính. */
    private QuizResponse mapQuizToResponse(QuizEntity quiz) {
        return mapQuizToResponse(quiz, true);
    }

    /** Ánh xạ quiz và chỉ trả cờ đáp án đúng cho giao diện tác giả. */
    private QuizResponse mapQuizToResponse(QuizEntity quiz, boolean includeCorrectAnswers) {
        if (quiz == null) return null;
        QuizResponse response = quizMapper.toResponse(quiz);
        List<QuizQuestionResponse> questions = questionRepository.findByQuizIdOrderByOrderIndexAsc(quiz.getId()).stream()
                .map(question -> QuizQuestionResponse.builder()
                        .id(question.getId())
                        .content(question.getContent())
                        .questionType(QuestionTypeEnum.apiName(question.getQuestionType()))
                        .points(question.getPoints())
                        .orderIndex(question.getOrderIndex())
                        .explanation(question.getExplanation())
                        .options(questionOptionRepository.findByQuestionIdOrderByOrderIndexAsc(question.getId()).stream()
                                .map(option -> QuizQuestionOptionResponse.builder()
                                        .id(option.getId())
                                        .content(option.getContent())
                                        .isCorrect(includeCorrectAnswers ? option.getIsCorrect() : null)
                                        .orderIndex(option.getOrderIndex())
                                        .build())
                                .toList())
                        .build())
                .toList();
        response.setQuestions(questions);
        return response;
    }

    /** Thay thế atomically danh sách câu hỏi của quiz sau khi kiểm tra quy tắc đáp án. */
    private void synchronizeQuizQuestions(Long quizId, List<QuizQuestionRequest> questions) {
        if (questions == null) return;

        List<QuestionEntity> oldQuestions = questionRepository.findByQuizId(quizId);
        oldQuestions.forEach(question -> questionOptionRepository.deleteByQuestionId(question.getId()));
        questionRepository.deleteByQuizId(quizId);

        for (int questionIndex = 0; questionIndex < questions.size(); questionIndex++) {
            QuizQuestionRequest request = questions.get(questionIndex);
            QuestionTypeEnum type = QuestionTypeEnum.fromName(request.getQuestionType());
            validateQuestionOptions(request, type, questionIndex);
            QuestionEntity savedQuestion = questionRepository.save(QuestionEntity.builder()
                    .quizId(quizId)
                    .content(request.getContent().trim())
                    .questionType(type.getCode())
                    .points(request.getPoints() != null ? request.getPoints() : BigDecimal.ONE)
                    .orderIndex(questionIndex)
                    .explanation(request.getExplanation())
                    .status((byte) 1)
                    .build());

            for (int optionIndex = 0; optionIndex < request.getOptions().size(); optionIndex++) {
                QuizQuestionOptionRequest option = request.getOptions().get(optionIndex);
                questionOptionRepository.save(QuestionOptionEntity.builder()
                        .questionId(savedQuestion.getId())
                        .content(option.getContent().trim())
                        .isCorrect(Boolean.TRUE.equals(option.getIsCorrect()))
                        .orderIndex(optionIndex)
                        .build());
            }
        }
    }

    /** Kiểm tra số đáp án đúng phù hợp với loại câu hỏi trước khi ghi database. */
    private void validateQuestionOptions(QuizQuestionRequest request, QuestionTypeEnum type, int questionIndex) {
        if (request.getOptions() == null || request.getOptions().isEmpty()) {
            throw new BusinessException("Câu hỏi " + (questionIndex + 1) + " phải có phương án trả lời.");
        }
        long correctCount = request.getOptions().stream().filter(option -> Boolean.TRUE.equals(option.getIsCorrect())).count();
        if ((type == QuestionTypeEnum.SINGLE_CHOICE || type == QuestionTypeEnum.TRUE_FALSE) && correctCount != 1) {
            throw new BusinessException("Câu hỏi " + (questionIndex + 1) + " phải có đúng một đáp án đúng.");
        }
        if (type == QuestionTypeEnum.MULTIPLE_CHOICE && correctCount < 1) {
            throw new BusinessException("Câu hỏi " + (questionIndex + 1) + " phải có ít nhất một đáp án đúng.");
        }
    }

    @Override
    @Transactional
    public QuizResponse createQuiz(QuizRequest request) {
        log.info("Creating quiz for courseId: {}, sectionId: {}, lessonId: {}",
                request.getCourseId(), request.getSectionId(), request.getLessonId());
        Long courseId = request.getCourseId() == null && request.getSectionId() == null && request.getLessonId() == null
                ? null
                : resolveCourseId(request.getCourseId(), request.getSectionId(), request.getLessonId());
        if (courseId != null) {
            requireEditableCourse(courseId);
        }
        request.setCourseId(courseId);
        QuizEntity quiz = quizMapper.toEntity(request);
        quiz.setCode(CodeGenerator.generate(QUIZ_CODE_PREFIX, quizRepository::existsByCode));
        if (quiz.getStatus() == null) quiz.setStatus(BaseStatusEnum.DRAFT);
        QuizEntity saved = quizRepository.save(quiz);
        synchronizeQuizQuestions(saved.getId(), request.getQuestions());
        return mapQuizToResponse(saved);
    }

    @Override
    @Transactional
    public QuizResponse updateQuiz(Long quizId, QuizRequest request) {
        log.info("Updating quizId: {}", quizId);
        QuizEntity quiz = quizRepository.findById(quizId)
                .orElseThrow(() -> ResourceNotFoundException.of("Quiz", quizId));
        Long courseId = resolveCourseId(quiz.getCourseId(), quiz.getSectionId(), quiz.getLessonId());
        requireEditableCourse(courseId);
        request.setCourseId(courseId);
        quizMapper.updateFromRequest(request, quiz);
        QuizEntity saved = quizRepository.save(quiz);
        synchronizeQuizQuestions(saved.getId(), request.getQuestions());
        return mapQuizToResponse(saved);
    }

    @Override
    @Transactional
    public AssignmentResponse createAssignment(CreateAssignmentRequest request) {
        log.info("Creating assignment");
        Long courseId = resolveCourseId(request.getCourseId(), request.getSectionId(), request.getLessonId());
        requireEditableCourse(courseId);
        request.setCourseId(courseId);
        if (request.getMaxScore() == null) {
            request.setMaxScore(BigDecimal.valueOf(10.0));
        }
        AssignmentEntity assignment = assignmentMapper.toEntity(request);
        if (assignment.getStatus() == null) assignment.setStatus(BaseStatusEnum.DRAFT);
        return assignmentMapper.toResponse(assignmentRepository.save(assignment));
    }

    @Override
    @Transactional
    public AssignmentResponse updateAssignment(Long assignmentId, AssignmentRequest request) {
        log.info("Updating assignmentId: {}", assignmentId);
        AssignmentEntity assignment = assignmentRepository.findById(assignmentId)
                .orElseThrow(() -> ResourceNotFoundException.of("Assignment", assignmentId));
        Long courseId = resolveCourseId(assignment.getCourseId(), assignment.getSectionId(), assignment.getLessonId());
        requireEditableCourse(courseId);
        request.setCourseId(courseId);
        assignmentMapper.updateFromRequest(request, assignment);
        return assignmentMapper.toResponse(assignmentRepository.save(assignment));
    }

    private Long getCurrentUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.isAuthenticated() && !(authentication instanceof AnonymousAuthenticationToken)) {
            Object principal = authentication.getPrincipal();
            if (principal instanceof CustomUserDetails userDetails) {
                return userDetails.getUser().getId();
            }
        }
        return null;
    }

    /** Xác định course cha từ context assessment và chặn context mâu thuẫn. */
    private Long resolveCourseId(Long courseId, Long sectionId, Long lessonId) {
        Long resolved = courseId;
        if (lessonId != null) {
            LessonEntity lesson = lessonRepository.findById(lessonId)
                    .orElseThrow(() -> ResourceNotFoundException.of("Lesson", lessonId));
            Long lessonCourseId = lesson.getCourseSectionEntity().getCourseEntity().getId();
            if (resolved != null && !resolved.equals(lessonCourseId)) {
                throw new BusinessException("Lesson không thuộc khóa học đã chọn.");
            }
            resolved = lessonCourseId;
        } else if (sectionId != null) {
            CourseSectionEntity section = courseSectionRepository.findById(sectionId)
                    .orElseThrow(() -> ResourceNotFoundException.of("Section", sectionId));
            Long sectionCourseId = section.getCourseEntity().getId();
            if (resolved != null && !resolved.equals(sectionCourseId)) {
                throw new BusinessException("Chương học không thuộc khóa học đã chọn.");
            }
            resolved = sectionCourseId;
        }
        if (resolved == null) {
            throw new BusinessException("Quiz hoặc assignment phải thuộc một khóa học.");
        }
        return resolved;
    }

    /** Chỉ cho phép chủ sở hữu, giảng viên phụ trách đã xác nhận hoặc Admin sửa khóa học ở trạng thái có thể biên soạn. */
    private CourseEntity requireEditableCourse(Long courseId) {
        CourseEntity course = courseRepository.findById(courseId)
                .orElseThrow(() -> ResourceNotFoundException.of("Course", courseId));
        verifyCourseOwner(course, getCurrentUserId());
        if (course.getStatus() != CourseStatusEnum.DRAFT && course.getStatus() != CourseStatusEnum.REJECTED) {
            throw new BusinessException("Chỉ được chỉnh sửa khóa học ở trạng thái DRAFT hoặc REJECTED.");
        }
        return course;
    }

    private void verifyCourseOwner(CourseEntity course, Long currentUserId) {
        if (course == null) return;
        if (currentUserId == null) {
            throw new UnauthorizedException("Vui lòng đăng nhập để thực hiện thao tác này.");
        }
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getAuthorities() != null) {
            boolean isAdmin = auth.getAuthorities().stream()
                    .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN") || a.getAuthority().equals("ROLE_MANAGER"));
            if (isAdmin) return;
        }

        if (course.getCreatedBy() != null && course.getCreatedBy().equals(currentUserId)) {
            return;
        }
        boolean acceptedCoInstructor = courseInstructorRepository.existsByCourseIdAndInstructorIdAndStatus(
                course.getId(), currentUserId, CourseInstructorStatusEnum.ACCEPTED);
        boolean activeAssignedTeacher = courseTeacherRepository
                .existsByCourseEntity_IdAndUserEntity_IdAndStatus(
                        course.getId(), currentUserId, CourseTeacherStatusEnum.ACTIVE);
        if (!acceptedCoInstructor && !activeAssignedTeacher) {
            throw new BusinessException("Chỉ người tạo hoặc giảng viên phụ trách khóa học mới có quyền thực hiện thao tác này.");
        }
    }

    @Override
    @Transactional
    public CourseResponse submitForReview(Long courseId) {
        log.info("Submitting courseId {} for review", courseId);
        CourseEntity course = courseRepository.findById(courseId)
                .orElseThrow(() -> ResourceNotFoundException.of("Course", courseId));

        Long currentUserId = getCurrentUserId();
        verifyCourseOwner(course, currentUserId);

        CourseStatusEnum currentStatus = course.getStatus();
        if (currentStatus != CourseStatusEnum.DRAFT && currentStatus != CourseStatusEnum.REJECTED) {
            throw new BusinessException("Chỉ khóa học ở trạng thái DRAFT hoặc REJECTED mới có thể gửi duyệt. Trạng thái hiện tại: " + currentStatus);
        }

        List<CourseSectionEntity> sections = courseSectionRepository.findByCourseEntity_IdOrderByOrderIndexAsc(courseId);
        if (sections.isEmpty()) {
            throw new BusinessException("Khóa học phải có ít nhất 1 chương học trước khi gửi duyệt.");
        }
        boolean hasLesson = sections.stream().anyMatch(s -> s.getLessonEntities() != null && !s.getLessonEntities().isEmpty());
        if (!hasLesson) {
            throw new BusinessException("Khóa học phải có ít nhất 1 bài học trước khi gửi duyệt.");
        }
        validateCourseForReview(course, sections);

        course.setStatus(CourseStatusEnum.PENDING);
        CourseEntity saved = courseRepository.save(course);
        ApprovalRequestEntity approvalRequest = ApprovalRequestEntity.builder()
                .targetType("COURSE")
                .targetId(courseId)
                .level(1)
                .totalLevels(1)
                .status(ApprovalStatusEnum.PENDING)
                .createdBy(currentUserId)
                .createdAt(LocalDateTime.now())
                .build();
        approvalRequestRepository.save(approvalRequest);
        userRoleRepository.findAdminAndHrUsers().forEach(recipient ->
                notificationService.createSystemNotification(
                        recipient,
                        NotificationTypeEnum.GENERAL,
                        "Khóa học mới chờ phê duyệt",
                        "Khóa học '" + saved.getName() + "' đã được gửi duyệt.",
                        saved.getId(),
                        "/admin/approvals?section=COURSES"
                ));
        applicationEventPublisher.publishEvent(new AuditLogEvent(
                this, "SUBMIT_FOR_REVIEW", "COURSE", courseId, null, saved));
        return courseMapper.toResponse(saved);
    }

    /** Kiểm tra tài nguyên và assessment thật trước khi cho course vào hàng đợi duyệt. */
    private void validateCourseForReview(CourseEntity course, List<CourseSectionEntity> sections) {
        if (!StringUtils.hasText(course.getThumbnailUrl())) {
            throw new BusinessException("Khóa học phải có ảnh đại diện trước khi gửi duyệt.");
        }
        for (CourseSectionEntity section : sections) {
            if (section.getStatus() == BaseStatusEnum.INACTIVE) continue;
            for (LessonEntity lesson : section.getLessonEntities()) {
                if (lesson.getStatus() == BaseStatusEnum.INACTIVE) continue;
                String contentType = lesson.getContentType() == null ? "" : lesson.getContentType().toUpperCase();
                if (("VIDEO".equals(contentType) || "PDF".equals(contentType))
                        && !StringUtils.hasText(lesson.getContentUrl())) {
                    throw new BusinessException("Bài học '" + lesson.getName() + "' chưa có file nội dung.");
                }
                if ("QUIZ".equals(contentType)) {
                    QuizEntity quiz = quizRepository.findByLessonId(lesson.getId()).stream().findFirst()
                            .orElseThrow(() -> new BusinessException(
                                    "Bài học '" + lesson.getName() + "' chưa có quiz thật."));
                    if (questionRepository.findByQuizId(quiz.getId()).isEmpty()) {
                        throw new BusinessException("Quiz '" + quiz.getTitle() + "' chưa có câu hỏi.");
                    }
                }
                if ("ASSIGNMENT".equals(contentType)
                        && assignmentRepository.findByLessonId(lesson.getId()).isEmpty()) {
                    throw new BusinessException("Bài học '" + lesson.getName() + "' chưa có assignment thật.");
                }
            }
        }
    }

    @Override
    @Transactional
    public CourseResponse cancelReviewRequest(Long courseId) {
        log.info("Canceling review request for courseId: {}", courseId);
        CourseEntity course = courseRepository.findById(courseId)
                .orElseThrow(() -> ResourceNotFoundException.of("Course", courseId));

        Long currentUserId = getCurrentUserId();
        verifyCourseOwner(course, currentUserId);

        if (course.getStatus() != CourseStatusEnum.PENDING) {
            throw new BusinessException("Chỉ có thể hủy gửi duyệt khi khóa học đang ở trạng thái PENDING.");
        }

        course.setStatus(CourseStatusEnum.DRAFT);
        approvalRequestRepository.findFirstByTargetTypeAndTargetIdAndStatusOrderByLevelDesc(
                        "COURSE", courseId, ApprovalStatusEnum.PENDING)
                .ifPresent(request -> {
                    request.setStatus(ApprovalStatusEnum.CANCELLED);
                    request.setDecidedAt(LocalDateTime.now());
                    request.setComment("Người tạo khóa học đã hủy yêu cầu duyệt.");
                    approvalRequestRepository.save(request);
                });
        CourseEntity saved = courseRepository.save(course);
        applicationEventPublisher.publishEvent(new AuditLogEvent(
                this, "CANCEL_REVIEW", "COURSE", courseId, null, saved));
        return courseMapper.toResponse(saved);
    }

    @Override
    @Transactional
    public CourseResponse requestEditActiveCourse(Long courseId) {
        log.info("Switching ACTIVE courseId {} to DRAFT edit mode", courseId);
        CourseEntity course = courseRepository.findById(courseId)
                .orElseThrow(() -> ResourceNotFoundException.of("Course", courseId));

        Long currentUserId = getCurrentUserId();
        verifyCourseOwner(course, currentUserId);

        if (course.getStatus() != CourseStatusEnum.ACTIVE) {
            throw new BusinessException("Chỉ khóa học đang ở trạng thái ACTIVE mới có thể chuyển sang Chế độ chỉnh sửa.");
        }

        course.setStatus(CourseStatusEnum.DRAFT);
        return courseMapper.toResponse(courseRepository.save(course));
    }

    @Override
    @Transactional
    public CourseInstructorResponse inviteInstructor(Long courseId, InviteInstructorRequest request) {
        log.info("Inviting instructor for courseId {}", courseId);
        CourseEntity course = courseRepository.findById(courseId)
                .orElseThrow(() -> ResourceNotFoundException.of("Course", courseId));

        Long currentUserId = getCurrentUserId();
        verifyCourseOwner(course, currentUserId);

        UserEntity invitedUser = null;
        if (request.getInstructorId() != null) {
            invitedUser = userRepository.findById(request.getInstructorId())
                    .orElseThrow(() -> new BusinessException("Không tìm thấy tài khoản giảng viên với ID: " + request.getInstructorId()));
        } else if (request.getEmail() != null && !request.getEmail().isBlank()) {
            invitedUser = userRepository.findByEmail(request.getEmail().trim())
                    .orElseThrow(() -> new BusinessException("Không tìm thấy tài khoản giảng viên với email: " + request.getEmail()));
        } else {
            throw new BusinessException("Vui lòng chọn giảng viên hoặc nhập địa chỉ email hợp lệ.");
        }

        if (invitedUser.getId().equals(currentUserId) || (course.getCreatedBy() != null && course.getCreatedBy().equals(invitedUser.getId()))) {
            throw new BusinessException("Người tạo khóa học mặc định đã là giảng viên chính.");
        }

        if (courseInstructorRepository.existsByCourseIdAndInstructorId(courseId, invitedUser.getId())) {
            throw new BusinessException("Giảng viên này đã được mời hoặc đang thuộc danh sách phụ trách khóa học.");
        }

        CourseInstructorEntity invitation = CourseInstructorEntity.builder()
                .courseId(courseId)
                .instructorId(invitedUser.getId())
                .status(CourseInstructorStatusEnum.PENDING)
                .invitedBy(currentUserId != null ? currentUserId : 1L)
                .invitedAt(LocalDateTime.now())
                .build();
        CourseInstructorEntity saved = courseInstructorRepository.save(invitation);

        try {
            notificationService.createSystemNotification(
                    invitedUser,
                    NotificationTypeEnum.GENERAL,
                    "Lời mời phụ trách khóa học: " + course.getName(),
                    "Bạn đã nhận được lời mời tham gia phụ trách khóa học '" + course.getName() + "'. Vui lòng bấm để xem và đồng ý.",
                    courseId,
                    "/teacher/courses/" + courseId + "/builder"
            );
        } catch (Exception e) {
            log.warn("Could not send system notification for invitation: {}", e.getMessage());
        }

        if (invitedUser.getEmail() != null && !invitedUser.getEmail().isBlank()) {
            try {
                emailService.sendInviteEmail(invitedUser.getEmail(), "http://localhost:3000/teacher/courses/" + courseId + "/builder");
            } catch (Exception e) {
                log.warn("Could not send email for invitation: {}", e.getMessage());
            }
        }

        UserEntity inviter = currentUserId != null ? userRepository.findById(currentUserId).orElse(null) : null;
        return CourseInstructorResponse.builder()
                .id(String.valueOf(saved.getId()))
                .courseId(String.valueOf(course.getId()))
                .courseName(course.getName())
                .instructorId(String.valueOf(invitedUser.getId()))
                .instructorName(invitedUser.getFullName() != null ? invitedUser.getFullName() : invitedUser.getEmail())
                .instructorEmail(invitedUser.getEmail())
                .instructorAvatar(invitedUser.getAvatarUrl())
                .status(saved.getStatus().name())
                .invitedBy(String.valueOf(currentUserId))
                .invitedByName(inviter != null ? inviter.getFullName() : "Người tạo khóa học")
                .invitedAt(saved.getInvitedAt())
                .acceptedAt(saved.getAcceptedAt())
                .isOwner(false)
                .build();
    }

    @Override
    public List<TeacherOptionResponse> searchTeachers(String query) {
        log.info("Searching teachers with query: {}", query);
        String q = query != null ? query.trim().toLowerCase() : "";

        List<UserEntity> users = userRepository.findByStatus(UserStatusEnum.ACTIVE);
        List<TeacherOptionResponse> result = new ArrayList<>();

        for (UserEntity u : users) {
            EmployeeEntity emp = employeeRepository.findById(u.getId()).orElse(null);
            String empCode = emp != null && emp.getEmployeeCode() != null ? emp.getEmployeeCode() : "GV" + u.getId();
            String deptName = emp != null && emp.getDepartment() != null ? emp.getDepartment().getName() : "Khoa / Trung tâm Đào Tạo";
            String fullName = u.getFullName() != null ? u.getFullName() : u.getEmail();

            boolean matches = q.isBlank()
                    || fullName.toLowerCase().contains(q)
                    || empCode.toLowerCase().contains(q)
                    || deptName.toLowerCase().contains(q)
                    || (u.getEmail() != null && u.getEmail().toLowerCase().contains(q));

            if (matches) {
                result.add(TeacherOptionResponse.builder()
                        .id(String.valueOf(u.getId()))
                        .fullName(fullName)
                        .employeeCode(empCode)
                        .departmentName(deptName)
                        .email(u.getEmail())
                        .avatarUrl(u.getAvatarUrl())
                        .build());
            }
        }
        return result;
    }

    @Override
    public List<CourseInstructorResponse> getCourseInstructors(Long courseId) {
        CourseEntity course = courseRepository.findById(courseId)
                .orElseThrow(() -> ResourceNotFoundException.of("Course", courseId));

        List<CourseInstructorResponse> result = new ArrayList<>();

        if (course.getCreatedBy() != null) {
            userRepository.findById(course.getCreatedBy()).ifPresent(owner -> {
                result.add(CourseInstructorResponse.builder()
                        .id("owner_" + owner.getId())
                        .courseId(String.valueOf(course.getId()))
                        .courseName(course.getName())
                        .instructorId(String.valueOf(owner.getId()))
                        .instructorName(owner.getFullName() != null ? owner.getFullName() : owner.getEmail())
                        .instructorEmail(owner.getEmail())
                        .instructorAvatar(owner.getAvatarUrl())
                        .status("ACCEPTED")
                        .invitedBy(String.valueOf(owner.getId()))
                        .invitedByName("Chủ sở hữu")
                        .invitedAt(course.getCreatedAt())
                        .acceptedAt(course.getCreatedAt())
                        .isOwner(true)
                        .build());
            });
        }

        List<CourseInstructorEntity> coInstructors = courseInstructorRepository.findByCourseId(courseId);
        for (CourseInstructorEntity ci : coInstructors) {
            userRepository.findById(ci.getInstructorId()).ifPresent(inst -> {
                UserEntity inviter = ci.getInvitedBy() != null ? userRepository.findById(ci.getInvitedBy()).orElse(null) : null;
                result.add(CourseInstructorResponse.builder()
                        .id(String.valueOf(ci.getId()))
                        .courseId(String.valueOf(course.getId()))
                        .courseName(course.getName())
                        .instructorId(String.valueOf(inst.getId()))
                        .instructorName(inst.getFullName() != null ? inst.getFullName() : inst.getEmail())
                        .instructorEmail(inst.getEmail())
                        .instructorAvatar(inst.getAvatarUrl())
                        .status(ci.getStatus().name())
                        .invitedBy(String.valueOf(ci.getInvitedBy()))
                        .invitedByName(inviter != null ? inviter.getFullName() : "Người tạo khóa học")
                        .invitedAt(ci.getInvitedAt())
                        .acceptedAt(ci.getAcceptedAt())
                        .isOwner(false)
                        .build());
            });
        }

        return result;
    }

    @Override
    @Transactional
    public void removeInstructor(Long courseId, Long instructorId) {
        log.info("Removing instructorId {} from courseId {}", instructorId, courseId);
        CourseEntity course = courseRepository.findById(courseId)
                .orElseThrow(() -> ResourceNotFoundException.of("Course", courseId));

        Long currentUserId = getCurrentUserId();
        verifyCourseOwner(course, currentUserId);

        if (course.getCreatedBy() != null && course.getCreatedBy().equals(instructorId)) {
            throw new BusinessException("Không thể xóa người tạo/chủ sở hữu khóa học.");
        }

        courseInstructorRepository.deleteByCourseIdAndInstructorId(courseId, instructorId);
    }

    @Override
    @Transactional
    public CourseInstructorResponse respondInvitation(Long invitationId, boolean accept) {
        CourseInstructorEntity ci = courseInstructorRepository.findById(invitationId)
                .orElseThrow(() -> ResourceNotFoundException.of("CourseInstructor", invitationId));

        Long currentUserId = getCurrentUserId();
        if (currentUserId != null && !ci.getInstructorId().equals(currentUserId)) {
            throw new BusinessException("Bạn không có quyền phản hồi lời mời này.");
        }

        if (accept) {
            ci.setStatus(CourseInstructorStatusEnum.ACCEPTED);
            ci.setAcceptedAt(LocalDateTime.now());
        } else {
            ci.setStatus(CourseInstructorStatusEnum.REJECTED);
        }
        CourseInstructorEntity saved = courseInstructorRepository.save(ci);
        CourseEntity course = courseRepository.findById(saved.getCourseId()).orElse(null);
        UserEntity inst = userRepository.findById(saved.getInstructorId()).orElse(null);

        return CourseInstructorResponse.builder()
                .id(String.valueOf(saved.getId()))
                .courseId(String.valueOf(saved.getCourseId()))
                .courseName(course != null ? course.getName() : "")
                .instructorId(String.valueOf(saved.getInstructorId()))
                .instructorName(inst != null ? inst.getFullName() : "")
                .instructorEmail(inst != null ? inst.getEmail() : "")
                .status(saved.getStatus().name())
                .invitedAt(saved.getInvitedAt())
                .acceptedAt(saved.getAcceptedAt())
                .isOwner(false)
                .build();
    }

    @Override
    public List<CourseInstructorResponse> getMyInvitations() {
        Long currentUserId = getCurrentUserId();
        if (currentUserId == null) return List.of();

        List<CourseInstructorEntity> list = courseInstructorRepository.findByInstructorIdAndStatus(
                currentUserId, CourseInstructorStatusEnum.PENDING);
        List<CourseInstructorResponse> result = new ArrayList<>();
        for (CourseInstructorEntity ci : list) {
            CourseEntity course = courseRepository.findById(ci.getCourseId()).orElse(null);
            UserEntity inst = userRepository.findById(ci.getInstructorId()).orElse(null);
            UserEntity inviter = ci.getInvitedBy() != null ? userRepository.findById(ci.getInvitedBy()).orElse(null) : null;

            result.add(CourseInstructorResponse.builder()
                    .id(String.valueOf(ci.getId()))
                    .courseId(String.valueOf(ci.getCourseId()))
                    .courseName(course != null ? course.getName() : "")
                    .instructorId(String.valueOf(ci.getInstructorId()))
                    .instructorName(inst != null ? inst.getFullName() : "")
                    .instructorEmail(inst != null ? inst.getEmail() : "")
                    .status(ci.getStatus().name())
                    .invitedBy(String.valueOf(ci.getInvitedBy()))
                    .invitedByName(inviter != null ? inviter.getFullName() : "Người tạo khóa học")
                    .invitedAt(ci.getInvitedAt())
                    .isOwner(false)
                    .build());
        }
        return result;
    }

    @Override
    public List<SubmissionResponse> getSubmissionsForGrading(Long assignmentId) {
        log.info("Getting submissions for assignmentId: {}", assignmentId);
        return submissionRepository.findByAssignmentIdOrderBySubmittedAtDesc(assignmentId)
                .stream().map(submissionMapper::toResponse).collect(Collectors.toList());
    }

    @Override
    @Transactional
    public SubmissionResponse gradeSubmission(Long submissionId, GradeSubmissionWithFeedbackRequest request) {
        log.info("Grading submissionId: {}", submissionId);
        SubmissionEntity submission = submissionRepository.findById(submissionId)
                .orElseThrow(() -> ResourceNotFoundException.of("Submission", submissionId));

        submission.setScore(request.getScore());
        submission.setFeedback(request.getFeedback());
        submission.setGradedAt(LocalDateTime.now());

        if (Boolean.TRUE.equals(request.getReturnForResubmission())) {
            submission.setStatus((byte) 2);
        } else {
            submission.setStatus((byte) 1);
        }

        return submissionMapper.toResponse(submissionRepository.save(submission));
    }
}
