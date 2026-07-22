package com.ailms.request;
 
import com.ailms.entity.enums.StudyGoalStatusEnum;
import lombok.*;

@Getter
@Setter
@Builder
@EqualsAndHashCode(callSuper = false)
public class StudyGoalSearchRequest extends CommonSearchRequest<StudyGoalStatusEnum> {

}
