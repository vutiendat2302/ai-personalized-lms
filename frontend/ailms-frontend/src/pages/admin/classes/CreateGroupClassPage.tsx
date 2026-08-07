import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
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
  ChevronLeft,
  ChevronDown,
  Search,
  Loader2,
} from "lucide-react";
import type { ClassScheduleSlot } from "@/types/adminCourseClass";
import { adminCourseClassApi } from "@/api/courses/adminCourseClassApi";

interface PaginatedCourseSelectorProps {
  selectedCourse: any;
  onSelectCourse: (course: any) => void;
}

const PaginatedCourseSelector: React.FC<PaginatedCourseSelectorProps> = ({
  selectedCourse,
  onSelectCourse,
}) => {
  const [open, setOpen] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [page, setPage] = useState(0);
  const [courses, setCourses] = useState<any[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchCourses = async (searchKw: string, pageNum: number) => {
    setLoading(true);
    try {
      const res = await adminCourseClassApi.searchCourses({
        keyword: searchKw,
        status: "ACTIVE",
        page: pageNum,
        size: 10,
      });
      if (res) {
        setCourses(res.content || []);
        setTotalPages(res.totalPages || 1);
        setTotalElements(res.totalElements || 0);
      }
    } catch (err) {
      console.error("Failed to search courses", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchCourses(keyword, page);
    }, 300);
    return () => clearTimeout(timer);
  }, [keyword, page]);

  const handleKeywordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setKeyword(e.target.value);
    setPage(0);
  };

  return (
    <div className="relative">
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between h-10 px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-left transition-colors cursor-pointer"
      >
        <div className="min-w-0 flex-1">
          {selectedCourse ? (
            <div className="flex items-center gap-2 truncate">
              <span className="font-semibold text-slate-900 truncate">
                {selectedCourse.name}
              </span>
              <Badge variant="outline" className="text-[10px] shrink-0 bg-blue-50 text-blue-700 border-blue-200">
                {selectedCourse.categoryName || `MÃ£ DM: ${selectedCourse.categoryId}`}
              </Badge>
            </div>
          ) : (
            <span className="text-slate-400">Chá»n khÃ³a há»c liÃªn quan...</span>
          )}
        </div>
        <ChevronDown className="h-4 w-4 text-slate-400 shrink-0 ml-2" />
      </button>

      {/* Dropdown Popover Panel */}
      {open && (
        <div className="absolute z-50 left-0 right-0 mt-1.5 bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden flex flex-col max-h-96">
          {/* Search Box Header */}
          <div className="p-2.5 border-b border-slate-100 bg-slate-50/50">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <Input
                placeholder="TÃ¬m tÃªn khÃ³a há»c..."
                value={keyword}
                onChange={handleKeywordChange}
                className="pl-9 h-8 text-xs rounded-lg bg-white"
                autoFocus
              />
              {loading && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-blue-600" />
              )}
            </div>
          </div>

          {/* List Items */}
          <div className="flex-1 overflow-y-auto p-1.5 space-y-1 min-h-35">
            {courses.length === 0 && !loading ? (
              <p className="text-xs text-slate-400 text-center py-6">
                KhÃ´ng tÃ¬m tháº¥y khÃ³a há»c nÃ o phÃ¹ há»£p.
              </p>
            ) : (
              courses.map((course) => {
                const isSelected = selectedCourse && String(selectedCourse.id) === String(course.id);
                return (
                  <div
                    key={course.id}
                    onClick={() => {
                      onSelectCourse(course);
                      setOpen(false);
                    }}
                    className={`flex items-center justify-between p-2.5 rounded-xl text-xs cursor-pointer transition-colors ${
                      isSelected
                        ? "bg-blue-50/80 text-blue-900 font-bold border border-blue-200"
                        : "hover:bg-slate-50 text-slate-700"
                    }`}
                  >
                    <div className="min-w-0 pr-2">
                      <p className="font-semibold text-slate-900 truncate">{course.name}</p>
                      <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500">
                        <span>Danh má»¥c: {course.categoryName}</span>
                        <span>â€¢</span>
                        <span>Cáº¥p Ä‘á»™: {course.level}</span>
                      </div>
                    </div>
                    {isSelected && <Check className="h-4 w-4 text-blue-600 shrink-0" />}
                  </div>
                );
              })
            )}
          </div>

          {/* Pagination Footer */}
          <div className="p-2 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between text-xs text-slate-500">
            <span className="text-[11px]">
              Trang {page + 1}/{totalPages} ({totalElements} khÃ³a há»c)
            </span>
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="ghost"
                disabled={page === 0 || loading}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                className="h-7 px-2 text-[11px] cursor-pointer"
              >
                <ChevronLeft className="h-3.5 w-3.5" /> TrÆ°á»›c
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={page + 1 >= totalPages || loading}
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                className="h-7 px-2 text-[11px] cursor-pointer"
              >
                Sau <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const CreateGroupClassPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const navigationState = location.state as {
    courseId?: string;
    courseName?: string;
    returnUrl?: string;
    packageMode?: string;
    packageId?: string;
  } | null;

  const [selectedCourse, setSelectedCourse] = useState<any>(null);
  const [employees, setEmployees] = useState<any[]>([]);
  const [teacherCategories, setTeacherCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Wizard state: Step 1 or Step 2
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);

  // Step 1 Form Data
  const [classNameValue, setClassNameValue] = useState("");
  const [maxCapacity, setMaxCapacity] = useState<number>(0);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Dynamic Weekly Schedule Rows
  const [schedules, setSchedules] = useState<ClassScheduleSlot[]>([]);

  // Step 2 Form Data
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>("");

  const getErrorMessage = (err: any, fallback: string) => {
    if (!err) return fallback;
    const msg =
      err.message ||
      err.response?.data?.message ||
      err.response?.data?.error ||
      err.error ||
      fallback;
    const details = err.details || err.response?.data?.details;
    if (Array.isArray(details) && details.length > 0) {
      return `${msg}: ${details.join(", ")}`;
    }
    return msg;
  };

  useEffect(() => {
    const load = async () => {
      try {
        const passedCourseId = navigationState?.courseId;
        const promises: Promise<any>[] = [
          adminCourseClassApi.getEmployees(),
          adminCourseClassApi.getTeacherCategories(),
        ];

        if (passedCourseId) {
          promises.unshift(adminCourseClassApi.getCourse(passedCourseId));
        } else {
          promises.unshift(adminCourseClassApi.searchCourses({ status: "ACTIVE", page: 0, size: 10 }));
        }

        const [courseResult, employeeRows, linkRows] = await Promise.all(promises);
        setEmployees(employeeRows);
        setTeacherCategories(linkRows);

        let targetCourse: any = null;
        if (passedCourseId) {
          targetCourse = courseResult;
        } else if (courseResult?.content && courseResult.content.length > 0) {
          targetCourse = courseResult.content[0];
        }

        if (targetCourse) {
          setSelectedCourse(targetCourse);
        }
      } catch (err: any) {
        setError(getErrorMessage(err, "KhÃ´ng thá»ƒ táº£i dá»¯ liá»‡u táº¡o lá»›p"));
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const categoryName = selectedCourse?.categoryName || "ChÆ°a chá»n khÃ³a há»c";

  // Filter candidate teachers whose category matches course category
  const candidateTeachers = useMemo(() => {
    const allowedIds = new Set(
      teacherCategories
        .filter((link) => link.status === "ACTIVE" && String(link.categoryId) === String(selectedCourse?.categoryId))
        .flatMap((link) => [String(link.employeeId), String(link.userId)])
        .filter(Boolean)
    );
    return employees
      .filter((employee) =>
        allowedIds.has(String(employee.id)) || allowedIds.has(String(employee.userId))
      )
      .map((employee) => ({
        id: String(employee.userId || employee.id),
        name: employee.fullName || employee.userName || "Giáº£ng viÃªn",
        avatar: employee.avatarUrl && employee.avatarUrl.trim() !== "" ? employee.avatarUrl : undefined,
        category: categoryName,
        email: employee.userEmail || employee.email || "ChÆ°a cáº­p nháº­t",
        phone: employee.phone || "ChÆ°a cáº­p nháº­t",
        rating: null,
      }));
  }, [employees, teacherCategories, selectedCourse, categoryName]);

  const checkTeacherConflict = (_teacherId: string): any => ({ hasConflict: false });

  const handleGoToStep2 = () => {
    setError("");
    if (!selectedCourse) {
      setError("Vui lÃ²ng chá»n khÃ³a há»c liÃªn quan.");
      return;
    }
    const nameTrimmed = classNameValue.trim();
    if (!nameTrimmed) {
      setError("Vui lÃ²ng nháº­p tÃªn lá»›p há»c.");
      return;
    }
    if (nameTrimmed.length < 3 || nameTrimmed.length > 150) {
      setError("TÃªn lá»›p há»c pháº£i cÃ³ Ä‘á»™ dÃ i tá»« 3 Ä‘áº¿n 150 kÃ½ tá»±.");
      return;
    }
    if (!Number.isInteger(maxCapacity) || maxCapacity <= 0 || maxCapacity > 500) {
      setError("SÄ© sá»‘ tá»‘i Ä‘a pháº£i lÃ  sá»‘ nguyÃªn tá»« 1 Ä‘áº¿n 500 thÃ nh viÃªn.");
      return;
    }
    if (!startDate || !endDate) {
      setError("Vui lÃ²ng chá»n ngÃ y khai giáº£ng vÃ  ngÃ y báº¿ giáº£ng.");
      return;
    }
    if (new Date(startDate) > new Date(endDate)) {
      setError("NgÃ y khai giáº£ng pháº£i trÆ°á»›c hoáº·c báº±ng ngÃ y báº¿ giáº£ng.");
      return;
    }
    if (schedules.length === 0) {
      setError("Vui lÃ²ng thÃªm Ã­t nháº¥t má»™t khung giá» há»c láº·p hÃ ng tuáº§n.");
      return;
    }
    for (let i = 0; i < schedules.length; i++) {
      const slot = schedules[i];
      if (!slot.startTime || !slot.endTime) {
        setError(`Vui lÃ²ng chá»n Ä‘áº§y Ä‘á»§ giá» báº¯t Ä‘áº§u vÃ  káº¿t thÃºc á»Ÿ buá»•i há»c #${i + 1}.`);
        return;
      }
      if (slot.startTime >= slot.endTime) {
        setError(`á»ž buá»•i há»c #${i + 1}, giá» báº¯t Ä‘áº§u (${slot.startTime}) pháº£i trÆ°á»›c giá» káº¿t thÃºc (${slot.endTime}).`);
        return;
      }
    }
    for (let i = 0; i < schedules.length; i++) {
      for (let j = i + 1; j < schedules.length; j++) {
        if (schedules[i].dayOfWeek === schedules[j].dayOfWeek) {
          const s1 = schedules[i].startTime;
          const e1 = schedules[i].endTime;
          const s2 = schedules[j].startTime;
          const e2 = schedules[j].endTime;
          if (s1 < e2 && e1 > s2) {
            setError(`PhÃ¡t hiá»‡n khung giá» láº·p bá»‹ trÃ¹ng nhau trong cáº¥u hÃ¬nh lá»›p há»c (buá»•i #${i + 1} vÃ  #${j + 1}).`);
            return;
          }
        }
      }
    }
    setCurrentStep(2);
  };

  const handleAddScheduleRow = () => {
    setSchedules([
      ...schedules,
      { dayOfWeek: "FRI", startTime: "", endTime: "" },
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

  const handleCancel = () => {
    if (navigationState?.returnUrl) {
      navigate(navigationState.returnUrl);
    } else {
      navigate("/admin/classrooms");
    }
  };

  const formatLocalTime = (timeStr: string) => {
    if (!timeStr) return "00:00:00";
    const parts = timeStr.trim().split(":");
    if (parts.length === 2) return `${parts[0]}:${parts[1]}:00`;
    return timeStr;
  };

  const formatDateTime = (dateVal: string, defaultTime: string) => {
    if (!dateVal) return "";
    const trimmed = dateVal.trim();
    if (trimmed.includes("T")) return trimmed;
    return `${trimmed}T${defaultTime}`;
  };

  const handleCompleteClassCreation = async () => {
    if (!selectedTeacherId || !selectedCourse) return;
    setSubmitting(true); setError("");
    const dayMap: Record<string, number> = { MON: 1, TUE: 2, WED: 3, THU: 4, FRI: 5, SAT: 6, SUN: 7 };
    try {
      const createdClass = await adminCourseClassApi.createGroupClass({
        courseId: selectedCourse.id,
        categoryId: selectedCourse.categoryId,
        name: classNameValue,
        maxMembers: maxCapacity,
        startDate: formatDateTime(startDate, "00:00:00"),
        endDate: formatDateTime(endDate, "23:59:59"),
        teacherEmployeeId: selectedTeacherId,
        schedules: schedules.map((slot) => ({
          dayOfWeek: dayMap[slot.dayOfWeek],
          startTime: formatLocalTime(slot.startTime),
          endTime: formatLocalTime(slot.endTime),
        })),
      });

      if (navigationState?.returnUrl) {
        navigate(navigationState.returnUrl, {
          state: {
            autoOpenCreatePackage: true,
            createdClassId: String(createdClass?.id || ""),
          },
        });
      } else {
        navigate("/admin/classrooms");
      }
    } catch (err: any) {
      setError(getErrorMessage(err, "KhÃ´ng thá»ƒ táº¡o lá»›p há»c"));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 flex justify-center items-center gap-2 text-sm text-slate-500">
        <Loader2 className="h-5 w-5 animate-spin" /> Äang táº£i dá»¯ liá»‡u...
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 flex items-start gap-3 shadow-sm animate-in fade-in duration-200">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5 text-red-600" />
          <div className="space-y-1">
            <p className="font-bold text-red-900">KhÃ´ng Thá»ƒ Táº¡o Lá»›p Há»c</p>
            <p className="text-xs text-red-800 leading-relaxed font-medium">{error}</p>
          </div>
        </div>
      )}
      {/* Top Header */}
      <div className="flex items-center justify-between border-b pb-4">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCancel}
            className="h-9 px-3 text-slate-700 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 mr-1.5" /> {navigationState?.returnUrl ? "Quay láº¡i gÃ³i bÃ¡n" : "Há»§y"}
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Táº¡o Lá»›p Há»c NhÃ³m Má»›i
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Quy trÃ¬nh 2 bÆ°á»›c cáº¥u hÃ¬nh lá»›p vÃ  kiá»ƒm tra trÃ¹ng lá»‹ch giÃ¡o viÃªn
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
            <p className="font-bold text-sm text-slate-900">BÆ°á»›c 1: ThÃ´ng Tin Lá»›p Há»c</p>
            <p className="text-xs text-slate-500">KhÃ³a há»c, sÄ© sá»‘ & Lá»‹ch láº·p hÃ ng tuáº§n</p>
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
            <p className="font-bold text-sm text-slate-900">BÆ°á»›c 2: PhÃ¢n CÃ´ng GiÃ¡o ViÃªn</p>
            <p className="text-xs text-slate-500">Äá»‘i chiáº¿u lá»‹ch & Kiá»ƒm tra trÃ¹ng giá»</p>
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
                  KhÃ³a Há»c LiÃªn Quan *
                </Label>
                <PaginatedCourseSelector
                  selectedCourse={selectedCourse}
                  onSelectCourse={(course) => setSelectedCourse(course)}
                />
              </div>

              {/* Auto Category Field */}
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold text-slate-800">
                  Danh Má»¥c (Tá»± Äá»™ng)
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
                  value={classNameValue}
                  onChange={(e) => setClassNameValue(e.target.value)}
                  className="h-10"
                />
              </div>

              {/* Capacity */}
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold text-slate-800">
                  SÄ© Sá»‘ Tá»‘i Äa *
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
                    NgÃ y Khai Giáº£ng *
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
                    NgÃ y Báº¿ Giáº£ng *
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
                    Lá»‹ch Há»c Láº·p HÃ ng Tuáº§n (class_schedule) *
                  </Label>
                  <p className="text-xs text-slate-500">
                    ThÃªm cÃ¡c buá»•i há»c cá»‘ Ä‘á»‹nh diá»…n ra má»—i tuáº§n
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddScheduleRow}
                  className="h-8 text-xs font-semibold"
                >
                  <Plus className="w-3.5 h-3.5 mr-1 text-blue-600" /> ThÃªm Buá»•i Há»c
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
                          <SelectItem value="MON">Thá»© 2 (MON)</SelectItem>
                          <SelectItem value="TUE">Thá»© 3 (TUE)</SelectItem>
                          <SelectItem value="WED">Thá»© 4 (WED)</SelectItem>
                          <SelectItem value="THU">Thá»© 5 (THU)</SelectItem>
                          <SelectItem value="FRI">Thá»© 6 (FRI)</SelectItem>
                          <SelectItem value="SAT">Thá»© 7 (SAT)</SelectItem>
                          <SelectItem value="SUN">Chá»§ Nháº­t (SUN)</SelectItem>
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

                    <span className="text-slate-400 text-xs font-medium">Ä‘áº¿n</span>

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
                onClick={handleGoToStep2}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold cursor-pointer"
              >
                Tiáº¿p Theo: PhÃ¢n CÃ´ng GiÃ¡o ViÃªn <ChevronRight className="w-4 h-4 ml-1" />
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
                á»¨ng ViÃªn GiÃ¡o ViÃªn Phá»¥ TrÃ¡ch ({categoryName})
              </h3>
              <p className="text-xs text-slate-500">
                Há»‡ thá»‘ng chá»‰ hiá»ƒn thá»‹ cÃ¡c giÃ¡o viÃªn thuá»™c danh má»¥c{" "}
                <span className="font-semibold text-slate-700">{categoryName}</span>.
                Chá»n giÃ¡o viÃªn Ä‘á»ƒ kiá»ƒm tra trÃ¹ng lá»‹ch ngay láº­p tá»©c.
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
                      {t.avatar ? (
                        <img
                          src={t.avatar}
                          alt={t.name}
                          className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center shrink-0 border-2 border-white shadow-sm text-base">
                          {(t.name || "?").charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-slate-900 text-base">{t.name}</h4>
                          {t.rating != null && <Badge variant="outline" className="text-xs bg-white">â˜… {t.rating}</Badge>}
                        </div>
                        <p className="text-xs text-slate-500">{t.email} â€¢ {t.phone}</p>
                      </div>
                    </div>

                    {/* Eligibility from teacher_category; collision is validated by backend on submit */}
                    <div className="bg-slate-100/80 rounded-lg p-2.5 text-xs space-y-1 md:w-64">
                      <span className="text-[10px] uppercase font-bold text-slate-500 block">
                        Äiá»u kiá»‡n phÃ¢n cÃ´ng:
                      </span>
                      <span className="bg-emerald-100 text-emerald-800 font-semibold px-1.5 py-0.5 rounded text-[10px]">ÄÃºng danh má»¥c chuyÃªn mÃ´n</span>
                      <p className="text-[10px] text-slate-500">Backend sáº½ kiá»ƒm tra trÃ¹ng lá»‹ch khi hoÃ n táº¥t.</p>
                    </div>

                    {/* Right: Conflict Warning or Select Button */}
                    <div className="flex flex-col items-end gap-2 md:w-48">
                      {conflict.hasConflict ? (
                        <div className="text-right space-y-1">
                          <Badge className="bg-red-500/10 text-red-600 border-red-500/20 font-bold text-xs">
                            <AlertCircle className="w-3 h-3 mr-1" /> TrÃ¹ng Lá»‹ch
                          </Badge>
                          <p className="text-[11px] text-red-600 font-medium">
                            âš  TrÃ¹ng lá»‹ch vá»›i lá»›p <span className="font-bold">{conflict.conflictingClassName}</span> vÃ o {conflict.conflictTime}
                          </p>
                          <Button
                            size="sm"
                            disabled
                            className="h-8 text-xs opacity-50 bg-slate-300 text-slate-600 cursor-not-allowed"
                          >
                            KhÃ´ng Thá»ƒ Chá»n
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
                              <Check className="w-3.5 h-3.5 mr-1" /> ÄÃ£ Chá»n
                            </>
                          ) : (
                            "Chá»n GiÃ¡o ViÃªn"
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
                <ArrowLeft className="w-4 h-4 mr-1.5" /> Quay Láº¡i BÆ°á»›c 1
              </Button>
              <Button
                onClick={handleCompleteClassCreation}
                disabled={!selectedTeacherId || submitting}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6"
              >
                {submitting ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Check className="w-4 h-4 mr-1.5" />} HoÃ n Táº¥t Táº¡o Lá»›p Há»c
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
