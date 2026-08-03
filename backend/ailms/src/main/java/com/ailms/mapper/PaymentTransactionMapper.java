package com.ailms.mapper;

import com.ailms.entity.PaymentTransactionEntity;
import com.ailms.entity.enums.PaymentTransactionStatusEnum;
import com.ailms.response.PaymentTransactionResponse;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import java.util.List;

@Mapper(componentModel = "spring")
public interface PaymentTransactionMapper {

    @Mapping(target = "orderId", source = "orderEntity.id")
    @Mapping(target = "status", expression = "java(entity.getStatus() != null ? entity.getStatus() : com.ailms.entity.enums.PaymentTransactionStatusEnum.PENDING)")
    PaymentTransactionResponse toResponse(PaymentTransactionEntity entity);

    List<PaymentTransactionResponse> toResponseList(List<PaymentTransactionEntity> entities);
}
