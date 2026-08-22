package com.ailms.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.SuperBuilder;

import java.util.ArrayList;
import java.util.List;

/**
 * Thực thể lưu trữ hồ sơ thông tin cá nhân hóa của học viên.
 * Liên kết 1-1 với tài khoản người dùng (UserEntity) qua primary key `userId`.
 */
@Entity
@Table(name = "student_profile", uniqueConstraints = {
        @UniqueConstraint(name = "uk_student_code", columnNames = {"student_code"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class StudentProfileEntity extends BaseEntity {

    /** Mã định danh học viên (trùng với ID của UserEntity). */
    @Id
    @Column(name = "user_id")
    private Long userId;

    /** Thực thể tài khoản người dùng tương ứng với hồ sơ học viên. */
    @OneToOne(fetch = FetchType.LAZY)
    @MapsId
    @JoinColumn(name = "user_id", nullable = false)
    private UserEntity userEntity;

    /** Mã học sinh / học viên (duy nhất trong hệ thống). */
    @Column(name = "student_code", nullable = false, unique = true, length = 50)
    private String studentCode;

    /** Trình độ học vấn hiện tại (VD: Tiểu học, THCS, THPT, Đại học, Người đi làm). */
    @Column(name = "education_level")
    private String educationLevel;

    /** Mô tả bản thân hoặc ghi chú thêm về học viên. */
    @Column(name = "description")
    private String description;

    /** Mục tiêu học tập tổng quan (dạng mô tả văn bản). */
    @Column(name = "goal")
    private String goal;

    /** Tên trường học hoặc cơ sở đào tạo hiện tại. */
    @Column(name = "school_name")
    private String schoolName;

    /** Đã thực hiện onboarding thiết lập mục tiêu / sở thích hay chưa. */
    @Column(name = "has_goal")
    @Builder.Default
    private Boolean hasGoal = false;

    /** Đánh dấu học viên là vị thành niên (< 18 tuổi), cần thông tin phụ huynh / người giám hộ. */
    @Column(name = "is_minor")
    @Builder.Default
    private Boolean isMinor = false;

    /** Chỉ số dẫn xuất từ learning_activity_log, không lưu trong student_profile. */
    @Transient
    private Integer currentStreak;

    /** Chuỗi ngày học dài nhất, được tính từ toàn bộ lịch sử hoạt động học tập. */
    @Transient
    private Integer longestStreak;

    /** Danh sách lĩnh vực sở thích quan tâm của học viên. */
    @OneToMany(mappedBy = "studentProfile", fetch = FetchType.LAZY)
    @Builder.Default
    private List<StudentInterestEntity> studentInterests = new ArrayList<>();
}
