package com.ailms.service;

import com.ailms.request.UpdateProgressRequest;
import com.ailms.response.CourseCurriculumResponse;
import com.ailms.response.LessonProgressResponse;

/**
 * Service interface phục vụ trải nghiệm học tập của học viên (Student Learning Experience).
 */
public interface IStudentLearningService {

    /**
     * Lấy cây nội dung khóa học kèm theo tiến độ cá nhân của học viên.
     */
    CourseCurriculumResponse getCourseTree(Long courseId, Long userId);

    /**
     * Cập nhật thời gian xem video / tiến độ học của bài học.
     */
    LessonProgressResponse updateLessonProgress(Long lessonId, Long userId, Long enrollmentId, UpdateProgressRequest request);

    /**
     * Đánh dấu hoàn thành bài học thủ công/tự động và tự động tính lại progressPercent của Enrollment.
     */
    LessonProgressResponse completeLesson(Long lessonId, Long userId, Long enrollmentId);
}
