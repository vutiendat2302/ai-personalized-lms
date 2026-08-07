package com.ailms.common.util;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.function.Function;

/**
 * Utility class dùng để xây dựng file CSV (mở được bằng Excel nhờ UTF-8 BOM).
 */
public class CsvBuilder {

    private final StringBuilder sb = new StringBuilder();

    public static CsvBuilder create() {
        CsvBuilder builder = new CsvBuilder();
        builder.sb.append("\uFEFF"); // UTF-8 BOM — chỉ thêm 1 lần duy nhất ở đầu file
        return builder;
    }

    /** Thêm tiêu đề section, VD: "1. THÔNG TIN TÀI KHOẢN" -> "=== 1. THÔNG TIN TÀI KHOẢN ===" */
    public CsvBuilder section(String title) {
        sb.append("=== ").append(title).append(" ===\n");
        return this;
    }

    /** Thêm 1 dòng trống ngăn cách giữa các section */
    public CsvBuilder blankLine() {
        sb.append("\n");
        return this;
    }

    /** Thêm block dạng key-value (Trường,Giá trị) */
    public CsvBuilder keyValueBlock(LinkedHashMap<String, Object> fields) {
        sb.append("Trường,Giá trị\n");
        for (Map.Entry<String, Object> entry : fields.entrySet()) {
            sb.append(escape(entry.getKey())).append(",")
                    .append(formatValue(entry.getValue())).append("\n");
        }
        return this;
    }

    /**
     * Thêm block dạng bảng.
     * @param headers  danh sách tên cột (không bao gồm STT, tự động thêm)
     * @param rows     mỗi row là 1 List<Object> theo đúng thứ tự headers
     * @param emptyMessage  thông điệp hiển thị nếu rows rỗng
     */
    public CsvBuilder table(List<String> headers, List<List<Object>> rows, String emptyMessage) {
        if (rows == null || rows.isEmpty()) {
            if (emptyMessage != null && !emptyMessage.isBlank()) {
                sb.append(escape(emptyMessage)).append("\n");
            }
            return this;
        }
        sb.append("STT,").append(String.join(",", headers.stream().map(this::escape).toList())).append("\n");
        int idx = 1;
        for (List<Object> row : rows) {
            sb.append(idx++);
            for (Object cell : row) {
                sb.append(",").append(formatValue(cell));
            }
            sb.append("\n");
        }
        return this;
    }

    /**
     * Overload hỗ trợ tạo table từ List DTO trực tiếp + extractors
     */
    public <T> CsvBuilder tableFromList(List<String> headers, List<T> data, List<Function<T, Object>> extractors, String emptyMessage) {
        if (data == null || data.isEmpty()) {
            if (emptyMessage != null && !emptyMessage.isBlank()) {
                sb.append(escape(emptyMessage)).append("\n");
            }
            return this;
        }
        List<List<Object>> rows = new ArrayList<>();
        for (T item : data) {
            List<Object> row = new ArrayList<>();
            for (Function<T, Object> extractor : extractors) {
                row.add(extractor.apply(item));
            }
            rows.add(row);
        }
        return table(headers, rows, emptyMessage);
    }

    public byte[] build() {
        return sb.toString().getBytes(StandardCharsets.UTF_8);
    }

    // ---- xử lý escape & format dùng chung ----

    private String formatValue(Object value) {
        if (value == null) return "";
        if (value instanceof LocalDateTime dt) return dt.format(DEFAULT_DATETIME_FORMAT);
        if (value instanceof LocalDate d) return d.format(DEFAULT_DATE_FORMAT);
        if (value instanceof BigDecimal bd) return bd.toPlainString();
        if (value instanceof Enum<?> e) return e.name();
        return escape(value.toString());
    }

    /** Escape chuẩn CSV (RFC 4180): bọc "..." nếu chứa dấu phẩy, xuống dòng, hoặc dấu " */
    private String escape(String value) {
        if (value == null) return "";
        boolean needsQuote = value.contains(",") || value.contains("\"") || value.contains("\n") || value.contains("\r");
        String escaped = value.replace("\"", "\"\"");
        return needsQuote ? "\"" + escaped + "\"" : escaped;
    }

    private static final DateTimeFormatter DEFAULT_DATETIME_FORMAT = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm:ss");
    private static final DateTimeFormatter DEFAULT_DATE_FORMAT = DateTimeFormatter.ofPattern("dd/MM/yyyy");
}
