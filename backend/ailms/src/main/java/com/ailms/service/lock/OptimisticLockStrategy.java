package com.ailms.service.lock;

import org.springframework.stereotype.Component;

@Component("optimisticLockStrategy")
public class OptimisticLockStrategy implements CapacityLockStrategy {

    @Override
    public void acquireLock(Long classId) {
        // No-op for optimistic locking at JVM level
    }

    @Override
    public void releaseLock(Long classId) {
        // No-op for optimistic locking at JVM level
    }
}
