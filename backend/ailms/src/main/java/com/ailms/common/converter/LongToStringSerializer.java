package com.ailms.common.converter;

import tools.jackson.core.JsonGenerator;
import tools.jackson.databind.SerializationContext;
import tools.jackson.databind.ValueSerializer;

/**
 * Serializer tùy chỉnh cho kiểu Long.
 * Chuyển giá trị Long thành chuỗi (String) khi trả về JSON
 */
public class LongToStringSerializer extends ValueSerializer<Long> {

    @Override
    public void serialize(Long value, JsonGenerator gen, SerializationContext context) {
        gen.writeString(value.toString());
    }
}