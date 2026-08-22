/**
 * Chuyển đổi đối tượng Date thành chuỗi 'YYYY-MM-DD' theo giờ địa phương (local timezone).
 * Tránh lỗi lùi 1 ngày do chuyển về UTC của Date.prototype.toISOString().
 */
export const formatLocalDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

/**
 * Trả về khoảng ngày { dateFrom, dateTo } dạng YYYY-MM-DD cho "Hôm nay"
 */
export const getTodayDateRange = () => {
  const today = formatLocalDate(new Date());
  return { dateFrom: today, dateTo: today };
};

/**
 * Trả về khoảng ngày { dateFrom, dateTo } dạng YYYY-MM-DD cho "Tuần này" (Từ Thứ 2 đến Chủ Nhật)
 */
export const getThisWeekDateRange = () => {
  const now = new Date();
  const dayOfWeek = now.getDay() || 7; // Chủ Nhật là 7, Thứ 2 là 1
  const monday = new Date(now);
  monday.setDate(now.getDate() - (dayOfWeek - 1));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return {
    dateFrom: formatLocalDate(monday),
    dateTo: formatLocalDate(sunday),
  };
};

/**
 * Trả về khoảng ngày { dateFrom, dateTo } dạng YYYY-MM-DD cho "Tháng này" (Từ ngày đầu tháng đến ngày cuối tháng)
 */
export const getThisMonthDateRange = () => {
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    dateFrom: formatLocalDate(firstDay),
    dateTo: formatLocalDate(lastDay),
  };
};
