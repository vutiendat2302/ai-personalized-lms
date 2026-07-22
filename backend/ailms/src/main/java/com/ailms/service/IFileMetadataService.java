package com.ailms.service;
import com.ailms.entity.enums.BaseStatusEnum;
import com.ailms.entity.enums.FileTypeEnum;
import com.ailms.request.CreateFileMetadataRequest;
import com.ailms.request.FileSearchRequest;
import com.ailms.response.FileMetadataResponse;
import com.ailms.response.PageResponse;

import java.util.List;

/**
 * Service quản lý thông tin siêu dữ liệu (metadata) của các file tải lên hệ thống.
 */
public interface IFileMetadataService {

    /**
     * Tạo mới bản ghi từ dữ liệu yêu cầu.
     *
     * @param request Đối tượng DTO chứa thông tin yêu cầu
     * @return đối tượng chứa thông tin chi tiết kết quả
     */
    FileMetadataResponse create(CreateFileMetadataRequest request);

    /**
     * Lấy thông tin file dựa trên khóa file (fileKey) duy nhất.
     *
     * @param fileKey Khóa duy nhất định danh tệp tin trong hệ thống lưu trữ
     * @return đối tượng chứa thông tin chi tiết kết quả
     */
    FileMetadataResponse getByFileKey(String fileKey);

    /**
     * Lấy thông tin chi tiết của bản ghi theo ID.
     *
     * @param id ID của bản ghi cần xử lý
     * @return đối tượng chứa thông tin chi tiết kết quả
     */
    FileMetadataResponse getById(Long id);

    /**
     * Lấy danh sách file theo định dạng hoặc loại tệp.
     *
     * @param fileType Phân loại tệp tin tải lên
     * @return danh sách các đối tượng phù hợp
     */
    List<FileMetadataResponse> getByFileType(FileTypeEnum fileType);

    /**
     * Xóa mềm file (chuyển trạng thái hoạt động thành ẩn/không sử dụng).
     *
     * @param fileKey Khóa duy nhất định danh tệp tin trong hệ thống lưu trữ
     */
    void softDelete(String fileKey);

    /**
     * Xóa vĩnh viễn tệp tin khỏi hệ thống dữ liệu.
     *
     * @param fileKey Khóa duy nhất định danh tệp tin trong hệ thống lưu trữ
     */
    void hardDelete(String fileKey);

    /**
     * Kiểm tra sự tồn tại của tệp dựa trên fileKey.
     *
     * @param fileKey Khóa duy nhất định danh tệp tin trong hệ thống lưu trữ
     * @return true nếu xử lý thành công hoặc hợp lệ, ngược lại là false
     */
    boolean existsByFileKey(String fileKey);

    /**
     * Tìm kiếm và phân trang danh sách dựa trên các tiêu chí lọc.
     *
     * @param request Đối tượng DTO chứa thông tin yêu cầu
     * @return trang kết quả chứa danh sách đã được phân trang
     */
    PageResponse<FileMetadataResponse> search(FileSearchRequest request);

    /**
     * Cập nhật tên gốc hiển thị của tệp tin.
     *
     * @param fileKey Khóa duy nhất định danh tệp tin trong hệ thống lưu trữ
     * @param newOriginalName Tên gốc mới muốn thay đổi của tệp tin
     * @return đối tượng chứa thông tin chi tiết kết quả
     */
    FileMetadataResponse updateOriginalName(String fileKey, String newOriginalName);

    /**
     * Cập nhật trạng thái hoạt động của tệp.
     *
     * @param fileKey Khóa duy nhất định danh tệp tin trong hệ thống lưu trữ
     * @param status Trạng thái mới cần cập nhật
     * @return đối tượng chứa thông tin chi tiết kết quả
     */
    FileMetadataResponse updateStatus(String fileKey, BaseStatusEnum status);

    /**
     * Lấy toàn bộ danh sách tệp tin đang quản lý.
     * @return danh sách các đối tượng phù hợp
     */
    List<FileMetadataResponse> getAllFiles();
}
