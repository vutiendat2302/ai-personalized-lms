package com.ailms.entity.enums;

import com.ailms.exception.BusinessException;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class QuestionTypeEnumTest {

    /** Khóa hợp đồng mã byte để service lưu và chấm cùng một loại câu hỏi. */
    @Test
    void mapsApiNamesToCanonicalDatabaseCodes() {
        assertEquals(1, QuestionTypeEnum.fromName("SINGLE_CHOICE").getCode());
        assertEquals(2, QuestionTypeEnum.fromName("TRUE_FALSE").getCode());
        assertEquals(3, QuestionTypeEnum.fromName("MULTIPLE_CHOICE").getCode());
        assertEquals(4, QuestionTypeEnum.fromName("SHORT_ANSWER").getCode());
    }

    /** Không âm thầm ghi loại câu hỏi mà hệ thống chấm chưa hỗ trợ. */
    @Test
    void rejectsUnsupportedQuestionType() {
        assertThrows(BusinessException.class, () -> QuestionTypeEnum.fromName("MATCHING"));
    }
}
