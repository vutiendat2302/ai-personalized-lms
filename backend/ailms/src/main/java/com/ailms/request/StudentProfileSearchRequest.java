package com.ailms.request;
 
import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.*;
import java.time.LocalDateTime;

@Getter
@Setter
@Builder
@EqualsAndHashCode(callSuper = false)
public class StudentProfileSearchRequest extends CommonSearchRequest<Boolean> {

}
