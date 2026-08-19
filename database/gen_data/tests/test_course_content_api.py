"""Kiểm thử nguồn PDF và catalog trước khi cho phép gọi API sinh khóa học."""

from pathlib import Path
import sys
import unittest
from unittest.mock import patch

GEN_DATA_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(GEN_DATA_DIR))

from course_content_api import (
    ASSET_DIR,
    AilmsApi,
    locked_course_needs_repair,
    ensure_section,
    parse_question_pdf,
    probe_media_duration_seconds,
)
from course_content_catalog import COURSES


class CourseContentApiTest(unittest.TestCase):
    """Kiểm thử generator mà không khởi động Backend hoặc thay đổi dữ liệu."""

    def test_question_pdf_produces_real_quiz_contract(self) -> None:
        """PDF phải sinh đúng năm câu, bốn lựa chọn và tổng điểm 100."""
        questions, essays = parse_question_pdf(ASSET_DIR / "kiemtra.pdf")

        self.assertEqual(5, len(questions))
        self.assertEqual(5, len(essays))
        self.assertEqual(100, sum(question["points"] for question in questions))
        self.assertTrue(all(question["questionType"] == "SINGLE_CHOICE" for question in questions))
        self.assertTrue(all(len(question["options"]) == 4 for question in questions))
        self.assertTrue(all(sum(option["isCorrect"] for option in question["options"]) == 1 for question in questions))
        self.assertTrue(all("Trả lời:" not in essay for essay in essays))
        self.assertTrue(all("JVBBài kiểm tra" not in option["content"]
                            for question in questions for option in question["options"]))
        self.assertTrue(all("JVBBài kiểm tra" not in essay for essay in essays))

    def test_catalog_covers_report_workflow_states(self) -> None:
        """Catalog phải có ba khóa active và đủ trạng thái nháp/chờ duyệt/từ chối."""
        statuses = [course["target_status"] for course in COURSES]

        self.assertEqual(3, statuses.count("ACTIVE"))
        self.assertEqual(1, statuses.count("DRAFT"))
        self.assertEqual(1, statuses.count("PENDING"))
        self.assertEqual(1, statuses.count("REJECTED"))
        self.assertEqual(len(COURSES), len({course["slug"] for course in COURSES}))

    def test_upload_sends_mime_type_in_multipart_contract(self) -> None:
        """Upload thumbnail phải gửi Content-Type để Backend chuyển tiếp hợp lệ sang MinIO."""
        api = AilmsApi("http://localhost:8080/api")
        captured = {}

        def fake_request(method, path, **kwargs):
            captured.update({"method": method, "path": path, **kwargs})
            return {"id": "1", "fileKey": "course_thumbnails/test.jpg"}

        api.request = fake_request
        api.upload(ASSET_DIR / "c1.jpg", "IMAGE", "COURSE_THUMBNAIL", "1", "Course")

        filename, _, content_type = captured["files"]["file"]
        self.assertEqual("c1.jpg", filename)
        self.assertEqual("image/jpeg", content_type)

    def test_authoring_section_payload_contains_course_id(self) -> None:
        """Payload section phải tương thích cả path authoring và CreateSectionRequest hiện tại."""
        api = AilmsApi("http://localhost:8080/api")
        captured = {}

        def fake_request(method, path, **kwargs):
            captured.update({"method": method, "path": path, **kwargs})
            return {"id": "10", "name": kwargs["json"]["name"], "lessons": []}

        api.request = fake_request
        ensure_section(api, "123", {"sections": []}, "1. Tổng quan")

        self.assertEqual("123", captured["json"]["courseId"])
        self.assertEqual("1. Tổng quan", captured["json"]["name"])

    def test_active_course_missing_assessment_requires_repair(self) -> None:
        """Course ACTIVE thiếu linked assessment phải được sửa thay vì làm pipeline crash."""
        questions, essays = parse_question_pdf(ASSET_DIR / "kiemtra.pdf")
        api = AilmsApi("http://localhost:8080/api")
        api.request = lambda *_args, **_kwargs: {
            "sections": [
                {"lessons": [
                    {"contentType": "VIDEO", "contentUrl": "lesson_videos/one.mp4"},
                    {"contentType": "VIDEO", "contentUrl": "lesson_videos/two.mp4"},
                    {"contentType": "QUIZ", "linkedQuiz": None},
                    {"contentType": "ASSIGNMENT", "linkedAssignment": None},
                    {"contentType": "TEXT"},
                    {"contentType": "PDF"},
                ]},
                {"lessons": []},
                {"lessons": []},
            ],
        }

        self.assertTrue(locked_course_needs_repair(api, "123", questions, essays, "ACTIVE"))

    def test_video_duration_is_rounded_to_actual_second(self) -> None:
        """Metadata 20,01 giây phải lưu là 20 giây thay vì số phút ước lượng."""
        with patch("course_content_api.subprocess.run") as run:
            run.return_value.stdout = "20.010000\n"

            self.assertEqual(20, probe_media_duration_seconds(Path("mau1.mp4")))


if __name__ == "__main__":
    unittest.main()
