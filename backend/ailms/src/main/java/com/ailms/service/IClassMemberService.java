package com.ailms.service;

import com.ailms.entity.ClassMemberEntity;
import com.ailms.entity.enums.ClassMemberRole;
import com.ailms.response.ClassMemberResponse;
import com.ailms.response.MemberDetailResponse;
import com.ailms.response.PageResponse;

import java.util.List;

/**
 * Service quản lý thành viên trong các lớp học (tham gia, rời lớp, chuyển lớp, danh sách chờ).
 */
public interface IClassMemberService {

    /**
     * Thêm thành viên vào lớp học với vai trò cụ thể.
     *
     * @param classId ID của lớp học
     * @param userId ID của người dùng (User)
     * @param role Vai trò của thành viên trong lớp học
     * @return đối tượng chứa thông tin chi tiết kết quả
     */
    ClassMemberEntity join(Long classId, Long userId, ClassMemberRole role);

    /**
     * Xóa thành viên khỏi lớp học kèm theo lý do.
     *
     * @param classId ID của lớp học
     * @param userId ID của người dùng (User)
     * @param reason Lý do thực hiện hành động
     * @return đối tượng chứa thông tin chi tiết kết quả
     */
    ClassMemberEntity leave(Long classId, Long userId, String reason);

    /**
     * Chuyển thành viên từ lớp học cũ sang lớp học mới.
     *
     * @param fromClassId ID lớp học gốc chuyển đi
     * @param toClassId ID lớp học đích chuyển đến
     * @param userId ID của người dùng (User)
     */
    void transfer(Long fromClassId, Long toClassId, Long userId);

    /**
     * Đưa học viên tiếp theo trong danh sách chờ vào lớp học chính thức.
     *
     * @param classId ID của lớp học
     */
    void promoteNextWaitlist(Long classId);

    /**
     * Cho phép thành viên quay trở lại lớp học sau khi đã rời đi.
     *
     * @param classId ID của lớp học
     * @param userId ID của người dùng (User)
     * @return đối tượng chứa thông tin chi tiết kết quả
     */
    ClassMemberEntity rejoin(Long classId, Long userId);

    /** Thay giáo viên chính atomically sau khi kiểm tra trùng lịch của người mới. */
    ClassMemberEntity replaceTeacher(Long classId, Long newTeacherUserId, String reason);

    List<ClassMemberResponse> getByUserId(Long userId);

    List<ClassMemberResponse> getByClassId(Long classId);
    /**
     * Lấy thông tin chi tiết tổng hợp của thành viên trong lớp học.
     */
    MemberDetailResponse getMemberDetail(Long classId, Long userId);

    /**
     * Lấy danh sách thành viên trong lớp học có phân trang và lọc từ khóa.
     */
    PageResponse<ClassMemberResponse> getMembersPage(Long classId, String keyword, String role, String status, int page, int size);
}
