package com.ailms.service;

import com.ailms.request.*;
import com.ailms.response.EffectivePermissionResponse;
import com.ailms.response.UserResponse;
import com.ailms.response.PageResponse;
import com.ailms.response.MonthlyUserCountResponse;
import com.ailms.response.UserDetailResponse;
import java.util.List;
import java.util.Map;

/**
 * Service quản lý tài khoản người dùng, phân quyền và lịch sử hoạt động.
 */
public interface IUserService {

    /**
     * Lấy danh sách người dùng có phân trang.
     *
     * @param request Đối tượng DTO chứa thông tin yêu cầu
     * @return trang kết quả chứa danh sách đã được phân trang
     */
    PageResponse<UserResponse> getUsers(UserSearchRequest request);

    /**
     * Lấy tất cả người dùng.
     * @return danh sách các đối tượng phù hợp
     */
    List<UserResponse> getAllUsers();

    /**
     * Lấy thông tin người dùng theo ID.
     *
     * @param id ID của bản ghi cần xử lý
     * @return đối tượng chứa thông tin chi tiết kết quả
     */
    UserResponse getUserById(Long id);

    /**
     * Tạo tài khoản người dùng mới.
     *
     * @param request Đối tượng DTO chứa thông tin yêu cầu
     * @return đối tượng chứa thông tin chi tiết kết quả
     */
    UserResponse createUser(CreateUserRequest request);

    /**
     * Cập nhật tài khoản người dùng.
     *
     * @param id ID của bản ghi cần xử lý
     * @param request Đối tượng DTO chứa thông tin yêu cầu
     * @return đối tượng chứa thông tin chi tiết kết quả
     */
    UserResponse updateUser(Long id, UpdateUserRequest request);

    /**
     * Xóa tài khoản người dùng.
     *
     * @param id ID của bản ghi cần xử lý
     */
    void deleteUser(Long id);

    /**
     * Mời người dùng tham gia hệ thống qua email.
     *
     * @param request Đối tượng DTO chứa thông tin yêu cầu
     */
    void inviteUser(InviteUserRequest request);

    /**
     * Xác nhận lời mời và đặt mật khẩu lần đầu.
     *
     * @param request Đối tượng DTO chứa thông tin yêu cầu
     */
    void completeInvite(CompleteInviteRequest request);

    /**
     * Xóa hàng loạt tài khoản người dùng.
     *
     * @param request Đối tượng DTO chứa thông tin yêu cầu
     * @return bản đồ Map chứa kết quả xử lý (ví dụ: số lượng thành công, thất bại và chi tiết lỗi)
     */
    Map<String, Object> bulkDelete(BulkDeleteRequest request);

    /**
     * Gán vai trò hàng loạt cho nhiều người dùng.
     *
     * @param request Đối tượng DTO chứa thông tin yêu cầu
     * @return bản đồ Map chứa kết quả xử lý (ví dụ: số lượng thành công, thất bại và chi tiết lỗi)
     */
    Map<String, Object> bulkAssignRole(BulkAssignRoleRequest request);

    /**
     * Lấy danh sách toàn bộ các quyền hạn có hiệu lực thực tế của người dùng.
     *
     * @param userId ID của người dùng (User)
     * @return danh sách các đối tượng phù hợp
     */
    List<EffectivePermissionResponse> getEffectivePermissions(Long userId);

    /**
     * Gán danh sách các vai trò cho người dùng.
     *
     * @param userId ID của người dùng (User)
     * @param request Đối tượng DTO chứa thông tin yêu cầu
     */
    void assignRoles(Long userId, AssignRolesRequest request);

    /**
     * Học viên/nhân viên tự cập nhật thông tin cá nhân của mình.
     *
     * @param userId ID của người dùng (User)
     * @param request Đối tượng DTO chứa thông tin yêu cầu
     * @return đối tượng chứa thông tin chi tiết kết quả
     */
    UserResponse updateProfile(Long userId, UpdateProfileRequest request);

    /**
     * Xác thực mã OTP để hoàn thành đổi email mới.
     *
     * @param userId ID của người dùng (User)
     * @param request Đối tượng DTO chứa thông tin yêu cầu
     */
    void verifyEmailChange(Long userId, VerifyEmailChangeRequest request);

    /**
     * Lấy ra số lượng student (người dùng)
     */
    long countStudents();

    /**
     * Lấy ra số lượng nhân viên
     */
    long countEmployees();

    /**
     * Số lượng user theo từng vai trò
     */
    Map<String, Long> countUsersByRole();

    /**
     * Số lượng user theo giói tính
     */
    Map<String, Long> countUsersByGender();

    /**
     * Số lượng người dùng (UserEntity) theo trạng thái
     */
    Map<String, Long> countUsersByStatus();

    /**
     * Số lượng nhân viên theo độ tuổi
     */
    Map<String, Long> countEmployeesByAgeGroup();


    /**
     * Số lượng nhân viên theo trạng thái
     */
    Map<String, Long> countEmployeesByStatus();

    /**
     * Lấy số lượng người dùng mới theo tháng (trả v danh sách năm đó (12 tháng))
     */
    List<MonthlyUserCountResponse> getMonthlyNewUsers(Integer year);

    /**
     * Xem chi tiết người dùng: thông tin cá nhân (student-guardian hoặc employee), thông tin tài khoản (user),
     * thông tin hệ thống (baseEntity)
     */
    UserDetailResponse getUserDetail(Long userId);

    /**
     * Gửi email tới nhiều tài khoản (sẽ có request danh sách tài khoản email, nội dung gửi về)
     */
    void sendBulkEmail(SendBulkEmailRequest request);

    /**
     * Xuất file excel danh sách
     */
    byte[] exportUsersToExcel(UserSearchRequest request);

    /**
     * Xuất file excel chi tiết 1 người dùng (gồm tài khoản, hồ sơ cá nhân học viên/nhân viên/phụ huynh và hệ thống)
     */
    byte[] exportUserDetailToExcel(Long userId);

    /**
     * Thêm nhiều nhân viên (request: một danh sách email)
     */
    Map<String, Object> bulkCreateEmployees(BulkCreateEmployeeRequest request);
}


