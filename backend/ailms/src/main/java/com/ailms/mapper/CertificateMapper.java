package com.ailms.mapper;

import com.ailms.entity.CertificateEntity;
import com.ailms.response.CertificateResponse;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import java.util.List;

@Mapper(componentModel = "spring")
public interface CertificateMapper {

    @Mapping(target = "isValid", source = "valid")
    CertificateResponse toResponse(CertificateEntity entity);

    List<CertificateResponse> toResponseList(List<CertificateEntity> list);
}
