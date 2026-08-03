"""Sinh bảng lương từ dữ liệu nghiệp vụ thật đã seed.

Không gán ngẫu nhiên total_salary: mọi giá trị được tính từ hợp đồng, chấm công,
thù lao buổi dạy CONFIRMED, phụ cấp và công thức thuế giống SalaryService.
Chạy lặp an toàn: phiếu đã tồn tại theo employee + period sẽ được giữ nguyên.
"""

from datetime import datetime, time
from decimal import Decimal, ROUND_HALF_UP

from snowflake_id import snowflake


ZERO = Decimal("0")
MONEY = Decimal("0.01")


def _month(value, offset):
    index = value.year * 12 + value.month - 1 + offset
    return index // 12, index % 12 + 1


def _pit(income):
    bands = [
        (Decimal("5000000"), Decimal("0.05"), ZERO),
        (Decimal("10000000"), Decimal("0.10"), Decimal("250000")),
        (Decimal("18000000"), Decimal("0.15"), Decimal("750000")),
        (Decimal("32000000"), Decimal("0.20"), Decimal("1650000")),
        (Decimal("52000000"), Decimal("0.25"), Decimal("3250000")),
        (Decimal("80000000"), Decimal("0.30"), Decimal("5850000")),
    ]
    for ceiling, rate, quick in bands:
        if income <= ceiling:
            return max(ZERO, income * rate - quick).quantize(MONEY, rounding=ROUND_HALF_UP)
    return max(ZERO, income * Decimal("0.35") - Decimal("9850000")).quantize(MONEY)


def _detail(cursor, salary_id, key, amount, description, actor, now):
    cursor.execute(
        """INSERT INTO salary_detail
           (id,salary_id,item_key,amount,description,created_at,updated_at,created_by,updated_by)
           VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s)""",
        (snowflake.next_id(), salary_id, key, amount, description, now, now, actor, actor),
    )


def seed(cursor):
    print("→ Seeding payroll từ hợp đồng, chấm công và buổi dạy...")
    cursor.execute("""
        SELECT u.id FROM user u JOIN user_role ur ON ur.user_id=u.id
        JOIN role r ON r.id=ur.role_id WHERE r.code='HR' ORDER BY u.id LIMIT 1
    """)
    hr = cursor.fetchone()
    cursor.execute("""
        SELECT u.id FROM user u JOIN user_role ur ON ur.user_id=u.id
        JOIN role r ON r.id=ur.role_id WHERE r.code='ADMIN' ORDER BY u.id LIMIT 1
    """)
    admin = cursor.fetchone()
    actor = (hr or admin or {}).get("id")

    now = datetime.now()
    inserted = skipped = 0
    # 5 kỳ cho phép xem đủ DRAFT -> PENDING -> CONFIRMED -> PAID.
    for month_offset in range(-4, 1):
        year, month = _month(now, month_offset)
        period = f"{year:04d}-{month:02d}"
        start = datetime(year, month, 1)
        next_year, next_month = _month(start, 1)
        end = datetime(next_year, next_month, 1)
        age = -month_offset
        status = "DRAFT" if age == 0 else "PENDING" if age == 1 else "CONFIRMED" if age == 2 else "PAID"
        submitted_at = None if status == "DRAFT" else end.replace(hour=9)
        approved_at = end.replace(hour=15) if status in ("CONFIRMED", "PAID") else None
        paid_at = end.replace(hour=16) if status == "PAID" else None

        cursor.execute("""
            SELECT e.user_id, e.employee_code, e.employment_type,
                   ec.base_salary, ec.salary_type,
                   EXISTS(SELECT 1 FROM user_role ur JOIN role r ON r.id=ur.role_id
                          WHERE ur.user_id=e.user_id AND r.code='TEACHER') AS is_teacher
            FROM employee e
            JOIN employee_contract ec ON ec.employee_id=e.user_id AND ec.status='ACTIVE'
            WHERE e.status='ACTIVE' AND ec.start_date < %s
              AND (ec.end_date IS NULL OR ec.end_date >= %s)
              AND ec.start_date=(SELECT MAX(ec2.start_date) FROM employee_contract ec2
                                 WHERE ec2.employee_id=e.user_id AND ec2.status='ACTIVE'
                                   AND ec2.start_date < %s
                                   AND (ec2.end_date IS NULL OR ec2.end_date >= %s))
            ORDER BY e.user_id
        """, (end.date(), start.date(), end.date(), start.date()))

        for index, employee in enumerate(cursor.fetchall()):
            employee_id = employee["user_id"]
            cursor.execute("SELECT id FROM salary WHERE employee_id=%s AND period=%s LIMIT 1", (employee_id, period))
            if cursor.fetchone():
                skipped += 1
                continue

            contract_base = Decimal(employee["base_salary"] or 0)
            full_time = employee["employment_type"] == "FULL_TIME"
            cursor.execute("""
                SELECT COALESCE(SUM(tsp.amount),0) AS total
                FROM teaching_session_payment tsp
                JOIN class_online co ON co.id=tsp.class_online_id
                WHERE tsp.employee_id=%s AND tsp.status='CONFIRMED'
                  AND co.scheduled_at >= %s AND co.scheduled_at < %s
            """, (employee_id, start, end))
            teaching = Decimal(cursor.fetchone()["total"] or 0)

            absent = half_day = late = 0
            if full_time:
                cursor.execute("""
                    SELECT status,COUNT(*) total FROM attendance
                    WHERE employee_id=%s AND work_date >= %s AND work_date < %s
                      AND status <> 'CANCELLED' GROUP BY status
                """, (employee_id, start.date(), end.date()))
                attendance = {row["status"]: row["total"] for row in cursor.fetchall()}
                absent = attendance.get("ABSENT", 0)
                half_day = attendance.get("HALF_DAY", 0) + attendance.get("HALF_DAY_LATE", 0)
                late = attendance.get("LATE", 0) + attendance.get("PRESENT_LATE", 0) + attendance.get("HALF_DAY_LATE", 0)

            base = contract_base if full_time else teaching
            teaching_extra = teaching if full_time and employee["is_teacher"] else ZERO
            daily = contract_base / Decimal("22") if full_time else ZERO
            absent_deduct = (daily * absent).quantize(MONEY)
            half_deduct = (daily * Decimal("0.5") * half_day).quantize(MONEY)
            late_deduct = Decimal("100000") * late
            attendance_deduct = absent_deduct + half_deduct + late_deduct

            # Khoản có quy luật cố định để các phiếu có thể kiểm tra lại bằng mắt.
            meal = Decimal("730000") if full_time else ZERO
            phone = Decimal("300000") if full_time else ZERO
            uniform = Decimal("200000") if full_time else ZERO
            responsibility = Decimal("500000") if full_time and index % 4 == 0 else ZERO
            performance = Decimal("500000") if full_time and index % 3 == 0 else ZERO
            bonus = Decimal("300000") if index % 5 == 0 else ZERO
            dependents = index % 3

            gross = max(ZERO, base + teaching_extra + meal + phone + uniform + responsibility + performance + bonus - attendance_deduct)
            insurance_base = min(Decimal("36000000"), base + responsibility) if full_time else ZERO
            bhxh = (insurance_base * Decimal("0.08")).quantize(MONEY)
            bhyt = (insurance_base * Decimal("0.015")).quantize(MONEY)
            bhtn = (insurance_base * Decimal("0.01")).quantize(MONEY)
            insurance = bhxh + bhyt + bhtn
            taxable_meal = max(ZERO, meal - Decimal("730000"))
            taxable = max(ZERO, base + teaching_extra + responsibility + performance + bonus + taxable_meal - attendance_deduct)
            personal = Decimal("11000000")
            dependent = Decimal("4400000") * dependents
            assessed = max(ZERO, taxable - personal - dependent - insurance)
            tax = _pit(assessed)
            net = max(ZERO, gross - insurance - tax)

            salary_id = snowflake.next_id()
            created_at = start.replace(day=min(25, 28), hour=10)
            cursor.execute("""
                INSERT INTO salary
                (id,employee_id,period,base_salary,salary_type,bonus,deduction,total_salary,status,
                 paid_at,submitted_at,approved_at,description,created_at,updated_at,created_by,updated_by)
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
            """, (salary_id, employee_id, period, base, employee["salary_type"],
                  teaching_extra + meal + phone + uniform + responsibility + performance + bonus,
                  insurance + tax + attendance_deduct, net, status, paid_at, submitted_at,
                  approved_at, "Dữ liệu kiểm thử được tính từ nguồn nghiệp vụ", created_at,
                  approved_at or submitted_at or created_at, actor, actor))

            details = [
                ("BASE_SALARY", base, "Lương cơ bản" if full_time else "Lương dạy học Part-time"),
                ("TEACHING_COMPENSATION", teaching_extra, "Thù lao buổi dạy đã xác nhận"),
                ("MEAL_ALLOWANCE", meal, "Phụ cấp ăn trưa"),
                ("PHONE_ALLOWANCE", phone, "Phụ cấp điện thoại"),
                ("UNIFORM_ALLOWANCE", uniform, "Phụ cấp trang phục"),
                ("RESPONSIBILITY_ALLOWANCE", responsibility, "Phụ cấp trách nhiệm"),
                ("PERFORMANCE_ALLOWANCE", performance, "Phụ cấp hiệu suất"),
                ("BONUS", bonus, "Thưởng khác"),
                ("BHXH_DEDUCTION", bhxh, "Khấu trừ BHXH 8%"),
                ("BHYT_DEDUCTION", bhyt, "Khấu trừ BHYT 1.5%"),
                ("BHTN_DEDUCTION", bhtn, "Khấu trừ BHTN 1%"),
                ("INSURANCE_SALARY", insurance_base, "Lương đóng bảo hiểm"),
                ("ABSENT_DEDUCTION", absent_deduct, "Khấu trừ vắng mặt"),
                ("HALFDAY_DEDUCTION", half_deduct, "Khấu trừ nửa ngày"),
                ("LATE_DEDUCTION", late_deduct, "Khấu trừ đi muộn"),
                ("PERSONAL_DEDUCTION", personal, "Giảm trừ bản thân khi tính thuế"),
                ("DEPENDENT_DEDUCTION", dependent, "Giảm trừ người phụ thuộc"),
                ("TAXABLE_INCOME", taxable, "Thu nhập chịu thuế"),
                ("PIT_TAX", tax, "Thuế thu nhập cá nhân"),
                ("OTHER_DEDUCTION", ZERO, "Khấu trừ khác"),
                ("NET_PAY", net, "Lương thực lĩnh"),
            ]
            for key, amount, description in details:
                _detail(cursor, salary_id, key, amount, description, actor, created_at)
            inserted += 1

    print(f"   [completed] payroll_slips={inserted} | skipped_existing={skipped}")


if __name__ == "__main__":
    from db import get_connection

    connection = get_connection()
    try:
        with connection.cursor() as db_cursor:
            seed(db_cursor)
        connection.commit()
        print("✅ Seed bảng lương thành công.")
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()
