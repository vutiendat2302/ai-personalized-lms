/** Ghép đường dẫn asset backend theo cùng base URL với Axios client. */
export const resolveBackendAssetUrl = (path: string): string => {
  if (/^(https?:|blob:|data:)/i.test(path)) return path;
  const base = (import.meta.env.VITE_BE_URL || import.meta.env.VITE_API_BASE_URL || "/api").replace(/\/+$/, "");
  const normalized = path.startsWith("/") ? path : `/${path}`;
  if (base.endsWith("/api") && normalized.startsWith("/api/")) {
    return `${base.slice(0, -4)}${normalized}`;
  }
  if (base.endsWith("/api") && normalized.startsWith("/v1/")) {
    return `${base}${normalized}`;
  }
  return `${base}${normalized}`;
};

/** Chuẩn hóa URL API, URL ngoài hoặc raw MinIO key thành src trình duyệt đọc được. */
export const resolveAvatarUrl = (value?: string | null): string | undefined => {
  if (!value || !value.trim()) return undefined;
  const avatar = value.trim();
  if (/^(https?:|blob:|data:)/i.test(avatar)) return avatar;
  if (avatar.startsWith("/api/") || avatar.startsWith("/v1/")) {
    return resolveBackendAssetUrl(avatar);
  }
  return resolveBackendAssetUrl(`/v1/files/download?fileKey=${encodeURIComponent(avatar)}`);
};

const AVATAR_KEYS = new Set([
  "avatar", "avatarUrl", "studentAvatar", "teacherAvatar", "userAvatar", "authorAvatar",
]);

/** Chuẩn hóa đệ quy các trường avatar ngay tại biên HTTP để mọi danh sách dùng cùng hợp đồng. */
export const normalizeAvatarFields = <T>(payload: T): T => {
  const visited = new WeakSet<object>();
  const walk = (value: unknown): void => {
    if (!value || typeof value !== "object" || visited.has(value as object)) return;
    visited.add(value as object);
    if (Array.isArray(value)) {
      value.forEach(walk);
      return;
    }
    Object.entries(value as Record<string, unknown>).forEach(([key, child]) => {
      if (AVATAR_KEYS.has(key) && typeof child === "string") {
        (value as Record<string, unknown>)[key] = resolveAvatarUrl(child);
      } else {
        walk(child);
      }
    });
  };
  walk(payload);
  return payload;
};
