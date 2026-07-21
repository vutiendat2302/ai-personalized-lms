package com.ailms.service;

import com.ailms.request.CourseApprovalRequest;
import com.ailms.request.CourseSearchRequest;
import com.ailms.request.CourseStatusRequest;
import com.ailms.request.CreateCourseRequest;
import com.ailms.request.UpdateCourseRequest;
import com.ailms.response.ClassResponse;
import com.ailms.response.CourseResponse;
import com.ailms.response.PageResponse;

import java.util.List;

public interface ICourseService {
    
    CourseResponse create(CreateCourseRequest request);

    CourseResponse createCourseByTeacher(Long teacherUserId, CreateCourseRequest request);
    
    CourseResponse update(Long id, UpdateCourseRequest request);
    
    CourseResponse updateStatus(Long id, CourseStatusRequest request);

    CourseResponse approveCourse(Long id, CourseApprovalRequest request);
    
    void delete(Long id);
    
    CourseResponse getById(Long id);

    List<CourseResponse> getAll();
    
    PageResponse<CourseResponse> search(CourseSearchRequest request);

    List<ClassResponse> getSuggestedClassesForTeacher(Long teacherUserId);

    ClassResponse claimClass(Long teacherUserId, Long classId);
}
