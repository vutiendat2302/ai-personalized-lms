package com.ailms.request;
 
import com.ailms.entity.enums.GuardianRelationship;
import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.*;
import java.time.LocalDateTime;

@Getter
@Setter
@Builder
@EqualsAndHashCode(callSuper = false)
public class GuardianSearchRequest extends CommonSearchRequest<GuardianRelationship> {

}
