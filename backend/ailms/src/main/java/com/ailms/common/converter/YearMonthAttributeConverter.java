package com.ailms.common.converter;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

import java.time.YearMonth;

/** Lưu YearMonth ổn định dưới dạng YYYY-MM, không dùng Java serialization. */
@Converter(autoApply = true)
public class YearMonthAttributeConverter implements AttributeConverter<YearMonth, String> {
    @Override
    public String convertToDatabaseColumn(YearMonth attribute) {
        return attribute == null ? null : attribute.toString();
    }

    @Override
    public YearMonth convertToEntityAttribute(String value) {
        return value == null || value.isBlank() ? null : YearMonth.parse(value);
    }
}
