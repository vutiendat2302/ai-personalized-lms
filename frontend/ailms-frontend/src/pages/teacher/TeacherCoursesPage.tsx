import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { teacherApi, type TeacherCourseItem } from "@/api/teacher/teacherApi";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/useToast";
import {
  BookOpen,
  Plus,
  Edit,
  AlertOctagon,
  Video,
  ArrowLeft,
  DollarSign,
} from "lucide-react";

export const TeacherCoursesPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { success } = useToast();

  const [courses, setCourses] = useState<TeacherCourseItem[]>([]);
  const [editingCourse, setEditingCourse] = useState<TeacherCourseItem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    teacherApi.getCourses().then((res) => {
      setCourses(res);
      if (id) {
        const found = res.find((c) => c.id === id);
        if (found) setEditingCourse(found);
      }
      setLoading(false);
    });
  }, [id]);

  const formatVND = (val: number) => {
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(val);
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-muted-foreground">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-3" />
        <p className="text-xs font-semibold">Đang tải danh sách khóa học...</p>
      </div>
    );
  }

  // COURSE BUILDER 2-COLUMN EDITOR VIEW
  if (editingCourse) {
    return (
      <div className="space-y-6 pb-16">
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEditingCourse(null)}
            className="rounded-lg gap-1.5 text-xs border-border text-foreground hover:bg-muted cursor-pointer"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Quay lại danh sách khóa học
          </Button>
          <Button
            size="sm"
            onClick={() => success("Đã gửi yêu cầu phê duyệt khóa học tới Admin!")}
            className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold rounded-lg cursor-pointer"
          >
            Gửi duyệt Khóa học (Publish)
          </Button>
        </div>

        {/* Course Header Banner */}
        <Card className="bg-card border-border/40 p-5 space-y-2 shadow-xs">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-foreground">{editingCourse.title}</h1>
            <span className="px-2.5 py-1 bg-muted text-muted-foreground text-xs font-bold rounded">
              {editingCourse.status}
            </span>
          </div>

          {/* Suggested Price Disclaimer */}
          <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl flex items-center gap-2 text-xs text-amber-700 dark:text-amber-300">
            <DollarSign className="h-4 w-4 shrink-0" />
            <span>
              Định giá đề xuất: <strong>{formatVND(editingCourse.suggestedPrice)}</strong>. (Lưu ý: Giá bán chính thức do Admin quyết định qua Course Package).
            </span>
          </div>
        </Card>

        {/* 2-Column Course Builder */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Left Column: Section & Lesson Tree */}
          <div className="md:col-span-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Cấu trúc Chương & Bài học</h3>
              <Button size="sm" variant="outline" className="text-xs border-border text-foreground h-7 cursor-pointer">
                + Thêm Chương
              </Button>
            </div>

            <div className="space-y-3">
              {editingCourse.sections?.map((sec) => (
                <div key={sec.id} className="p-3 bg-card border border-border/40 rounded-xl space-y-2 shadow-xs">
                  <h4 className="text-xs font-bold text-primary">{sec.title}</h4>
                  <div className="space-y-1.5 pl-2">
                    {sec.lessons.map((les) => (
                      <div
                        key={les.id}
                        className="p-2.5 bg-background border border-border/40 hover:border-primary/60 rounded-lg flex items-center justify-between text-xs cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <Video className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-foreground">{les.title}</span>
                        </div>
                        <span className="text-[10px] text-muted-foreground font-mono">{les.previewType}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: Editor Panel */}
          <div className="md:col-span-7 space-y-4">
            <Card className="bg-card border-border/40 p-5 space-y-4 shadow-xs">
              <h3 className="text-sm font-bold text-foreground border-b border-border/40 pb-3">
                Soạn thảo Bài học & Trắc nghiệm / Bài tập
              </h3>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-foreground font-semibold block mb-1">Tiêu đề bài học:</label>
                  <input
                    type="text"
                    defaultValue="Cấu hình Spring Security 6"
                    className="w-full bg-background border border-border rounded-lg p-2.5 text-foreground"
                  />
                </div>

                <div>
                  <label className="text-foreground font-semibold block mb-1">Loại nội dung:</label>
                  <select className="w-full bg-background border border-border rounded-lg p-2.5 text-foreground">
                    <option value="VIDEO">Video MP4 / HLS</option>
                    <option value="TEXT">Văn bản / Markdown</option>
                    <option value="PDF">Tài liệu PDF</option>
                  </select>
                </div>

                <div className="pt-3 border-t border-border/40 space-y-2">
                  <h4 className="font-bold text-primary">Tích hợp Quiz / Bài tập cho Bài học này:</h4>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="text-xs border-border text-foreground cursor-pointer">
                      + Tạo Quiz (Single/Multiple/Fill-Blank)
                    </Button>
                    <Button size="sm" variant="outline" className="text-xs border-border text-foreground cursor-pointer">
                      + Tạo Bài tập về nhà (Assignment)
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // MAIN COURSE LIST VIEW
  return (
    <div className="space-y-6 pb-16">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-primary" />
            Quản lý Khóa học (Teacher Only)
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Soạn thảo chương trình học, câu hỏi Quiz & Bài tập về nhà cho các khóa học do bạn làm chủ nhiệm.
          </p>
        </div>
        <Button
          onClick={() => success("Tạo bản nháp khóa học mới...")}
          className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold rounded-lg gap-1.5 cursor-pointer shadow-md"
        >
          <Plus className="h-4 w-4" />
          Tạo Khóa học mới
        </Button>
      </div>

      {/* Course Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {courses.map((crs) => (
          <Card key={crs.id} className="bg-card border-border/40 p-5 space-y-4 shadow-xs">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="text-[10px] font-bold uppercase text-primary tracking-wider">
                  {crs.categoryName}
                </span>
                <h3 className="text-base font-bold text-foreground mt-0.5">{crs.title}</h3>
              </div>
              <span
                className={`px-2.5 py-1 text-[10px] font-extrabold rounded-full ${
                  crs.status === "ACTIVE"
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800"
                    : crs.status === "REJECTED"
                    ? "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border border-rose-300 dark:border-rose-800"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {crs.status}
              </span>
            </div>

            {/* Rejection Reason Banner if REJECTED */}
            {crs.status === "REJECTED" && crs.rejectionReason && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 rounded-xl space-y-1 text-xs">
                <div className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-bold">
                  <AlertOctagon className="h-4 w-4 shrink-0" />
                  Lý do bị từ chối phê duyệt:
                </div>
                <p className="text-rose-700 dark:text-rose-200/90 leading-relaxed pl-5.5 text-[11px]">{crs.rejectionReason}</p>
              </div>
            )}

            <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border/40">
              <span>{crs.totalLessons} bài học • {crs.totalStudents} học viên</span>
              <Button
                size="sm"
                onClick={() => setEditingCourse(crs)}
                className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold rounded-lg gap-1.5 cursor-pointer"
              >
                <Edit className="h-3.5 w-3.5" />
                {crs.status === "REJECTED" ? "Sửa & Gửi duyệt lại" : "Soạn thảo nội dung"}
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
