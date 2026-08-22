package com.ailms.repository;

import com.ailms.entity.ContractTemplateEntity;
import com.ailms.entity.enums.BaseStatusEnum;
import com.ailms.entity.enums.ContractTypeEnum;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ContractTemplateRepository extends JpaRepository<ContractTemplateEntity, Long> {

    List<ContractTemplateEntity> findByContractTypeEnumAndStatus(ContractTypeEnum contractTypeEnum, BaseStatusEnum status);

    Optional<ContractTemplateEntity> findFirstByContractTypeEnumAndStatusOrderByIdDesc(ContractTypeEnum contractTypeEnum, BaseStatusEnum status);

    List<ContractTemplateEntity> findByStatus(BaseStatusEnum status);
}
