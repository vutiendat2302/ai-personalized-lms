package com.ailms.service.imp;

import com.ailms.entity.EnrollmentEntity;
import com.ailms.entity.LessonEntity;
import com.ailms.entity.enums.ClassMemberRole;
import com.ailms.entity.enums.ClassMemberStatusEnum;
import com.ailms.exception.BadRequestException;
import com.ailms.exception.ForbiddenException;
import com.ailms.exception.ResourceNotFoundException;
import com.ailms.repository.ClassMemberRepository;
import com.ailms.repository.EnrollmentRepository;
import com.ailms.repository.EnrollmentPackageRepository;
import com.ailms.repository.LessonRepository;
import com.ailms.request.ai.AiChatRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Locale;
import java.util.Set;

/** Phân giải context học tập từ enrollment thật và không tin classId do Frontend tự gửi. */
@Service
@RequiredArgsConstructor
public class StudentLearningAiContextService {
    private static final Set<String> ALLOWED_SCOPES = Set.of(
            "LESSON_ONLY", "CLASS_MATERIALS", "COURSE_MATERIALS", "GENERAL");

    private final EnrollmentRepository enrollmentRepository;
    private final EnrollmentPackageRepository enrollmentPackageRepository;
    private final LessonRepository lessonRepository;
    private final ClassMemberRepository classMemberRepository;

    /** Xác thực course/lesson và suy ra classId từ enrollment của chính học viên. */
    @Transactional(readOnly = true)
    public LearningContext resolve(Long userId, AiChatRequest request) {
        String retrievalScope = normalizeScope(request.getRetrievalScope(), request.getLessonId());
        if (request.getCourseId() == null) {
            if (request.getLessonId() != null) {
                throw new BadRequestException("lessonId cần đi kèm courseId");
            }
            return new LearningContext(null, null, null, "GENERAL");
        }
        EnrollmentEntity enrollment = enrollmentRepository
                .findByUserEntity_IdAndCourseEntity_Id(userId, request.getCourseId())
                .orElseThrow(() -> new ForbiddenException("Bạn chưa ghi danh khóa học này"));
        if (!enrollmentPackageRepository.existsActiveCourseAccess(
                userId, request.getCourseId(), LocalDateTime.now())) {
            throw new ForbiddenException("Quyền truy cập khóa học đã hết hạn hoặc bị thu hồi");
        }
        if (Byte.valueOf((byte) 3).equals(enrollment.getStatus())) {
            throw new ForbiddenException("Ghi danh khóa học đã bị hủy");
        }
        Long classId = enrollment.getClassEntity() == null ? null : enrollment.getClassEntity().getId();
        if (classId != null) {
            boolean activeStudent = classMemberRepository.findById_ClassIdAndId_UserId(classId, userId)
                    .filter(member -> member.getStatus() == ClassMemberStatusEnum.ACTIVE)
                    .filter(member -> member.getRoleInClass() == ClassMemberRole.STUDENT)
                    .isPresent();
            if (!activeStudent) throw new ForbiddenException("Bạn không còn là học viên hoạt động của lớp");
        }
        Long lessonId = null;
        if (request.getLessonId() != null) {
            LessonEntity lesson = lessonRepository.findById(request.getLessonId())
                    .orElseThrow(() -> ResourceNotFoundException.of("Lesson", request.getLessonId()));
            Long lessonCourseId = lesson.getCourseSectionEntity().getCourseEntity().getId();
            if (!request.getCourseId().equals(lessonCourseId)) {
                throw new ForbiddenException("Lesson không thuộc khóa học đang học");
            }
            lessonId = lesson.getId();
        }
        if ("LESSON_ONLY".equals(retrievalScope) && lessonId == null) {
            throw new BadRequestException("LESSON_ONLY cần lessonId");
        }
        if ("CLASS_MATERIALS".equals(retrievalScope) && classId == null) {
            throw new BadRequestException("Khóa học hiện tại chưa gắn với lớp để tìm tài liệu lớp");
        }
        return new LearningContext(request.getCourseId(), classId, lessonId, retrievalScope);
    }

    /** Chuẩn hóa scope, mặc định lesson khi đang đứng trong Course Player. */
    private String normalizeScope(String value, Long lessonId) {
        String scope = value == null || value.isBlank()
                ? (lessonId == null ? "COURSE_MATERIALS" : "LESSON_ONLY")
                : value.trim().toUpperCase(Locale.ROOT);
        if (!ALLOWED_SCOPES.contains(scope)) {
            throw new BadRequestException("retrievalScope không hợp lệ");
        }
        return scope;
    }

    /** Context đã được xác thực để chuyển sang persistence và AI Service. */
    public record LearningContext(Long courseId, Long classId, Long lessonId, String retrievalScope) {
    }
}
