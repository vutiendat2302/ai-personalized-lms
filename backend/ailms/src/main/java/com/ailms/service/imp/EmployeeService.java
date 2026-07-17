package com.ailms.service.imp;

import com.ailms.entity.enums.EmployeeStatusEnum;
import org.springframework.data.domain.Page;
import com.ailms.response.PageResponse;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import com.ailms.request.EmployeeSearchRequest;
import com.ailms.repository.specification.EmployeeSpecification;
import com.ailms.entity.EmployeeEntity;
import com.ailms.response.EmployeeResponse;


import com.ailms.entity.DepartmentEntity;
import com.ailms.entity.EmployeeEntity;
import com.ailms.entity.UserEntity;
import com.ailms.exception.DuplicateResourceException;
import com.ailms.exception.ResourceNotFoundException;
import com.ailms.mapper.EmployeeMapper;
import com.ailms.repository.DepartmentRepository;
import com.ailms.repository.EmployeeRepository;
import com.ailms.repository.UserRepository;
import com.ailms.request.CreateEmployeeRequest;
import com.ailms.request.UpdateEmployeeRequest;
import com.ailms.response.EmployeeResponse;
import com.ailms.service.IEmployeeService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.ailms.repository.EmployeeContractRepository;
import com.ailms.repository.SalaryRepository;
import com.ailms.repository.TeachingRateRepository;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import com.ailms.entity.EmployeeContractEntity;
import com.ailms.entity.SalaryEntity;
import com.ailms.entity.TeachingRateEntity;
import com.ailms.entity.enums.BaseStatusEnum;
import com.ailms.exception.BusinessException;

import com.ailms.common.util.SortFieldResolver;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class EmployeeService implements IEmployeeService {

    private final EmployeeRepository employeeRepository;
    private final DepartmentRepository departmentRepository;
    private final UserRepository userRepository;
    private final EmployeeMapper employeeMapper;
    private final EmployeeContractRepository employeeContractRepository;
    private final SalaryRepository salaryRepository;
    private final TeachingRateRepository teachingRateRepository;
    private final SortFieldResolver sortFieldResolver;

    private static final String RESOURCE_NAME = "Employee";

    @Override
    public List<EmployeeResponse> getAll() {
        log.info("Getting all employees excluding deleted ones");
        return employeeMapper.toResponseList(employeeRepository.findAllByStatusNot(EmployeeStatusEnum.DELETE));
    }

    @Override
    public EmployeeResponse getById(Long id) {
        log.info("Getting employee by id: {}", id);
        EmployeeEntity entity = employeeRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of(RESOURCE_NAME, id));
        if (entity.getStatus() == EmployeeStatusEnum.DELETE) {
            throw ResourceNotFoundException.of(RESOURCE_NAME, id);
        }
        return employeeMapper.toResponse(entity);
    }

    @Transactional
    @Override
    public EmployeeResponse create(CreateEmployeeRequest request) {
        log.info("Creating employee for user: {}", request.getUserId());

        UserEntity user = userRepository.findById(request.getUserId())
                .orElseThrow(() -> ResourceNotFoundException.of("User", request.getUserId()));

        if (employeeRepository.existsById(request.getUserId())) {
            throw new DuplicateResourceException("Employee already exists for user ID: " + request.getUserId());
        }

        EmployeeEntity entity = employeeMapper.toEntity(request);
        entity.setUserEntity(user);
        entity.setEmployeeCode(com.ailms.common.util.CodeGenerator.generate("EP", employeeRepository::existsByEmployeeCode));
        entity.setStatus(EmployeeStatusEnum.ACTIVE);
        entity.setDepartment(resolveDepartment(request.getDepartmentId()));

        EmployeeEntity saved = employeeRepository.save(entity);
        log.info("Employee created successfully");
        return employeeMapper.toResponse(saved);
    }

    @Transactional
    @Override
    public EmployeeResponse update(Long id, UpdateEmployeeRequest request) {
        log.info("Updating employee: {}", id);

        EmployeeEntity existing = employeeRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of(RESOURCE_NAME, id));

        if (existing.getStatus() == EmployeeStatusEnum.DELETE) {
            throw new BusinessException("Cannot update a deleted employee.");
        }

        if (request.getStatus() != null && request.getStatus() != existing.getStatus()) {
            if (request.getStatus() == EmployeeStatusEnum.TERMINATED) {
                throw new BusinessException("Cannot terminate employee via general update. Use /terminate endpoint instead.");
            }
            if (request.getStatus() == EmployeeStatusEnum.DELETE) {
                throw new BusinessException("Cannot delete employee via general update. Use delete endpoint instead.");
            }
        }

        if (request.getEmployeeCode() != null && !existing.getEmployeeCode().equals(request.getEmployeeCode()) &&
                employeeRepository.existsByEmployeeCode(request.getEmployeeCode())) {
            throw DuplicateResourceException.of(RESOURCE_NAME, "employeeCode", request.getEmployeeCode());
        }

        employeeMapper.updateFromRequest(request, existing);
        if (request.getDepartmentId() != null) {
            existing.setDepartment(resolveDepartment(request.getDepartmentId()));
        }
        EmployeeEntity updated = employeeRepository.save(existing);
        return employeeMapper.toResponse(updated);
    }

    @Transactional
    @Override
    public void softDelete(Long id) {
        log.info("Deleting employee: {}", id);
        EmployeeEntity entity = employeeRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of(RESOURCE_NAME, id));

        if (entity.getStatus() == EmployeeStatusEnum.DELETE) {
            throw new DuplicateResourceException("Employee already deleted: " + id);
        }

        // Check active contracts
        List<EmployeeContractEntity> activeContracts = employeeContractRepository.findByEmployee_UserId(id).stream()
                .filter(c -> c.getStatus() == BaseStatusEnum.ACTIVE)
                .filter(c -> (c.getStartDate() == null || !LocalDate.now().isBefore(c.getStartDate()))
                        && (c.getEndDate() == null || !LocalDate.now().isAfter(c.getEndDate())))
                .toList();
        if (!activeContracts.isEmpty()) {
            throw new BusinessException("Cannot delete employee: Employee has active contracts.");
        }

        // Check unfinalized (DRAFT) salaries
        List<SalaryEntity> draftSalaries = salaryRepository.findByEmployee_UserId(id).stream()
                .filter(s -> s.getStatus() == com.ailms.entity.enums.SalaryStatusEnum.DRAFT)
                .toList();
        if (!draftSalaries.isEmpty()) {
            throw new BusinessException("Cannot delete employee: Employee has unfinalized (DRAFT) salaries.");
        }

        entity.setStatus(EmployeeStatusEnum.DELETE);
        employeeRepository.save(entity);
    }

    @Transactional
    @Override
    public EmployeeResponse terminate(Long id) {
        log.info("Terminating employee: {}", id);
        EmployeeEntity employee = employeeRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of(RESOURCE_NAME, id));

        if (employee.getStatus() == EmployeeStatusEnum.TERMINATED) {
            throw new BusinessException("Employee is already terminated.");
        }
        if (employee.getStatus() == EmployeeStatusEnum.DELETE) {
            throw new BusinessException("Employee is deleted. Cannot terminate.");
        }

        employee.setStatus(EmployeeStatusEnum.TERMINATED);
        employee.setEndDate(LocalDateTime.now());

        // Set endDate of any currently ACTIVE EmployeeContractEntity to terminate it
        List<EmployeeContractEntity> contracts = employeeContractRepository.findByEmployee_UserId(id);
        for (EmployeeContractEntity contract : contracts) {
            if (contract.getStatus() == BaseStatusEnum.ACTIVE) {
                contract.setEndDate(LocalDate.now());
                contract.setStatus(BaseStatusEnum.INACTIVE);
                employeeContractRepository.save(contract);
            }
        }

        // Set effectiveTo of all active TeachingRateEntity to termination date
        List<TeachingRateEntity> rates = teachingRateRepository.findByEmployeeEntity_UserId(id);
        for (TeachingRateEntity rate : rates) {
            if (rate.getStatus() == BaseStatusEnum.ACTIVE) {
                rate.setEffectiveTo(LocalDateTime.now());
                rate.setStatus(BaseStatusEnum.INACTIVE);
                teachingRateRepository.save(rate);
            }
        }

        EmployeeEntity saved = employeeRepository.save(employee);
        return employeeMapper.toResponse(saved);
    }

    private DepartmentEntity resolveDepartment(Long departmentId) {
        if (departmentId == null) {
            return null;
        }
        return departmentRepository.findById(departmentId)
                .orElseThrow(() -> ResourceNotFoundException.of("Department", departmentId));
    }

    @Override
    public PageResponse<EmployeeResponse> search(EmployeeSearchRequest request) {
        log.info("Searching Employee via specification");
        Specification<EmployeeEntity> spec = EmployeeSpecification.filterAndSearch(request);
        Pageable pageable = request.toPageable();
        if (pageable.getSort().isSorted()) {
            pageable = org.springframework.data.domain.PageRequest.of(
                    pageable.getPageNumber(),
                    pageable.getPageSize(),
                    sortFieldResolver.resolve(pageable.getSort(), EmployeeEntity.class)
            );
        }
        Page<EmployeeEntity> page = employeeRepository.findAll(spec, pageable);
        return PageResponse.from(page.map(employeeMapper::toResponse));
    }

}
