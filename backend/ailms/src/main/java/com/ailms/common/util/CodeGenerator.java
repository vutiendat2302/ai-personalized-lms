package com.ailms.common.util;

import com.ailms.exception.BusinessException;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.UUID;
import java.util.function.Predicate;

public class CodeGenerator {

    /**
     * Sinh mã theo định dạng: PREFIX-yyMM-RANDOM_6_KY_TU
     * Ví dụ: EM-2607-A1B2C3
     * Tham số existsPredicate được dùng để kiểm tra
     * mã vừa sinh ra đã tồn tại trong hệ thống hay chưa.
     * Tối đa thử 5 lần, nếu vẫn bị trùng thì ném exception.
     */
    public static String generate(String prefix, Predicate<String> existsPredicate) {
        String yyMM = DateTimeFormatter.ofPattern("yyMM").format(LocalDate.now());

        for (int i = 0; i < 10; i++) {
            String randomStr = UUID.randomUUID().toString().replace("-", "").substring(0, 6).toUpperCase();
            String candidateCode = prefix + "-" + yyMM + "-" + randomStr;
            if (!existsPredicate.test(candidateCode)) {
                return candidateCode;
            }
        }
        throw new BusinessException("Tao ma code that bai " + prefix + " sau 5 lan");
    }
}
