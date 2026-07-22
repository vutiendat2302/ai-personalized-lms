package com.ailms.service.imp;
import com.ailms.repository.specification.ClassOnlineSpecification;
import com.ailms.request.ClassOnlineSearchRequest;
import com.ailms.request.UpdateClassOnlineRequest;
import com.ailms.service.IClassOnlineService;


import com.ailms.entity.ClassEntity;
import com.ailms.entity.ClassOnlineEntity;
import com.ailms.entity.UserEntity;
import com.ailms.exception.ResourceNotFoundException;
import com.ailms.mapper.ClassOnlineMapper;
import com.ailms.repository.ClassOnlineRepository;
import com.ailms.repository.ClassRepository;
import com.ailms.repository.UserRepository;
import com.ailms.request.CreateClassOnlineRequest;
import com.ailms.response.ClassOnlineResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import com.ailms.response.PageResponse;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class ClassOnlineService implements IClassOnlineService {

    private final ClassOnlineRepository classOnlineRepository;
    private final ClassRepository classRepository;
    private final UserRepository userRepository;
    private final ClassOnlineMapper classOnlineMapper;

    private static final String RESOURCE_NAME = "ClassOnline";

    public List<ClassOnlineResponse> getAll() {
        log.info("Getting all online classes");
        return classOnlineMapper.toResponseList(classOnlineRepository.findAll());
    }

    public ClassOnlineResponse getById(Long id) {
        log.info("Getting online class by id: {}", id);
        ClassOnlineEntity entity = classOnlineRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of(RESOURCE_NAME, id));
        return classOnlineMapper.toResponse(entity);
    }

    public List<ClassOnlineResponse> getByClassId(Long classId) {
        log.info("Getting online classes by class id: {}", classId);
        return classOnlineMapper.toResponseList(classOnlineRepository.findByClassEntity_Id(classId));
    }

    public List<ClassOnlineResponse> getByTeacherId(Long teacherId) {
        log.info("Getting online classes by teacher id: {}", teacherId);
        return classOnlineMapper.toResponseList(classOnlineRepository.findByTeacherEntity_Id(teacherId));
    }

    @Transactional
    public ClassOnlineResponse create(CreateClassOnlineRequest request) {
        log.info("Creating online class for class: {}", request.getClassId());
        ClassOnlineEntity entity = classOnlineMapper.toEntity(request);
        applyRelations(entity, request);

        ClassOnlineEntity saved = classOnlineRepository.save(entity);
        return classOnlineMapper.toResponse(saved);
    }

    @Transactional
    public ClassOnlineResponse update(Long id, UpdateClassOnlineRequest request) {
        log.info("Updating online class: {}", id);
        ClassOnlineEntity existing = classOnlineRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of(RESOURCE_NAME, id));

        classOnlineMapper.updateFromRequest(request, existing);

        ClassOnlineEntity updated = classOnlineRepository.save(existing);
        return classOnlineMapper.toResponse(updated);
    }

    @Transactional
    public void delete(Long id) {
        log.info("Deleting online class: {}", id);
        if (!classOnlineRepository.existsById(id)) {
            throw ResourceNotFoundException.of(RESOURCE_NAME, id);
        }
        classOnlineRepository.deleteById(id);
    }

    private void applyRelations(ClassOnlineEntity entity, CreateClassOnlineRequest request) {
        ClassEntity classEntity = classRepository.findById(request.getClassId())
                .orElseThrow(() -> ResourceNotFoundException.of("Class", request.getClassId()));
        UserEntity teacher = userRepository.findById(request.getTeacherId())
                .orElseThrow(() -> ResourceNotFoundException.of("User", request.getTeacherId()));

        entity.setClassEntity(classEntity);
        entity.setTeacherEntity(teacher);
    }

    @Override
    public PageResponse<ClassOnlineResponse> search(ClassOnlineSearchRequest request) {
        log.info("Searching ClassOnline via specification");
        Specification<ClassOnlineEntity> spec = ClassOnlineSpecification.filterAndSearch(request);
        Pageable pageable = request.toPageable();
        Page<ClassOnlineEntity> page = classOnlineRepository.findAll(spec, pageable);
        return PageResponse.from(page.map(classOnlineMapper::toResponse));
    }
}
