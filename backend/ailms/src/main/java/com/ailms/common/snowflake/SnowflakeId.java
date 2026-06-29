package com.ailms.common.snowflake;

import org.hibernate.annotations.IdGeneratorType;
import org.springframework.stereotype.Component;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

@Component //Tự tạo đối tượng, lưu vào Spring (Coi là một Bean)

/**
 * Snowflake ID Generator
 * 64-bi Id structure:
 * [1 bit sign] [41 bits timestamp] [10 bits machine id] [12 bits sequence]
 */


@IdGeneratorType(SnowflakeIdGeneratorStrategy.class)
@Retention(RetentionPolicy.RUNTIME)
@Target({ElementType.FIELD, ElementType.METHOD})
public @interface SnowflakeId {

}

