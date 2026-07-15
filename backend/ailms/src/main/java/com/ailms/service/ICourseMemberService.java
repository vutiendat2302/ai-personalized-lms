package com.ailms.service;

import org.springframework.data.domain.Page;
import com.ailms.request.CourseMemberSearchRequest;
import com.ailms.response.CourseMemberResponse;


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
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

public interface ICourseMemberService {
    Page<CourseMemberResponse> search(CourseMemberSearchRequest request);
    List<CourseMemberResponse> getAll();
    CourseMemberResponse getById(Long courseId, Long userId);
    List<CourseMemberResponse> getByCourseId(Long courseId);
    List<CourseMemberResponse> getByUserId(Long userId);
    CourseMemberResponse create(CourseMemberRequest request);
    CourseMemberResponse update(Long courseId, Long userId, CourseMemberRequest request);
    void delete(Long courseId, Long userId);
}
