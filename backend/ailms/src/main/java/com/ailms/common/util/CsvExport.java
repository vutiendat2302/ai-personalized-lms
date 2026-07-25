package com.ailms.common.util;


import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.function.Function;

/**
 * Util dùng chung để xuất dữ liệu ra file CSV (mở được bằng Excel nhờ UTF-8 BOM).
 * Phù hợp cho dữ liệu lớn, không cần style, ưu tiên tốc độ và đơn giản.
 */
public final class CsvExport {

    private static final String UTF8_BOM = "\uFEFF";
    private static final String LINE_SEPARATOR = "\n";
    private static final String DELIMITER = ",";

    private CsvExport() {
    }

    /**
     * @param headers          tên cột hiển thị, theo đúng thứ tự
     * @param data             danh sách dữ liệu nguồn
     * @param columnExtractors hàm lấy giá trị từng cột từ 1 phần tử dữ liệu, PHẢI cùng thứ tự và cùng số lượng với headers
     * @param includeIndex     true nếu muốn tự thêm cột "STT" ở đầu
     */
    public static <T> byte[] exportToCsv(List<String> headers, List<T> data,
                                         List<Function<T, Object>> columnExtractors,
                                         boolean includeIndex) {
        validate(headers, columnExtractors, includeIndex);

        StringBuilder sb = new StringBuilder();
        sb.append(UTF8_BOM);

        if (includeIndex) {
            sb.append("STT").append(DELIMITER);
        }
        sb.append(String.join(DELIMITER, headers)).append(LINE_SEPARATOR);

        int index = 1;
        for (T item : data) {
            if (includeIndex) {
                sb.append(index++).append(DELIMITER);
            }
            for (int col = 0; col < columnExtractors.size(); col++) {
                Object value = columnExtractors.get(col).apply(item);
                sb.append(escapeCsvValue(value));
                if (col < columnExtractors.size() - 1) {
                    sb.append(DELIMITER);
                }
            }
            sb.append(LINE_SEPARATOR);
        }

        return sb.toString().getBytes(StandardCharsets.UTF_8);
    }

    /**
     * Escape đúng chuẩn CSV: field chứa dấu phẩy/xuống dòng/dấu ngoặc kép phải bọc trong "..." và nhân đôi dấu " bên trong.
     */
    private static String escapeCsvValue(Object value) {
        if (value == null) {
            return "";
        }
        String str = value.toString();
        if (str.contains(",") || str.contains("\"") || str.contains("\n") || str.contains("\r")) {
            return "\"" + str.replace("\"", "\"\"") + "\"";
        }
        return str;
    }

    private static <T> void validate(List<String> headers, List<Function<T, Object>> extractors, boolean includeIndex) {
        if (headers.size() != extractors.size()) {
            throw new IllegalArgumentException(
                    "Number of headers (%d) does not match number of extractors (%d)"
                            .formatted(headers.size(), extractors.size()));
        }
    }
}