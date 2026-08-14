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
            ]
        )
    ]
