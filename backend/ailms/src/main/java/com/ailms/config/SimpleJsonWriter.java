package com.ailms.config;


import java.lang.reflect.Field;
import java.lang.reflect.Modifier;
import java.time.temporal.Temporal;
import java.util.Collection;
import java.util.Map;

/**
 * Convert object sang chuỗi JSON đơn giản bằng reflection, không phụ thuộc
 * thư viện ngoài (Jackson/Gson). Dùng cho mục đích ghi audit log (oldValue/
 * newValue) - không cần xử lý đầy đủ mọi edge case như thư viện JSON thật,
 * chỉ cần đủ để lưu lại "trạng thái" của entity dưới dạng đọc được.
 * Giới hạn:
 * - Không xử lý vòng lặp tham chiếu (circular reference) - object có quan hệ
 *   hai chiều (VD entity cha-con trỏ lẫn nhau) có thể gây StackOverflow.
 *   Field nào lỗi khi đọc sẽ được bỏ qua an toàn, không làm crash toàn bộ.
 * - Collection/Map lồng nhau được hỗ trợ, nhưng entity quan hệ (@OneToMany,
 *   @ManyToOne...) nên được ignore từ trước khi truyền vào (VD qua cloneUser
 *   chỉ copy field scalar) để tránh lazy-loading exception.
 */
public final class SimpleJsonWriter {

    private SimpleJsonWriter() {
    }

    public static String toJson(Object obj) {
        StringBuilder sb = new StringBuilder();
        writeValue(obj, sb);
        return sb.toString();
    }

    private static void writeValue(Object value, StringBuilder sb) {
        if (value == null) {
            sb.append("null");
        } else if (value instanceof String s) {
            writeString(s, sb);
        } else if (value instanceof Number || value instanceof Boolean) {
            sb.append(value);
        } else if (value instanceof Enum<?> e) {
            writeString(e.name(), sb);
        } else if (value instanceof Temporal) {
            writeString(value.toString(), sb);
        } else if (value instanceof Map<?, ?> map) {
            writeMap(map, sb);
        } else if (value instanceof Collection<?> collection) {
            writeCollection(collection, sb);
        } else if (value.getClass().isArray()) {
            writeCollection(java.util.Arrays.asList((Object[]) value), sb);
        } else {
            writeBean(value, sb);
        }
    }

    private static void writeString(String s, StringBuilder sb) {
        sb.append('"');
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            switch (c) {
                case '"' -> sb.append("\\\"");
                case '\\' -> sb.append("\\\\");
                case '\n' -> sb.append("\\n");
                case '\r' -> sb.append("\\r");
                case '\t' -> sb.append("\\t");
                default -> {
                    if (c < 0x20) {
                        sb.append(String.format("\\u%04x", (int) c));
                    } else {
                        sb.append(c);
                    }
                }
            }
        }
        sb.append('"');
    }

    private static void writeMap(Map<?, ?> map, StringBuilder sb) {
        sb.append('{');
        boolean first = true;
        for (Map.Entry<?, ?> entry : map.entrySet()) {
            if (!first) sb.append(',');
            first = false;
            writeString(String.valueOf(entry.getKey()), sb);
            sb.append(':');
            writeValue(entry.getValue(), sb);
        }
        sb.append('}');
    }

    private static void writeCollection(Collection<?> collection, StringBuilder sb) {
        sb.append('[');
        boolean first = true;
        for (Object item : collection) {
            if (!first) sb.append(',');
            first = false;
            writeValue(item, sb);
        }
        sb.append(']');
    }

    private static void writeBean(Object obj, StringBuilder sb) {
        sb.append('{');
        boolean first = true;
        Class<?> clazz = obj.getClass();

        for (Field field : clazz.getDeclaredFields()) {
            if (Modifier.isStatic(field.getModifiers()) || field.isSynthetic()) {
                continue;
            }
            field.setAccessible(true);
            Object fieldValue;
            try {
                fieldValue = field.get(obj);
            } catch (Exception e) {
                // Field không đọc được (lazy proxy, security manager...) -> bỏ qua field này
                continue;
            }

            // Bỏ qua các quan hệ entity dạng collection để tránh lazy-loading/vòng lặp
            if (fieldValue instanceof Collection<?> || (fieldValue != null && fieldValue.getClass().isArray())) {
                continue;
            }

            if (!first) sb.append(',');
            first = false;
            writeString(field.getName(), sb);
            sb.append(':');

            try {
                writeValue(fieldValue, sb);
            } catch (Exception e) {
                sb.append("null");
            }
        }
        sb.append('}');
    }
}
