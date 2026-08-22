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
 * Khóa chính tổng hợp của bảng ClassMemberEntity,
 * gồm mã lớp học và mã người dùng.
 */
@Embeddable
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode
public class ClassMemberId implements Serializable {

    /** Mã ID của lớp học. */
    @Column(name = "class_id")
    private Long classId;

    /** Mã ID của người dùng (Học viên / Giảng viên / Trợ giảng). */
    @Column(name = "user_id")
    private Long userId;
}
