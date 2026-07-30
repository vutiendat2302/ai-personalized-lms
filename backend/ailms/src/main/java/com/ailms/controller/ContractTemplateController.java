package com.ailms.controller;

import com.ailms.entity.enums.ContractTypeEnum;
import com.ailms.response.ApiResponse;
import com.ailms.response.ContractTemplateResponse;
import com.ailms.service.IContractTemplateService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Controller xử lý các yêu cầu liên quan đến mẫu hợp đồng HTML (Contract Template).
 */
@RestController
@RequestMapping("${api.prefix}/contract-templates")
@RequiredArgsConstructor
public class ContractTemplateController {

    private final IContractTemplateService contractTemplateService;

    /**
     * [2.2 - Bước B1] GET /contract-templates?type=PROBATION
     * Lấy danh sách các mẫu hợp đồng HTML đang ACTIVE (lọc theo loại hợp đồng nếu truyền parameter type).
     */
    @GetMapping
    public ResponseEntity<ApiResponse<List<ContractTemplateResponse>>> getTemplates(
            @RequestParam(required = false) ContractTypeEnum type) {
        List<ContractTemplateResponse> response = contractTemplateService.getTemplates(type);
        return ResponseEntity.ok(ApiResponse.of("Contract templates retrieved successfully", response));
    }

    /**
     * GET /contract-templates/{id}
     * Lấy chi tiết 1 mẫu hợp đồng HTML theo templateId (kèm danh sách placeholders).
     */
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<ContractTemplateResponse>> getById(@PathVariable Long id) {
        ContractTemplateResponse response = contractTemplateService.getTemplateById(id);
        return ResponseEntity.ok(ApiResponse.of("Contract template retrieved successfully", response));
    }

    /**
     * [2.2 - Bước B2] POST /contract-templates/{templateId}/preview
     * (Tùy chọn) Điền dữ liệu placeholder vào HTML template và trả về chuỗi previewHtml do BE render.
     */
    @PostMapping("/{templateId}/preview")
    public ResponseEntity<ApiResponse<Map<String, String>>> previewHtml(
            @PathVariable Long templateId,
            @RequestBody(required = false) Map<String, String> placeholderData) {
        String previewHtml = contractTemplateService.generatePreviewHtml(templateId, placeholderData);
        return ResponseEntity.ok(ApiResponse.of("Contract template preview generated successfully", Map.of("previewHtml", previewHtml)));
    }
}
