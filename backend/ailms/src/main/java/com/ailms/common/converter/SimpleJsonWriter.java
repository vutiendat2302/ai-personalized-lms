package com.ailms.common.converter;


import java.lang.reflect.Field;
import java.lang.reflect.Modifier;
import java.time.temporal.Temporal;
import java.util.Collection;
import java.util.IdentityHashMap;
import java.util.Map;
import java.util.Set;

/**
 * Convert object sang chuỗi JSON đơn giản bằng reflection, Dùng cho mục đích ghi audit log (oldValue/
 * newValue) - không cần xử lý đầy đủ mọi edge case như thư viện JSON thật,
 * chỉ cần đủ để lưu lại "trạng thái" của entity dưới dạng đọc được.
 *   chỉ copy field scalar) để tránh lazy-loading exception.
 */

public final class SimpleJsonWriter {
    // Số tầng bean-lồng-bean tối đa được mở đầy đủ, tính từ object gốc (depth 0).
    // depth 0 = object gốc -> mở đầy đủ field.
    // Field nào của object gốc mà bản thân là 1 bean khác (depth 1) -> chỉ ghi reference gọn,
    // KHÔNG mở tiếp field của nó (tránh cycle + tránh nổ payload).
    private static final int MAX_DEPTH = 0;

    private SimpleJsonWriter() {
    }

    public static String toJson(Object obj) {
        StringBuilder sb = new StringBuilder();
        writeValue(obj, sb, 0);
        return sb.toString();
    }

    private static void writeValue(Object value, StringBuilder sb, int depth) {
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
            writeMap(map, sb, depth);
        } else if (value instanceof Collection<?> collection) {
            writeCollection(collection, sb, depth);
        } else if (value.getClass().isArray()) {
            writeCollection(java.util.Arrays.asList((Object[]) value), sb, depth);
        } else if (depth > MAX_DEPTH) {
            // Đã vượt độ sâu cho phép -> chỉ ghi reference gọn, không mở field của bean này
            writeEntityRef(value, sb);
        } else {
            writeBean(value, sb, depth);
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

    private static void writeMap(Map<?, ?> map, StringBuilder sb, int depth) {
        sb.append('{');
        boolean first = true;
        for (Map.Entry<?, ?> entry : map.entrySet()) {
            if (!first) sb.append(',');
            first = false;
            writeString(String.valueOf(entry.getKey()), sb);
            sb.append(':');
            // Giá trị trong map coi như "con" của bean hiện tại -> tăng depth để không mở
            // tiếp nếu value lại là 1 bean có quan hệ entity khác.
            writeValue(entry.getValue(), sb, depth + 1);
        }
        sb.append('}');
    }

    private static void writeCollection(Collection<?> collection, StringBuilder sb, int depth) {
        sb.append('[');
        boolean first = true;
        for (Object item : collection) {
            if (!first) sb.append(',');
            first = false;
            writeValue(item, sb, depth + 1);
        }
        sb.append(']');
    }

    private static void writeBean(Object obj, StringBuilder sb, int depth) {
        sb.append('{');
        boolean first = true;
        Class<?> clazz = obj.getClass();

        while (clazz != null && clazz != Object.class) {
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
                    // fieldValue nếu là 1 bean khác (vd @ManyToOne) sẽ bị coi là depth+1
                    // -> chỉ ghi reference gọn thay vì mở hết field của nó.
                    writeValue(fieldValue, sb, depth + 1);
                } catch (Exception e) {
                    sb.append("null");
                }
            }
            clazz = clazz.getSuperclass();
        }

        sb.append('}');
    }

    /**
     * Ghi reference gọn cho 1 bean vượt quá độ sâu cho phép, dạng:
     * {"_ref":"Employee","id":123}
     * Nếu không tìm được field "id" (hoặc lỗi khi đọc) thì fallback về chỉ tên class:
     * "Employee"
     */
    private static void writeEntityRef(Object obj, StringBuilder sb) {
        String className = shortClassName(obj.getClass());
        Object idValue = findIdValue(obj);

        if (idValue == null) {
            writeString(className, sb);
            return;
        }

        sb.append('{');
        writeString("_ref", sb);
        sb.append(':');
        writeString(className, sb);
        sb.append(',');
        writeString("id", sb);
        sb.append(':');
        writeValue(idValue, sb, Integer.MAX_VALUE); // id luôn là scalar, depth không còn ý nghĩa
        sb.append('}');
    }

    private static Object findIdValue(Object obj) {
        Class<?> clazz = obj.getClass();
        while (clazz != null && clazz != Object.class) {
            try {
                Field idField = clazz.getDeclaredField("id");
                idField.setAccessible(true);
                Object idValue = idField.get(obj);
                // Chỉ chấp nhận id nếu là kiểu scalar đơn giản, tránh việc id lại là 1 object phức tạp khác
                if (idValue == null || idValue instanceof Number || idValue instanceof String
                        || idValue instanceof java.util.UUID) {
                    return idValue;
                }
                return null;
            } catch (NoSuchFieldException e) {
                clazz = clazz.getSuperclass();
            } catch (Exception e) {
                return null;
            }
        }
        return null;
    }

    private static String shortClassName(Class<?> clazz) {
        String name = clazz.getName();
        int idx = name.lastIndexOf('.');
        String simple = idx >= 0 ? name.substring(idx + 1) : name;
        // Loại bỏ hậu tố proxy của Hibernate nếu có, vd "Employee$HibernateProxy$abcd" -> "Employee"
        int dollar = simple.indexOf('$');
        return dollar >= 0 ? simple.substring(0, dollar) : simple;
    }
}