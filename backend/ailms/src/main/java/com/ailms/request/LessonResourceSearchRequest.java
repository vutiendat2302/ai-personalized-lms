package com.ailms.request;
 
import com.ailms.entity.enums.BaseStatusEnum;
import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.*;
import java.time.LocalDateTime;

@Getter
@Setter
@Builder
@EqualsAndHashCode(callSuper = false)
public class LessonResourceSearchRequest extends CommonSearchRequest<BaseStatusEnum> {

}
