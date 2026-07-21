package com.ailms.mapper;

import com.ailms.entity.CertificateEntity;
import com.ailms.response.CertificateResponse;
import org.mapstruct.Mapper;

import java.util.List;

@Mapper(componentModel = "spring")
public interface CertificateMapper {

    CertificateResponse toResponse(CertificateEntity entity);

    List<CertificateResponse> toResponseList(List<CertificateEntity> list);
}
