package com.ailms.request;
 
import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.*;
import java.time.LocalDateTime;
import java.util.List;
import com.ailms.entity.enums.StudyGoalTypeEnum;
import com.ailms.entity.enums.UserStatusEnum;

@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
@EqualsAndHashCode(callSuper = false)
public class StudentProfileSearchRequest extends CommonSearchRequest<Boolean> {

    private Long userId;
    private String keyword;
    private Boolean isMinor;
    private Boolean hasGuardian;
    private Boolean hasEnrollment;
    private Boolean hasGoal;
    private List<StudyGoalTypeEnum> goalTypes;
    private Integer inactiveDays;
    private List<Long> interestIds;
    private UserStatusEnum userStatus;
    private Integer gender;
}
