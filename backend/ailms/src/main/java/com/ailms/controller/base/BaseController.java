package com.ailms.controller.base;

import com.ailms.service.base.BaseService;
import com.ailms.response.ApiResponse;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

public abstract class BaseController<CreateDto, UpdateDto, ResponseDto, ID> {

    protected abstract BaseService<?, ID, CreateDto, UpdateDto, ResponseDto> getService();
    protected abstract String getResourceName();

    @PostMapping
    public ResponseEntity<ApiResponse<ResponseDto>> create(@Valid @RequestBody CreateDto dto) {
        ResponseDto response = getService().create(dto);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.of(getResourceName() + " created successfully", response));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<ResponseDto>> getById(@PathVariable ID id) {
        ResponseDto response = getService().getById(id);
        return ResponseEntity.ok(ApiResponse.of(response));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<java.util.List<ResponseDto>>> getAll() {
        java.util.List<ResponseDto> response = getService().getAllList();
        return ResponseEntity.ok(ApiResponse.of(response));
    }

    @GetMapping("/page")
    public ResponseEntity<ApiResponse<com.ailms.response.PageResponse<ResponseDto>>> getAllPage(Pageable pageable) {
        com.ailms.response.PageResponse<ResponseDto> response = com.ailms.response.PageResponse.from(getService().getAll(pageable));
        return ResponseEntity.ok(ApiResponse.of(response));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<ResponseDto>> update(@PathVariable ID id, @Valid @RequestBody UpdateDto dto) {
        ResponseDto response = getService().update(id, dto);
        return ResponseEntity.ok(ApiResponse.of(getResourceName() + " updated successfully", response));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable ID id) {
        getService().delete(id);
        return ResponseEntity.ok(ApiResponse.message(getResourceName() + " deleted successfully"));
    }
}
