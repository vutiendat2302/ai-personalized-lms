"""Chuẩn hóa salary.period từ Java-serialized YearMonth sang VARCHAR(7).

Tạo bảng backup trước khi đụng dữ liệu. Khi một employee-period tồn tại cả bản
legacy và bản do payroll seeder mới tạo, giữ bản legacy và chỉ bỏ bản seed trùng.
"""

from db import get_connection


SEED_NOTE = "Dữ liệu kiểm thử được tính từ nguồn nghiệp vụ"


def decode_period(raw):
    if isinstance(raw, str):
        return raw
    value = bytes(raw)
    if value.startswith(b"\xac\xed") and len(value) >= 9:
        year = int.from_bytes(value[-6:-2], "big", signed=True)
        month = value[-2]
        return f"{year:04d}-{month:02d}"
    return value.decode("utf-8")


def migrate(cursor):
    cursor.execute("CREATE TABLE IF NOT EXISTS salary_period_backup LIKE salary")
    cursor.execute("CREATE TABLE IF NOT EXISTS salary_detail_period_backup LIKE salary_detail")
    cursor.execute("INSERT IGNORE INTO salary_period_backup SELECT * FROM salary")
    cursor.execute("INSERT IGNORE INTO salary_detail_period_backup SELECT * FROM salary_detail")

    cursor.execute("SELECT id,employee_id,period,description FROM salary ORDER BY created_at,id")
    rows = cursor.fetchall()
    by_key = {}
    for row in rows:
        period = decode_period(row["period"])
        by_key.setdefault((row["employee_id"], period), []).append(row)

    removed = converted = 0
    for (_, period), duplicates in by_key.items():
        keeper = next((row for row in duplicates if row.get("description") != SEED_NOTE), duplicates[0])
        for row in duplicates:
            if row["id"] == keeper["id"]:
                continue
            cursor.execute("DELETE FROM salary_detail WHERE salary_id=%s", (row["id"],))
            cursor.execute("DELETE FROM salary WHERE id=%s", (row["id"],))
            removed += 1
        cursor.execute("UPDATE salary SET period=%s WHERE id=%s", (period, keeper["id"]))
        converted += 1

    cursor.execute("ALTER TABLE salary MODIFY period VARCHAR(7) NOT NULL")
    cursor.execute("""SELECT index_name FROM information_schema.statistics
        WHERE table_schema=DATABASE() AND table_name='salary'
          AND index_name='idx_salary_employee_period' LIMIT 1""")
    if not cursor.fetchone():
        cursor.execute("CREATE INDEX idx_salary_employee_period ON salary(employee_id,period)")
    cursor.execute("""SELECT index_name FROM information_schema.statistics
        WHERE table_schema=DATABASE() AND table_name='salary'
          AND index_name='uk_employee_period' LIMIT 1""")
    if cursor.fetchone():
        cursor.execute("ALTER TABLE salary DROP INDEX uk_employee_period")
    print(f"[completed] converted={converted} | duplicate_seed_rows_removed={removed}")


if __name__ == "__main__":
    connection = get_connection()
    try:
        with connection.cursor() as db_cursor:
            migrate(db_cursor)
        connection.commit()
        print("✅ Chuẩn hóa salary.period thành công; backup được giữ trong database.")
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()
