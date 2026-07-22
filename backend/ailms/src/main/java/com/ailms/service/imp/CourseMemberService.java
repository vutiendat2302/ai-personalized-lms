package com.ailms.service.imp;
import com.ailms.repository.specification.CourseMemberSpecification;
import com.ailms.request.CourseMemberSearchRequest;
import com.ailms.service.ICourseMemberService;


import com.ailms.entity.CourseEntity;
import com.ailms.entity.CourseMemberEntity;
import com.ailms.entity.CourseMemberId;
import com.ailms.entity.UserEntity;
import com.ailms.exception.DuplicateResourceException;
import com.ailms.exception.ResourceNotFoundException;
import com.ailms.mapper.CourseMemberMapper;
import com.ailms.repository.CourseMemberRepository;
import com.ailms.repository.CourseRepository;
import com.ailms.repository.UserRepository;
import com.ailms.request.CourseMemberRequest;
import com.ailms.response.CourseMemberResponse;
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
public class CourseMemberService implements ICourseMemberService {
    @Override
    public PageResponse<CourseMemberResponse> search(CourseMemberSearchRequest request) {
        log.info("Searching CourseMember via specification");
        Specification<CourseMemberEntity> spec = CourseMemberSpecification.filterAndSearch(request);
        Pageable pageable = request.toPageable();
        Page<CourseMemberEntity> page = courseMemberRepository.findAll(spec, pageable);
        return PageResponse.from(page.map(courseMemberMapper::toResponse));
    }


    private final CourseMemberRepository courseMemberRepository;
    private final CourseRepository courseRepository;
    private final UserRepository userRepository;
    private final CourseMemberMapper courseMemberMapper;

    private static final String RESOURCE_NAME = "CourseMember";

    public List<CourseMemberResponse> getAll() {
        log.info("Getting all course members");
        return courseMemberMapper.toResponseList(courseMemberRepository.findAll());
    }

    public CourseMemberResponse getById(Long courseId, Long userId) {
        log.info("Getting course member by course id: {}, user id: {}", courseId, userId);
        CourseMemberEntity entity = courseMemberRepository.findById(new CourseMemberId(courseId, userId))
                .orElseThrow(() -> notFound(courseId, userId));
        return courseMemberMapper.toResponse(entity);
    }

    public List<CourseMemberResponse> getByCourseId(Long courseId) {
        log.info("Getting members by course id: {}", courseId);
        return courseMemberMapper.toResponseList(courseMemberRepository.findByCourseEntity_Id(courseId));
    }

    public List<CourseMemberResponse> getByUserId(Long userId) {
        log.info("Getting course members by user id: {}", userId);
        return courseMemberMapper.toResponseList(courseMemberRepository.findByUserEntity_Id(userId));
    }

    @Transactional
    public CourseMemberResponse create(CourseMemberRequest request) {
        log.info("Creating course member for course: {}, user: {}", request.getCourseId(), request.getUserId());
        CourseMemberId id = new CourseMemberId(request.getCourseId(), request.getUserId());
        if (courseMemberRepository.existsById(id)) {
            throw new DuplicateResourceException("Course member already exists for course ID "
                    + request.getCourseId() + " and user ID " + request.getUserId());
        }

        CourseMemberEntity entity = courseMemberMapper.toEntity(request);
        entity.setId(id);
        applyRelations(entity, request);

        CourseMemberEntity saved = courseMemberRepository.save(entity);
        return courseMemberMapper.toResponse(saved);
    }

    @Transactional
    public CourseMemberResponse update(Long courseId, Long userId, CourseMemberRequest request) {
        log.info("Updating course member for course: {}, user: {}", courseId, userId);
        CourseMemberId id = new CourseMemberId(courseId, userId);
        CourseMemberEntity existing = courseMemberRepository.findById(id)
                .orElseThrow(() -> notFound(courseId, userId));

        courseMemberMapper.updateFromRequest(request, existing);
        existing.setId(id);
        applyRelations(existing, request);

        CourseMemberEntity updated = courseMemberRepository.save(existing);
        return courseMemberMapper.toResponse(updated);
    }

    @Transactional
    public void delete(Long courseId, Long userId) {
        log.info("Deleting course member for course: {}, user: {}", courseId, userId);
        CourseMemberId id = new CourseMemberId(courseId, userId);
        if (!courseMemberRepository.existsById(id)) {
            throw notFound(courseId, userId);
        }
        courseMemberRepository.deleteById(id);
    }

    private ResourceNotFoundException notFound(Long courseId, Long userId) {
        return new ResourceNotFoundException(RESOURCE_NAME + " not found with course ID "
                + courseId + " and user ID " + userId);
    }

    private void applyRelations(CourseMemberEntity entity, CourseMemberRequest request) {
        CourseEntity course = courseRepository.findById(request.getCourseId())
                .orElseThrow(() -> ResourceNotFoundException.of("Course", request.getCourseId()));
        UserEntity user = userRepository.findById(request.getUserId())
                .orElseThrow(() -> ResourceNotFoundException.of("User", request.getUserId()));

        entity.setCourseEntity(course);
        entity.setUserEntity(user);
    }
}
