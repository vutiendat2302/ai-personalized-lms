package com.ailms.common.snowflake;


import org.springframework.stereotype.Component;

/**
 * Twitter Snowflake ID Generator
 * 64-bit ID structure:
 * [1 bit sign] [41 bits timestamp] [10 bits machine id] [12 bits sequence]
 * Max ~4096 IDs/ms per node, valid until year 2039 (relative to epoch).
 */
@Component
public class SnowflakeIdGenerator {

    // Custom epoch: 2024-01-01 00:00:00 UTC
    private static final long EPOCH = 1704067200000L;

    private static final long MACHINE_ID_BITS    = 10L;
    private static final long SEQUENCE_BITS      = 12L;

    private static final long MAX_MACHINE_ID     = ~(-1L << MACHINE_ID_BITS);  // 1023
    private static final long MAX_SEQUENCE        = ~(-1L << SEQUENCE_BITS);    // 4095

    private static final long MACHINE_ID_SHIFT   = SEQUENCE_BITS;               // 12
    private static final long TIMESTAMP_SHIFT    = SEQUENCE_BITS + MACHINE_ID_BITS; // 22

    private final long machineId;
    private long lastTimestamp = -1L;
    private long sequence      = 0L;

    public SnowflakeIdGenerator() {
        this(1L); // default machine id
    }

    public SnowflakeIdGenerator(long machineId) {
        if (machineId < 0 || machineId > MAX_MACHINE_ID) {
            throw new IllegalArgumentException(
                    "Machine ID must be between 0 and " + MAX_MACHINE_ID);
        }
        this.machineId = machineId;
    }

    public synchronized long nextId() {
        long currentTimestamp = System.currentTimeMillis();

        if (currentTimestamp < lastTimestamp) {
            throw new IllegalStateException(
                    "Clock moved backwards. Refusing to generate ID for "
                            + (lastTimestamp - currentTimestamp) + " ms");
        }

        if (currentTimestamp == lastTimestamp) {
            sequence = (sequence + 1) & MAX_SEQUENCE;
            if (sequence == 0) {
                currentTimestamp = waitNextMillis(lastTimestamp);
            }
        } else {
            sequence = 0L;
        }

        lastTimestamp = currentTimestamp;

        return ((currentTimestamp - EPOCH) << TIMESTAMP_SHIFT)
                | (machineId << MACHINE_ID_SHIFT)
                | sequence;
    }

    private long waitNextMillis(long lastTimestamp) {
        long timestamp = System.currentTimeMillis();
        while (timestamp <= lastTimestamp) {
            timestamp = System.currentTimeMillis();
        }
        return timestamp;
    }
}