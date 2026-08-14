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
import interest_category
import user
import user_role
import file_metadata
import employee_contract
import employee
import attendance
import student_profile
import guardian
import student_interest
import study_goal
import learning_activity_log
import learning_session
import teacher_category
import teacher_availability
import course
import course_teacher
import course_section
import lesson
import review
import degree
import lesson_resource
import search_history
import course_class
import teaching_compensation
import payroll
import migrate_salary_period
import course_package
import sales_order
import student_tuition_payment


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
            interest_category.seed(cursor)
            user.seed(cursor)
            user_role.seed(cursor)
            file_metadata.seed(cursor)
            employee.seed(cursor)
            employee_contract.seed(cursor)
            attendance.seed(cursor)
            student_profile.seed(cursor)
            guardian.seed(cursor)
            student_interest.seed(cursor)
            study_goal.seed(cursor)
            teacher_category.seed(cursor)
            teacher_availability.seed(cursor)
            course.seed(cursor)
            course_teacher.seed(cursor)
            course_section.seed(cursor)
            lesson.seed(cursor)
            # Nhật ký cần course/section/lesson tồn tại để gắn đúng đối tượng học tập.
            learning_activity_log.seed(cursor)
            learning_session.seed(cursor)
            review.seed(cursor)
            degree.seed(cursor)
            lesson_resource.seed(cursor)
            course_class.seed(cursor)
            teaching_compensation.seed(cursor)
            migrate_salary_period.migrate(cursor)
            payroll.seed(cursor)
            search_history.seed(cursor)
            course_package.seed(cursor)
            sales_order.seed(cursor)
            student_tuition_payment.seed(cursor)
            
            
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
