package com.ailms.request;
 
import com.ailms.entity.enums.AttendanceStatusEnum;
import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.*;
import java.time.LocalDateTime;

@Getter
@Setter
@AllArgsConstructor
@Builder
@EqualsAndHashCode(callSuper = false)
public class AttendanceSearchRequest extends CommonSearchRequest<AttendanceStatusEnum> {

}
