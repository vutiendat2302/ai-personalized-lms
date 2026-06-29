package com.ailms.common.snowflake;

import org.hibernate.engine.spi.SharedSessionContractImplementor;
import org.hibernate.generator.BeforeExecutionGenerator;
import org.hibernate.generator.EventType;
import org.hibernate.generator.EventTypeSets;

import java.util.EnumSet;

/**
 * Hibernate 7 generator dùng Snowflake ID.
 * Dùng cùng với @IdGeneratorType(SnowflakeIdGeneratorStrategy.class) trên annotation tự định nghĩa.
 */
public class SnowflakeIdGeneratorStrategy implements BeforeExecutionGenerator {

    private static final SnowflakeIdGenerator GENERATOR = new SnowflakeIdGenerator(1L);

    @Override
    public Object generate(SharedSessionContractImplementor session, Object owner, Object currentValue, EventType eventType) {
        return GENERATOR.nextId();
    }

    @Override
    public EnumSet<EventType> getEventTypes() {
        return EventTypeSets.INSERT_ONLY;
    }
}