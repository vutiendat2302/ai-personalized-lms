package com.ailms.entity;

import com.ailms.entity.enums.ClassMemberRole;
import com.ailms.entity.enums.ClassMemberStatusEnum;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.time.LocalDateTime;

/**
 * Thực thể thành viên tham gia lớp học (thành viên bao gồm học viên, giảng viên chính, trợ giảng).
 */
@Entity
@Table(name = "class_member", indexes = {
        @Index(name = "idx_class_member_user_id", columnList = "user_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class ClassMemberEntity extends BaseEntity {

    /** Khóa phức hợp gồm classId và userId. */
    @EmbeddedId
    private ClassMemberId id;

    /** Lớp học tương ứng. */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @MapsId("classId")
    @JoinColumn(name = "class_id", nullable = false)
    private ClassEntity classEntity;

    /** Người dùng (học viên/giảng viên) tương ứng. */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @MapsId("userId")
    @JoinColumn(name = "user_id", nullable = false)
    private UserEntity userEntity;

    /** Vai trò của thành viên trong lớp học (STUDENT, MAIN_TEACHER, TEACHING_ASSISTANT). */
    @Column(name = "role_in_class", nullable = false, length = 20)
    @Enumerated(EnumType.STRING)
    private ClassMemberRole roleInClass;

    /** Trạng thái tham gia lớp học (ACTIVE, WAITLISTED, DROPPED, COMPLETED). */
    @Column(name = "status", nullable = false, length = 20)
    @Enumerated(EnumType.STRING)
    private ClassMemberStatusEnum status;

    /** Thời điểm tham gia chính thức vào lớp học. */
    @Column(name = "joined_at")
    private LocalDateTime joinedAt;

    /** Thời điểm đưa vào danh sách chờ (nếu lớp đã hết chỗ slot tại thời điểm đăng ký). */
    @Column(name = "waitlisted_at")
    private LocalDateTime waitlistedAt; // Thời điểm vào danh sách chờ khi đã hết slot

    /** Thời điểm rời khỏi hoặc hủy đăng ký lớp học. */
    @Column(name = "left_at")
    private LocalDateTime leftAt;
}
