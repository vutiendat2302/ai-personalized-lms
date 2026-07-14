package com.ailms.service;

import com.ailms.entity.ClassEntity;
import com.ailms.entity.ClassOnlineEntity;
import com.ailms.entity.UserEntity;
import com.ailms.exception.ResourceNotFoundException;
import com.ailms.mapper.ClassOnlineMapper;
import com.ailms.repository.ClassOnlineRepository;
import com.ailms.repository.ClassRepository;
import com.ailms.repository.UserRepository;
import com.ailms.request.ClassOnlineRequest;
import com.ailms.response.ClassOnlineResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class ClassOnlineService {

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
    public ClassOnlineResponse create(ClassOnlineRequest request) {
        log.info("Creating online class for class: {}", request.getClassId());
        ClassOnlineEntity entity = classOnlineMapper.toEntity(request);
        applyRelations(entity, request);

        ClassOnlineEntity saved = classOnlineRepository.save(entity);
        return classOnlineMapper.toResponse(saved);
    }

    @Transactional
    public ClassOnlineResponse update(Long id, ClassOnlineRequest request) {
        log.info("Updating online class: {}", id);
        ClassOnlineEntity existing = classOnlineRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of(RESOURCE_NAME, id));

        classOnlineMapper.updateFromRequest(request, existing);
        applyRelations(existing, request);

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

    private void applyRelations(ClassOnlineEntity entity, ClassOnlineRequest request) {
        ClassEntity classEntity = classRepository.findById(request.getClassId())
                .orElseThrow(() -> ResourceNotFoundException.of("Class", request.getClassId()));
        UserEntity teacher = userRepository.findById(request.getTeacherId())
                .orElseThrow(() -> ResourceNotFoundException.of("User", request.getTeacherId()));

        entity.setClassEntity(classEntity);
        entity.setTeacherEntity(teacher);
    }
}
