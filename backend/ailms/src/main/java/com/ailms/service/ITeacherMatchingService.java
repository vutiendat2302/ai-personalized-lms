package com.ailms.service;

import com.ailms.entity.EmployeeEntity;
import com.ailms.request.CreateGroupClassRequest;

import java.util.List;
import java.util.Optional;

/**
 * Service hỗ trợ thuật toán ghép cặp và gợi ý giáo viên phù hợp cho lớp học.
 */
public interface ITeacherMatchingService {

    /**
     * Kiểm tra xem giáo viên có bị trùng lịch học khi nhận lớp mới hay không.
     *
     * @param teacherEmployeeId ID nhân viên của giáo viên
     * @param requestedSlots Danh sách các slot lịch học yêu cầu ghép lớp
     * @return true nếu xử lý thành công hoặc hợp lệ, ngược lại là false
     */
    boolean checkScheduleCollision(Long teacherEmployeeId, List<CreateGroupClassRequest.ScheduleSlotRequest> requestedSlots);

    String findScheduleCollisionDetail(Long teacherEmployeeId, List<CreateGroupClassRequest.ScheduleSlotRequest> requestedSlots);

    /**
     * Tìm kiếm giáo viên phù hợp cho lớp học kèm 1-1.
     *
     * @param categoryId ID của danh mục khóa học
     * @param requestedSlots Danh sách các slot lịch học yêu cầu ghép lớp
     * @return đối tượng Optional chứa thông tin kết quả nếu tìm thấy
     */
    Optional<EmployeeEntity> matchTeacherFor1on1(Long categoryId, List<CreateGroupClassRequest.ScheduleSlotRequest> requestedSlots);

    /**
     * Tìm kiếm giáo viên phù hợp cho lớp học nhóm.
     *
     * @param categoryId ID của danh mục khóa học
     * @param requestedSlots Danh sách các slot lịch học yêu cầu ghép lớp
     * @return đối tượng Optional chứa thông tin kết quả nếu tìm thấy
     */
    Optional<EmployeeEntity> matchTeacherForGroupClass(Long categoryId, List<CreateGroupClassRequest.ScheduleSlotRequest> requestedSlots);
}
