package com.ailms.entity.enums;

import com.ailms.exception.BusinessException;

/** Chuẩn hóa mã loại câu hỏi đang lưu dưới dạng TINYINT trong database. */
public enum QuestionTypeEnum {
    SINGLE_CHOICE((byte) 1),
    TRUE_FALSE((byte) 2),
    MULTIPLE_CHOICE((byte) 3),
    SHORT_ANSWER((byte) 4),
    ESSAY((byte) 4);

    private final byte code;

    /** Gắn mã database bất biến cho từng loại câu hỏi. */
    QuestionTypeEnum(byte code) {
        this.code = code;
    }

    /** Trả mã database ổn định của loại câu hỏi. */
    public byte getCode() {
        return code;
    }

    /** Chuyển tên API thành loại câu hỏi và báo lỗi rõ ràng khi không hỗ trợ. */
    public static QuestionTypeEnum fromName(String value) {
        try {
            return QuestionTypeEnum.valueOf(value == null ? "SINGLE_CHOICE" : value.trim().toUpperCase());
        } catch (IllegalArgumentException exception) {
            throw new BusinessException("Loại câu hỏi không được hỗ trợ: " + value);
        }
    }

    /** Chuyển mã database thành tên API thống nhất cho frontend. */
    public static String apiName(byte code) {
        return switch (code) {
            case 1 -> SINGLE_CHOICE.name();
            case 2 -> TRUE_FALSE.name();
            case 3 -> MULTIPLE_CHOICE.name();
            case 4 -> SHORT_ANSWER.name();
            default -> throw new BusinessException("Mã loại câu hỏi không hợp lệ: " + code);
        };
    }
}
