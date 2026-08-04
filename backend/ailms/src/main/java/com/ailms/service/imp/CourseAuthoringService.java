package com.ailms.service.imp;

import com.ailms.entity.*;
import com.ailms.entity.enums.BaseStatusEnum;
import com.ailms.entity.enums.CourseStatusEnum;
import com.ailms.exception.BusinessException;
import com.ailms.exception.ResourceNotFoundException;
import com.ailms.mapper.*;
import com.ailms.repository.*;
import com.ailms.request.*;
import com.ailms.response.*;
import com.ailms.service.ICourseAuthoringService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
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
    private final AssignmentRepository assignmentRepository;
    private final SubmissionRepository submissionRepository;
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
                .sections(sectionItems)
                .finalExamQuizzes(finalQuizzes.stream().map(quizMapper::toResponse).collect(Collectors.toList()))
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
                .chapterQuizzes(chapterQuizzes.stream().map(quizMapper::toResponse).collect(Collectors.toList()))
                .chapterAssignments(chapterAssignments.stream().map(assignmentMapper::toResponse).collect(Collectors.toList()))
                .lessons(lessonItems)
                .build();
    }

    private CourseCurriculumResponse.LessonCurriculumItem buildLessonItem(LessonEntity lesson) {
        QuizResponse linkedQuiz = null;
        AssignmentResponse linkedAssignment = null;

        List<QuizEntity> quizzes = quizRepository.findByLessonId(lesson.getId());
        if (!quizzes.isEmpty()) linkedQuiz = quizMapper.toResponse(quizzes.get(0));

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

    @Override
    @Transactional
    public QuizResponse createQuiz(QuizRequest request) {
        log.info("Creating quiz for courseId: {}, sectionId: {}, lessonId: {}",
                request.getCourseId(), request.getSectionId(), request.getLessonId());
        QuizEntity quiz = quizMapper.toEntity(request);
        if (quiz.getStatus() == null) quiz.setStatus((byte) 0);
        return quizMapper.toResponse(quizRepository.save(quiz));
    }

    @Override
    @Transactional
    public QuizResponse updateQuiz(Long quizId, QuizRequest request) {
        log.info("Updating quizId: {}", quizId);
        QuizEntity quiz = quizRepository.findById(quizId)
                .orElseThrow(() -> ResourceNotFoundException.of("Quiz", quizId));
        quizMapper.updateFromRequest(request, quiz);
        return quizMapper.toResponse(quizRepository.save(quiz));
    }

    @Override
    @Transactional
    public AssignmentResponse createAssignment(CreateAssignmentRequest request) {
        log.info("Creating assignment");
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

    @Override
    @Transactional
    public CourseResponse submitForReview(Long courseId) {
        log.info("Submitting courseId {} for review", courseId);
        CourseEntity course = courseRepository.findById(courseId)
                .orElseThrow(() -> ResourceNotFoundException.of("Course", courseId));

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
