package com.ailms.request;
 
import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.*;
import java.time.LocalDateTime;

@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
@EqualsAndHashCode(callSuper = false)
public class StudentProfileSearchRequest extends CommonSearchRequest<Boolean> {

    private Long userId;
}
