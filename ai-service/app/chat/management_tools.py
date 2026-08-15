import logging
from typing import Any

import httpx
from google.genai import types

from app.core.config import settings

logger = logging.getLogger(__name__)


class ManagementToolClient:
    """Gọi internal tool endpoint của Backend thay vì truy cập dữ liệu nghiệp vụ trực tiếp."""

    async def execute(
        self, tool_name: str, arguments: dict[str, Any], tool_access_token: str
    ) -> dict[str, Any]:
        """Gửi tool call cùng token context bất biến và chỉ trả dữ liệu response tối thiểu."""
        backend_url = settings.BACKEND_INTERNAL_BASE_URL.rstrip("/")
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                response = await client.post(
                    f"{backend_url}/api/v1/ai/internal/tools",
                    headers={"X-Internal-Token": settings.INTERNAL_SECRET},
                    json={
                        "toolName": tool_name,
                        "arguments": arguments,
                        "toolAccessToken": tool_access_token,
                    },
                )
            if response.is_error:
                logger.warning(
                    "Management tool thất bại: tool=%s status=%s",
                    tool_name,
                    response.status_code,
                )
                return {"error": "Không thể lấy dữ liệu hệ thống cho yêu cầu này."}
            payload = response.json()
            data = payload.get("data", {})
            return data.get(
                "result", {"error": "Backend không trả dữ liệu tool hợp lệ."}
            )
        except httpx.ConnectError:
            logger.error(
                "AI Service không kết nối được Backend internal URL: tool=%s backendUrl=%s",
                tool_name,
                backend_url,
                exc_info=True,
            )
            return {"error": "AI Service không kết nối được Backend dữ liệu nội bộ."}
        except httpx.TimeoutException:
            logger.error(
                "Backend internal tool timeout: tool=%s backendUrl=%s",
                tool_name,
                backend_url,
                exc_info=True,
            )
            return {"error": "Backend dữ liệu nội bộ phản hồi quá lâu."}
        except (httpx.HTTPError, ValueError):
            logger.warning(
                "Không thể gọi Backend management tool: tool=%s backendUrl=%s",
                tool_name,
                backend_url,
                exc_info=True,
            )
            return {"error": "Không thể gọi Backend dữ liệu nội bộ."}


def management_tools() -> list[types.Tool]:
    """Khai báo allow-list function calling cho các câu hỏi quản trị Admin và HR."""
    return [
        types.Tool(
            function_declarations=[
                types.FunctionDeclaration(
                    name="get_system_overview",
                    description=(
                        "Lấy số lượng nhân viên, học viên, hợp đồng, phòng ban và trạng thái "
                        "cấu hình hồ sơ công ty trong hệ thống AILMS."
                    ),
                ),
                types.FunctionDeclaration(
                    name="search_employees",
                    description=(
                        "Tìm nhân viên theo mã nhân viên, tên hoặc tên phòng ban. Dùng trước "
                        "khi chưa xác định chính xác mã hoặc ID nhân viên."
                    ),
                    parameters_json_schema={
                        "type": "object",
                        "properties": {
                            "keyword": {"type": "string"},
                            "limit": {"type": "integer", "minimum": 1, "maximum": 20},
                        },
                        "additionalProperties": False,
                    },
                ),
                types.FunctionDeclaration(
                    name="get_employee_contracts",
                    description=(
                        "Lấy trạng thái và thời hạn hợp đồng của một nhân viên theo employeeId "
                        "hoặc employeeCode. Không trả lương, thông tin liên hệ hay file hợp đồng."
                    ),
                    parameters_json_schema={
                        "type": "object",
                        "properties": {
                            "employeeId": {"type": "string"},
                            "employeeCode": {"type": "string"},
                        },
                        "additionalProperties": False,
                    },
                ),
                types.FunctionDeclaration(
                    name="search_students",
                    description=(
                        "Tìm học viên theo mã học viên hoặc tên. Dùng trước khi chưa xác định "
                        "chính xác mã hoặc ID học viên."
                    ),
                    parameters_json_schema={
                        "type": "object",
                        "properties": {
                            "keyword": {"type": "string"},
                            "limit": {"type": "integer", "minimum": 1, "maximum": 20},
                        },
                        "additionalProperties": False,
                    },
                ),
                types.FunctionDeclaration(
                    name="get_student_learning_summary",
                    description=(
                        "Lấy thông tin ghi danh và tiến độ khóa học đã được Backend tính cho một "
                        "học viên theo studentId hoặc studentCode."
                    ),
                    parameters_json_schema={
                        "type": "object",
                        "properties": {
                            "studentId": {"type": "string"},
                            "studentCode": {"type": "string"},
                        },
                        "additionalProperties": False,
                    },
                ),
                types.FunctionDeclaration(
                    name="get_hr_operations_summary",
                    description=(
                        "Lấy tổng quan chấm công theo ngày và số đơn nghỉ phép đang chờ duyệt. "
                        "Dùng khi hỏi vận hành nhân sự, đi muộn, vắng mặt hoặc nghỉ phép."
                    ),
                    parameters_json_schema={
                        "type": "object",
                        "properties": {"date": {"type": "string", "format": "date"}},
                        "additionalProperties": False,
                    },
                ),
                types.FunctionDeclaration(
                    name="analyze_attendance_trend",
                    description=(
                        "Phân tích xu hướng chấm công trong tối đa 90 ngày: số bản ghi theo "
                        "trạng thái và tổng số phút đi muộn. Không trả ghi chú hoặc danh tính nhân viên."
                    ),
                    parameters_json_schema={
                        "type": "object",
                        "properties": {
                            "fromDate": {"type": "string", "format": "date"},
                            "toDate": {"type": "string", "format": "date"},
                        },
                        "additionalProperties": False,
                    },
                ),
                types.FunctionDeclaration(
                    name="list_expiring_contracts",
                    description=(
                        "Liệt kê tối đa 20 hợp đồng ACTIVE sẽ hết hạn trong số ngày tới. "
                        "Không trả lương hoặc tệp hợp đồng."
                    ),
                    parameters_json_schema={
                        "type": "object",
                        "properties": {
                            "daysAhead": {
                                "type": "integer",
                                "minimum": 1,
                                "maximum": 180,
                            }
                        },
                        "additionalProperties": False,
                    },
                ),
                types.FunctionDeclaration(
                    name="list_pending_approvals",
                    description=(
                        "Lấy danh sách metadata tối đa 20 yêu cầu phê duyệt đang chờ xử lý, "
                        "gồm loại đối tượng và cấp duyệt, không có comment hoặc dữ liệu target."
                    ),
                    parameters_json_schema={
                        "type": "object",
                        "properties": {
                            "limit": {"type": "integer", "minimum": 1, "maximum": 20}
                        },
                        "additionalProperties": False,
                    },
                ),
                types.FunctionDeclaration(
                    name="get_order_summary",
                    description=(
                        "Chỉ dành cho Admin: tổng hợp số lượng và tổng tiền đơn hàng theo trạng thái. "
                        "Không trả thông tin từng học viên hoặc đơn hàng."
                    ),
                ),
                types.FunctionDeclaration(
                    name="get_course_catalog_summary",
                    description=(
                        "Chỉ dành cho Admin: tổng hợp số lượng khóa học theo trạng thái catalog."
                    ),
                ),
                types.FunctionDeclaration(
                    name="analyze_learning_progress",
                    description=(
                        "Phân tích aggregate tiến độ học toàn hệ thống: tiến độ trung bình và "
                        "số bản ghi dưới ngưỡng rủi ro. Không trả danh sách hoặc thông tin liên hệ học viên."
                    ),
                    parameters_json_schema={
                        "type": "object",
                        "properties": {
                            "riskBelowPercent": {
                                "type": "integer",
                                "minimum": 1,
                                "maximum": 100,
                            }
                        },
                        "additionalProperties": False,
                    },
                ),
                types.FunctionDeclaration(
                    name="draft_notification",
                    description=(
                        "Chỉ khi Admin yêu cầu rõ ràng tạo hoặc gửi thông báo: tạo một bản nháp "
                        "chưa gửi. Không dùng để thông báo đã được gửi. Người dùng phải xác nhận "
                        "riêng ở Backend sau khi xem nội dung. Chọn đúng một broadcastAll hoặc targetRole."
                    ),
                    parameters_json_schema={
                        "type": "object",
                        "properties": {
                            "title": {
                                "type": "string",
                                "minLength": 1,
                                "maxLength": 255,
                            },
                            "content": {
                                "type": "string",
                                "minLength": 1,
                                "maxLength": 4000,
                            },
                            "broadcastAll": {"type": "boolean"},
                            "targetRole": {
                                "type": "string",
                                "enum": [
                                    "ADMIN",
                                    "HR",
                                    "TEACHER",
                                    "INSTRUCTOR",
                                    "EMPLOYEE",
                                    "STUDENT",
                                ],
                            },
                        },
                        "additionalProperties": False,
                    },
                ),
                types.FunctionDeclaration(
                    name="get_course_details",
                    description=(
                        "Lấy thông tin tổng quan, mô tả, mục tiêu đầu ra và yêu cầu đầu vào "
                        "của một khóa học theo courseId hoặc từ khóa tên khóa học."
                    ),
                    parameters_json_schema={
                        "type": "object",
                        "properties": {
                            "courseId": {"type": "string", "description": "Mã ID khóa học"},
                            "keyword": {"type": "string", "description": "Tên hoặc từ khóa tìm kiếm khóa học"},
                        },
                        "additionalProperties": False,
                    },
                ),
                types.FunctionDeclaration(
                    name="get_course_curriculum",
                    description=(
                        "Lấy khung chương trình chi tiết của khóa học: danh sách các chương (sections) "
                        "và bài học (lessons) kèm loại nội dung (VIDEO, TEXT, PDF, QUIZ, ASSIGNMENT) "
                        "và thời lượng theo courseId."
                    ),
                    parameters_json_schema={
                        "type": "object",
                        "properties": {
                            "courseId": {"type": "string", "description": "Mã ID khóa học"},
                        },
                        "required": ["courseId"],
                        "additionalProperties": False,
                    },
                ),
                types.FunctionDeclaration(
                    name="get_my_learning_progress",
                    description=(
                        "Lấy tiến độ học tập cá nhân của chính học viên hiện tại (% hoàn thành, "
                        "số bài đã học, điểm số trung bình). Dùng khi học viên hỏi về tiến độ "
                        "hoặc kết quả học tập của chính mình."
                    ),
                    parameters_json_schema={
                        "type": "object",
                        "properties": {
                            "courseId": {"type": "string", "description": "Mã ID khóa học (tùy chọn)"},
                        },
                        "additionalProperties": False,
                    },
                ),
                types.FunctionDeclaration(
                    name="recommend_next_learning_step",
                    description=(
                        "Phân tích tiến độ học tập để gợi ý bài học tiếp theo cần hoàn thành "
                        "hoặc bài học cần ôn tập cho học viên trong khóa học theo courseId."
                    ),
                    parameters_json_schema={
                        "type": "object",
                        "properties": {
                            "courseId": {"type": "string", "description": "Mã ID khóa học"},
                        },
                        "required": ["courseId"],
                        "additionalProperties": False,
                    },
                ),
                types.FunctionDeclaration(
                    name="get_lesson_summary_and_resources",
                    description=(
                        "Lấy mô tả tóm tắt nội dung bài học và danh sách tài liệu đính kèm "
                        "(file PDF, tài nguyên tham khảo) theo lessonId."
                    ),
                    parameters_json_schema={
                        "type": "object",
                        "properties": {
                            "lessonId": {"type": "string", "description": "Mã ID bài học"},
                        },
                        "required": ["lessonId"],
                        "additionalProperties": False,
                    },
                ),
                types.FunctionDeclaration(
                    name="check_and_prepare_contract_creation",
                    description=(
                        "Kiểm tra xem nhân viên có đang còn hợp đồng ACTIVE hay không, "
                        "cảnh báo thời hạn còn lại và hướng dẫn các thông tin cần thiết để tạo hợp đồng mới."
                    ),
                    parameters_json_schema={
                        "type": "object",
                        "properties": {
                            "employeeId": {"type": "string"},
                            "employeeCode": {"type": "string"},
                            "keyword": {"type": "string"},
                        },
                        "additionalProperties": False,
                    },
                ),
                types.FunctionDeclaration(
                    name="create_or_renew_employee_contract",
                    description=(
                        "Tạo hợp đồng lao động mới cho nhân viên. Nếu nhân viên còn HĐ cũ đang hoạt động, "
                        "phải có forceTerminateOldContract=true để xác nhận chấm dứt HĐ cũ."
                    ),
                    parameters_json_schema={
                        "type": "object",
                        "properties": {
                            "employeeId": {"type": "string"},
                            "contractType": {
                                "type": "string",
                                "enum": ["PROBATION", "FIXED_TERM", "INDEFINITE", "SEASONAL"],
                            },
                            "baseSalary": {"type": "number"},
                            "salaryType": {
                                "type": "string",
                                "enum": ["MONTHLY", "DAILY", "HOURLY"],
                            },
                            "startDate": {"type": "string", "format": "date"},
                            "endDate": {"type": "string", "format": "date"},
                            "forceTerminateOldContract": {"type": "boolean"},
                        },
                        "required": ["employeeId", "contractType", "baseSalary", "startDate"],
                        "additionalProperties": False,
                    },
                ),
                types.FunctionDeclaration(
                    name="list_expiring_contracts_advanced",
                    description=(
                        "Liệt kê nâng cao danh sách hợp đồng sắp hết hạn trong N ngày tới (mặc định 60 ngày = 2 tháng), "
                        "có thể lọc theo tên phòng ban hoặc loại hợp đồng."
                    ),
                    parameters_json_schema={
                        "type": "object",
                        "properties": {
                            "daysAhead": {"type": "integer", "minimum": 1, "maximum": 180},
                            "departmentName": {"type": "string"},
                            "contractType": {"type": "string"},
                        },
                        "additionalProperties": False,
                    },
                ),
                types.FunctionDeclaration(
                    name="lock_or_unlock_employee_account",
                    description=(
                        "Khóa hoặc mở khóa tài khoản người dùng của nhân viên. Bắt buộc có lý do khi khóa."
                    ),
                    parameters_json_schema={
                        "type": "object",
                        "properties": {
                            "employeeId": {"type": "string"},
                            "employeeCode": {"type": "string"},
                            "action": {"type": "string", "enum": ["LOCK", "UNLOCK"]},
                            "reason": {"type": "string"},
                        },
                        "required": ["action"],
                        "additionalProperties": False,
                    },
                ),
                types.FunctionDeclaration(
                    name="lock_or_unlock_student_account",
                    description=(
                        "Khóa hoặc mở khóa tài khoản người dùng của học viên. Bắt buộc có lý do khi khóa."
                    ),
                    parameters_json_schema={
                        "type": "object",
                        "properties": {
                            "studentId": {"type": "string"},
                            "studentCode": {"type": "string"},
                            "action": {"type": "string", "enum": ["LOCK", "UNLOCK"]},
                            "reason": {"type": "string"},
                        },
                        "required": ["action"],
                        "additionalProperties": False,
                    },
                ),
                types.FunctionDeclaration(
                    name="get_employee_leave_and_attendance_detail",
                    description=(
                        "Thống kê chi tiết số ngày công và đơn nghỉ phép của nhân viên theo tháng (yyyy-MM)."
                    ),
                    parameters_json_schema={
                        "type": "object",
                        "properties": {
                            "employeeId": {"type": "string"},
                            "employeeCode": {"type": "string"},
                            "month": {"type": "string"},
                        },
                        "additionalProperties": False,
                    },
                ),
                types.FunctionDeclaration(
                    name="get_student_detailed_learning_progress",
                    description=(
                        "Quản lý hoặc Giảng viên tra cứu chi tiết học viên đang học đến bài nào, "
                        "tiến độ từng khóa học, bài học dở gần nhất và lần truy cập cuối."
                    ),
                    parameters_json_schema={
                        "type": "object",
                        "properties": {
                            "studentId": {"type": "string"},
                            "studentCode": {"type": "string"},
                            "keyword": {"type": "string"},
                            "courseId": {"type": "string"},
                        },
                        "additionalProperties": False,
                    },
                ),
                types.FunctionDeclaration(
                    name="list_students_at_learning_risk",
                    description=(
                        "Lọc danh sách các học viên có nguy cơ chậm tiến độ (tiến độ học tập dưới ngưỡng % chỉ định)."
                    ),
                    parameters_json_schema={
                        "type": "object",
                        "properties": {
                            "riskBelowPercent": {"type": "integer", "minimum": 1, "maximum": 100},
                            "courseId": {"type": "string"},
                        },
                        "additionalProperties": False,
                    },
                ),
                types.FunctionDeclaration(
                    name="draft_coupon_and_distribute",
                    description=(
                        "Tạo mã giảm giá mới và tự động phân phối gửi vào ví voucher của các học viên."
                    ),
                    parameters_json_schema={
                        "type": "object",
                        "properties": {
                            "couponCode": {"type": "string"},
                            "discountType": {"type": "string", "enum": ["PERCENTAGE", "FIXED_AMOUNT"]},
                            "discountValue": {"type": "number"},
                            "maxUsage": {"type": "integer", "minimum": 1},
                            "validDays": {"type": "integer", "minimum": 1},
                        },
                        "required": ["discountValue"],
                        "additionalProperties": False,
                    },
                ),
                types.FunctionDeclaration(
                    name="get_sales_kpi_and_order_analytics",
                    description=(
                        "Thống kê tổng quan đơn hàng và doanh số bán hàng từ hệ thống."
                    ),
                    parameters_json_schema={
                        "type": "object",
                        "properties": {
                            "timeRange": {"type": "string"},
                        },
                        "additionalProperties": False,
                    },
                ),
                types.FunctionDeclaration(
                    name="query_abandoned_carts_and_retarget",
                    description=(
                        "Thống kê số lượng giỏ hàng chưa thanh toán để chuẩn bị voucher tiếp thị lại."
                    ),
                    parameters_json_schema={
                        "type": "object",
                        "properties": {
                            "olderThanHours": {"type": "integer"},
                        },
                        "additionalProperties": False,
                    },
                ),
            ]
        )
    ]
