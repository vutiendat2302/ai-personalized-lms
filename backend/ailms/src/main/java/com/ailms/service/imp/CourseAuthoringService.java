package com.ailms.service.imp;

import com.ailms.entity.*;
import com.ailms.entity.enums.*;
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
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class CourseAuthoringService implements ICourseAuthoringService {

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

    @Override
    public CourseCurriculumResponse getCurriculum(Long courseId) {
        log.info("Getting curriculum for courseId: {}", courseId);
        CourseEntity course = courseRepository.findById(courseId)
                .orElseThrow(() -> ResourceNotFoundException.of("Course", courseId));

        List<CourseSectionEntity> sections = courseSectionRepository.findByCourseEntity_IdOrderByOrderIndexAsc(courseId);

        // Final Exam Quizzes and Assignments (sectionId=null, lessonId=null)
        List<QuizEntity> finalQuizzes = quizRepository.findByCourseId(courseId).stream()
                .filter(q -> q.getSectionId() == null && q.getLessonId() == null)
                .collect(Collectors.toList());
        List<AssignmentEntity> finalAssignments = assignmentRepository.findByCourseId(courseId).stream()
                .filter(a -> a.getSectionId() == null && a.getLessonId() == null)
                .collect(Collectors.toList());

        List<CourseCurriculumResponse.SectionCurriculumItem> sectionItems = sections.stream()
                .map(this::buildSectionItem)
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
                .finalExamQuizzes(finalQuizzes.stream().map(this::mapQuizToResponse).collect(Collectors.toList()))
                .finalExamAssignments(finalAssignments.stream().map(assignmentMapper::toResponse).collect(Collectors.toList()))
                .totalLessons(totalLessons)
                .totalDurationMin(totalDurationMin)
                .build();
    }

    private CourseCurriculumResponse.SectionCurriculumItem buildSectionItem(CourseSectionEntity section) {
        List<QuizEntity> chapterQuizzes = quizRepository.findBySectionId(section.getId()).stream()
                .filter(q -> q.getLessonId() == null).collect(Collectors.toList());
        List<AssignmentEntity> chapterAssignments = assignmentRepository.findBySectionId(section.getId()).stream()
                .filter(a -> a.getLessonId() == null).collect(Collectors.toList());

        List<CourseCurriculumResponse.LessonCurriculumItem> lessonItems = section.getLessonEntities().stream()
                .filter(l -> l.getStatus() == null || !BaseStatusEnum.INACTIVE.equals(l.getStatus()))
                .map(this::buildLessonItem)
                .collect(Collectors.toList());

        return CourseCurriculumResponse.SectionCurriculumItem.builder()
                .id(section.getId())
                .name(section.getName())
                .orderIndex(section.getOrderIndex())
                .status(section.getStatus() != null ? section.getStatus().name() : null)
                .chapterQuizzes(chapterQuizzes.stream().map(this::mapQuizToResponse).collect(Collectors.toList()))
                .chapterAssignments(chapterAssignments.stream().map(assignmentMapper::toResponse).collect(Collectors.toList()))
                .lessons(lessonItems)
                .build();
    }

    private CourseCurriculumResponse.LessonCurriculumItem buildLessonItem(LessonEntity lesson) {
        QuizResponse linkedQuiz = null;
        AssignmentResponse linkedAssignment = null;

        List<QuizEntity> quizzes = quizRepository.findByLessonId(lesson.getId());
        if (!quizzes.isEmpty()) linkedQuiz = mapQuizToResponse(quizzes.get(0));

        List<AssignmentEntity> assignments = assignmentRepository.findByLessonId(lesson.getId());
        if (!assignments.isEmpty()) linkedAssignment = assignmentMapper.toResponse(assignments.get(0));

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
        CourseEntity course = courseRepository.findById(courseId)
                .orElseThrow(() -> ResourceNotFoundException.of("Course", courseId));

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
        lessonMapper.updateEntityFromRequest(request, lesson);
        return lessonMapper.toResponse(lessonRepository.save(lesson));
    }

    @Override
    @Transactional
    public void deleteLesson(Long lessonId) {
        log.info("Deleting/deactivating lessonId: {}", lessonId);
        LessonEntity lesson = lessonRepository.findById(lessonId)
                .orElseThrow(() -> ResourceNotFoundException.of("Lesson", lessonId));

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

    private final ObjectMapper objectMapper = new ObjectMapper();

    private QuizResponse mapQuizToResponse(QuizEntity quiz) {
        if (quiz == null) return null;
        QuizResponse response = quizMapper.toResponse(quiz);
        if (quiz.getDescription() != null && quiz.getDescription().trim().startsWith("[")) {
            try {
                Object parsed = objectMapper.readValue(quiz.getDescription(), Object.class);
                response.setQuestions(parsed);
            } catch (Exception e) {
                log.warn("Could not parse quiz description JSON for quiz id {}", quiz.getId());
            }
        }
        return response;
    }

    @SuppressWarnings("unchecked")
    private void saveQuizQuestionsToDb(Long quizId, String description) {
        if (quizId == null || description == null || !description.trim().startsWith("[")) {
            return;
        }
        try {
            List<Map<String, Object>> qList = objectMapper.readValue(description, List.class);
            if (qList == null || qList.isEmpty()) return;

            List<QuestionEntity> oldQuestions = questionRepository.findByQuizId(quizId);
            for (QuestionEntity oldQ : oldQuestions) {
                questionOptionRepository.deleteByQuestionId(oldQ.getId());
            }
            questionRepository.deleteByQuizId(quizId);

            int qOrder = 0;
            for (Map<String, Object> qMap : qList) {
                String content = (String) qMap.getOrDefault("content", "");
                String qTypeStr = (String) qMap.getOrDefault("questionType", "SINGLE_CHOICE");
                byte qType = 1;
                switch (qTypeStr) {
                    case "MULTIPLE_CHOICE": qType = 2; break;
                    case "TRUE_FALSE": qType = 3; break;
                    case "SHORT_ANSWER": qType = 4; break;
                    case "ESSAY": qType = 4; break;
                    case "MATCHING": qType = 5; break;
                    default: qType = 1;
                }
                Double pointsVal = qMap.get("points") != null ? Double.parseDouble(qMap.get("points").toString()) : 1.0;
                String explanation = (String) qMap.getOrDefault("explanation", "");

                QuestionEntity qEntity = QuestionEntity.builder()
                        .quizId(quizId)
                        .content(content)
                        .questionType(qType)
                        .points(BigDecimal.valueOf(pointsVal))
                        .orderIndex(qOrder++)
                        .explanation(explanation)
                        .status((byte) 1)
                        .build();
                QuestionEntity savedQ = questionRepository.save(qEntity);

                List<Map<String, Object>> options = (List<Map<String, Object>>) qMap.get("options");
                if (options != null) {
                    int optOrder = 0;
                    for (Map<String, Object> optMap : options) {
                        String optContent = (String) optMap.getOrDefault("content", "");
                        Boolean isCorrect = Boolean.TRUE.equals(optMap.get("isCorrect"));

                        QuestionOptionEntity optEntity = QuestionOptionEntity.builder()
                                .questionId(savedQ.getId())
                                .content(optContent)
                                .isCorrect(isCorrect)
                                .orderIndex(optOrder++)
                                .build();
                        questionOptionRepository.save(optEntity);
                    }
                }
            }
        } catch (Exception e) {
            log.warn("Could not sync quiz questions to relational DB tables for quizId {}: {}", quizId, e.getMessage());
        }
    }

    @Override
    @Transactional
    public QuizResponse createQuiz(QuizRequest request) {
        log.info("Creating quiz for courseId: {}, sectionId: {}, lessonId: {}",
                request.getCourseId(), request.getSectionId(), request.getLessonId());
        QuizEntity quiz = quizMapper.toEntity(request);
        if (quiz.getStatus() == null) quiz.setStatus(BaseStatusEnum.DRAFT);
        QuizEntity saved = quizRepository.save(quiz);
        saveQuizQuestionsToDb(saved.getId(), request.getDescription());
        return mapQuizToResponse(saved);
    }

    @Override
    @Transactional
    public QuizResponse updateQuiz(Long quizId, QuizRequest request) {
        log.info("Updating quizId: {}", quizId);
        QuizEntity quiz = quizRepository.findById(quizId)
                .orElseThrow(() -> ResourceNotFoundException.of("Quiz", quizId));
        quizMapper.updateFromRequest(request, quiz);
        QuizEntity saved = quizRepository.save(quiz);
        saveQuizQuestionsToDb(saved.getId(), request.getDescription());
        return mapQuizToResponse(saved);
    }

    @Override
    @Transactional
    public AssignmentResponse createAssignment(CreateAssignmentRequest request) {
        log.info("Creating assignment");
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

        if (course.getCreatedBy() != null && !course.getCreatedBy().equals(currentUserId)) {
            throw new BusinessException("Chỉ người tạo khóa học mới có quyền thực hiện thao tác này.");
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

        course.setStatus(CourseStatusEnum.PENDING);
        return courseMapper.toResponse(courseRepository.save(course));
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
        return courseMapper.toResponse(courseRepository.save(course));
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
