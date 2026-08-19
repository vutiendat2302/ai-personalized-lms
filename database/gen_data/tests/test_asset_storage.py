"""Kiểm thử đồng bộ và rollback MinIO bằng client bộ nhớ."""

import tempfile
import unittest
import hashlib
from pathlib import Path
from types import SimpleNamespace

from asset_storage import MinioSeedStorage


class MissingObjectError(Exception):
    """Lỗi giả lập cùng mã NoSuchKey của MinIO SDK."""

    code = "NoSuchKey"


class FakeMinioClient:
    """Client tối thiểu mô phỏng bucket và object MinIO cho unit test."""

    def __init__(self):
        """Khởi tạo kho object rỗng."""
        self.buckets = set()
        self.objects = {}

    def bucket_exists(self, bucket_name):
        """Kiểm tra bucket trong bộ nhớ."""
        return bucket_name in self.buckets

    def make_bucket(self, bucket_name):
        """Tạo bucket trong bộ nhớ."""
        self.buckets.add(bucket_name)

    def stat_object(self, bucket_name, file_key):
        """Trả kích thước object hoặc ném NoSuchKey."""
        try:
            content = self.objects[(bucket_name, file_key)]
        except KeyError as exc:
            raise MissingObjectError() from exc
        etag = hashlib.md5(content, usedforsecurity=False).hexdigest()
        return SimpleNamespace(size=len(content), etag=etag)

    def fput_object(self, bucket_name, file_key, source, content_type=None):
        """Lưu bytes của file nguồn vào bộ nhớ."""
        self.objects[(bucket_name, file_key)] = Path(source).read_bytes()

    def remove_object(self, bucket_name, file_key):
        """Xóa object trong bộ nhớ."""
        self.objects.pop((bucket_name, file_key), None)


class MinioSeedStorageTest(unittest.TestCase):
    """Bảo vệ hành vi idempotent và bù trừ object của storage helper."""

    def test_upload_is_idempotent_and_cleanup_only_removes_new_object(self):
        """Upload lần hai tái sử dụng object và rollback xóa object mới."""
        client = FakeMinioClient()
        storage = MinioSeedStorage(client=client, bucket_name="test-bucket")
        with tempfile.TemporaryDirectory() as directory:
            source = Path(directory) / "avatar.jpeg"
            source.write_bytes(b"real-image-content")
            self.assertTrue(storage.upload_if_absent(source, "avatars/a.jpeg", "image/jpeg"))
            self.assertFalse(storage.upload_if_absent(source, "avatars/a.jpeg", "image/jpeg"))
            storage.verify("avatars/a.jpeg", source.stat().st_size)
            storage.cleanup_new_objects()
        self.assertNotIn(("test-bucket", "avatars/a.jpeg"), client.objects)

    def test_existing_object_with_wrong_size_is_rejected(self):
        """Không ghi đè im lặng khi object cùng key có nội dung khác."""
        client = FakeMinioClient()
        client.buckets.add("test-bucket")
        client.objects[("test-bucket", "contracts/a.pdf")] = b"old"
        storage = MinioSeedStorage(client=client, bucket_name="test-bucket")
        with tempfile.TemporaryDirectory() as directory:
            source = Path(directory) / "contract.pdf"
            source.write_bytes(b"new-contract-content")
            with self.assertRaises(ValueError):
                storage.upload_if_absent(source, "contracts/a.pdf", "application/pdf")

    def test_existing_object_with_same_size_and_wrong_checksum_is_rejected(self):
        """Phát hiện object khác nội dung ngay cả khi kích thước trùng nhau."""
        client = FakeMinioClient()
        client.buckets.add("test-bucket")
        client.objects[("test-bucket", "avatars/a.jpeg")] = b"old-content"
        storage = MinioSeedStorage(client=client, bucket_name="test-bucket")
        with tempfile.TemporaryDirectory() as directory:
            source = Path(directory) / "avatar.jpeg"
            source.write_bytes(b"new-content")
            with self.assertRaises(ValueError):
                storage.upload_if_absent(source, "avatars/a.jpeg", "image/jpeg")


if __name__ == "__main__":
    unittest.main()
