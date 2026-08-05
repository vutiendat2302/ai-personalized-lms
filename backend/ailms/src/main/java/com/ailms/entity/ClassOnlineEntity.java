package com.ailms.entity;

import com.ailms.common.snowflake.SnowflakeId;
import com.ailms.entity.enums.BaseStatusEnum;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.time.LocalDateTime;

/**
 * Lưu trữ thông tin các buổi học trực tuyến của lớp học,
 * bao gồm giáo viên phụ trách, thời gian diễn ra, liên kết
 * phòng học trực tuyến và trạng thái của buổi học.
 */

@Entity
@Table(name = "class_online", indexes = {
        @Index(name = "idx_class_online_class_id", columnList = "class_id"),
        @Index(name = "idx_class_online_teacher_id", columnList = "teacher_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class ClassOnlineEntity extends BaseEntity {

    /** Mã định danh buổi học trực tuyến (Snowflake ID 64-bit). */
    @Id
    @SnowflakeId
    @Column(name = "id", updatable = false, nullable = false)
    private Long id;

    /** Lớp học tương ứng với buổi học trực tuyến. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "class_id", nullable = false)
    private ClassEntity classEntity;

    /** Giảng viên phụ trách giảng dạy buổi học trực tuyến này. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "teacher_id")
    private UserEntity teacherEntity;

    /** Tiêu đề hoặc chủ đề buổi học (VD: Buổi 1 - Giới thiệu về Spring Data JPA). */
    @Column(name = "title")
    private String title;

    /** Đường dẫn liên kết phòng học trực tuyến (Google Meet / Zoom / Jitsi / Livekit). */
    @Column(name = "meeting_url")
    private String meetingUrl;

    /** Nền tảng phòng học trực tuyến được dùng cho buổi học. */
    @Column(name = "meeting_provider")
    @Builder.Default
    private String meetingProvider = "GOOGLE_MEET";

    /** Ngày và giờ bắt đầu buổi học được lên lịch. */
    @Column(name = "scheduled_at")
    private LocalDateTime scheduledAt;

    /** Thời lượng buổi học dự kiến hoặc thực tế (tính bằng phút). */
    @Column(name = "duration_min")
    private Integer durationMin;

    /** Trạng thái buổi học (UPCOMING, IN_PROGRESS, COMPLETED, CANCELLED). */
    @Column(name = "status")
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private BaseStatusEnum status = BaseStatusEnum.ACTIVE;

    /** Link bản ghi/xem lại buổi học, nếu có. */
    @Column(name = "record_url")
    private String recordUrl;

    /** Nội dung chính sau buổi học. */
    @Column(name = "session_summary", columnDefinition = "TEXT")
    private String sessionSummary;

    /** Phản hồi/đánh giá của học viên sau buổi học. */
    @Column(name = "student_feedback", columnDefinition = "TEXT")
    private String studentFeedback;

    /** Nhận xét của giảng viên sau buổi học. */
    @Column(name = "teacher_notes", columnDefinition = "TEXT")
    private String teacherNotes;

    /** Ghi chú chuẩn bị cho buổi tiếp theo. */
    @Column(name = "next_session_notes", columnDefinition = "TEXT")
    private String nextSessionNotes;
}
