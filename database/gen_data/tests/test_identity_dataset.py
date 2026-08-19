"""Kiểm thử catalog định danh không cần kết nối MySQL hoặc MinIO."""

import unittest
from datetime import date

from identity_dataset import PEOPLE, ROLE_LAYOUT, employee_profile, student_profile


class IdentityDatasetTest(unittest.TestCase):
    """Bảo vệ số lượng, tính duy nhất và tính nhất quán của dataset."""

    def test_role_distribution_and_identity_are_exact(self):
        """Dataset có đúng 100 định danh duy nhất theo phân bố role đã chốt."""
        expected = {role: count for role, _, count in ROLE_LAYOUT}
        actual = {role: sum(person["role"] == role for person in PEOPLE) for role in expected}
        self.assertEqual(expected, actual)
        self.assertEqual(100, len({person["username"] for person in PEOPLE}))
        self.assertEqual(100, len({person["email"] for person in PEOPLE}))
        self.assertEqual(100, len({person["phone"] for person in PEOPLE}))
        self.assertEqual(100, len({person["full_name"] for person in PEOPLE}))

    def test_profile_codes_follow_backend_format(self):
        """Mã EP/ST là duy nhất và theo đúng PREFIX-yyMM-XXXXXX."""
        employees = [employee_profile(person) for person in PEOPLE if person["role"] != "STUDENT"]
        students = [student_profile(person) for person in PEOPLE if person["role"] == "STUDENT"]
        employee_codes = {profile["employee_code"] for profile in employees}
        student_codes = {profile["student_code"] for profile in students}
        self.assertEqual(50, len(employee_codes))
        self.assertEqual(50, len(student_codes))
        self.assertTrue(all(code.startswith("EP-2608-") and len(code) == 14 for code in employee_codes))
        self.assertTrue(all(code.startswith("ST-2608-") and len(code) == 14 for code in student_codes))

    def test_employee_department_codes_are_valid_master_keys(self):
        """Mỗi nhân viên phải mang một department code dạng chuỗi có trong master data."""
        valid_codes = {"IT", "HR", "SUPPORT", "ACADEMIC", "CONTENT", "QUALITY", "OPERATIONS"}
        profiles = [employee_profile(person) for person in PEOPLE if person["role"] != "STUDENT"]

        self.assertTrue(all(isinstance(profile["department_code"], str) for profile in profiles))
        self.assertTrue(all(profile["department_code"] in valid_codes for profile in profiles))

    def test_minor_flag_matches_date_of_birth(self):
        """Có đúng 12 minor và cờ is_minor khớp tuổi tại ngày chốt dataset."""
        students = [person for person in PEOPLE if person["role"] == "STUDENT"]
        minors = 0
        for person in students:
            birth_date = person["date_of_birth"].date()
            is_minor = date(birth_date.year + 18, birth_date.month, birth_date.day) > date(2026, 8, 15)
            self.assertEqual(is_minor, student_profile(person)["is_minor"])
            minors += int(is_minor)
        self.assertEqual(12, minors)


if __name__ == "__main__":
    unittest.main()
