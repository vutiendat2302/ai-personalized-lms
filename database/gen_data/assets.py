"""Catalog asset thật đi kèm bộ dữ liệu báo cáo, không dùng URL ảnh ngẫu nhiên bên ngoài."""

from pathlib import Path


ASSET_ROOT = Path(__file__).resolve().parent / "file"

AVATAR_ASSETS = tuple(
    {
        "source": ASSET_ROOT / "avatar" / f"av{index}.jpeg",
        "file_key": f"seed-assets/avatars/avatar-{index:02d}.jpeg",
        "content_type": "image/jpeg",
    }
    for index in range(1, 5)
)

CONTRACT_ASSET = {
    "source": ASSET_ROOT / "contract-fake.pdf",
    "file_key": "seed-assets/contracts/employment-contract-demo.pdf",
    "content_type": "application/pdf",
}

COURSE_IMAGE_ASSETS = tuple(
    {
        "source": ASSET_ROOT / "course" / f"c{index}.jpg",
        "file_key": f"seed-assets/courses/course-cover-{index:02d}.jpg",
        "content_type": "image/jpeg",
    }
    for index in range(1, 4)
)


def validate_assets():
    """Xác nhận toàn bộ asset catalog tồn tại và không rỗng trước khi seed."""
    assets = [*AVATAR_ASSETS, CONTRACT_ASSET, *COURSE_IMAGE_ASSETS]
    missing = [str(item["source"]) for item in assets if not item["source"].is_file()]
    empty = [str(item["source"]) for item in assets if item["source"].is_file() and item["source"].stat().st_size == 0]
    if missing or empty:
        raise ValueError(f"Asset không hợp lệ; missing={missing}, empty={empty}")
    return assets
