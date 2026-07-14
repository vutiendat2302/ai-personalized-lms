package com.ailms.service;
import com.ailms.entity.FileTypeEnum;
import com.ailms.request.CreateFileMetadataRequest;
import com.ailms.request.FileSearchRequest;
import com.ailms.response.FileMetadataResponse;
import org.springframework.data.domain.Page;

import java.util.List;

/**
 * Service quản lý metadata của file trong DB (bảng file_metadata).
 */
public interface IFileMetadataService {
    /**
     * Tạo mới bản ghi metadata sau khi file đã upload thành công lên storage.
     *
     * @param request thông tin metadata cần lưu
     * @return metadata vừa tạo
     */
    FileMetadataResponse create(CreateFileMetadataRequest request);

    /**
     * Lấy metadata theo fileKey.
     *
     * @param fileKey object key cần tra cứu
     * @return metadata tương ứng
     */
    FileMetadataResponse getByFileKey(String fileKey);

    /**
     * Lấy metadata theo id.
     *
     * @param id id của bản ghi metadata
     * @return metadata tương ứng
     */
    FileMetadataResponse getById(Long id);

    /**
     * Lấy danh sách metadata theo loại file (VD: CONTRACT, AVATAR...).
     *
     * @param fileType loại file cần lọc
     * @return danh sách metadata phù hợp
     */
    List<FileMetadataResponse> getByFileType(FileTypeEnum fileType);

    /**
     * Soft-delete: đổi status sang INACTIVE/DELETED, không xóa row khỏi DB.
     *
     * @param fileKey object key cần soft-delete
     */
    void softDelete(String fileKey);

    /**
     * Xóa hẳn bản ghi metadata khỏi DB.
     * @param fileKey object key cần xóa metadata
     */
    void hardDelete(String fileKey);

    /**
     * Kiểm tra metadata có tồn tại theo fileKey không.
     * @param fileKey object key cần kiểm tra
     * @return true nếu tồn tại, false nếu không
     */
    boolean existsByFileKey(String fileKey);

    /**
     * Tìm kiếm, lọc, sắp xếp, phân trang metadata file — dùng cho màn quản lý file của admin.
     *
     * @param request điều kiện tìm kiếm
     * @return trang kết quả metadata phù hợp
     */
    Page<FileMetadataResponse> search(FileSearchRequest request);

}
