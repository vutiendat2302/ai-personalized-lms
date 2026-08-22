package com.ailms.service;

import com.ailms.request.DegreeSearchRequest;
import com.ailms.response.DegreeResponse;
import com.ailms.response.PageResponse;

import java.util.List;

public interface IDegreeService {
    PageResponse<DegreeResponse> search(DegreeSearchRequest request);
    List<DegreeResponse> getDegreesByCategoryId(Long categoryId);
}
