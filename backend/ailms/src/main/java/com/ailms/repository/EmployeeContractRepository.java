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
    /** Tìm danh sách hợp đồng theo ID người dùng của nhân viên. */
    List<EmployeeContractEntity> findByEmployee_UserId(Long userId);

    /** Tìm danh sách hợp đồng theo ID người dùng và trạng thái của nhân viên. */
    List<EmployeeContractEntity> findByEmployee_UserIdAndStatus(Long userId, BaseStatusEnum status);

    /** Tìm danh sách hợp đồng theo trạng thái và ngày kết thúc. */
    List<EmployeeContractEntity> findByStatusAndEndDate(BaseStatusEnum status, LocalDate endDate);

    /** Tìm danh sách hợp đồng theo trạng thái trong khoảng ngày kết thúc. */
    List<EmployeeContractEntity> findByStatusAndEndDateBetween(BaseStatusEnum status, LocalDate startDate, LocalDate endDate);

    /** Tìm hợp đồng theo mã token ký hợp đồng. */
    java.util.Optional<EmployeeContractEntity> findBySigningToken(String signingToken);

    /** Thống kê số lượng hợp đồng theo từng trạng thái. */
    @Query("SELECT c.status, COUNT(c) FROM EmployeeContractEntity c GROUP BY c.status")
    List<Object[]> countContractsGroupByStatus();

    /** Thống kê số lượng hợp đồng theo từng trạng thái trong năm. */
    @Query("SELECT c.status, COUNT(c) FROM EmployeeContractEntity c " +
           "WHERE (c.startDate IS NULL OR c.startDate <= :endOfYearDate) " +
           "AND (c.endDate IS NULL OR c.endDate >= :startOfYearDate) " +
           "GROUP BY c.status")
    List<Object[]> countContractsGroupByStatusInYear(
            @Param("startOfYearDate") LocalDate startOfYearDate,
            @Param("endOfYearDate") LocalDate endOfYearDate);

    /** Tìm danh sách hợp đồng thử việc sắp hết hạn trong khoảng ngày. */
    @Query("SELECT c FROM EmployeeContractEntity c WHERE c.contractTypeEnum = ContractTypeEnum.PROBATION AND c.endDate BETWEEN :startDate AND :endDate")
    List<EmployeeContractEntity> findExpiringProbationContracts(@Param("startDate") LocalDate startDate, @Param("endDate") LocalDate endDate);
}


