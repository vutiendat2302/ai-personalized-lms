package com.ailms.service;

import com.ailms.response.PageResponse;
import com.ailms.response.TrashItemResponse;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Map;

/**
 * Interface trừu tượng chuẩn hóa các thao tác Thùng rác (Unified Trash) cho từng loại Entity trong hệ thống.
 */
public interface ITrashable {

    /**
     * Tên loại thực thể nhận diện (ví dụ: "USER", "EMPLOYEE", "STUDENT", "COURSE", "DEPARTMENT").
     */
    String getEntityType();

    /**
     * Lấy danh sách các bản ghi trong thùng rác có phân trang và lọc theo từ khóa.
     */
    PageResponse<TrashItemResponse> getTrashItems(String keyword, Pageable pageable);

    /**
     * Lấy chi tiết 1 bản ghi nằm trong thùng rác.
     */
    TrashItemResponse getTrashItemDetail(Long id);

    /**
     * Kiểm tra ràng buộc dữ liệu con ở các bảng phụ thuộc trước khi thực thi Xóa Cứng (Hard Delete).
     * @return Map với key là tên bảng con/mô tả và value là số bản ghi phụ thuộc.
     */
    Map<String, Long> checkChildRecords(Long id);

    /**
     * Lấy danh sách chi tiết các bản ghi con phụ thuộc khóa ngoại (Foreign Keys).
     */
    List<com.ailms.response.ChildRecordDetailResponse> getChildRecordDetails(Long id);

    /**
     * Thực thi xóa cứng vĩnh viễn khỏi CSDL (DELETE thật).
     */
    void hardDelete(Long id);

    /**
     * Khôi phục (Restore) bản ghi quay trở lại hệ thống về trạng thái ban đầu.
     */
    void restore(Long id);

    /**
     * Xóa cứng hàng loạt danh sách ID.
     */
    Map<String, Object> bulkHardDelete(List<Long> ids);

    /**
     * Khôi phục hàng loạt danh sách ID (theo cơ chế best-effort).
     */
    Map<String, Object> bulkRestore(List<Long> ids);
}
