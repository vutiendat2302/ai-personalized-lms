"""Catalog khóa học báo cáo; tài nguyên nhị phân nằm trong file/course/."""

COURSES = (
    {
        "slug": "jvb-hoi-nhap-doanh-nghiep-2026",
        "name": "Hội nhập và tìm hiểu Công ty JVB",
        "description": "Khóa học định hướng giúp học viên hiểu lĩnh vực hoạt động, thị trường và văn hóa làm việc tại JVB.",
        "objectives": "Hiểu tổng quan JVB; nhận biết yêu cầu của dự án Nhật Bản; hình thành tác phong trách nhiệm, phối hợp và chủ động học hỏi.",
        "prerequisites": "Không yêu cầu kinh nghiệm; phù hợp nhân sự mới và thực tập sinh.",
        "image": "c1.jpg",
        "videos": ("mau1.mp4", "mau2.mp4"),
        "target_status": "ACTIVE",
    },
    {
        "slug": "jvb-ky-nang-du-an-nhat-ban-2026",
        "name": "Kỹ năng làm việc trong dự án IT Nhật Bản",
        "description": "Chương trình thực hành các nguyên tắc phối hợp, chất lượng, tiến độ và giao tiếp rõ ràng trong dự án Nhật Bản.",
        "objectives": "Nắm quy trình cơ bản; giao tiếp rõ ràng; phối hợp nhóm hiệu quả; tôn trọng chất lượng và thời hạn.",
        "prerequisites": "Có kiến thức tin học cơ bản và tinh thần làm việc nhóm.",
        "image": "c2.jpg",
        "videos": ("mau2.mp4", "mau3.mp4"),
        "target_status": "ACTIVE",
    },
    {
        "slug": "jvb-dinh-huong-thuc-tap-sinh-2026",
        "name": "Chương trình định hướng thực tập sinh JVB",
        "description": "Lộ trình giúp thực tập sinh kết nối kiến thức đã học với quy trình phát triển phần mềm thực tế tại doanh nghiệp.",
        "objectives": "Xác định mục tiêu thực tập; chuẩn bị kỹ năng dự án; chủ động tiếp nhận phản hồi; xây dựng kế hoạch phát triển cá nhân.",
        "prerequisites": "Dành cho sinh viên hoặc người mới bắt đầu tìm hiểu môi trường doanh nghiệp phần mềm.",
        "image": "c3.jpg",
        "videos": ("mau3.mp4", "mau1.mp4"),
        "target_status": "ACTIVE",
    },
    {
        "slug": "jvb-ban-nhap-van-hoa-lam-viec-2026",
        "name": "Văn hóa làm việc JVB - Bản nháp",
        "description": "Bản nháp minh họa quá trình giảng viên đang biên soạn nội dung.",
        "objectives": "Hoàn thiện nội dung trước khi gửi duyệt.",
        "prerequisites": "Không yêu cầu.",
        "image": "c1.jpg",
        "videos": ("mau1.mp4", "mau3.mp4"),
        "target_status": "DRAFT",
    },
    {
        "slug": "jvb-cho-duyet-quy-trinh-chat-luong-2026",
        "name": "Quy trình chất lượng dự án JVB - Chờ duyệt",
        "description": "Khóa học hoàn thiện nội dung và đang nằm trong hàng đợi phê duyệt.",
        "objectives": "Nhận biết vai trò của quy trình, chất lượng, deadline và giao tiếp với khách hàng Nhật Bản.",
        "prerequisites": "Có kiến thức cơ bản về dự án phần mềm.",
        "image": "c2.jpg",
        "videos": ("mau2.mp4", "mau1.mp4"),
        "target_status": "PENDING",
    },
    {
        "slug": "jvb-tu-choi-ban-noi-dung-can-bo-sung-2026",
        "name": "Tác phong dự án JVB - Yêu cầu bổ sung",
        "description": "Khóa học mẫu thể hiện trường hợp nội dung đã gửi nhưng cần giảng viên bổ sung hướng dẫn thực hành.",
        "objectives": "Hiểu tinh thần trách nhiệm, phối hợp nhóm và chủ động học hỏi.",
        "prerequisites": "Không yêu cầu.",
        "image": "c3.jpg",
        "videos": ("mau3.mp4", "mau2.mp4"),
        "target_status": "REJECTED",
    },
)

REJECTION_REASON = "Cần bổ sung ví dụ thực hành và tiêu chí đánh giá đầu ra trước khi phát hành."

