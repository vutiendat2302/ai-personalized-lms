package com.ailms.repository;

import com.ailms.entity.EmployeeContractEntity;
import com.ailms.entity.enums.BaseStatusEnum;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface EmployeeContractRepository extends JpaRepository<EmployeeContractEntity, Long>, JpaSpecificationExecutor<EmployeeContractEntity> {
    List<EmployeeContractEntity> findByEmployee_UserId(Long userId);
    List<EmployeeContractEntity> findByStatusAndEndDate(BaseStatusEnum status, LocalDate endDate);
    java.util.Optional<EmployeeContractEntity> findBySigningToken(String signingToken);

    @Query("SELECT c.status, COUNT(c) FROM EmployeeContractEntity c GROUP BY c.status")
    List<Object[]> countContractsGroupByStatus();

    @Query("SELECT c.status, COUNT(c) FROM EmployeeContractEntity c " +
           "WHERE (c.startDate IS NULL OR c.startDate <= :endOfYearDate) " +
           "AND (c.endDate IS NULL OR c.endDate >= :startOfYearDate) " +
           "GROUP BY c.status")
    List<Object[]> countContractsGroupByStatusInYear(
            @Param("startOfYearDate") LocalDate startOfYearDate,
            @Param("endOfYearDate") LocalDate endOfYearDate);

    @Query("SELECT c FROM EmployeeContractEntity c WHERE c.contractTypeEnum = ContractTypeEnum.PROBATION AND c.endDate BETWEEN :startDate AND :endDate")
    List<EmployeeContractEntity> findExpiringProbationContracts(@Param("startDate") LocalDate startDate, @Param("endDate") LocalDate endDate);
}


