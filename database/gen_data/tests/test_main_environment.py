"""Kiểm thử chuẩn hóa cấu hình host của entrypoint gen data."""

import unittest

from main import resolve_host_minio_endpoint


class MainEnvironmentTest(unittest.TestCase):
    """Bảo vệ generator khỏi sử dụng hostname chỉ tồn tại trong Docker network."""

    def test_internal_docker_minio_hostname_maps_to_published_host_port(self) -> None:
        """Endpoint `minio` trong `.env` phải thành localhost khi chạy Python trên host."""
        self.assertEqual("http://127.0.0.1:9000", resolve_host_minio_endpoint("http://minio:9000"))
        self.assertEqual("http://127.0.0.1:9000", resolve_host_minio_endpoint("ailms-minio-docker:9000"))

    def test_explicit_external_minio_endpoint_is_preserved(self) -> None:
        """Endpoint localhost hoặc máy MinIO bên ngoài không được tự ý thay đổi."""
        self.assertEqual(
            "http://192.168.1.20:9000",
            resolve_host_minio_endpoint("http://192.168.1.20:9000"),
        )


if __name__ == "__main__":
    unittest.main()
