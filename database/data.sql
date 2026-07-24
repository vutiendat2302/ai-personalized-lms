course (employee tạo)
  → course_section
    → lesson
      → lesson_resource
      → quiz → question → question_option
      → assignment


cart_item (cần user, course_package)
order (cần user, coupon nếu có)
  → order_item (cần order, course_package)
  → payment_transaction (cần order)


enrollment → enrollment_package (cần order_item, course_package)
class_member (giáo viên do matching, học viên do enroll — cần class_)

