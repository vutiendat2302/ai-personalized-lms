package com.ailms.service;

import com.ailms.request.*;
import com.ailms.response.EffectivePermissionResponse;
import com.ailms.response.UserResponse;
import com.ailms.response.PageResponse;
import java.util.List;
import java.util.Map;

/**
 * Service xử lý nghiệp vụ liên quan đến User, Role, Permission và Audit Log.
 * Bao gồm: CRUD user, mời user qua email, thao tác hàng loạt (bulk),
 * gán role, tra cứu quyền tổng hợp (effective permissions) và lịch sử thay đổi.
 */

public interface IUserService {

    /**
     * Lấy danh sách user có phân trang, hỗ trợ search/filter/sort
     * (theo tên, email, role, status, ngày tạo...).
     *
     * @param request điều kiện tìm kiếm, lọc và thông tin phân trang
     * @return danh sách user đã phân trang
     */
    PageResponse<UserResponse> getUsers(UserSearchRequest request);

    List<UserResponse> getAllUsers();
    UserResponse getUserById(Long id);
    UserResponse createUser(CreateUserRequest request);
    UserResponse updateUser(Long id, UpdateUserRequest request);
    void deleteUser(Long id);

    /**
     * Gui loi moi than he thong qua email, tao user o trang thai chua active
     * kem token moi co thoi gian, va link set password cho user
     * @param request email va role cho user duoc moi
     */
    void inviteUser(InviteUserRequest request);

    /**
     * Hoàn tất quá trình được mời: xác thực token, cho user đặt password
     * và kích hoạt tài khoản (chuyển status = ACTIVE), gán role đã chuẩn bị sẵn.
     *
     * @param request token mời và password mới do user nhập
     */
    void completeInvite(CompleteInviteRequest request);

    /**
     * Xóa mềm nhiều user cùng lúc. Xử lý theo từng phần tử (partial success),
     * user nào lỗi sẽ được ghi nhận lại thay vì làm fail toàn bộ batch.
     *
     * @param request danh sách id user cần xóa
     * @return kết quả tổng hợp gồm số lượng thành công/thất bại và chi tiết lỗi
     */
    Map<String, Object> bulkDelete(BulkDeleteRequest request);

    /**
     * Gán 1 role cho nhiều user cùng lúc. User nào đã có role đó thì bỏ qua,
     * không tạo trùng. Xử lý theo kiểu partial success như bulkDelete.
     *
     * @param request danh sách id user và id role cần gán
     * @return kết quả tổng hợp gồm số lượng thành công/thất bại và chi tiết lỗi
     */
    Map<String, Object> bulkAssignRole(BulkAssignRoleRequest request);

    /**
     * Tổng hợp toàn bộ permission hiệu lực (effective permissions) của 1 user,
     * gộp từ tất cả role đang active (chưa hết hạn) mà user đang có.
     * Mỗi permission trả về kèm danh sách role nào cung cấp nó, phục vụ tra cứu/kiểm tra quyền.
     *
     * @param userId id của user cần tra cứu quyền
     * @return danh sách permission tổng hợp, đã dedupe theo permission
     */
    List<EffectivePermissionResponse> getEffectivePermissions(Long userId);

    /**
     * Gán lại toàn bộ role cho user (thay thế danh sách role hiện tại bằng danh sách mới).
     * Yêu cầu user luôn phải có ít nhất 1 role sau khi gán.
     *
     * @param userId  id của user
     * @param request danh sách id role mới muốn gán
     */
    void assignRoles(Long userId, AssignRolesRequest request);

    /**
     * Cập nhật thông tin hồ sơ cá nhân của user (self-update, không đổi role/status).
     *
     * @param userId  id của user
     * @param request thông tin hồ sơ cần cập nhật
     * @return thông tin user sau khi cập nhật
     */
    UserResponse updateProfile(Long userId, UpdateProfileRequest request);

    /**
     * Xác thực OTP để hoàn tất việc đổi email của user.
     * OTP và email mới được lưu tạm ở Redis, xóa sau khi xác thực thành công.
     *
     * @param userId  id của user
     * @param request mã OTP do user nhập để xác nhận đổi email
     */
    void verifyEmailChange(Long userId, VerifyEmailChangeRequest request);

}
