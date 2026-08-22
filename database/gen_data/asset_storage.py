"""Đồng bộ asset seed thật với MinIO theo cùng cấu hình và quy ước của backend."""

from __future__ import annotations

import os
import hashlib
from pathlib import Path
from urllib.parse import urlparse


_storage = None


class MinioSeedStorage:
    """Client MinIO nhỏ gọn có kiểm tra object và bù trừ khi DB rollback."""

    def __init__(self, client=None, bucket_name: str | None = None):
        """Khởi tạo client từ ENV hoặc nhận client giả lập khi kiểm thử."""
        self.bucket_name = bucket_name or os.getenv("MINIO_BUCKET_NAME", "ailms-minio")
        self._uploaded_keys = []
        self.client = client or self._build_client()
        self._ensure_bucket()

    def _build_client(self):
        """Tạo MinIO SDK client và không hard-code credential môi trường."""
        try:
            from minio import Minio
        except ImportError as exc:
            raise RuntimeError(
                "Thiếu thư viện minio. Hãy cài database/gen_data/requirements.txt trước khi seed asset."
            ) from exc

        endpoint = os.getenv("MINIO_ENDPOINT", "http://localhost:9000")
        parsed = urlparse(endpoint if "://" in endpoint else f"http://{endpoint}")
        return Minio(
            parsed.netloc or parsed.path,
            access_key=os.getenv("MINIO_ACCESS_KEY", "minioadmin"),
            secret_key=os.getenv("MINIO_SECRET_KEY", "minioadmin123"),
            secure=parsed.scheme == "https",
            region="us-east-1",
        )

    def _ensure_bucket(self) -> None:
        """Tạo bucket khi chưa tồn tại giống MinioConfig của backend."""
        if not self.client.bucket_exists(self.bucket_name):
            self.client.make_bucket(self.bucket_name)

    def upload_if_absent(self, source: Path, file_key: str, content_type: str) -> bool:
        """Upload file thật nếu thiếu và từ chối object cùng key nhưng sai kích thước."""
        if not source.is_file() or source.stat().st_size <= 0:
            raise ValueError(f"Asset nguồn không hợp lệ: {source}")

        try:
            stat = self.client.stat_object(self.bucket_name, file_key)
            if stat.size != source.stat().st_size:
                raise ValueError(
                    f"Object MinIO {file_key} có size={stat.size}, khác asset nguồn={source.stat().st_size}"
                )
            etag = str(getattr(stat, "etag", "") or "").strip('"').lower()
            if etag and "-" not in etag and etag != self._md5(source):
                raise ValueError(f"Object MinIO {file_key} có checksum khác asset nguồn")
            return False
        except Exception as exc:
            if not self._is_missing_object(exc):
                raise

        self.client.fput_object(
            self.bucket_name,
            file_key,
            str(source),
            content_type=content_type,
        )
        self._uploaded_keys.append(file_key)
        return True

    def verify(self, file_key: str, expected_size: int) -> None:
        """Xác nhận object tồn tại và đúng kích thước sau upload."""
        stat = self.client.stat_object(self.bucket_name, file_key)
        if stat.size != expected_size:
            raise ValueError(f"Object MinIO {file_key} không đúng kích thước mong đợi")

    @staticmethod
    def _md5(source: Path) -> str:
        """Tính ETag MD5 cho asset nhỏ nhằm phát hiện object cùng key nhưng khác nội dung."""
        digest = hashlib.md5(usedforsecurity=False)
        with source.open("rb") as stream:
            for chunk in iter(lambda: stream.read(1024 * 1024), b""):
                digest.update(chunk)
        return digest.hexdigest()

    def cleanup_new_objects(self) -> None:
        """Xóa các object chỉ vừa được tạo trong transaction seed bị rollback."""
        for file_key in reversed(self._uploaded_keys):
            self.client.remove_object(self.bucket_name, file_key)
        self._uploaded_keys.clear()

    def clear_uploaded_registry(self) -> None:
        """Đánh dấu các object mới đã được DB commit thành công và không còn cần bù trừ."""
        self._uploaded_keys.clear()

    @staticmethod
    def _is_missing_object(exc: Exception) -> bool:
        """Nhận diện lỗi object không tồn tại từ MinIO SDK hoặc client test."""
        code = getattr(exc, "code", None)
        return code in {"NoSuchKey", "NoSuchObject", "NotFound"} or isinstance(exc, FileNotFoundError)


def get_storage() -> MinioSeedStorage:
    """Trả singleton storage để toàn bộ lượt seed dùng chung registry rollback."""
    global _storage
    if _storage is None:
        _storage = MinioSeedStorage()
    return _storage


def cleanup_new_objects() -> None:
    """Bù trừ object MinIO mới nếu transaction MySQL thất bại."""
    if _storage is not None:
        _storage.cleanup_new_objects()


def clear_uploaded_registry() -> None:
    """Xóa registry tạm sau khi transaction MySQL đã commit."""
    if _storage is not None:
        _storage.clear_uploaded_registry()
