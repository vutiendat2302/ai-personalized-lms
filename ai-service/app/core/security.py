from typing import Optional
from fastapi import Header, HTTPException, status
from app.core.config import settings


# Xác thực nội bộ với spring boot
async def verify_internal_token(
    x_internal_token: Optional[str] = Header(None, alias="X-Internal-Token")
):
    """
    Xác thực token bảo mật giao tiếp nội bộ giữa Spring Boot Backend và AI Service.

    Args:
        x_internal_token (Optional[str]): Giá trị header 'X-Internal-Token' từ request gửi tới.

    Raises:
        HTTPException (401 Unauthorized): Nếu token bị thiếu hoặc không khớp với INTERNAL_SECRET cấu hình.
    """
    if not x_internal_token or x_internal_token != settings.INTERNAL_SECRET:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing X-Internal-Token header",
        )
