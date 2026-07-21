package com.ailms.service;

import com.ailms.request.*;
import com.ailms.response.ClassResponse;
import com.ailms.response.CoursePackageResponse;

import java.time.LocalDateTime;
import java.util.List;

public interface IClassManagementService {

    ClassResponse createGroupClass(CreateGroupClassRequest request);

    CoursePackageResponse createCoursePackage(CreateCoursePackageRequest request);

    void processEnrollmentPlacement(Long userId, Long coursePackageId, String requestedScheduleJson);

    void removeMemberAndPromoteWaitlist(Long classId, Long userId);

    void requestClassTransfer(Long userId, ClassTransferRequest request);

    void approveClassTransfer(Long approvalRequestId, boolean approve, String rejectionReason, Long adminUserId);

    void requestTeacherChange(Long userId, TeacherChangeRequest request);

    void approveTeacherChange(Long approvalRequestId, boolean approve, String rejectionReason, Long adminUserId);

    void requestTeacherWithdrawal(Long teacherEmployeeId, Long classId, String reason);

    void rescheduleOnlineClass(Long classOnlineId, LocalDateTime newScheduledAt, Integer durationMin, Long teacherUserId);

    void addTeacherAvailability(TeacherAvailabilityRequest request);
}
