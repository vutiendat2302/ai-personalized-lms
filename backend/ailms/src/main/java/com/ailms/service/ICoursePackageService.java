package com.ailms.service;

import com.ailms.request.CoursePackageRequest;
import com.ailms.request.CoursePackageSearchRequest;
import com.ailms.response.CoursePackageResponse;
import com.ailms.response.PageResponse;

import java.util.List;

public interface ICoursePackageService {
    PageResponse<CoursePackageResponse> search(CoursePackageSearchRequest request);
    List<CoursePackageResponse> getAll();
    CoursePackageResponse getById(Long id);
    List<CoursePackageResponse> getByCourseId(Long courseId);
    CoursePackageResponse create(CoursePackageRequest request);
    CoursePackageResponse update(Long id, CoursePackageRequest request);
    void delete(Long id);
}
