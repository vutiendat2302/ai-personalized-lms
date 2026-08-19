"""Sinh khóa học qua REST API Backend để đi đúng workflow và MinIO nghiệp vụ."""

from __future__ import annotations

import json
import mimetypes
import os
import re
import subprocess
import math
from pathlib import Path
from typing import Any

import requests
try:
    from pypdf import PdfReader
except ImportError:
    PdfReader = None

from course_catalog_50 import COURSES_50 as COURSES, REJECTION_REASON


BASE_DIR = Path(__file__).resolve().parent
ASSET_DIR = BASE_DIR / "file" / "course"


def compact_text(value: str) -> str:
    """Chuẩn hóa khoảng trắng trích xuất từ PDF nhưng giữ nguyên nội dung tiếng Việt."""
    return re.sub(r"\s+", " ", value).strip()


def clean_question_source_text(value: str) -> str:
    """Loại header, footer và số trang do trình đọc PDF chèn vào giữa nội dung."""
    cleaned_lines = []
    for line in value.splitlines():
        normalized = compact_text(line)
        if not normalized or re.fullmatch(r"\d+", normalized):
            continue
        if normalized.casefold() == "jvbbài kiểm tra tìm hiểu công ty".casefold():
            continue
        cleaned_lines.append(line)
    return "\n".join(cleaned_lines)


def polish_extracted_text(value: str) -> str:
    """Sửa các điểm dính chữ đặc trưng của PDF nguồn mà không thay đổi ý câu hỏi."""
    result = compact_text(value)
    result = re.sub(r"([,.;:!?])(?=\S)", r"\1 ", result)
    result = re.sub(r"\s+([”’»])", r"\1", result)
    replacements = {
        "JVBlà": "JVB là",
        "yếu tốmà": "yếu tố mà",
        "vớithị": "với thị",
        "nhữngkỹ": "những kỹ",
        "thái độnào": "thái độ nào",
        "mộtdự án": "một dự án",
        "nhất3": "nhất 3",
    }
    for source, target in replacements.items():
        result = result.replace(source, target)
    return result


def extract_pdf_text(path: Path) -> str:
    """Đọc toàn bộ nội dung chữ của PDF nguồn bằng thư viện cục bộ."""
    if PdfReader is not None:
        reader = PdfReader(str(path))
        return "\n".join(page.extract_text() or "" for page in reader.pages)
    try:
        result = subprocess.run(
            ["pdftotext", "-layout", str(path), "-"], check=True, capture_output=True, text=True,
        )
        return result.stdout
    except (FileNotFoundError, subprocess.CalledProcessError) as error:
        raise RuntimeError("Cần cài pypdf hoặc pdftotext để đọc file nguồn") from error


def probe_media_duration_seconds(path: Path) -> int:
    """Đọc thời lượng media thật bằng ffprobe và làm tròn tới giây gần nhất."""
    try:
        result = subprocess.run(
            [
                "ffprobe", "-v", "error", "-show_entries", "format=duration",
                "-of", "default=noprint_wrappers=1:nokey=1", str(path),
            ],
            check=True,
            capture_output=True,
            text=True,
        )
        duration = float(result.stdout.strip())
    except (FileNotFoundError, subprocess.CalledProcessError, ValueError) as error:
        raise RuntimeError(f"Không đọc được thời lượng video {path.name}; cần cài ffprobe") from error
    if not math.isfinite(duration) or duration <= 0:
        raise RuntimeError(f"Video {path.name} có thời lượng không hợp lệ")
    return max(1, round(duration))


def parse_question_pdf(path: Path) -> tuple[list[dict[str, Any]], list[str]]:
    """Chuyển file câu hỏi thành năm câu trắc nghiệm và năm đề tự luận có kiểm chứng."""
    text = clean_question_source_text(extract_pdf_text(path))
    if "PHẦN I" not in text or "PHẦN II" not in text:
        raise ValueError("kiemtra.pdf không đúng cấu trúc PHẦN I/PHẦN II")
    multiple_part, essay_part = text.split("PHẦN II", 1)
    answer_key_part = essay_part.split("ĐÁP ÁN", 1)[1] if "ĐÁP ÁN" in essay_part else ""
    answer_keys = {
        int(number): answer
        for number, answer in re.findall(r"(?m)^\s*([1-5])\s+([A-D])\s*$", answer_key_part)
    }
    essay_part = essay_part.split("ĐÁP ÁN", 1)[0]
    question_blocks = re.findall(r"Câu\s+\d+\.\s*(.*?)(?=Câu\s+\d+\.|$)", multiple_part, re.DOTALL)
    questions: list[dict[str, Any]] = []
    for index, block in enumerate(question_blocks):
        option_matches = list(re.finditer(r"(?:^|\n)\s*([A-D])\.\s*", block))
        if len(option_matches) != 4:
            continue
        content = polish_extracted_text(block[: option_matches[0].start()])
        options = []
        for option_index, match in enumerate(option_matches):
            end = option_matches[option_index + 1].start() if option_index + 1 < len(option_matches) else len(block)
            options.append({
                "content": polish_extracted_text(block[match.end():end]),
                "isCorrect": match.group(1) == answer_keys.get(index + 1),
            })
        questions.append({
            "content": content,
            "questionType": "SINGLE_CHOICE",
            "points": 20,
            "explanation": "Đáp án được xác định từ nội dung bài đọc tìm hiểu Công ty JVB.",
            "options": options,
        })
    essays = [polish_extracted_text(item).split("Trả lời:", 1)[0].strip() for item in re.findall(
        r"Câu\s+\d+\.\s*(.*?)(?=Câu\s+\d+\.|$)", essay_part, re.DOTALL,
    )]
    if len(answer_keys) != 5 or len(questions) != 5 or len(essays) != 5:
        raise ValueError(f"Cần đúng 5 câu trắc nghiệm và 5 câu tự luận, nhận được {len(questions)}/{len(essays)}")
    return questions, essays


class AilmsApi:
    """Client nhỏ dùng riêng cho seed, luôn kiểm tra envelope ApiResponse của Backend."""

    def __init__(self, base_url: str) -> None:
        """Khởi tạo session HTTP với URL Backend đã chuẩn hóa."""
        self.base_url = base_url.rstrip("/")
        self.session = requests.Session()
        self.session.headers.update({"Accept": "application/json"})

    def login(self, username: str, password: str) -> dict[str, Any]:
        """Đăng nhập và đặt access token trong bộ nhớ của tiến trình seed."""
        data = self.request("POST", "/auth/login", json={"usernameOrEmail": username, "password": password})
        self.session.headers["Authorization"] = f"Bearer {data['accessToken']}"
        return data

    def request(self, method: str, path: str, **kwargs: Any) -> Any:
        """Gọi API với retry tự động (tối đa 3 lần) khi bị ConnectionError/RemoteDisconnected."""
        import time as _time
        last_err: Exception | None = None
        for attempt in range(3):
            try:
                response = self.session.request(method, self.base_url + path, timeout=90, **kwargs)
                break
            except Exception as conn_err:
                last_err = conn_err
                if attempt < 2:
                    _time.sleep(2 + attempt * 2)
                    # Tạo lại session mới để tránh connection stale
                    old_headers = dict(self.session.headers)
                    self.session.close()
                    import requests as _req
                    self.session = _req.Session()
                    self.session.headers.update(old_headers)
                    continue
                raise RuntimeError(f"{method} {path} ConnectionError sau 3 lần thử: {conn_err}") from conn_err
        try:
            payload = response.json()
        except ValueError as error:
            raise RuntimeError(f"{method} {path} trả dữ liệu không phải JSON ({response.status_code})") from error
        if not response.ok or payload.get("success") is False:
            message = payload.get("message") or payload.get("error") or response.text
            details = payload.get("details")
            if details:
                message = f"{message}: {'; '.join(str(item) for item in details)}"
            raise RuntimeError(f"{method} {path} thất bại ({response.status_code}): {message}")
        return payload.get("data")

    def upload(self, path: Path, file_type: str, usage_type: str, reference_id: str, reference_type: str) -> dict[str, Any]:
        """Upload asset bằng endpoint Backend và gắn chủ sở hữu ngay khi tạo metadata."""
        content_type = mimetypes.guess_type(path.name)[0] or "application/octet-stream"
        with path.open("rb") as stream:
            return self.request(
                "POST", "/v1/files/upload",
                files={"file": (path.name, stream, content_type)},
                data={
                    "fileType": file_type,
                    "usageType": usage_type,
                    "referenceEntityId": reference_id,
                    "referenceEntityType": reference_type,
                    "originalName": path.name,
                },
            )

    def assert_downloadable(self, file_key: str, expected_type: str) -> None:
        """Đọc một phần file qua Backend để chắc chắn object MinIO tồn tại và đúng MIME chính."""
        with self.session.get(
            self.base_url + "/v1/files/download",
            params={"fileKey": file_key},
            stream=True,
            timeout=30,
        ) as response:
            if not response.ok:
                raise RuntimeError(f"Không tải được asset {file_key} ({response.status_code})")
            content_type = response.headers.get("Content-Type", "").lower()
            if expected_type and not content_type.startswith(expected_type.lower()):
                raise RuntimeError(
                    f"Asset {file_key} có MIME {content_type or 'không xác định'}, cần {expected_type}"
                )
            if not next(response.iter_content(chunk_size=1), b""):
                raise RuntimeError(f"Asset {file_key} không có dữ liệu")


def text_blocks(title: str, paragraphs: list[str]) -> str:
    """Tạo block nội dung tương thích trình soạn thảo và màn học viên hiện tại."""
    blocks = [{"id": "heading-1", "type": "heading", "content": title, "level": 2}]
    blocks.extend({"id": f"paragraph-{index}", "type": "paragraph", "content": value}
                  for index, value in enumerate(paragraphs, start=1))
    return json.dumps(blocks, ensure_ascii=False)


def find_existing_course(api: AilmsApi, teacher_id: str, spec: dict[str, Any]) -> dict[str, Any] | None:
    """Tìm khóa học seed theo slug ổn định để chạy lại không sinh bản sao."""
    page = api.request("GET", "/v1/courses/search", params={
        "name": spec["name"], "createdBy": teacher_id, "page": 0, "size": 100,
    })
    return next((course for course in page.get("content", []) if course.get("link") == spec["slug"]), None)


def ensure_course(api: AilmsApi, teacher_id: str, category_id: str, spec: dict[str, Any]) -> dict[str, Any]:
    """Tạo course DRAFT bằng API Teacher hoặc trả course đã có theo natural key."""
    existing = find_existing_course(api, teacher_id, spec)
    if existing:
        return existing
    return api.request("POST", "/v1/courses/teacher", params={"teacherUserId": teacher_id}, json={
        "categoryId": category_id,
        "name": spec["name"],
        "link": spec["slug"],
        "description": spec["description"],
        "learningObjectives": spec["objectives"],
        "prerequisites": spec["prerequisites"],
        "suggestedPrice": 490000,
        "level": "BEGINNER",
        "certificateConditionType": "FINAL_EXAM_PASS",
        "certificatePassThreshold": 70,
    })


def ensure_thumbnail(api: AilmsApi, course: dict[str, Any], spec: dict[str, Any]) -> None:
    """Upload thumbnail một lần rồi lưu URL download bền vững trên course."""
    if course.get("thumbnailUrl"):
        return
    metadata = api.upload(ASSET_DIR / spec["image"], "IMAGE", "COURSE_THUMBNAIL", str(course["id"]), "Course")
    thumbnail_url = f"/api/v1/files/download?fileKey={requests.utils.quote(metadata['fileKey'], safe='')}"
    api.request("PUT", f"/v1/courses/{course['id']}", json={
        "name": spec["name"],
        "link": spec["slug"],
        "description": spec["description"],
        "thumbnailUrl": thumbnail_url,
        "learningObjectives": spec["objectives"],
        "prerequisites": spec["prerequisites"],
        "suggestedPrice": 490000,
        "level": "BEGINNER",
        "certificateConditionType": "FINAL_EXAM_PASS",
        "certificatePassThreshold": 70,
    })
    course["thumbnailUrl"] = thumbnail_url


def ensure_section(api: AilmsApi, course_id: str, curriculum: dict[str, Any], name: str) -> dict[str, Any]:
    """Tạo chương còn thiếu theo tên ổn định."""
    existing = next((section for section in curriculum.get("sections", []) if section.get("name") == name), None)
    if existing:
        return existing
    section = api.request(
        "POST",
        f"/v1/authoring/courses/{course_id}/sections",
        json={"name": name, "courseId": course_id},
    )
    curriculum.setdefault("sections", []).append({**section, "lessons": []})
    return curriculum["sections"][-1]


def ensure_lesson(api: AilmsApi, section: dict[str, Any], payload: dict[str, Any]) -> tuple[dict[str, Any], bool]:
    """Tạo lesson còn thiếu và trả cờ cho biết lesson vừa được tạo."""
    existing = next((lesson for lesson in section.get("lessons", []) if lesson.get("name") == payload["name"]), None)
    if existing:
        changes = {key: value for key, value in payload.items() if existing.get(key) != value}
        if changes:
            existing = api.request("PUT", f"/v1/authoring/lessons/{existing['id']}", json=changes)
        return existing, False
    lesson = api.request("POST", f"/v1/authoring/sections/{section['id']}/lessons", json=payload)
    section.setdefault("lessons", []).append(lesson)
    return lesson, True


def attach_main_file(api: AilmsApi, lesson: dict[str, Any], asset_name: str, file_type: str, usage_type: str) -> None:
    """Upload và gắn contentUrl cho lesson mới, không thao tác trực tiếp MinIO."""
    if lesson.get("contentUrl"):
        return
    metadata = api.upload(ASSET_DIR / asset_name, file_type, usage_type, str(lesson["id"]), "Lesson")
    api.request("PUT", f"/v1/authoring/lessons/{lesson['id']}", json={"contentUrl": metadata["fileKey"]})
    lesson["contentUrl"] = metadata["fileKey"]


def ensure_resource(api: AilmsApi, lesson: dict[str, Any]) -> None:
    """Gắn baidoc.pdf thành LessonResource thật và tránh tạo lại theo tên."""
    if any(resource.get("name") == "Bài đọc tìm hiểu Công ty JVB" for resource in lesson.get("resources", [])):
        return
    metadata = api.upload(ASSET_DIR / "baidoc.pdf", "DOCUMENT", "LESSON_RESOURCE", str(lesson["id"]), "Lesson")
    resource = api.request("POST", f"/v1/lesson-resources/lessons/{lesson['id']}/resources", json={
        "lessonId": lesson["id"], "fileMetadataId": metadata["id"], "name": "Bài đọc tìm hiểu Công ty JVB",
    })
    lesson.setdefault("resources", []).append(resource)


def quiz_matches_source(quiz: dict[str, Any] | None, questions: list[dict[str, Any]]) -> bool:
    """So sánh quiz hiện có với PDF nguồn theo câu hỏi, phương án và đáp án đúng."""
    if not quiz or len(quiz.get("questions") or []) != len(questions):
        return False
    for actual, expected in zip(quiz["questions"], questions):
        if actual.get("content") != expected["content"] or actual.get("questionType") != expected["questionType"]:
            return False
        actual_options = actual.get("options") or []
        if len(actual_options) != len(expected["options"]):
            return False
        for actual_option, expected_option in zip(actual_options, expected["options"]):
            if (actual_option.get("content") != expected_option["content"]
                    or actual_option.get("isCorrect") != expected_option["isCorrect"]):
                return False
    return True


def build_assignment_description(essays: list[str]) -> str:
    """Tạo payload hướng dẫn bài tập block-editor thống nhất cho create, update và validation."""
    return json.dumps({
        "instructions": "\n".join(f"{index}. {value}" for index, value in enumerate(essays, 1)),
        "submissionMode": "BLOCK_EDITOR",
    }, ensure_ascii=False)


def locked_course_needs_repair(
        api: AilmsApi,
        course_id: str,
        questions: list[dict[str, Any]],
        essays: list[str],
        expected_assessment_status: str,
) -> bool:
    """Phát hiện course đang khóa sửa nhưng thiếu hoặc sai nội dung seed chuẩn."""
    curriculum = api.request("GET", f"/v1/authoring/courses/{course_id}/curriculum")
    lessons = [lesson for section in curriculum.get("sections", []) for lesson in section.get("lessons", [])]
    quiz_lesson = next((lesson for lesson in lessons if lesson.get("contentType") == "QUIZ"), None)
    assignment_lesson = next((lesson for lesson in lessons if lesson.get("contentType") == "ASSIGNMENT"), None)
    videos = [lesson for lesson in lessons if lesson.get("contentType") == "VIDEO"]
    return (
        len(curriculum.get("sections", [])) != 3
        or len(lessons) != 6
        or len(videos) != 2
        or any(not lesson.get("contentUrl") for lesson in videos)
        or any(not lesson.get("durationSec") for lesson in videos)
        or not quiz_lesson
        or (quiz_lesson.get("linkedQuiz") or {}).get("status") != expected_assessment_status
        or not quiz_matches_source(quiz_lesson.get("linkedQuiz"), questions)
        or not assignment_lesson
        or (assignment_lesson.get("linkedAssignment") or {}).get("status") != expected_assessment_status
        or (assignment_lesson.get("linkedAssignment") or {}).get("description") != build_assignment_description(essays)
    )


def ensure_package(api: AilmsApi, course_id: str, course_name: str, category_id: str = "1") -> None:
    """Bảo đảm course có các gói SELF_STUDY, GROUP_CLASS, ONE_ON_ONE ACTIVE trước khi Admin duyệt."""
    from datetime import datetime, timedelta
    packages = api.request("GET", f"/v1/course-packages/course/{course_id}")
    existing_modes = {p.get("deliveryMode") for p in packages if p.get("status") == "ACTIVE"}

    if "SELF_STUDY" not in existing_modes:
        try:
            api.request("POST", "/v1/course-packages", json={
                "courseId": int(course_id),
                "name": f"Gói tự học - {course_name}"[:100],
                "description": "Truy cập toàn bộ video, bài đọc, quiz và bài tập trong 180 ngày.",
                "price": 490000,
                "originalPrice": 690000,
                "deliveryMode": "SELF_STUDY",
                "durationDays": 180,
                "includedTutorSessions": 0,
            })
        except Exception:
            pass

    if "ONE_ON_ONE" not in existing_modes:
        try:
            api.request("POST", "/v1/course-packages", json={
                "courseId": int(course_id),
                "name": f"Gói kèm 1-1 - {course_name}"[:100],
                "description": "Kèm 1-1 chuyên sâu cùng giảng viên hướng dẫn.",
                "price": 2490000,
                "originalPrice": 2990000,
                "deliveryMode": "ONE_ON_ONE",
                "durationDays": 60,
                "includedTutorSessions": 8,
            })
        except Exception:
            pass

    if "GROUP_CLASS" not in existing_modes:
        try:
            start_date = datetime.now() + timedelta(days=3)
            end_date = start_date + timedelta(days=90)
            cls = api.request("POST", "/v1/classes", json={
                "courseId": int(course_id),
                "categoryId": int(category_id),
                "name": f"Lớp nhóm {course_name}"[:40],
                "description": f"Lớp học nhóm trực tuyến cho {course_name}",
                "registrationOpen": True,
                "allowLateEnrollment": True,
                "packageType": "GROUP_CLASS",
                "maxMembers": 20,
                "startDate": start_date.isoformat(),
                "endDate": end_date.isoformat(),
            })
            api.request("POST", "/v1/course-packages", json={
                "courseId": int(course_id),
                "classId": cls["id"],
                "name": f"Gói lớp nhóm - {course_name}"[:100],
                "description": "Học nhóm tương tác trực tuyến 2 buổi/tuần.",
                "price": 1290000,
                "originalPrice": 1590000,
                "deliveryMode": "GROUP_CLASS",
                "durationDays": 90,
                "includedTutorSessions": 0,
            })
        except Exception:
            pass


def ensure_curriculum(api: AilmsApi, course: dict[str, Any], spec: dict[str, Any], questions: list[dict[str, Any]], essays: list[str], reading_text: str) -> None:
    """Đồng bộ ba chương, sáu lesson, quiz quan hệ, assignment và tài liệu đọc."""
    course_id = str(course["id"])
    curriculum = api.request("GET", f"/v1/authoring/courses/{course_id}/curriculum")
    video_durations = {
        asset_name: probe_media_duration_seconds(ASSET_DIR / asset_name)
        for asset_name in spec["videos"]
    }
    section_intro = ensure_section(api, course_id, curriculum, "1. Tổng quan về JVB")
    intro, _ = ensure_lesson(api, section_intro, {
        "name": "Bài 1. Giới thiệu Công ty JVB", "contentType": "TEXT", "durationMin": 1,
        "previewType": "FREE", "description": text_blocks("Giới thiệu Công ty JVB", [reading_text]),
    })
    video_one, _ = ensure_lesson(api, section_intro, {
        "name": "Bài 2. Video định hướng hội nhập", "contentType": "VIDEO", "durationMin": 1,
        "durationSec": video_durations[spec["videos"][0]], "previewType": "FREE",
        "description": text_blocks("Video định hướng", ["Theo dõi video và ghi lại ba điểm quan trọng về môi trường làm việc."]),
    })
    attach_main_file(api, video_one, spec["videos"][0], "VIDEO", "LESSON_VIDEO")

    section_work = ensure_section(api, course_id, curriculum, "2. Môi trường và phương pháp làm việc")
    reading, _ = ensure_lesson(api, section_work, {
        "name": "Bài 3. Bài đọc về môi trường làm việc", "contentType": "PDF", "durationMin": 1,
        "previewType": "LOCKED", "description": text_blocks("Nội dung cần đọc", [reading_text]),
    })
    attach_main_file(api, reading, "baidoc.pdf", "DOCUMENT", "COURSE_LESSON")
    ensure_resource(api, reading)
    video_two, _ = ensure_lesson(api, section_work, {
        "name": "Bài 4. Làm việc trong dự án Nhật Bản", "contentType": "VIDEO", "durationMin": 1,
        "durationSec": video_durations[spec["videos"][1]],
        "previewType": "LOCKED", "description": text_blocks("Thực hành dự án", ["Tập trung vào quy trình, chất lượng, deadline và giao tiếp rõ ràng."]),
    })
    attach_main_file(api, video_two, spec["videos"][1], "VIDEO", "LESSON_VIDEO")

    section_assessment = ensure_section(api, course_id, curriculum, "3. Đánh giá cuối khóa")
    quiz_lesson, _ = ensure_lesson(api, section_assessment, {
        "name": "Bài 5. Kiểm tra kiến thức JVB", "contentType": "QUIZ", "durationMin": 25,
        "previewType": "LOCKED", "description": text_blocks("Kiểm tra kiến thức", ["Hoàn thành 5 câu hỏi trong 25 phút. Điểm đạt là 70/100."]),
    })
    quiz_payload = {
        "lessonId": quiz_lesson["id"], "courseId": course_id, "sectionId": section_assessment["id"],
        "title": "Kiểm tra tìm hiểu Công ty JVB", "description": "Bài kiểm tra được tạo từ nội dung kiemtra.pdf.",
        "timeLimitMin": 25, "passScore": 70, "maxAttempts": 3, "shuffleQuestions": True,
        "status": "DRAFT", "questions": questions,
    }
    linked_quiz = quiz_lesson.get("linkedQuiz")
    if not linked_quiz:
        quiz_lesson["linkedQuiz"] = api.request("POST", "/v1/authoring/quizzes", json=quiz_payload)
    elif not quiz_matches_source(linked_quiz, questions):
        quiz_lesson["linkedQuiz"] = api.request(
            "PUT", f"/v1/authoring/quizzes/{linked_quiz['id']}", json=quiz_payload,
        )

    assignment_lesson, _ = ensure_lesson(api, section_assessment, {
        "name": "Bài 6. Bài tập tự luận định hướng", "contentType": "ASSIGNMENT", "durationMin": 30,
        "previewType": "LOCKED", "description": text_blocks("Bài tập tự luận", essays),
    })
    assignment_payload = {
        "lessonId": assignment_lesson["id"], "courseId": course_id, "sectionId": section_assessment["id"],
        "title": "Bài tự luận tìm hiểu và định hướng tại JVB",
        "description": build_assignment_description(essays),
        "maxScore": 100, "allowLate": False, "status": "DRAFT",
    }
    linked_assignment = assignment_lesson.get("linkedAssignment")
    if not linked_assignment:
        assignment_lesson["linkedAssignment"] = api.request(
            "POST", "/v1/authoring/assignments", json=assignment_payload,
        )
    elif linked_assignment.get("description") != assignment_payload["description"]:
        assignment_lesson["linkedAssignment"] = api.request(
            "PUT", f"/v1/authoring/assignments/{linked_assignment['id']}", json=assignment_payload,
        )


def transition_course(api: AilmsApi, admin: AilmsApi, course: dict[str, Any], target_status: str) -> None:
    """Đưa course qua submit/approve/reject đúng endpoint và giữ trạng thái đích khi chạy lại."""
    current = course.get("status")
    if current == target_status:
        return
    course_id = str(course["id"])
    if current in {"DRAFT", "REJECTED"} and target_status != "DRAFT":
        course = api.request("POST", f"/v1/authoring/courses/{course_id}/submit")
        current = course.get("status")
    if current == "PENDING" and target_status == "ACTIVE":
        admin.request("POST", f"/v1/courses/{course_id}/approve", json={"approve": True})
    elif current == "PENDING" and target_status == "REJECTED":
        admin.request("POST", f"/v1/courses/{course_id}/approve", json={"approve": False, "rejectionReason": REJECTION_REASON})


def validate_seeded_course(
        api: AilmsApi,
        course_id: str,
        target_status: str,
        questions: list[dict[str, Any]],
        essays: list[str],
) -> None:
    """Xác nhận curriculum, assessment và video qua API thật trước khi báo seed thành công."""
    curriculum = api.request("GET", f"/v1/authoring/courses/{course_id}/curriculum")
    sections = curriculum.get("sections") or []
    lessons = [lesson for section in sections for lesson in section.get("lessons", [])]
    if len(sections) != 3 or len(lessons) != 6:
        raise RuntimeError(f"Course {course_id} cần 3 chương/6 bài, nhận được {len(sections)}/{len(lessons)}")

    quiz_lesson = next((lesson for lesson in lessons if lesson.get("contentType") == "QUIZ"), None)
    assignment_lesson = next((lesson for lesson in lessons if lesson.get("contentType") == "ASSIGNMENT"), None)
    if not quiz_lesson or not quiz_matches_source(quiz_lesson.get("linkedQuiz"), questions):
        raise RuntimeError(f"Course {course_id} chưa có đủ câu hỏi quiz đúng theo kiemtra.pdf")
    if (not assignment_lesson
            or (assignment_lesson.get("linkedAssignment") or {}).get("description")
            != build_assignment_description(essays)):
        raise RuntimeError(f"Course {course_id} chưa có đủ câu hỏi bài tập tự luận theo kiemtra.pdf")

    videos = [lesson for lesson in lessons if lesson.get("contentType") == "VIDEO"]
    if len(videos) != 2:
        raise RuntimeError(f"Course {course_id} phải có đúng 2 bài video")
    for video in videos:
        file_key = video.get("contentUrl")
        if not file_key:
            raise RuntimeError(f"Bài video {video.get('name')} chưa có fileKey")
        api.assert_downloadable(file_key, "video/")
        if not video.get("durationSec") or video["durationSec"] <= 0:
            raise RuntimeError(f"Bài video {video.get('name')} chưa có durationSec hợp lệ")

    if target_status == "ACTIVE":
        learning = api.request("GET", f"/v1/learning/courses/{course_id}")
        learning_lessons = [
            lesson for section in learning.get("sections", []) for lesson in section.get("lessons", [])
        ]
        visible_quiz = next((lesson.get("linkedQuiz") for lesson in learning_lessons
                             if lesson.get("contentType") == "QUIZ"), None)
        visible_assignment = next((lesson.get("linkedAssignment") for lesson in learning_lessons
                                   if lesson.get("contentType") == "ASSIGNMENT"), None)
        if not visible_quiz or len(visible_quiz.get("questions") or []) != len(questions):
            raise RuntimeError(f"API học viên chưa hiển thị đủ câu hỏi quiz của course {course_id}")
        if not visible_assignment:
            raise RuntimeError(f"API học viên chưa hiển thị bài tập của course {course_id}")
    print("   [verified] 3 chương, 6 bài, 5 câu quiz, 5 câu tự luận, 2 video tải được")


def validate_assets() -> None:
    """Chặn sớm nếu bộ asset khóa học không đầy đủ trước khi gọi Backend."""
    required = {"baidoc.pdf", "kiemtra.pdf", "c1.jpg", "c2.jpg", "c3.jpg", "mau1.mp4", "mau2.mp4", "mau3.mp4"}
    missing = sorted(name for name in required if not (ASSET_DIR / name).is_file())
    if missing:
        raise FileNotFoundError("Thiếu asset khóa học: " + ", ".join(missing))


def get_all_teachers(api: AilmsApi) -> list[dict[str, Any]]:
    """Lấy danh sách teacher ACTIVE từ backend để phân công đa teacher."""
    try:
        res = api.request("GET", "/v1/users/page", params={"roleType": "EMPLOYEE", "page": 0, "size": 100})
        return [
            user for user in res.get("content", [])
            if "TEACHER" in (user.get("roles") or [])
        ]
    except Exception:
        return []


def get_teacher_active_categories(api: AilmsApi) -> dict[str, Any]:
    """Lấy category ACTIVE đầu tiên của teacher đang đăng nhập."""
    categories = api.request("GET", "/v1/teacher_categories/teacher-categories/me")
    active = [item for item in categories if item.get("status") == "ACTIVE"]
    return active[0] if active else None


def build_teacher_category_map(base_url: str, password: str, teachers: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """
    Xây dựng danh sách {teacher_user, api, category_id} cho tất cả teacher có ACTIVE category.
    Kết quả được dùng để phân công khóa học round-robin theo chuyên môn.
    """
    result = []
    for teacher_user in teachers:
        username = teacher_user.get("username") or teacher_user.get("email")
        if not username:
            continue
        t_api = AilmsApi(base_url)
        try:
            t_api.login(username, password)
        except RuntimeError:
            continue
        first_cat = get_teacher_active_categories(t_api)
        if not first_cat:
            continue
        result.append({
            "user": teacher_user,
            "api": t_api,
            "category_id": str(first_cat["categoryId"]),
        })
    return result


def seed_course_content() -> None:
    """
    Điều phối toàn bộ bộ dữ liệu khóa học qua nhiều Teacher và Admin.
    Phân công khóa học round-robin theo danh sách teacher có ACTIVE category,
    đảm bảo mỗi khóa có đúng 1 teacher phụ trách và category phù hợp.
    """
    validate_assets()
    demo_password = os.getenv("AILMS_SEED_PASSWORD", "Password@123")
    teacher_password = os.getenv("AILMS_SEED_TEACHER_PASSWORD", demo_password)
    admin_password = os.getenv("AILMS_SEED_ADMIN_PASSWORD", demo_password)
    if not teacher_password or not admin_password:
        raise RuntimeError("Mật khẩu actor seed không được để trống")
    base_url = os.getenv("AILMS_API_BASE_URL", "http://localhost:8080/api")

    # Dùng admin để lấy danh sách teacher
    admin = AilmsApi(base_url)
    admin.login(os.getenv("AILMS_SEED_ADMIN_USERNAME", "admin.report"), admin_password)

    teachers = get_all_teachers(admin)
    if not teachers:
        raise RuntimeError("Không tìm thấy teacher nào! Hãy chạy phase identity trước.")

    print(f"   [info] Tìm thấy {len(teachers)} teacher, đang kiểm tra chuyên môn...")
    teacher_slots = build_teacher_category_map(base_url, teacher_password, teachers)
    if not teacher_slots:
        raise RuntimeError("Không có teacher nào có ACTIVE category. Hãy chạy phase identity trước.")
    print(f"   [info] {len(teacher_slots)} teacher có ACTIVE category sẵn sàng tạo khóa học")

    questions, essays = parse_question_pdf(ASSET_DIR / "kiemtra.pdf")
    reading_text = compact_text(extract_pdf_text(ASSET_DIR / "baidoc.pdf"))

    for course_idx, spec in enumerate(COURSES):
        # Phân công teacher theo round-robin — đảm bảo nhiều teacher tạo nhiều khóa
        slot = teacher_slots[course_idx % len(teacher_slots)]
        teacher = slot["api"]
        teacher_user_id = str(slot["user"]["id"])
        category_id = slot["category_id"]

        print(f"→ [{course_idx+1}/{len(COURSES)}] {spec['name']} [{spec['target_status']}] → teacher={slot['user'].get('username', teacher_user_id)}")
        course = ensure_course(teacher, teacher_user_id, category_id, spec)
        if course.get("status") in {"ACTIVE", "PENDING"}:
            expected_status = "ACTIVE" if course.get("status") == "ACTIVE" else "DRAFT"
            if locked_course_needs_repair(
                    teacher, str(course["id"]), questions, essays, expected_status):
                action = "request-edit" if course.get("status") == "ACTIVE" else "cancel-review"
                course = teacher.request(
                    "POST", f"/v1/authoring/courses/{course['id']}/{action}",
                )
        ensure_thumbnail(teacher, course, spec)
        ensure_curriculum(teacher, course, spec, questions, essays, reading_text)
        if spec["target_status"] in {"ACTIVE", "PENDING"}:
            ensure_package(teacher, str(course["id"]), spec["name"], category_id)
        transition_course(teacher, admin, course, spec["target_status"])
        validate_seeded_course(
            teacher, str(course["id"]), spec["target_status"], questions, essays,
        )
