import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import {
  MOCK_REQUESTS,
  ALL_TEACHERS,
} from "@/types/adminCourseClass";
import type { TeacherInfo, OperationalRequest } from "@/types/adminCourseClass";

export const TeacherMatchingRequestPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const req: OperationalRequest =
    MOCK_REQUESTS.find((r) => r.id === id) || MOCK_REQUESTS[2];

  const [isManualMode, setIsManualMode] = useState<boolean>(false);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>("");
  const [isMatchedSuccess, setIsMatchedSuccess] = useState<boolean>(false);

  // Auto matching logic mock:
  // If request ID is 'req-3' or 'req-6', system auto-finds candidate 't-1' or 't-5'
  const autoMatchedTeacher: TeacherInfo | null =
    req.id === "req-3" || req.id === "req-6" ? ALL_TEACHERS[0] : null;

  // Candidate teachers belonging to category
  const categoryTeachers = ALL_TEACHERS.filter(
    (t) => t.category === "Lập Trình Backend"
  );

  const checkSoftConflict = (tId: string) => {
    if (tId === "t-2" || tId === "t-5") {
      return {
        hasConflict: true,
        message: "⚠ Trùng lịch dạy lớp khác vào Thứ 2 (18:30-20:30). HR có thể thỏa thuận đổi giờ trực tiếp.",
      };
    }
    return { hasConflict: false };
  };

  const handleConfirmMatching = (teacherId: string) => {
    setSelectedTeacherId(teacherId);
    setIsMatchedSuccess(true);
    setTimeout(() => {
      navigate("/admin/pending-requests");
    }, 1500);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Back Header */}
      <div className="flex items-center gap-3 border-b pb-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate("/admin/pending-requests")}
          className="h-9 px-3 text-slate-700"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" /> Quay lại hàng đợi
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Chi Tiết Ghép Giáo Viên (Teacher Matching)
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Duyệt tự động hoặc tùy chỉnh ghép giáo viên cho học viên/lớp
          </p>
        </div>
      </div>

      {/* Success Toast Banner */}
      {isMatchedSuccess && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-3 text-xs text-emerald-900 font-bold animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          <span>Ghép giáo viên thành công! Đang chuyển hướng về hàng đợi...</span>
        </div>
      )}

      {/* Context Summary Header Card */}
      <Card className="border-slate-200 shadow-none bg-slate-50/70">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Tóm Tắt Ngữ Cảnh Yêu Cầu
            </span>
            <Badge className="bg-blue-600 text-white font-bold">{req.type}</Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="space-y-1.5">
              <p className="text-slate-500">Học viên / Đại diện:</p>
              <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                <img
                  src={req.studentAvatar}
                  alt=""
                  className="w-7 h-7 rounded-full object-cover"
                />
                <span>{req.studentName}</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <p className="text-slate-500">Khóa học & Lớp:</p>
              <p className="font-bold text-slate-900 text-sm">{req.courseName}</p>
              {req.className && <span className="text-slate-600">({req.className})</span>}
            </div>

            {req.desiredSchedule && (
              <div className="space-y-1">
                <p className="text-slate-500">Khung giờ mong muốn:</p>
                <p className="font-bold text-blue-600 text-sm">{req.desiredSchedule}</p>
              </div>
            )}

            <div className="space-y-1 md:col-span-2">
              <p className="text-slate-500">Lý do yêu cầu:</p>
              <p className="font-medium text-slate-800 italic bg-white p-3 rounded-lg border border-slate-200">
                "{req.reason}"
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Matching Results Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-500" /> Kết Quả Hệ Thống Matching
          </h2>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsManualMode(!isManualMode)}
            className="text-xs font-semibold"
          >
            {isManualMode ? "Xem Đề Xuất Tự Động" : "Chọn Thủ Công Tất Cả GV"}
          </Button>
        </div>

        {/* Case 1: Auto Match Found */}
        {!isManualMode && autoMatchedTeacher ? (
          <Card className="border-2 border-emerald-400 bg-emerald-50/30 shadow-md">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <Badge className="bg-emerald-600 text-white font-bold text-xs px-2.5 py-1">
                  ✓ Hệ thống tự tìm thấy 1 Giáo Viên Phù Hợp 100%
                </Badge>
                <span className="text-xs text-slate-500 font-medium">Khớp category & rảnh giờ</span>
              </div>

              {/* Teacher Recommendation Card */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-emerald-200">
                <div className="flex items-center gap-4">
                  <img
                    src={autoMatchedTeacher.avatar}
                    alt=""
                    className="w-14 h-14 rounded-full object-cover border-2 border-emerald-400"
                  />
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">
                      {autoMatchedTeacher.name}
                    </h3>
                    <p className="text-xs text-slate-500">{autoMatchedTeacher.category}</p>
                    <div className="flex items-center gap-2 mt-1 text-xs text-amber-600 font-bold">
                      ★ {autoMatchedTeacher.rating} • {autoMatchedTeacher.email}
                    </div>
                  </div>
                </div>

                <Button
                  onClick={() => handleConfirmMatching(autoMatchedTeacher.id)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 shadow"
                >
                  <Check className="w-4 h-4 mr-1.5" /> Xác Nhận Ghép Giáo Viên Này
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : !isManualMode && !autoMatchedTeacher ? (
          /* Case 2: Auto Match Not Found -> Empty State */
          <Card className="border-dashed border-2 p-8 text-center bg-slate-50 space-y-3">
            <AlertCircle className="w-10 h-10 text-amber-500 mx-auto" />
            <div className="space-y-1">
              <h3 className="font-bold text-slate-900 text-base">
                Không Tìm Thấy Giáo Viên Khớp Lịch Tự Động
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Hệ thống đã quét toàn bộ giáo viên thuộc danh mục nhưng không ai trống đúng khung giờ yêu cầu.
              </p>
            </div>
            <Button
              onClick={() => setIsManualMode(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold mt-2"
            >
              Chuyển Sang Chọn Thủ Công & Xem Cảnh Báo Mềm
            </Button>
          </Card>
        ) : null}

        {/* Manual Selection Mode */}
        {isManualMode && (
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
              <p className="font-bold">Chế độ chọn thủ công cho Admin/HR:</p>
              <p>
                Tại đây, trùng lịch chỉ là <span className="font-extrabold underline">Cảnh báo mềm (Soft Warning)</span> — nút chọn vẫn hoạt động bình thường để HR có thể bỏ qua ràng buộc lịch rảnh và tự thỏa thuận đổi giờ với giáo viên.
              </p>
            </div>

            <div className="space-y-3">
              {categoryTeachers.map((t) => {
                const softConflict = checkSoftConflict(t.id);
                const isSelected = selectedTeacherId === t.id;

                return (
                  <Card
                    key={t.id}
                    className={`border-2 transition-all ${
                      isSelected
                        ? "border-blue-600 bg-blue-50/50"
                        : softConflict.hasConflict
                        ? "border-amber-200 bg-amber-50/20"
                        : "border-slate-200 bg-white"
                    }`}
                  >
                    <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <img
                          src={t.avatar}
                          alt=""
                          className="w-10 h-10 rounded-full object-cover"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-slate-900 text-sm">{t.name}</h4>
                            <span className="text-xs text-amber-600 font-bold">★ {t.rating}</span>
                          </div>
                          <p className="text-xs text-slate-500">{t.email} • {t.phone}</p>
                        </div>
                      </div>

                      {/* Soft Conflict Notice */}
                      {softConflict.hasConflict && (
                        <div className="text-xs text-amber-800 font-medium md:max-w-xs bg-amber-100/60 p-2 rounded-lg">
                          {softConflict.message}
                        </div>
                      )}

                      <Button
                        variant={isSelected ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleConfirmMatching(t.id)}
                        className={
                          isSelected
                            ? "bg-blue-600 text-white font-medium"
                            : "text-slate-700 hover:border-slate-400"
                        }
                      >
                        {isSelected ? "Đã Ghép" : "Chọn Thủ Công"}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
