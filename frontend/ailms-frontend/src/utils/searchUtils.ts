/** Chuẩn hóa chuỗi tìm kiếm tiếng Việt để tìm không dấu ở UI. */
export const normalizeSearchText = (value: string | null | undefined): string =>
  (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("vi-VN")
    .trim();

/** Chuẩn hóa hiển thị trình độ khóa học (BEGINNER, INTERMEDIATE, ADVANCED) sang Tiếng Việt. */
export const formatCourseLevel = (level?: string | null): string => {
  if (!level) return "";
  const upper = level.toUpperCase();
  if (upper === "BEGINNER" || upper === "BASIC") return "Cơ bản";
  if (upper === "INTERMEDIATE") return "Trung cấp";
  if (upper === "ADVANCED") return "Nâng cao";
  return level;
};
