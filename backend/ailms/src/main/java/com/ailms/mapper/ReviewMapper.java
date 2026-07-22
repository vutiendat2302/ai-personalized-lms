package com.ailms.mapper;

import com.ailms.entity.ReviewEntity;
import com.ailms.response.ReviewResponse;
import org.mapstruct.Mapper;

import java.util.List;

@Mapper(componentModel = "spring")
public interface ReviewMapper {

    ReviewResponse toResponse(ReviewEntity entity);

    List<ReviewResponse> toResponseList(List<ReviewEntity> list);
}
