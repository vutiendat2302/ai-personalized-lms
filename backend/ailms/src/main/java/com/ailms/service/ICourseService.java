package com.ailms.service;

import com.ailms.response.PageResponse;
import com.ailms.request.CourseSearchRequest;
import com.ailms.request.CourseStatusRequest;
import com.ailms.request.CreateCourseRequest;
import com.ailms.request.UpdateCourseRequest;
import com.ailms.response.CourseResponse;

import java.util.List;

public interface ICourseService {
    
    CourseResponse create(CreateCourseRequest request);
    
    CourseResponse update(Long id, UpdateCourseRequest request);
    
    CourseResponse updateStatus(Long id, CourseStatusRequest request);
    
    void delete(Long id);
    
    CourseResponse getById(Long id);

    List<CourseResponse> getAll();
    
    PageResponse<CourseResponse> search(CourseSearchRequest request);

}
