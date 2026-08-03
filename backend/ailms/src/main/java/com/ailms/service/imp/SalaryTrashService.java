package com.ailms.service.imp;

import com.ailms.entity.SalaryEntity;
import com.ailms.exception.BusinessException;
import com.ailms.repository.SalaryRepository;
import com.ailms.response.ChildRecordDetailResponse;
import com.ailms.response.PageResponse;
import com.ailms.response.TrashItemResponse;
import com.ailms.service.ITrashable;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.*;

@Service
@RequiredArgsConstructor
public class SalaryTrashService implements ITrashable {
    private final SalaryRepository repository;

    @Override public String getEntityType() { return "SALARY"; }

    private List<SalaryEntity> batch(Long id) {
        SalaryEntity anchor = repository.findById(id).filter(s -> s.getDeletedAt() != null)
                .orElseThrow(() -> new BusinessException("Bảng lương không nằm trong thùng rác"));
        return repository.findByDeletedAtIsNotNull().stream().filter(s -> s.getPeriod().equals(anchor.getPeriod())).toList();
    }

    private TrashItemResponse item(List<SalaryEntity> slips) {
        SalaryEntity first = slips.get(0);
        LocalDateTime deletedAt = slips.stream().map(SalaryEntity::getDeletedAt).filter(Objects::nonNull).min(LocalDateTime::compareTo).orElse(LocalDateTime.now());
        return TrashItemResponse.builder().entityType("SALARY").id(String.valueOf(first.getId()))
                .code("PAYROLL-" + first.getPeriod()).name("Bảng lương tháng " + first.getPeriod())
                .deletedAt(deletedAt).daysInTrash(Math.max(0, ChronoUnit.DAYS.between(deletedAt, LocalDateTime.now())))
                .hasChildRecords(false).childRecordCounts(Map.of())
                .extraFields(Map.of("period", first.getPeriod().toString(), "slipCount", slips.size(),
                        "totalAmount", slips.stream().map(SalaryEntity::getTotalSalary).filter(Objects::nonNull).reduce(java.math.BigDecimal.ZERO, java.math.BigDecimal::add)))
                .build();
    }

    @Override public PageResponse<TrashItemResponse> getTrashItems(String keyword, Pageable pageable) {
        List<TrashItemResponse> items = repository.findByDeletedAtIsNotNull().stream()
                .collect(java.util.stream.Collectors.groupingBy(SalaryEntity::getPeriod)).values().stream().map(this::item)
                .filter(i -> keyword == null || i.getName().toLowerCase().contains(keyword.toLowerCase()) || i.getCode().toLowerCase().contains(keyword.toLowerCase()))
                .sorted(Comparator.comparing(TrashItemResponse::getDeletedAt).reversed()).toList();
        if (pageable.isUnpaged()) return PageResponse.from(new PageImpl<>(items));
        int start = Math.min((int) pageable.getOffset(), items.size()), end = Math.min(start + pageable.getPageSize(), items.size());
        return PageResponse.from(new PageImpl<>(items.subList(start, end), pageable, items.size()));
    }
    @Override public TrashItemResponse getTrashItemDetail(Long id) { return item(batch(id)); }
    @Override public Map<String, Long> checkChildRecords(Long id) { batch(id); return Map.of(); }
    @Override public List<ChildRecordDetailResponse> getChildRecordDetails(Long id) { batch(id); return List.of(); }
    @Override @Transactional public void hardDelete(Long id) { repository.deleteAll(batch(id)); }
    @Override @Transactional public void restore(Long id) { List<SalaryEntity> rows=batch(id); rows.forEach(s->s.setDeletedAt(null)); repository.saveAll(rows); }
    @Override public Map<String,Object> bulkHardDelete(List<Long> ids) { int n=0; for(Long id:ids){ try{hardDelete(id);n++;}catch(Exception ignored){} } return Map.of("successCount",n,"failureCount",ids.size()-n); }
    @Override public Map<String,Object> bulkRestore(List<Long> ids) { int n=0; for(Long id:ids){ try{restore(id);n++;}catch(Exception ignored){} } return Map.of("successCount",n,"failureCount",ids.size()-n); }
}
