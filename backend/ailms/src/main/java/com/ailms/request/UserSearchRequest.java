package com.ailms.request;

import com.ailms.entity.enums.BaseStatusEnum;
import com.ailms.entity.enums.UserStatusEnum;
import lombok.*;
import org.springframework.format.annotation.DateTimeFormat;

import java.time.LocalDateTime;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(callSuper = false)
public class UserSearchRequest extends CommonSearchRequest<UserStatusEnum> {

    private List<Long> roleIds;

    private List<UserStatusEnum> statuses;

    private Integer gender;
}
