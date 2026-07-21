# AI Personalized LMS - RBAC & Permissions Documentation

Tài liệu này định nghĩa hệ thống phân quyền dựa trên vai trò (**Role-Based Access Control - RBAC**), bao gồm danh sách các **Permissions (Mã quyền)**, ánh xạ **Permission -> API Endpoint**, và **Bảng Phân quyền Vai trò (Role Permission Matrix)**.

---

## 1. Quyết định Thiết kế Mã quyền (Permission Naming Standard)

Mã quyền tuân theo cấu trúc: `<domain>:<action>`
- `domain`: Đối tượng hoặc Module tài nguyên (VD: `user`, `employee`, `course`, `quiz`).
- `action`: Hành động được phép thực hiện (VD: `read`, `create`, `update`, `delete`, `approve`, `grade`).

---

## 2. Bảng Ánh xạ API Endpoint -> Permission & Roles Được Phép

### 2.1 Module 1: Auth, User & Permission
| Method | Endpoint | Required Permission | Allowed Roles |
|---|---|---|---|
| `POST` | `/api/v1/auth/register` | *Public* | Anonymous / All |
| `POST` | `/api/v1/auth/login` | *Public* | Anonymous / All |
| `POST` | `/api/v1/auth/refresh` | *Public* | Anonymous / All |
| `POST` | `/api/v1/auth/logout` | `auth:logout` | Authenticated Users |
| `GET` | `/api/v1/users` | `user:read` | `ADMIN`, `HR`, `MANAGER` |
| `GET` | `/api/v1/users/{id}` | `user:read` | `ADMIN`, `HR`, `MANAGER` |
| `POST` | `/api/v1/users` | `user:create` | `ADMIN`, `HR` |
| `PUT` | `/api/v1/users/{id}` | `user:update` | `ADMIN`, `HR` |
| `DELETE` | `/api/v1/users/{id}` | `user:delete` | `ADMIN` |
| `GET` | `/api/v1/roles` | `role:read` | `ADMIN`, `HR` |
| `POST` | `/api/v1/roles` | `role:create` | `ADMIN` |
| `PUT` | `/api/v1/roles/{id}` | `role:update` | `ADMIN` |
| `DELETE` | `/api/v1/roles/{id}` | `role:delete` | `ADMIN` |
| `POST` | `/api/v1/roles/{roleId}/permissions` | `role:assign_permission` | `ADMIN` |
| `GET` | `/api/v1/permissions` | `permission:read` | `ADMIN` |

---

### 2.2 Module 2: HR Management, Chấm công & Tính Lương
| Method | Endpoint | Required Permission | Allowed Roles |
|---|---|---|---|
| `POST` | `/api/v1/employees` | `employee:create` | `ADMIN`, `HR` |
| `GET` | `/api/v1/employees/{id}` | `employee:read` | `ADMIN`, `HR`, `MANAGER` |
| `PUT` | `/api/v1/employees/{id}` | `employee:update` | `ADMIN`, `HR` |
| `POST` | `/api/v1/employee-contracts` | `contract:create` | `ADMIN`, `HR` |
| `GET` | `/api/v1/employee-contracts/expiring` | `contract:read` | `ADMIN`, `HR` |
| `POST` | `/api/v1/attendances/check-in` | `attendance:checkin` | `FULL_TIME` Employees |
| `POST` | `/api/v1/attendances/check-out` | `attendance:checkout` | `FULL_TIME` Employees |
| `POST` | `/api/v1/leave-requests` | `leave:create` | All Employees |
| `POST` | `/api/v1/leave-requests/{id}/approve` | `leave:approve` | `ADMIN`, `HR`, `MANAGER` |
| `POST` | `/api/v1/teaching-session-payments/check-in` | `teaching:checkin` | `TEACHER`, `TA` |
| `POST` | `/api/v1/teaching-session-payments/check-out` | `teaching:checkout` | `TEACHER`, `TA` |
| `POST` | `/api/v1/salaries/calculate-full-time` | `salary:calculate` | `ADMIN`, `HR`, `ACCOUNTANT` |
| `POST` | `/api/v1/salaries/calculate-part-time` | `salary:calculate` | `ADMIN`, `HR`, `ACCOUNTANT` |
| `GET` | `/api/v1/salaries/payslip/{employeeId}` | `salary:read_payslip` | `ADMIN`, `HR`, `ACCOUNTANT`, Employee (Self) |

---

### 2.3 Module 3: Student Management
| Method | Endpoint | Required Permission | Allowed Roles |
|---|---|---|---|
| `GET` | `/api/v1/students/profile` | `student:read_profile` | `STUDENT`, `ADMIN`, `HR`, `TEACHER` |
| `POST` | `/api/v1/students/profile` | `student:update_profile` | `STUDENT` (Self), `ADMIN` |
| `POST` | `/api/v1/students/onboarding/skip-goal` | `student:onboarding` | `STUDENT` |
| `GET` | `/api/v1/study-goals` | `study_goal:read` | `STUDENT`, `TEACHER` |
| `POST` | `/api/v1/study-goals` | `study_goal:create` | `STUDENT` |
| `PUT` | `/api/v1/study-goals/{id}` | `study_goal:update` | `STUDENT` |
| `POST` | `/api/v1/guardians` | `guardian:create` | `STUDENT`, `ADMIN` |
| `GET` | `/api/v1/learning-activity-logs` | `activity_log:read` | `STUDENT`, `ADMIN`, `TEACHER` |

---

### 2.4 Module 4: Course Management
| Method | Endpoint | Required Permission | Allowed Roles |
|---|---|---|---|
| `GET` | `/api/v1/categories` | `category:read` | *Public* / All |
| `POST` | `/api/v1/categories` | `category:create` | `ADMIN`, `MANAGER` |
| `POST` | `/api/v1/categories/{id}/teachers` | `category:assign_teacher` | `ADMIN`, `MANAGER` |
| `GET` | `/api/v1/courses` | `course:read` | *Public* / All |
| `POST` | `/api/v1/courses` | `course:create` | `TEACHER` (trong Category đã gán), `ADMIN` |
| `POST` | `/api/v1/courses/{id}/submit` | `course:submit` | `TEACHER` |
| `POST` | `/api/v1/courses/{id}/approve` | `course:approve` | `ADMIN`, `MANAGER` |
| `POST` | `/api/v1/courses/{id}/sections` | `section:create` | `TEACHER`, `ADMIN` |
| `POST` | `/api/v1/sections/{id}/lessons` | `lesson:create` | `TEACHER`, `ADMIN` |
| `POST` | `/api/v1/lessons/{id}/resources` | `lesson:upload_resource` | `TEACHER`, `ADMIN` |

---

### 2.5 Module 5: Order & Payment Management
| Method | Endpoint | Required Permission | Allowed Roles |
|---|---|---|---|
| `POST` | `/api/v1/cart/items` | `cart:manage` | `STUDENT` |
| `DELETE` | `/api/v1/cart/items/{id}` | `cart:manage` | `STUDENT` |
| `POST` | `/api/v1/coupons` | `coupon:create` | `ADMIN`, `ACCOUNTANT`, `MANAGER` |
| `POST` | `/api/v1/coupons/validate` | `coupon:validate` | `STUDENT`, All |
| `POST` | `/api/v1/orders` | `order:create` | `STUDENT` |
| `POST` | `/api/v1/orders/{id}/payment-url` | `order:pay` | `STUDENT` |
| `POST` | `/api/v1/orders/webhook/vnpay` | *Webhook Secret* | Payment Gateway Server |

---

### 2.6 Module 6: Class Management
| Method | Endpoint | Required Permission | Allowed Roles |
|---|---|---|---|
| `POST` | `/api/v1/classes` | `class:create` | `ADMIN`, `MANAGER` |
| `POST` | `/api/v1/classes/placement` | `class:placement` | System Auto / `ADMIN`, `MANAGER` |
| `POST` | `/api/v1/classes/transfer-request` | `class:transfer_request` | `STUDENT` |
| `POST` | `/api/v1/classes/transfer-request/{id}/approve` | `class:transfer_approve` | `ADMIN`, `MANAGER` |
| `POST` | `/api/v1/classes/teacher-change-request` | `class:teacher_change_request` | `STUDENT`, `TEACHER` |
| `POST` | `/api/v1/classes/teacher-change-request/{id}/approve` | `class:teacher_change_approve` | `ADMIN`, `MANAGER` |
| `POST` | `/api/v1/classes/{id}/reschedule` | `class:reschedule` | `TEACHER`, `ADMIN`, `MANAGER` |
| `POST` | `/api/v1/classes/{id}/teacher-withdrawal` | `class:teacher_withdrawal` | `TEACHER`, `ADMIN` |

---

### 2.7 Module 7: Assessment & Progress Management
| Method | Endpoint | Required Permission | Allowed Roles |
|---|---|---|---|
| `POST` | `/api/v1/quizzes` | `quiz:create` | `TEACHER`, `ADMIN` |
| `POST` | `/api/v1/quizzes/{id}/attempts` | `quiz:start` | `STUDENT` |
| `POST` | `/api/v1/quiz-attempts/{id}/submit` | `quiz:submit` | `STUDENT` |
| `POST` | `/api/v1/quiz-attempts/{id}/grade` | `quiz:grade_fill_blank` | `TEACHER`, `TA`, `ADMIN` |
| `POST` | `/api/v1/assignments` | `assignment:create` | `TEACHER`, `ADMIN` |
| `POST` | `/api/v1/assignments/{id}/submissions` | `assignment:submit` | `STUDENT` |
| `POST` | `/api/v1/submissions/{id}/grade` | `assignment:grade` | `TEACHER`, `TA`, `ADMIN` |
| `GET` | `/api/v1/reports/class-progress` | `report:class_progress` | `TEACHER`, `TA`, `MANAGER`, `ADMIN` |
| `GET` | `/api/v1/reports/system-dashboard` | `report:system_dashboard` | `ADMIN`, `HR`, `MANAGER` |

---

### 2.8 Module 8: System & Certificates
| Method | Endpoint | Required Permission | Allowed Roles |
|---|---|---|---|
| `GET` | `/api/v1/certificates/user/{userId}` | `certificate:read` | `STUDENT` (Self), `ADMIN`, `TEACHER` |
| `GET` | `/api/v1/certificates/verify/{code}` | *Public* | Anonymous / All |
| `POST` | `/api/v1/files/upload` | `file:upload` | Authenticated Users |
| `GET` | `/api/v1/audit-logs` | `audit_log:read` | `ADMIN` |

---

## 3. Bảng Phân Quyền Vai Trò (Role-Permission Matrix)

| Quyền (Permission) | ADMIN | HR | ACCOUNTANT | MANAGER | TEACHER | TA | STUDENT |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| `user:read` / `user:create` / `user:update` | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| `user:delete` / `role:*` / `permission:*` | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `employee:create` / `contract:*` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `attendance:*` / `leave:create` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| `leave:approve` | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| `salary:calculate` / `salary:read_payslip` | ✅ | ✅ | ✅ | ❌ | (Self) | (Self) | (Self) |
| `student:*` / `study_goal:*` | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ✅ |
| `category:create` / `category:assign_teacher` | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| `course:create` / `section:create` / `lesson:create` | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| `course:approve` | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| `coupon:create` | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ |
| `cart:manage` / `order:create` / `order:pay` | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| `class:create` / `class:transfer_approve` | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| `class:reschedule` / `class:teacher_withdrawal` | ✅ | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ |
| `quiz:create` / `assignment:create` | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| `quiz:start` / `quiz:submit` / `assignment:submit` | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| `quiz:grade_fill_blank` / `assignment:grade` | ✅ | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ |
| `report:class_progress` | ✅ | ❌ | ❌ | ✅ | ✅ | ✅ | ❌ |
| `report:system_dashboard` | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| `audit_log:read` | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
