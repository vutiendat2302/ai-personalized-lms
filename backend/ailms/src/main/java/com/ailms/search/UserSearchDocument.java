package com.ailms.search;

import com.ailms.entity.UserEntity;
import com.ailms.entity.enums.UserStatusEnum;
import lombok.Builder;
import lombok.Getter;

import java.time.ZoneOffset;

/** Tài liệu phẳng được lưu trong index người dùng của Meilisearch. */
@Getter
@Builder
public class UserSearchDocument {
    private Long id;
    private String username;
    private String email;
    private String fullName;
    private String phone;
    private Integer gender;
    private UserStatusEnum status;
    private Long createdAtEpoch;

    /** Chuyển entity người dùng thành document phục vụ Meilisearch. */
    public static UserSearchDocument from(UserEntity user) {
        if (user == null) return null;
        return UserSearchDocument.builder()
                .id(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .phone(user.getPhone())
                .gender(user.getGender())
                .status(user.getStatus())
                .createdAtEpoch(user.getCreatedAt() == null ? null : user.getCreatedAt().toInstant(ZoneOffset.UTC).toEpochMilli())
                .build();
    }
}
