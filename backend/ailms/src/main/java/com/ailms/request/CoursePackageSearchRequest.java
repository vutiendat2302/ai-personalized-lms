package com.ailms.request;

import com.ailms.entity.enums.DeliveryModeEnum;
import com.ailms.entity.enums.CoursePackageStatusEnum;
import lombok.*;
import lombok.experimental.SuperBuilder;

@Getter
@Setter
public class CoursePackageSearchRequest extends CommonSearchRequest<CoursePackageStatusEnum> {

    private Long courseId;
    private DeliveryModeEnum deliveryMode;

}
