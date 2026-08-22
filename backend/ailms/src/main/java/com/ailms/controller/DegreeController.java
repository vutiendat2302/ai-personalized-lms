package com.ailms.controller;

import com.ailms.request.DegreeSearchRequest;
import com.ailms.response.ApiResponse;
import com.ailms.response.DegreeResponse;
import com.ailms.response.PageResponse;
import com.ailms.service.IDegreeService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("${api.prefix}/degrees")
@RequiredArgsConstructor
public class DegreeController {

    private final IDegreeService degreeService;

    @GetMapping("/search")
    public ResponseEntity<ApiResponse<PageResponse<DegreeResponse>>> searchDegrees(DegreeSearchRequest request) {
        PageResponse<DegreeResponse> response = degreeService.search(request);
        return ResponseEntity.ok(ApiResponse.of("Tìm kiếm bằng cấp trực tuyến thành công", response));
    }

    @GetMapping("/{categoryId}/category")
    public ResponseEntity<ApiResponse<List<DegreeResponse>>> getDegreesByCategoryId(@PathVariable Long categoryId) {
        List<DegreeResponse> response = degreeService.getDegreesByCategoryId(categoryId);
        return ResponseEntity.ok(ApiResponse.of("Lấy danh sách bằng cấp trực tuyến của danh mục thành công", response));
    }
}
