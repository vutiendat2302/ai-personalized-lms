"""Entry point duy nhất cho bộ dữ liệu báo cáo cuối cùng của AILMS.

Mặc định chạy tuần tự ba giai đoạn đã hoàn thiện:
master data -> user/profile -> course content qua Backend API.
"""

from __future__ import annotations

import argparse
import os
from pathlib import Path
from urllib.parse import urlparse


PROJECT_ROOT = Path(__file__).resolve().parents[2]


def resolve_host_minio_endpoint(endpoint: str | None) -> str:
    """Đổi hostname nội bộ Docker sang cổng MinIO được publish trên máy host."""
    value = (endpoint or "").strip()
    parsed = urlparse(value if "://" in value else f"http://{value}")
    if not value or parsed.hostname in {"minio", "ailms-minio-docker"}:
        return "http://127.0.0.1:9000"
    return value


def load_project_environment() -> None:
    """Nạp `.env` cục bộ và ánh xạ biến Compose mà không ghi đè ENV của tiến trình."""
    env_path = PROJECT_ROOT / ".env"
    if env_path.is_file():
        for raw_line in env_path.read_text(encoding="utf-8").splitlines():
            line = raw_line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            value = value.strip()
            if len(value) >= 2 and value[0] == value[-1] and value[0] in {"'", '"'}:
                value = value[1:-1]
            os.environ.setdefault(key.strip(), value)

    aliases = {
        "DB_USER": "MYSQL_USER",
        "DB_PASSWORD": "MYSQL_PASSWORD",
        "DB_NAME": "MYSQL_DATABASE",
        "MINIO_ACCESS_KEY": "MINIO_ROOT_USER",
        "MINIO_SECRET_KEY": "MINIO_ROOT_PASSWORD",
    }
    for target, source in aliases.items():
        if source in os.environ:
            os.environ.setdefault(target, os.environ[source])
    os.environ.setdefault("DB_HOST", "127.0.0.1")
    os.environ.setdefault("DB_PORT", "3306")
    os.environ["MINIO_ENDPOINT"] = resolve_host_minio_endpoint(os.getenv("MINIO_ENDPOINT"))
    os.environ.setdefault("MINIO_BUCKET_NAME", "ailms-minio")
    os.environ.setdefault("AILMS_API_BASE_URL", "http://localhost:8080/api")


load_project_environment()


def parse_args() -> argparse.Namespace:
    """Đọc giai đoạn cần chạy và chế độ kiểm tra không commit."""
    parser = argparse.ArgumentParser(
        description="Seed bộ dữ liệu báo cáo cuối cùng của AI Personalized LMS",
    )
    parser.add_argument(
        "--phase",
        choices=(
            "all", "static", "identity", "course-content",
            "learner-lifecycle", "commerce", "class-lifecycle",
            "learning-progress", "reviews", "validate",
        ),
        default="all",
        help=(
            "Mặc định 'all'; dùng lựa chọn khác để chạy lại riêng một giai đoạn. "
            "'learner-lifecycle' chạy toàn bộ các bước mua hàng, lớp học, tiến độ và đánh giá."
        ),
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Kiểm tra master data rồi rollback; chỉ dùng cùng --phase static",
    )
    args = parser.parse_args()
    if args.dry_run and args.phase != "static":
        parser.error("--dry-run chỉ hỗ trợ cho --phase static")
    return args


def validate_degree_schema(cursor) -> None:
    """Bảo đảm migration v24 đã mở rộng đủ loại văn bằng trước khi seed."""
    cursor.execute("SHOW COLUMNS FROM degree LIKE 'type'")
    row = cursor.fetchone()
    column_type = row.get("Type", "") if row else ""
    required = {"ASSOCIATE", "ENGINEER", "DOCTORATE", "CERTIFICATE"}
    missing = sorted(item for item in required if f"'{item}'" not in column_type)
    if missing:
        raise ValueError(
            "Schema degree chưa áp dụng database/v24_expand_degree_qualification_types.sql; "
            f"thiếu {missing}"
        )


def run_static(*, apply_changes: bool) -> None:
    """Seed master data trong một transaction và rollback khi dry-run hoặc có lỗi."""
    import assets
    import category
    import coupon
    import degree
    import department
    import interest
    import interest_category
    import permission
    import role
    import role_permission
    from db import DB_CONFIG, get_connection

    static_seeders = (
        department,
        role,
        permission,
        role_permission,
        category,
        interest,
        interest_category,
        coupon,
        degree,
    )
    validated_assets = assets.validate_assets()
    print("\n=== Giai đoạn 1/3: Master data ===")
    print(
        f"MySQL: {DB_CONFIG['user']}@{DB_CONFIG['host']}:"
        f"{DB_CONFIG['port']}/{DB_CONFIG['database']}"
    )
    connection = get_connection()
    try:
        with connection.cursor() as cursor:
            validate_degree_schema(cursor)
            for seeder in static_seeders:
                seeder.seed(cursor)
        if apply_changes:
            connection.commit()
            print(f"✅ Đã commit master data; assets={len(validated_assets)}")
        else:
            connection.rollback()
            print(f"✅ Dry-run master data thành công; assets={len(validated_assets)}")
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()


def run_identity() -> None:
    """Seed 50 nhân viên, 50 học viên và asset MinIO với cơ chế bù trừ khi lỗi."""
    import department
    import employee
    import employee_contract
    import file_metadata
    import guardian
    import identity_validation
    import interest
    import role
    import student_interest
    import student_profile
    import study_goal
    import teacher_availability
    import teacher_category
    import user
    import user_role
    from asset_storage import cleanup_new_objects, clear_uploaded_registry
    from db import get_connection

    print("\n=== Giai đoạn 2/3: User, profile và MinIO ===")
    connection = get_connection()
    try:
        with connection.cursor() as cursor:
            department.seed(cursor)
            role.seed(cursor)
            interest.seed(cursor)
            user.seed(cursor)
            user_role.seed(cursor)
            employee.seed(cursor)
            student_profile.seed(cursor)
            file_metadata.seed(cursor)
            employee_contract.seed(cursor)
            guardian.seed(cursor)
            student_interest.seed(cursor)
            study_goal.seed(cursor)
            teacher_category.seed(cursor)
            teacher_availability.seed(cursor)
            identity_validation.validate(cursor)
        connection.commit()
        clear_uploaded_registry()
        print("✅ Đã commit 50 nhân viên, 50 học viên và metadata asset")
    except Exception:
        connection.rollback()
        try:
            cleanup_new_objects()
        except Exception as cleanup_error:
            print(f"⚠️ Không thể dọn object MinIO vừa upload: {cleanup_error}")
        raise
    finally:
        connection.close()


def run_course_content() -> None:
    """Sinh khóa học, lesson, quiz, assignment và resource qua Backend API."""
    from course_content_api import seed_course_content

    print("\n=== Giai đoạn 3/5: Nội dung khóa học qua Backend ===")
    seed_course_content()
    print("✅ Đã đồng bộ bộ khóa học theo workflow nháp, duyệt và kích hoạt")


def run_commerce() -> None:
    """Sinh dữ liệu mua hàng: checkout PayPal Sandbox → capture → Order PAID → Enrollment."""
    from commerce_api import seed_commerce

    print("\n=== Giai đoạn 4a/5: Mua hàng và thanh toán PayPal ===")
    seed_commerce()
    print("✅ Đã hoàn tất chu trình mua hàng cho các student")


def run_class_lifecycle() -> None:
    """Sinh lớp học nhóm và hoàn tất quy trình ghép giáo viên 1-1."""
    from class_lifecycle_api import seed_class_lifecycle

    print("\n=== Giai đoạn 4b/5: Lớp học và quy trình 1-1 ===")
    seed_class_lifecycle()
    print("✅ Đã tạo lớp nhóm và xử lý matching 1-1")


def run_learning_progress() -> None:
    """Hoàn thành 100% curriculum cho tất cả enrollment qua Backend API."""
    from learning_progress_api import seed_learning_progress

    print("\n=== Giai đoạn 4c/5: Hoàn thành bài học ===")
    seed_learning_progress()
    print("✅ Đã hoàn thành curriculum cho tất cả enrollment")


def run_reviews() -> None:
    """Sinh đánh giá khóa học và giáo viên sau khi enrollment đạt 100%."""
    from review_api import seed_reviews

    print("\n=== Giai đoạn 5/5: Đánh giá khóa học và giáo viên ===")
    seed_reviews()
    print("✅ Đã sinh đánh giá cho các enrollment hoàn thành")


def run_validate() -> None:
    """Chạy kiểm toán dữ liệu và xuất báo cáo chất lượng pipeline."""
    from lifecycle_validation import run_validation

    print("\n=== Validation: Kiểm toán chất lượng dữ liệu ===")
    result = run_validation()
    if result.get("failed", 0) > 0:
        print(f"⚠️  {result['failed']} kiểm tra FAIL. Xem chi tiết ở trên.")
    else:
        print("✅ Toàn bộ kiểm tra PASS")


def run_learner_lifecycle() -> None:
    """Chạy toàn bộ pipeline learner-lifecycle: commerce → class → learning → reviews → validate."""
    run_commerce()
    run_class_lifecycle()
    run_learning_progress()
    run_reviews()
    run_validate()


def main() -> None:
    """Điều phối pipeline cuối cùng hoặc một giai đoạn được chọn từ CLI."""
    args = parse_args()
    if args.phase in {"all", "static"}:
        run_static(apply_changes=not args.dry_run)
    if args.phase in {"all", "identity"}:
        run_identity()
    if args.phase in {"all", "course-content"}:
        run_course_content()
    if args.phase in {"all", "learner-lifecycle"}:
        run_learner_lifecycle()
    if args.phase == "commerce":
        run_commerce()
    if args.phase == "class-lifecycle":
        run_class_lifecycle()
    if args.phase == "learning-progress":
        run_learning_progress()
    if args.phase == "reviews":
        run_reviews()
    if args.phase == "validate":
        run_validate()
    print("\n✅ Pipeline gen_data hoàn tất")


if __name__ == "__main__":
    main()
