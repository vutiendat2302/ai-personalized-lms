package com.ailms.service;

import com.ailms.entity.enums.ContractTypeEnum;
import com.ailms.response.ContractTemplateResponse;

import java.util.List;
import java.util.Map;

/**
 * Interface định nghĩa dịch vụ quản lý mẫu hợp đồng HTML (Contract Template).
 */
public interface IContractTemplateService {

    /**
     * [Bước B1] Lấy danh sách mẫu hợp đồng HTML đang ACTIVE theo loại hợp đồng (PROBATION, FIXED_TERM, INDEFINITE, SEASONAL).
     */
    List<ContractTemplateResponse> getTemplates(ContractTypeEnum type);

    /**
     * Lấy thông tin chi tiết mẫu hợp đồng theo templateId (bao gồm danh sách biến placeholder).
     */
    ContractTemplateResponse getTemplateById(Long templateId);

    /**
     * [Bước B2] Sinh bản xem trước HTML (Live Preview) bằng cách thay thế các biến {{placeholder}} bằng dữ liệu nhập thực tế.
     */
    String generatePreviewHtml(Long templateId, Map<String, String> placeholderData);
}
