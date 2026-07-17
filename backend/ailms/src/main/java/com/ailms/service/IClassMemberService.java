package com.ailms.service;

import com.ailms.entity.ClassMemberEntity;
import com.ailms.entity.enums.ClassMemberRole;

public interface IClassMemberService {
    ClassMemberEntity join(Long classId, Long userId, ClassMemberRole role);
    ClassMemberEntity leave(Long classId, Long userId, String reason);
    void transfer(Long fromClassId, Long toClassId, Long userId);
    void promoteNextWaitlist(Long classId);
    ClassMemberEntity rejoin(Long classId, Long userId);
}
