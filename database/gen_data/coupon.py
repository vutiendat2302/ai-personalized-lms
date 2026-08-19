"""Master data mã ưu đãi demo, không gắn course và không giả lập lượt sử dụng."""

from datetime import datetime
from decimal import Decimal

from snowflake_id import snowflake


COUPONS = [
    {"code": "WELCOME2026", "type": "PERCENT", "value": Decimal("20"), "max_usage": 1000, "from": "2026-01-01 00:00:00", "to": "2026-12-31 23:59:59", "status": "ACTIVE"},
    {"code": "SUMMER50", "type": "FIXED", "value": Decimal("50000"), "max_usage": 500, "from": "2026-06-01 00:00:00", "to": "2026-08-31 23:59:59", "status": "ACTIVE"},
    {"code": "VIPMEMBER", "type": "PERCENT", "value": Decimal("15"), "max_usage": 300, "from": "2026-01-01 00:00:00", "to": "2026-12-31 23:59:59", "status": "ACTIVE"},
    {"code": "BACK2SCHOOL", "type": "PERCENT", "value": Decimal("10"), "max_usage": 800, "from": "2026-08-01 00:00:00", "to": "2026-09-30 23:59:59", "status": "ACTIVE"},
    {"code": "TECHSTART100K", "type": "FIXED", "value": Decimal("100000"), "max_usage": 300, "from": "2026-01-01 00:00:00", "to": "2026-12-31 23:59:59", "status": "ACTIVE"},
    {"code": "IELTS2026", "type": "PERCENT", "value": Decimal("15"), "max_usage": 250, "from": "2026-01-01 00:00:00", "to": "2026-12-31 23:59:59", "status": "ACTIVE"},
    {"code": "EARLYBIRD10", "type": "PERCENT", "value": Decimal("10"), "max_usage": None, "from": "2026-01-01 00:00:00", "to": "2026-12-31 23:59:59", "status": "ACTIVE"},
    {"code": "REFERRAL50K", "type": "FIXED", "value": Decimal("50000"), "max_usage": None, "from": "2026-01-01 00:00:00", "to": "2026-12-31 23:59:59", "status": "ACTIVE"},
    {"code": "CORPORATE20", "type": "PERCENT", "value": Decimal("20"), "max_usage": 200, "from": "2026-01-01 00:00:00", "to": "2026-12-31 23:59:59", "status": "ACTIVE"},
    {"code": "TEACHERDAY20", "type": "PERCENT", "value": Decimal("20"), "max_usage": 200, "from": "2026-11-15 00:00:00", "to": "2026-11-21 23:59:59", "status": "ACTIVE"},
    {"code": "NEWYEAR2027", "type": "PERCENT", "value": Decimal("12"), "max_usage": 500, "from": "2026-12-20 00:00:00", "to": "2027-01-10 23:59:59", "status": "ACTIVE"},
    {"code": "REPORTDEMO", "type": "FIXED", "value": Decimal("75000"), "max_usage": 100, "from": "2026-01-01 00:00:00", "to": "2026-12-31 23:59:59", "status": "INACTIVE"},
]


def get_id_by_code(cursor, code):
    """Tìm coupon theo code duy nhất."""
    cursor.execute("SELECT id FROM coupon WHERE code=%s", (code,))
    row = cursor.fetchone()
    return row["id"] if row else None


def parse_datetime(value):
    """Chuyển chuỗi ISO dùng trong catalog thành datetime MySQL."""
    return datetime.strptime(value, "%Y-%m-%d %H:%M:%S")


def validate_catalog():
    """Kiểm tra code, khoảng hiệu lực và giá trị giảm giá."""
    codes = [item["code"] for item in COUPONS]
    if len(codes) != len(set(codes)):
        raise ValueError("Coupon code bị trùng trong master catalog.")
    for item in COUPONS:
        if item["value"] <= 0 or (item["type"] == "PERCENT" and item["value"] > 100):
            raise ValueError(f"Giá trị coupon không hợp lệ: {item['code']}")
        if parse_datetime(item["from"]) >= parse_datetime(item["to"]):
            raise ValueError(f"Khoảng hiệu lực coupon không hợp lệ: {item['code']}")


def deactivate_non_catalog_coupons(cursor):
    """Ngừng kích hoạt coupon demo cũ nhưng giữ bản ghi phục vụ lịch sử tham chiếu."""
    codes = [item["code"] for item in COUPONS]
    placeholders = ",".join(["%s"] * len(codes))
    cursor.execute(
        f"UPDATE coupon SET status='INACTIVE', updated_at=NOW() WHERE code NOT IN ({placeholders})",
        tuple(codes),
    )


def seed(cursor):
    """Đồng bộ coupon toàn hệ thống với used_count bằng 0 và không gắn course."""
    validate_catalog()
    print("→ Seeding coupons...")
    deactivate_non_catalog_coupons(cursor)
    for item in COUPONS:
        existing_id = get_id_by_code(cursor, item["code"])
        values = (
            item["type"], item["value"], item["max_usage"],
            parse_datetime(item["from"]), parse_datetime(item["to"]), item["status"],
        )
        if existing_id:
            cursor.execute(
                """UPDATE coupon SET discount_type=%s, discount_value=%s,
                   applicable_course_id=NULL, max_usage=%s, used_count=0,
                   valid_from=%s, valid_to=%s, status=%s, updated_at=NOW() WHERE id=%s""",
                (*values, existing_id),
            )
            continue
        cursor.execute(
            """INSERT INTO coupon
               (id, code, discount_type, discount_value, applicable_course_id, max_usage,
                used_count, valid_from, valid_to, status, created_at, updated_at)
               VALUES (%s, %s, %s, %s, NULL, %s, 0, %s, %s, %s, NOW(), NOW())""",
            (snowflake.next_id(), item["code"], *values),
        )
    print(f"   [completed] coupons synchronized: {len(COUPONS)}")
