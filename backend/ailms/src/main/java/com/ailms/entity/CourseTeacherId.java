package com.ailms.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.AllArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.io.Serializable;

/**
 * Khóa phức hợp (Composite Key) cho thực thể liên kết CourseTeacherEntity.
 * Bao gồm ID khóa học và ID giảng viên (người dùng).
 */
@Embeddable
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode
public class CourseTeacherId implements Serializable {

    /** Mã ID của khóa học. */
    @Column(name = "course_id")
    private Long courseId;

    /** Mã ID của giảng viên (User ID). */
    @Column(name = "user_id")
    private Long userId;
}
