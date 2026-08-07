package com.ailms.service.imp;

import com.ailms.entity.ClassMemberEntity;
import com.ailms.entity.ClassScheduleEntity;
import com.ailms.entity.EmployeeEntity;
import com.ailms.entity.TeacherAvailabilityEntity;
import com.ailms.entity.TeacherCategoryEntity;
import com.ailms.entity.enums.BaseStatusEnum;
import com.ailms.entity.enums.ClassMemberRole;
import com.ailms.entity.enums.ClassMemberStatusEnum;
import com.ailms.repository.*;
import com.ailms.request.CreateGroupClassRequest;
import com.ailms.service.ITeacherMatchingService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class TeacherMatchingService implements ITeacherMatchingService {

    private final TeacherCategoryRepository teacherCategoryRepository;
    private final TeacherAvailabilityRepository teacherAvailabilityRepository;
    private final ClassMemberRepository classMemberRepository;
    private final ClassScheduleRepository classScheduleRepository;

    @Override
    public boolean checkScheduleCollision(Long teacherEmployeeId, List<CreateGroupClassRequest.ScheduleSlotRequest> requestedSlots) {
        return findScheduleCollisionDetail(teacherEmployeeId, requestedSlots) != null;
    }

    @Override
    public String findScheduleCollisionDetail(Long teacherEmployeeId, List<CreateGroupClassRequest.ScheduleSlotRequest> requestedSlots) {
        if (requestedSlots == null || requestedSlots.isEmpty()) {
            return null;
        }

        // Get active teaching assignments for teacher
        List<ClassMemberEntity> activeTeacherMembers = classMemberRepository.findAll().stream()
                .filter(cm -> cm.getUserEntity() != null && cm.getStatus() == ClassMemberStatusEnum.ACTIVE
                        && (cm.getRoleInClass() == ClassMemberRole.TEACHER || cm.getRoleInClass() == ClassMemberRole.TA)
                        && (cm.getUserEntity().getId().equals(teacherEmployeeId)))
                .toList();

        List<Long> activeClassIds = activeTeacherMembers.stream()
                .map(cm -> cm.getClassEntity().getId())
                .distinct()
                .toList();

        if (activeClassIds.isEmpty()) {
            return null;
        }

        List<ClassScheduleEntity> existingSchedules = classScheduleRepository.findByClassEntity_IdIn(activeClassIds);
        String[] dayNames = new String[]{"", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ Nhật"};

        for (CreateGroupClassRequest.ScheduleSlotRequest slot : requestedSlots) {
            for (ClassScheduleEntity existing : existingSchedules) {
                if (existing.getDayOfWeek().equals(slot.getDayOfWeek())) {
                    // Check time overlap: (start1 < end2) && (end1 > start2)
                    if (slot.getStartTime().isBefore(existing.getEndTime()) && slot.getEndTime().isAfter(existing.getStartTime())) {
                        log.warn("Collision detected for employee {} on day {} between {}-{} and {}-{}",
                                teacherEmployeeId, slot.getDayOfWeek(), slot.getStartTime(), slot.getEndTime(), existing.getStartTime(), existing.getEndTime());
                        int d = slot.getDayOfWeek() != null ? slot.getDayOfWeek() : 0;
                        String dayName = (d >= 1 && d <= 7) ? dayNames[d] : ("Thứ " + d);
                        String className = existing.getClassEntity() != null ? existing.getClassEntity().getName() : "lớp khác";
                        return String.format("Giảng viên bị trùng lịch dạy vào %s (%s - %s) với lớp \"%s\" (%s - %s)",
                                dayName, slot.getStartTime(), slot.getEndTime(), className, existing.getStartTime(), existing.getEndTime());
                    }
                }
            }
        }

        return null;
    }

    @Override
    public Optional<EmployeeEntity> matchTeacherFor1on1(Long categoryId, List<CreateGroupClassRequest.ScheduleSlotRequest> requestedSlots) {
        log.info("Matching 1-1 teacher for category: {}", categoryId);

        // 1. Filter by category
        List<TeacherCategoryEntity> categoryTeachers = teacherCategoryRepository.findByCategory_IdAndStatus(categoryId, BaseStatusEnum.ACTIVE);
        if (categoryTeachers.isEmpty()) {
            return Optional.empty();
        }

        List<EmployeeEntity> candidateEmployees = categoryTeachers.stream()
                .map(TeacherCategoryEntity::getEmployee)
                .collect(Collectors.toList());

        for (EmployeeEntity emp : candidateEmployees) {
            // Check availability slots
            List<TeacherAvailabilityEntity> availabilities = teacherAvailabilityRepository.findByEmployeeEntity_UserIdAndStatus(emp.getUserId(), BaseStatusEnum.ACTIVE);

            boolean matchesAllSlots = true;
            if (requestedSlots != null && !requestedSlots.isEmpty()) {
                for (CreateGroupClassRequest.ScheduleSlotRequest slot : requestedSlots) {
                    boolean slotAvailable = availabilities.stream().anyMatch(avail ->
                            avail.getDayOfWeek().equals(slot.getDayOfWeek())
                                    && !slot.getStartTime().isBefore(avail.getStartTime())
                                    && !slot.getEndTime().isAfter(avail.getEndTime())
                    );
                    if (!slotAvailable) {
                        matchesAllSlots = false;
                        break;
                    }
                }
            }

            if (!matchesAllSlots) {
                continue;
            }

            // Check collision with existing teaching classes
            if (!checkScheduleCollision(emp.getUserId(), requestedSlots)) {
                log.info("Matched teacher {} for 1-1 class", emp.getUserId());
                return Optional.of(emp);
            }
        }

        return Optional.empty();
    }

    @Override
    public Optional<EmployeeEntity> matchTeacherForGroupClass(Long categoryId, List<CreateGroupClassRequest.ScheduleSlotRequest> requestedSlots) {
        return matchTeacherFor1on1(categoryId, requestedSlots);
    }
}
