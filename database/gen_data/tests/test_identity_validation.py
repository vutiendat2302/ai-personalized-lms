"""Kiểm thử chuẩn hóa kiểu dữ liệu MySQL trong validation identity."""

import unittest

from identity_validation import mysql_boolean


class IdentityValidationTest(unittest.TestCase):
    """Bảo vệ validator trước kiểu BIT/BOOLEAN khác nhau của MySQL driver."""

    def test_mysql_bit_bytes_are_converted_by_numeric_value(self) -> None:
        """BIT(1) bằng zero phải là False dù bytes là một object không rỗng."""
        self.assertFalse(mysql_boolean(b"\x00"))
        self.assertTrue(mysql_boolean(b"\x01"))
        self.assertFalse(mysql_boolean(memoryview(b"\x00")))

    def test_numeric_and_text_boolean_values_are_supported(self) -> None:
        """TINYINT và chuỗi boolean thông dụng phải cho cùng kết quả."""
        self.assertFalse(mysql_boolean(0))
        self.assertTrue(mysql_boolean(1))
        self.assertFalse(mysql_boolean("false"))
        self.assertTrue(mysql_boolean("true"))


if __name__ == "__main__":
    unittest.main()
