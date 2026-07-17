package com.ailms.entity;

import com.ailms.entity.enums.ClassMemberRole;
import com.ailms.entity.enums.ClassMemberStatusEnum;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.time.LocalDateTime;

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

    @EmbeddedId
    private ClassMemberId id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @MapsId("classId")
    @JoinColumn(name = "class_id", nullable = false)
    private ClassEntity classEntity;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @MapsId("userId")
    @JoinColumn(name = "user_id", nullable = false)
    private UserEntity userEntity;

    @Column(name = "role_in_class", nullable = false, length = 20)
    @Enumerated(EnumType.STRING)
    private ClassMemberRole roleInClass;

    @Column(name = "status", nullable = false, length = 20)
    @Enumerated(EnumType.STRING)
    private ClassMemberStatusEnum status;

    @Column(name = "joined_at")
    private LocalDateTime joinedAt;

    @Column(name = "waitlisted_at")
    private LocalDateTime waitlistedAt;

    @Column(name = "left_at")
    private LocalDateTime leftAt;
}
