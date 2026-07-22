package com.ailms.entity;

import com.ailms.entity.enums.ClassMemberRole;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.SuperBuilder;

import java.time.LocalDateTime;

/**
 * Lưu trữ thông tin thành viên tham gia khóa học,
 * bao gồm vai trò thành viên, thời điểm tham gia và thời điểm rời khỏi.
 */
@Entity
@Table(name = "course_member", indexes = {
        @Index(name = "idx_course_member_user_id", columnList = "user_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class CourseMemberEntity extends BaseEntity {

    /** Khóa phức hợp chứa courseId và userId. */
    @EmbeddedId
    private CourseMemberId id;

    /** Khóa học tương ứng. */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @MapsId("courseId")
    @JoinColumn(name = "course_id", nullable = false)
    private CourseEntity courseEntity;

    /** Người dùng tham gia khóa học. */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @MapsId("userId")
    @JoinColumn(name = "user_id", nullable = false)
    private UserEntity userEntity;

    /** Vai trò của thành viên trong khóa học (STUDENT, TEACHER, TA). */
    @Column(name = "role_in_class")
    @Enumerated(EnumType.ORDINAL)
    private ClassMemberRole roleInClass;

    /** Thời điểm tham gia khóa học. */
    @Column(name = "joined_at")
    private LocalDateTime joinedAt;

    /** Thời điểm kết thúc hoặc rút khỏi khóa học (null nếu vẫn đang tham gia). */
    @Column(name = "left_at")
    private LocalDateTime leftAt;
}
