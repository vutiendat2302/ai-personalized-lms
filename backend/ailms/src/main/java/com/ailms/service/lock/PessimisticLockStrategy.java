package com.ailms.service.lock;

import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Component;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.locks.ReentrantLock;

@Component("pessimisticLockStrategy")
@Primary
public class PessimisticLockStrategy implements CapacityLockStrategy {

    private final ConcurrentHashMap<Long, ReentrantLock> locks = new ConcurrentHashMap<>();

    @Override
    public void acquireLock(Long classId) {
        ReentrantLock lock = locks.computeIfAbsent(classId, k -> new ReentrantLock());
        lock.lock();
    }

    @Override
    public void releaseLock(Long classId) {
        ReentrantLock lock = locks.get(classId);
        if (lock != null && lock.isHeldByCurrentThread()) {
            lock.unlock();
        }
    }
}
