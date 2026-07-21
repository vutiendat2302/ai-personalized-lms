"""
main.py
--------
Entry point: kết nối MySQL và chạy tuần tự các file seed theo đúng thứ tự
(departments, roles, permissions phải xong trước role_permissions vì có FK).

Cài đặt thư viện:
    pip install pymysql

Cấu hình kết nối qua biến môi trường (xem db.py):
    DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME

Chạy:
    python main.py
"""

from db import get_connection, DB_CONFIG
import department
import role
import permission
import role_permission
import interest
import coupon
import category
import user
import user_role
import file_metadata
import employee_contract
import employee
import attendance

def main():
    print(f"Kết nối tới MySQL: {DB_CONFIG['user']}@{DB_CONFIG['host']}:{DB_CONFIG['port']}/{DB_CONFIG['database']}")
    conn = get_connection()
    try:
        with conn.cursor() as cursor:
            department.seed(cursor)
            role.seed(cursor)
            permission.seed(cursor)
            role_permission.seed(cursor)
            interest.seed(cursor)
            coupon.seed(cursor)
            category.seed(cursor)
            user.seed(cursor)
            user_role.seed(cursor)
            file_metadata.seed(cursor)
            employee.seed(cursor)
            employee_contract.seed(cursor)
            attendance.seed(cursor)
            
            
        conn.commit()
        print("\n✅ Seed dữ liệu thành công!")
    except Exception as e:
        conn.rollback()
        print(f"\n❌ Lỗi khi seed dữ liệu, đã rollback: {e}")
        raise
    finally:
        conn.close()


if __name__ == "__main__":
    main()