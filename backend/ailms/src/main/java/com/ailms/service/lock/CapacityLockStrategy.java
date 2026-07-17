package com.ailms.service.lock;

public interface CapacityLockStrategy {
    void acquireLock(Long classId);
    void releaseLock(Long classId);
}
