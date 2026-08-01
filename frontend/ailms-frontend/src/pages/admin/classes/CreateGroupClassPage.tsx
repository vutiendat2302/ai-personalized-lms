import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Check,
  Plus,
  Trash2,
  AlertCircle,
  Clock,
  ChevronRight,
  Loader2,
} from "lucide-react";
import type { ClassScheduleSlot } from "@/types/adminCourseClass";
import { adminCourseClassApi } from "@/api/courses/adminCourseClassApi";

export const CreateGroupClassPage: React.FC = () => {
  const navigate = useNavigate();
  const [courses, setCourses] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [teacherCategories, setTeacherCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Wizard state: Step 1 or Step 2
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);

  // Step 1 Form Data
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [className, setClassName] = useState("");
  const [maxCapacity, setMaxCapacity] = useState<number>(12);
  const [startDate, setStartDate] = useState("2026-09-01");
  const [endDate, setEndDate] = useState("2026-11-01");

  // Dynamic Weekly Schedule Rows
  const [schedules, setSchedules] = useState<ClassScheduleSlot[]>([
    { dayOfWeek: "MON", startTime: "18:30", endTime: "20:30" },
    { dayOfWeek: "WED", startTime: "18:30", endTime: "20:30" },
  ]);

  // Step 2 Form Data
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>("");

  useEffect(() => {
    const load = async () => {
      try {
        const [courseRows, employeeRows, linkRows] = await Promise.all([
          adminCourseClassApi.getCourses(), adminCourseClassApi.getEmployees(), adminCourseClassApi.getTeacherCategories(),
        ]);
        const activeCourses = courseRows.filter((course: any) => course.status === "ACTIVE");
        setCourses(activeCourses); setEmployees(employeeRows); setTeacherCategories(linkRows);
        if (activeCourses.length) setSelectedCourseId(String(activeCourses[0].id));
      } catch (err: any) { setError(err?.response?.data?.message || "Không thể tải dữ liệu tạo lớp"); }
      finally { setLoading(false); }
    };
    void load();
  }, []);

  const selectedCourse = courses.find((c) => String(c.id) === selectedCourseId);
  const categoryName = selectedCourse?.categoryName || "Chưa chọn khóa học";

  // Filter candidate teachers whose category matches course category
  const candidateTeachers = useMemo(() => {
    const allowedIds = new Set(teacherCategories.filter((link) => link.status === "ACTIVE" && String(link.categoryId) === String(selectedCourse?.categoryId)).map((link) => String(link.employeeId)));
    return employees.filter((employee) => allowedIds.has(String(employee.id || employee.userId))).map((employee) => ({
      id: String(employee.id || employee.userId), name: employee.fullName, avatar: employee.avatarUrl || "", category: categoryName,
      email: employee.userEmail || employee.email || "Chưa cập nhật", phone: employee.phone || "Chưa cập nhật", rating: null,
    }));
  }, [employees, teacherCategories, selectedCourse, categoryName]);

  const checkTeacherConflict = (_teacherId: string): any => ({ hasConflict: false });

  const handleAddScheduleRow = () => {
    setSchedules([
      ...schedules,
      { dayOfWeek: "FRI", startTime: "18:30", endTime: "20:30" },
    ]);
  };

  const handleRemoveScheduleRow = (index: number) => {
    if (schedules.length <= 1) return;
    setSchedules(schedules.filter((_, i) => i !== index));
  };

  const handleScheduleChange = (
    index: number,
    field: keyof ClassScheduleSlot,
    value: string
  ) => {
    setSchedules((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  const handleCompleteClassCreation = async () => {
    if (!selectedTeacherId) return;
    setSubmitting(true); setError("");
    const dayMap: Record<string, number> = { MON: 1, TUE: 2, WED: 3, THU: 4, FRI: 5, SAT: 6, SUN: 7 };
    try {
      await adminCourseClassApi.createGroupClass({
        courseId: selectedCourse.id, categoryId: selectedCourse.categoryId, name: className,
        maxMembers: maxCapacity, startDate: `${startDate}T00:00:00`, endDate: `${endDate}T23:59:59`,
        teacherEmployeeId: selectedTeacherId,
        schedules: schedules.map((slot) => ({ dayOfWeek: dayMap[slot.dayOfWeek], startTime: slot.startTime, endTime: slot.endTime })),
      });
      navigate("/admin/classrooms");
    } catch (err: any) { setError(err?.response?.data?.message || "Không thể tạo lớp học"); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {loading && <div className="py-20 flex justify-center items-center gap-2 text-sm text-slate-500"><Loader2 className="h-5 w-5 animate-spin" /> Đang tải dữ liệu...</div>}
      {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 flex gap-2"><AlertCircle className="h-5 w-5" /> {error}</div>}
      {/* Top Header */}
      <div className="flex items-center justify-between border-b pb-4">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/admin/classrooms")}
            className="h-9 px-3 text-slate-700"
          >
            <ArrowLeft className="w-4 h-4 mr-1.5" /> Hủy
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Tạo Lớp Học Nhóm Mới
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Quy trình 2 bước cấu hình lớp và kiểm tra trùng lịch giáo viên
            </p>
          </div>
        </div>
      </div>

      {/* Stepper Header Bar */}
      <div className="grid grid-cols-2 gap-4">
        <div
          className={`p-4 rounded-xl border flex items-center gap-3 transition-all ${
            currentStep === 1
              ? "border-blue-600 bg-blue-50/60 shadow-sm"
              : "border-slate-200 bg-white"
          }`}
        >
          <div
            className={`w-8 h-8 rounded-full font-bold text-xs flex items-center justify-center ${
              currentStep === 1
                ? "bg-blue-600 text-white"
                : "bg-slate-100 text-slate-600"
            }`}
          >
            1
          </div>
          <div>
            <p className="font-bold text-sm text-slate-900">Bước 1: Thông Tin Lớp Học</p>
            <p className="text-xs text-slate-500">Khóa học, sĩ số & Lịch lặp hàng tuần</p>
          </div>
        </div>

        <div
          className={`p-4 rounded-xl border flex items-center gap-3 transition-all ${
            currentStep === 2
              ? "border-blue-600 bg-blue-50/60 shadow-sm"
              : "border-slate-200 bg-white"
          }`}
        >
          <div
            className={`w-8 h-8 rounded-full font-bold text-xs flex items-center justify-center ${
              currentStep === 2
                ? "bg-blue-600 text-white"
                : "bg-slate-100 text-slate-600"
            }`}
          >
            2
          </div>
          <div>
            <p className="font-bold text-sm text-slate-900">Bước 2: Phân Công Giáo Viên</p>
            <p className="text-xs text-slate-500">Đối chiếu lịch & Kiểm tra trùng giờ</p>
          </div>
        </div>
      </div>

      {/* STEP 1 CONTENT */}
      {currentStep === 1 && (
        <Card className="border-slate-200 shadow-none">
          <CardContent className="p-6 md:p-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Course Selector */}
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold text-slate-800">
                  Khóa Học Liên Quan *
                </Label>
                <Select
                  value={selectedCourseId}
                  onValueChange={(val) => setSelectedCourseId(val)}
                >
                  <SelectTrigger className="bg-white h-10">
                    <SelectValue placeholder="Chọn khóa học" />
                  </SelectTrigger>
                  <SelectContent>
                    {courses.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Auto Category Field */}
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold text-slate-800">
                  Danh Mục (Tự Động)
                </Label>
                <Input
                  value={categoryName}
                  disabled
                  className="bg-slate-100 font-medium text-slate-700 h-10"
                />
              </div>

              {/* Class Name */}
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold text-slate-800">
                  Tên Lớp Học *
                </Label>
                <Input
                  placeholder="VD: Lớp Java Basic K13"
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                  className="h-10"
                />
              </div>

              {/* Class Code is generated from the Snowflake ID */}
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold text-slate-800">
                  Mã Lớp Học
                </Label>
                <Input
                  value="Hệ thống tự động sinh sau khi tạo"
                  disabled
                  className="h-10 bg-slate-100"
                />
              </div>

              {/* Capacity */}
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold text-slate-800">
                  Sĩ Số Tối Đa *
                </Label>
                <Input
                  type="number"
                  value={maxCapacity}
                  onChange={(e) => setMaxCapacity(Number(e.target.value))}
                  className="h-10"
                />
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold text-slate-800">
                    Ngày Khai Giảng *
                  </Label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="h-10"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold text-slate-800">
                    Ngày Bế Giảng *
                  </Label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="h-10"
                  />
                </div>
              </div>
            </div>

            {/* Dynamic Weekly Schedule Table */}
            <div className="space-y-3 pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-bold text-slate-900 block">
                    Lịch Học Lặp Hàng Tuần (class_schedule) *
                  </Label>
                  <p className="text-xs text-slate-500">
                    Thêm các buổi học cố định diễn ra mỗi tuần
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddScheduleRow}
                  className="h-8 text-xs font-semibold"
                >
                  <Plus className="w-3.5 h-3.5 mr-1 text-blue-600" /> Thêm Buổi Học
                </Button>
              </div>

              {/* Dynamic rows list */}
              <div className="space-y-2">
                {schedules.map((row, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200"
                  >
                    <span className="text-xs font-bold text-slate-400 w-6">
                      #{idx + 1}
                    </span>

                    {/* Day select */}
                    <div className="w-40">
                      <Select
                        value={row.dayOfWeek}
                        onValueChange={(val: any) =>
                          handleScheduleChange(idx, "dayOfWeek", val)
                        }
                      >
                        <SelectTrigger className="bg-white h-9 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="MON">Thứ 2 (MON)</SelectItem>
                          <SelectItem value="TUE">Thứ 3 (TUE)</SelectItem>
                          <SelectItem value="WED">Thứ 4 (WED)</SelectItem>
                          <SelectItem value="THU">Thứ 5 (THU)</SelectItem>
                          <SelectItem value="FRI">Thứ 6 (FRI)</SelectItem>
                          <SelectItem value="SAT">Thứ 7 (SAT)</SelectItem>
                          <SelectItem value="SUN">Chủ Nhật (SUN)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Start time */}
                    <div className="flex items-center gap-1.5 flex-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <Input
                        type="time"
                        value={row.startTime}
                        onChange={(e) =>
                          handleScheduleChange(idx, "startTime", e.target.value)
                        }
                        className="bg-white h-9 text-xs"
                      />
                    </div>

                    <span className="text-slate-400 text-xs font-medium">đến</span>

                    {/* End time */}
                    <div className="flex items-center gap-1.5 flex-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <Input
                        type="time"
                        value={row.endTime}
                        onChange={(e) =>
                          handleScheduleChange(idx, "endTime", e.target.value)
                        }
                        className="bg-white h-9 text-xs"
                      />
                    </div>

                    {/* Delete button */}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={schedules.length <= 1}
                      onClick={() => handleRemoveScheduleRow(idx)}
                      className="h-8 w-8 p-0 text-slate-400 hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <Button
                onClick={() => setCurrentStep(2)}
                disabled={!selectedCourseId || !className || schedules.length === 0}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium"
              >
                Tiếp Theo: Phân Công Giáo Viên <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* STEP 2 CONTENT */}
      {currentStep === 2 && (
        <Card className="border-slate-200 shadow-none space-y-6">
          <CardContent className="p-6 md:p-8 space-y-6">
            <div className="space-y-1">
              <h3 className="font-bold text-slate-900 text-base">
                Ứng Viên Giáo Viên Phụ Trách ({categoryName})
              </h3>
              <p className="text-xs text-slate-500">
                Hệ thống chỉ hiển thị các giáo viên thuộc danh mục{" "}
                <span className="font-semibold text-slate-700">{categoryName}</span>.
                Chọn giáo viên để kiểm tra trùng lịch ngay lập tức.
              </p>
            </div>

            {/* List of candidates */}
            <div className="space-y-4">
              {candidateTeachers.map((t) => {
                const conflict = checkTeacherConflict(t.id);
                const isSelected = selectedTeacherId === t.id;

                return (
                  <div
                    key={t.id}
                    className={`border-2 rounded-xl p-5 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                      isSelected
                        ? "border-blue-600 bg-blue-50/50 shadow-sm"
                        : conflict.hasConflict
                        ? "border-red-200 bg-red-50/30"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    {/* Left: Avatar + Info */}
                    <div className="flex items-center gap-4">
                      <img
                        src={t.avatar}
                        alt={t.name}
                        className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm"
                      />
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-slate-900 text-base">{t.name}</h4>
                          {t.rating != null && <Badge variant="outline" className="text-xs bg-white">★ {t.rating}</Badge>}
                        </div>
                        <p className="text-xs text-slate-500">{t.email} • {t.phone}</p>
                      </div>
                    </div>

                    {/* Eligibility from teacher_category; collision is validated by backend on submit */}
                    <div className="bg-slate-100/80 rounded-lg p-2.5 text-xs space-y-1 md:w-64">
                      <span className="text-[10px] uppercase font-bold text-slate-500 block">
                        Điều kiện phân công:
                      </span>
                      <span className="bg-emerald-100 text-emerald-800 font-semibold px-1.5 py-0.5 rounded text-[10px]">Đúng danh mục chuyên môn</span>
                      <p className="text-[10px] text-slate-500">Backend sẽ kiểm tra trùng lịch khi hoàn tất.</p>
                    </div>

                    {/* Right: Conflict Warning or Select Button */}
                    <div className="flex flex-col items-end gap-2 md:w-48">
                      {conflict.hasConflict ? (
                        <div className="text-right space-y-1">
                          <Badge className="bg-red-500/10 text-red-600 border-red-500/20 font-bold text-xs">
                            <AlertCircle className="w-3 h-3 mr-1" /> Trùng Lịch
                          </Badge>
                          <p className="text-[11px] text-red-600 font-medium">
                            ⚠ Trùng lịch với lớp <span className="font-bold">{conflict.conflictingClassName}</span> vào {conflict.conflictTime}
                          </p>
                          <Button
                            size="sm"
                            disabled
                            className="h-8 text-xs opacity-50 bg-slate-300 text-slate-600 cursor-not-allowed"
                          >
                            Không Thể Chọn
                          </Button>
                        </div>
                      ) : (
                        <Button
                          variant={isSelected ? "default" : "outline"}
                          size="sm"
                          onClick={() => setSelectedTeacherId(t.id)}
                          className={
                            isSelected
                              ? "bg-blue-600 text-white font-medium"
                              : "text-slate-700 hover:border-slate-400"
                          }
                        >
                          {isSelected ? (
                            <>
                              <Check className="w-3.5 h-3.5 mr-1" /> Đã Chọn
                            </>
                          ) : (
                            "Chọn Giáo Viên"
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bottom Footer Actions */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <Button variant="outline" onClick={() => setCurrentStep(1)}>
                <ArrowLeft className="w-4 h-4 mr-1.5" /> Quay Lại Bước 1
              </Button>
              <Button
                onClick={handleCompleteClassCreation}
                disabled={!selectedTeacherId || submitting}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6"
              >
                {submitting ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Check className="w-4 h-4 mr-1.5" />} Hoàn Tất Tạo Lớp Học
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
