package com.ailms.service;

import com.ailms.request.CreateTeacherCategoryRequest;
import com.ailms.request.UpdateTeacherCategoryRequest;
import com.ailms.response.TeacherCategoryResponse;

import java.util.List;

public interface ITeacherCategoryService {
    List<TeacherCategoryResponse> getAll();
    List<TeacherCategoryResponse> getByEmployeeId(Long employeeId);
    TeacherCategoryResponse create(CreateTeacherCategoryRequest request);
    void delete(Long id);
    TeacherCategoryResponse assignTeacherToCategory(Long categoryId, Long employeeId, Long adminUserId);
    void unassignTeacherFromCategory(Long categoryId, Long employeeId);
    void update(Long id, UpdateTeacherCategoryRequest request);
}
