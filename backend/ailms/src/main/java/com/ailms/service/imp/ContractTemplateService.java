package com.ailms.service.imp;

import com.ailms.entity.ContractTemplateEntity;
import com.ailms.entity.enums.BaseStatusEnum;
import com.ailms.entity.enums.ContractTypeEnum;
import com.ailms.exception.ResourceNotFoundException;
import com.ailms.repository.ContractTemplateRepository;
import com.ailms.response.ContractTemplateResponse;
import com.ailms.service.IContractTemplateService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Service xử lý logic truy vấn mẫu hợp đồng HTML và thay thế biến placeholder để xem trước.
 */
@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class ContractTemplateService implements IContractTemplateService {

    private final ContractTemplateRepository contractTemplateRepository;

    /** Pattern Regex tìm các biến placeholder dạng {{tên_biến}} trong chuỗi HTML. */
    private static final Pattern PLACEHOLDER_PATTERN = Pattern.compile("\\{\\{([^}]+)\\}\\}");

    /**
     * [Bước B1] Lấy danh sách mẫu hợp đồng HTML đang ACTIVE (lọc theo loại hợp đồng nếu có).
     */
    @Override
    public List<ContractTemplateResponse> getTemplates(ContractTypeEnum type) {
        log.info("Fetching contract templates for type: {}", type);
        List<ContractTemplateEntity> entities;
        if (type != null) {
            entities = contractTemplateRepository.findByContractTypeEnumAndStatus(type, BaseStatusEnum.ACTIVE);
        } else {
            entities = contractTemplateRepository.findByStatus(BaseStatusEnum.ACTIVE);
        }

        return entities.stream().map(this::toResponse).toList();
    }

    /**
     * Lấy chi tiết mẫu hợp đồng HTML theo templateId.
     */
    @Override
    public ContractTemplateResponse getTemplateById(Long templateId) {
        log.info("Fetching contract template by id: {}", templateId);
        ContractTemplateEntity entity = contractTemplateRepository.findById(templateId)
                .orElseThrow(() -> ResourceNotFoundException.of("ContractTemplate", templateId));
        return toResponse(entity);
    }

    /**
     * [Bước B2] Sinh HTML xem trước (Preview) do BE render bằng cách replace các {{placeholder}} bằng dữ liệu form.
     */
    @Override
    public String generatePreviewHtml(Long templateId, Map<String, String> placeholderData) {
        log.info("Generating preview HTML for template id: {}", templateId);
        ContractTemplateEntity entity = contractTemplateRepository.findById(templateId)
                .orElseThrow(() -> ResourceNotFoundException.of("ContractTemplate", templateId));

        String content = entity.getTemplateContent();
        if (placeholderData != null && !placeholderData.isEmpty()) {
            for (Map.Entry<String, String> entry : placeholderData.entrySet()) {
                String key = entry.getKey();
                String value = entry.getValue() != null ? entry.getValue() : "";
                content = content.replace("{{" + key + "}}", value);
            }
        }
        return content;
    }

    /**
     * Chuyển đổi Entity sang DTO Response kèm danh sách các placeholder bóc tách từ nội dung HTML.
     */
    private ContractTemplateResponse toResponse(ContractTemplateEntity entity) {
        List<String> placeholders = extractPlaceholders(entity.getTemplateContent());
        return ContractTemplateResponse.builder()
                .templateId(entity.getId())
                .name(entity.getName())
                .contractTypeEnum(entity.getContractTypeEnum())
                .templateContent(entity.getTemplateContent())
                .placeholders(placeholders)
                .version(entity.getVersion())
                .status(entity.getStatus())
                .build();
    }

    /**
     * Dùng Regex quét chuỗi HTML để tìm các biến động dạng {{variableName}} đưa vào mảng cho FE biết cần render input nào.
     */
    private List<String> extractPlaceholders(String content) {
        List<String> placeholders = new ArrayList<>();
        if (content == null) return placeholders;

        Matcher matcher = PLACEHOLDER_PATTERN.matcher(content);
        while (matcher.find()) {
            String placeholder = matcher.group(1).trim();
            if (!placeholders.contains(placeholder)) {
                placeholders.add(placeholder);
            }
        }
        return placeholders;
    }
}
