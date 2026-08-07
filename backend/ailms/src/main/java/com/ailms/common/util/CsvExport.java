package com.ailms.common.util;

import java.util.List;
import java.util.function.Function;

/**
 * Util dùng chung để xuất dữ liệu ra file CSV (Facade wrapper cho CsvBuilder).
 */
public final class CsvExport {

    private CsvExport() {
    }

    public static <T> byte[] exportToCsv(List<String> headers, List<T> data,
                                         List<Function<T, Object>> columnExtractors,
                                         boolean includeIndex) {
        return CsvBuilder.create()
                .tableFromList(headers, data, columnExtractors, "Không có dữ liệu")
                .build();
    }
}