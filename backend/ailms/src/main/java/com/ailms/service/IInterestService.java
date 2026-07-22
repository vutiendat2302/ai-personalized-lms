package com.ailms.service;

import com.ailms.request.*;
import com.ailms.response.InterestResponse;
import com.ailms.response.PageResponse;

import java.util.List;

/**
 * Service quản lý danh mục sở thích cá nhân của học viên phục vụ cá nhân hóa học tập.
 */
public interface IInterestService {

    /**
     * Tạo mới sở thích/chủ đề quan tâm của học viên.
     *
     * @param request Đối tượng DTO chứa thông tin yêu cầu
     * @return đối tượng chứa thông tin chi tiết kết quả
     */
    InterestResponse createInterest(CreateInterestRequest request);

    /**
     * Cập nhật thông tin sở thích.
     *
     * @param id ID của bản ghi cần xử lý
     * @param request Đối tượng DTO chứa thông tin yêu cầu
     * @return đối tượng chứa thông tin chi tiết kết quả
     */
    InterestResponse updateInterest(Long id, UpdateInterestRequest request);

    /**
     * Cập nhật trạng thái hoạt động của sở thích.
     *
     * @param id ID của bản ghi cần xử lý
     * @param request Đối tượng DTO chứa thông tin yêu cầu
     * @return đối tượng chứa thông tin chi tiết kết quả
     */
    InterestResponse updateStatus(Long id, InterestStatusRequest request);

    /**
     * Xóa bản ghi khỏi hệ thống theo ID.
     *
     * @param id ID của bản ghi cần xử lý
     */
    void delete(Long id);

    /**
     * Lấy thông tin sở thích theo ID.
     *
     * @param id ID của bản ghi cần xử lý
     * @return đối tượng chứa thông tin chi tiết kết quả
     */
    InterestResponse getInterestById(Long id);

    /**
     * Lấy danh sách tất cả các sở thích hoạt động.
     * @return danh sách các đối tượng phù hợp
     */
    List<InterestResponse> getInterests();

    /**
     * Tìm kiếm và phân trang danh sách dựa trên các tiêu chí lọc.
     *
     * @param request Đối tượng DTO chứa thông tin yêu cầu
     * @return trang kết quả chứa danh sách đã được phân trang
     */
    PageResponse<InterestResponse> search(InterestSearchRequest request);
}
