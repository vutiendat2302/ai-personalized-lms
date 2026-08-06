import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DatePickerInput, formatDateDisplay } from "@/components/ui/DatePickerInput";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  ShieldAlert,
  Flame,
  Award,
  BookOpen,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Edit2,
  Save,
  Mail,
  Phone,
  User,
  Activity,
  CreditCard,
  FileSpreadsheet,
  Loader2
} from "lucide-react";
import { studentApi, type StudentProfileData, type GuardianData, type StudyGoalData, type LearningActivityData, type EnrollmentData, type StudentOrderData, type StudentOrderDetailData, type StudentPaymentData } from "@/api/students/studentApi";
import { userApi } from "@/api/users/userApi";

const ACTIVITY_LABELS: Record<string, string> = { LESSON_VIEW: "Xem bài học", LESSON_COMPLETE: "Hoàn thành bài học", QUIZ_SUBMIT: "Nộp bài kiểm tra", RESOURCE_DOWNLOAD: "Tải tài liệu", LEARNING_SESSION_END: "Kết thúc phiên học" };

interface StudentDetailModalProps {
  open: boolean;
  onClose: () => void;
  student: StudentProfileData | null;
  onUpdateStudent?: (updated: Partial<StudentProfileData>) => void;
  onShowBanner?: (msg: string, isError?: boolean) => void;
  initialTab?: "general" | "goals";
}

export const StudentDetailModal: React.FC<StudentDetailModalProps> = ({
  open,
  onClose,
  student,
  onUpdateStudent,
  onShowBanner,
  initialTab = "general"
}) => {
  if (!student) return null;

  const [activeTab, setActiveTab] = useState("general");

  useEffect(() => { if (open) setActiveTab(initialTab); }, [open, initialTab, student.userId]);
  
  // Tab 1 Inline Edit State
  const [editingGeneral, setEditingGeneral] = useState(false);
  const [fullNameInput, setFullNameInput] = useState(student.fullName || "");
  const [emailInput, setEmailInput] = useState(student.email || "");
  const [phoneInput, setPhoneInput] = useState(student.phone || "");
  const [dobInput, setDobInput] = useState(student.dateOfBirth || "");
  const [addressInput, setAddressInput] = useState(student.address || "");
  const [schoolInput, setSchoolInput] = useState(student.schoolName || "");

  // Tab 2 Guardians
  const [guardians, setGuardians] = useState<GuardianData[]>([]);
  const [showAddGuardian, setShowAddGuardian] = useState(false);
  const [guardianName, setGuardianName] = useState("");
  const [guardianPhone, setGuardianPhone] = useState("");
  const [guardianRel, setGuardianRel] = useState<"FATHER" | "MOTHER" | "GUARDIAN" | "OTHER">("FATHER");

  // Tab 3 Study Goals
  const [goals, setGoals] = useState<StudyGoalData[]>([]);
  const [goalFilterStatus, setGoalFilterStatus] = useState<string>("ALL");

  // Tab 4 Interests
  const [interests, setInterests] = useState<string[]>([]);
  const [activities, setActivities] = useState<LearningActivityData[]>([]);
  const [enrollments, setEnrollments] = useState<EnrollmentData[]>([]);
  const [orders, setOrders] = useState<StudentOrderData[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [orderDetail, setOrderDetail] = useState<StudentOrderDetailData | null>(null);
  const [orderPayments, setOrderPayments] = useState<StudentPaymentData[]>([]);
  const [orderDetailLoading, setOrderDetailLoading] = useState(false);
  const [orderDetailError, setOrderDetailError] = useState("");
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [activitiesError, setActivitiesError] = useState("");
  const [enrollmentsError, setEnrollmentsError] = useState("");
  const [ordersError, setOrdersError] = useState("");
  const [saving, setSaving] = useState(false);
  const [exportingDetail, setExportingDetail] = useState(false);
  const [expandedActivityId, setExpandedActivityId] = useState<string | null>(null);
  const [enrollmentClassFilter, setEnrollmentClassFilter] = useState("ALL");
  const [enrollmentStatusFilter, setEnrollmentStatusFilter] = useState("ALL");

  const toggleOrderDetail = async (orderId: string) => {
    if (selectedOrderId === orderId) {
      setSelectedOrderId(null); setOrderDetail(null); setOrderPayments([]); setOrderDetailError("");
      return;
    }
    setSelectedOrderId(orderId); setOrderDetail(null); setOrderPayments([]); setOrderDetailError(""); setOrderDetailLoading(true);
    try {
      const [detail, payments] = await Promise.all([
        studentApi.getOrderDetail(orderId),
        studentApi.getOrderPayments(orderId),
      ]);
      setOrderDetail(detail); setOrderPayments(payments);
    } catch (error: any) {
      setOrderDetailError(error?.message || "Không tải được chi tiết đơn hàng.");
    } finally { setOrderDetailLoading(false); }
  };

  useEffect(() => {
    if (student) {
      setFullNameInput(student.fullName || "");
      setEmailInput(student.email || "");
      setPhoneInput(student.phone || "");
      setDobInput(student.dateOfBirth || "");
      setAddressInput(student.address || "");
      setSchoolInput(student.schoolName || "");

      setDetailLoading(true);
      setDetailError("");
      setGuardians([]); setGoals([]); setInterests([]); setActivities([]); setEnrollments([]); setOrders([]);
      setActivitiesError(""); setEnrollmentsError(""); setOrdersError("");
      Promise.allSettled([
        student.isMinor ? studentApi.getGuardians(student.userId) : Promise.resolve([]),
        studentApi.getStudyGoals(student.userId),
        studentApi.getStudentInterests(student.userId),
        studentApi.getLearningActivities(student.userId),
        studentApi.getEnrollments(student.userId),
        studentApi.getOrders(student.userId),
      ]).then(([guardianData, goalData, interestData, activityData, enrollmentData, orderData]) => {
        if (guardianData.status === "fulfilled") setGuardians(guardianData.value); else setDetailError("Không tải được thông tin người giám hộ.");
        if (goalData.status === "fulfilled") setGoals(goalData.value); else setDetailError("Không tải được mục tiêu học tập.");
        if (interestData.status === "fulfilled") setInterests(interestData.value); else setDetailError("Không tải được sở thích học viên.");
        if (activityData.status === "fulfilled") setActivities(activityData.value); else setActivitiesError("Không tải được nhật ký hoạt động học tập.");
        if (enrollmentData.status === "fulfilled") setEnrollments(enrollmentData.value); else setEnrollmentsError("Không tải được dữ liệu lớp học và kết quả.");
        if (orderData.status === "fulfilled") setOrders(orderData.value); else setOrdersError("Không tải được dữ liệu học phí và thanh toán.");
      })
        .finally(() => setDetailLoading(false));
    }
  }, [student]);

  const handleSaveGeneral = async () => {
    const updated = {
      fullName: fullNameInput,
      email: emailInput,
      phone: phoneInput,
      dateOfBirth: dobInput,
      address: addressInput,
      schoolName: schoolInput
    };
    setSaving(true);
    try {
      await Promise.all([
        userApi.updateUser(student.userId, { fullName: fullNameInput, phone: phoneInput, gender: student.gender, dateOfBirth: dobInput.slice(0, 10), status: student.status }),
        studentApi.updateStudentProfile(student.userId, { schoolName: schoolInput }),
      ]);
      onUpdateStudent?.(updated); setEditingGeneral(false);
      onShowBanner?.("Cập nhật thông tin học viên thành công!");
    } catch (error: any) {
      onShowBanner?.(error.message || "Không thể cập nhật học viên", true);
    } finally { setSaving(false); }
  };

  const handleAddGuardianSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guardianName.trim() || !guardianPhone.trim()) return;
    setSaving(true);
    try {
      const response = await studentApi.addGuardian({ studentUserId: student.userId, fullName: guardianName.trim(), phone: guardianPhone.trim(), relationship: guardianRel });
      if (response.data.data) setGuardians(previous => [...previous, response.data.data!]);
      setGuardianName(""); setGuardianPhone(""); setShowAddGuardian(false);
      onShowBanner?.("Thêm người giám hộ thành công!");
    } catch (error: any) { onShowBanner?.(error.message || "Không thể thêm người giám hộ", true); }
    finally { setSaving(false); }
  };

  const filteredGoals = goalFilterStatus === "ALL"
    ? goals
    : goals.filter(g => g.status === goalFilterStatus);
  const filteredEnrollments = enrollments.filter(enrollment =>
    (enrollmentClassFilter === "ALL" || String(enrollment.classId || "UNASSIGNED") === enrollmentClassFilter) &&
    (enrollmentStatusFilter === "ALL" || String(enrollment.status) === enrollmentStatusFilter));

  const exportStudentDetail = async () => {
    setExportingDetail(true);
    try {
      const response = await userApi.exportUserDetailToExcel(student.userId);
      const url = URL.createObjectURL(new Blob([response.data], { type: "text/csv;charset=utf-8" }));
      const anchor = document.createElement("a"); anchor.href = url; anchor.download = `hoc-vien-${student.studentCode}.csv`; anchor.click(); URL.revokeObjectURL(url);
      onShowBanner?.("Đã xuất CSV chi tiết học viên.");
    } catch (error: any) { onShowBanner?.(error.message || "Không thể xuất CSV chi tiết học viên.", true); }
    finally { setExportingDetail(false); }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => { if (!val) onClose(); }}>
      <DialogContent className="max-w-6xl w-[94vw] max-h-[94vh] flex flex-col p-0 overflow-hidden rounded-2xl bg-card border border-border/40 shadow-2xl backdrop-blur-xs">

        
        {/* FIXED HEADER (Avatar, Name, student_code, is_minor badge, current_streak, quick actions) */}
        <DialogHeader className="p-6 bg-linear-to-r from-primary/10 via-card to-card border-b border-border/40 shrink-0">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-primary/20 text-primary font-black text-2xl flex items-center justify-center border-2 border-primary/30 shrink-0">
                {student.fullName ? student.fullName.charAt(0).toUpperCase() : "S"}
              </div>

              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <DialogTitle className="text-2xl font-black tracking-tight text-foreground">
                    {student.fullName}
                  </DialogTitle>
                  <span className="font-mono text-xs font-extrabold px-2.5 py-0.5 rounded-lg bg-primary/10 text-primary border border-primary/20">
                    {student.studentCode}
                  </span>
                  {student.isMinor ? (
                    <Badge variant="destructive" className="font-bold text-xs gap-1">
                      <ShieldAlert className="h-3 w-3" /> Vị thành niên (&lt;18)
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="font-bold text-xs text-muted-foreground">
                      Người lớn (&ge;18)
                    </Badge>
                  )}
                </div>

                <DialogDescription className="text-xs text-muted-foreground mt-1 flex items-center gap-3">
                  <span>Email: <strong className="text-foreground">{student.email}</strong></span>
                  <span>SĐT: <strong className="text-foreground">{student.phone || "Chưa cập nhật"}</strong></span>
                </DialogDescription>
              </div>
            </div>

            {/* Streak & Quick Action Buttons */}
            <div className="flex items-center gap-3 shrink-0">
              <Button size="sm" variant="outline" onClick={exportStudentDetail} disabled={exportingDetail} className="font-bold text-xs gap-1">{exportingDetail ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4 text-emerald-600" />} Xuất CSV</Button>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-600 font-extrabold text-sm">
                <Flame className="h-5 w-5 fill-amber-500 text-amber-500" />
                <span>Streak: {student.currentStreak ?? 0} ngày</span>
              </div>

              <Button size="sm" onClick={() => setActiveTab("general")} className="font-bold text-xs gap-1">
                <Award className="h-4 w-4" /> Tiến độ
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* 7 TABS NAVIGATION */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <TabsList className="px-6 border-b border-border/30 bg-muted/20 justify-start gap-4 rounded-none h-12 overflow-x-auto">
            <TabsTrigger value="general" className="font-bold text-xs gap-1.5"><User className="h-3.5 w-3.5" /> Thông tin chung</TabsTrigger>
            <TabsTrigger value="activities" className="font-bold text-xs gap-1.5"><Activity className="h-3.5 w-3.5" /> Hoạt động học tập</TabsTrigger>
            <TabsTrigger value="tuition" className="font-bold text-xs gap-1.5"><CreditCard className="h-3.5 w-3.5" /> Học phí / Thanh toán</TabsTrigger>
            <TabsTrigger value="classes" className="font-bold text-xs gap-1.5"><BookOpen className="h-3.5 w-3.5" /> Lớp học & Kết quả</TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {detailLoading && <div className="flex min-h-48 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>}
            {detailError && !detailLoading && <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-center text-sm font-semibold text-red-600">Không tải được dữ liệu chi tiết học viên.<div className="mt-1 text-xs font-normal text-muted-foreground">{detailError}</div></div>}
            
            {/* TAB 1: THÔNG TIN CHUNG (Inline Edit) */}
            <TabsContent value="general" className="mt-0 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-extrabold text-foreground">Hồ sơ cá nhân</h4>
                {!editingGeneral ? (
                  <Button size="sm" variant="outline" onClick={() => setEditingGeneral(true)} className="gap-1 font-bold text-xs">
                    <Edit2 className="h-3.5 w-3.5" /> Chỉnh sửa
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSaveGeneral} disabled={saving} className="gap-1 font-bold text-xs bg-emerald-600 text-white">
                      <Save className="h-3.5 w-3.5" /> Lưu
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingGeneral(false)} className="gap-1 text-xs">
                      Hủy
                    </Button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4"><div className="text-xs font-semibold text-muted-foreground">Streak hiện tại</div><div className="mt-1 flex items-center gap-2 text-2xl font-black text-amber-600"><Flame className="h-5 w-5 fill-amber-500" />{student.currentStreak ?? 0} ngày</div></div>
                <div className="rounded-xl border border-orange-500/20 bg-orange-500/10 p-4"><div className="text-xs font-semibold text-muted-foreground">Streak dài nhất</div><div className="mt-1 flex items-center gap-2 text-2xl font-black text-orange-600"><Award className="h-5 w-5" />{student.longestStreak ?? 0} ngày</div></div>
                <div>
                  <Label className="text-xs font-bold text-muted-foreground">Mã Học viên (Readonly)</Label>
                  <Input value={student.studentCode} readOnly className="mt-1 bg-muted/60 font-mono font-bold text-xs cursor-text select-text" />
                </div>

                <div>
                  <Label className="text-xs font-bold text-muted-foreground">User ID (Readonly)</Label>
                  <Input value={student.userId} readOnly className="mt-1 bg-muted/60 font-mono font-bold text-xs cursor-text select-text" />
                </div>

                <div>
                  <Label className="text-xs font-bold text-muted-foreground">Họ và Tên</Label>
                  <Input value={fullNameInput} onChange={e => setFullNameInput(e.target.value)} readOnly={!editingGeneral} className={`mt-1 text-xs font-bold ${!editingGeneral ? "bg-muted/40 cursor-text select-text" : "bg-background border-primary/50"}`} />
                </div>

                <div>
                  <Label className="text-xs font-bold text-muted-foreground">Email</Label>
                  <Input value={emailInput} onChange={e => setEmailInput(e.target.value)} readOnly={!editingGeneral} className={`mt-1 text-xs ${!editingGeneral ? "bg-muted/40 cursor-text select-text" : "bg-background border-primary/50"}`} />
                </div>

                <div>
                  <Label className="text-xs font-bold text-muted-foreground">Số điện thoại</Label>
                  <Input value={phoneInput} onChange={e => setPhoneInput(e.target.value)} readOnly={!editingGeneral} className={`mt-1 text-xs ${!editingGeneral ? "bg-muted/40 cursor-text select-text" : "bg-background border-primary/50"}`} />
                </div>

                <div>
                  <Label className="text-xs font-bold text-muted-foreground">Ngày sinh</Label>
                  <DatePickerInput value={dobInput} onChange={setDobInput} readOnly={!editingGeneral} className={`mt-1 text-xs ${!editingGeneral ? "bg-muted/40 cursor-text select-text" : "bg-background border-primary/50"}`} />
                </div>

                <div>
                  <Label className="text-xs font-bold text-muted-foreground">Trường học / Đào tạo</Label>
                  <Input value={schoolInput} onChange={e => setSchoolInput(e.target.value)} readOnly={!editingGeneral} className={`mt-1 text-xs ${!editingGeneral ? "bg-muted/40 cursor-text select-text" : "bg-background border-primary/50"}`} />
                </div>

                <div>
                  <Label className="text-xs font-bold text-muted-foreground">Địa chỉ liên hệ</Label>
                  <Input value={addressInput} onChange={e => setAddressInput(e.target.value)} readOnly={!editingGeneral} className={`mt-1 text-xs ${!editingGeneral ? "bg-muted/40 cursor-text select-text" : "bg-background border-primary/50"}`} />
                </div>
              </div>

              <div className="mt-6 space-y-3 rounded-2xl border border-primary/20 bg-linear-to-br from-primary/5 to-card p-4">
                <div className="flex flex-wrap items-center justify-between gap-2"><div><h4 className="text-sm font-extrabold text-foreground">Mục tiêu học tập chi tiết</h4><p className="text-xs text-muted-foreground">Mục tiêu tổng quan và tiến độ hiện tại của học viên</p></div><Badge variant="outline" className="text-xs">{goals.length} mục tiêu</Badge></div>
                {student.goal && <div className="rounded-xl border bg-background/70 p-3"><div className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Định hướng tổng quan</div><p className="mt-1 text-sm font-semibold text-foreground">{student.goal}</p></div>}
                <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                  {goals.map(goal => <div key={goal.id} className="rounded-xl border bg-background p-4 shadow-xs"><div className="flex items-start justify-between gap-2"><div><div className="font-bold text-foreground">{goal.goalType}</div><div className="mt-1 text-xs text-muted-foreground">Chỉ tiêu: <strong className="text-foreground">{goal.targetValue}</strong></div></div><Badge variant={goal.status === "COMPLETED" ? "default" : goal.status === "IN_PROGRESS" ? "outline" : "destructive"}>{goal.status}</Badge></div><div className="mt-3"><div className="mb-1 flex justify-between text-xs font-semibold"><span>Tiến độ</span><span>{goal.progressPercent}%</span></div><Progress value={goal.progressPercent} className="h-2" /></div><div className="mt-3 grid grid-cols-2 gap-2 text-xs"><div className="rounded-lg bg-amber-500/10 p-2 text-amber-700">Streak hiện tại: <strong>{goal.currentStreak || 0} ngày</strong></div><div className="rounded-lg bg-orange-500/10 p-2 text-orange-700">Dài nhất: <strong>{goal.longestStreak || 0} ngày</strong></div></div></div>)}
                </div>
                {!detailLoading && goals.length === 0 && <div className="rounded-xl border border-dashed p-6 text-center text-xs text-muted-foreground">Học viên chưa thiết lập mục tiêu học tập chi tiết.</div>}
              </div>
            </TabsContent>

            {/* TAB 2: NGƯỜI GIÁM HỘ (chỉ hiện khi is_minor = true) */}
            {student.isMinor && (
              <div className="mt-6 space-y-4 border-t pt-5">
                {guardians.length === 0 && (
                  <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-extrabold">
                      <AlertTriangle className="h-5 w-5 shrink-0" />
                      <span>CẢNH BÁO: Học viên vị thành niên bắt buộc phải có thông tin Người giám hộ liên kết!</span>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-extrabold text-foreground">Danh sách Người giám hộ (Phụ huynh)</h4>
                  <Button size="sm" onClick={() => setShowAddGuardian(true)} className="gap-1 font-bold text-xs">
                    <Plus className="h-3.5 w-3.5" /> Thêm Người Giám Hộ
                  </Button>
                </div>

                {showAddGuardian && (
                  <form onSubmit={handleAddGuardianSubmit} className="p-4 rounded-xl border border-primary/30 bg-primary/5 space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <Label className="text-xs font-bold">Họ và tên</Label>
                        <Input value={guardianName} onChange={e => setGuardianName(e.target.value)} placeholder="Nhập tên phụ huynh..." className="mt-1 text-xs" />
                      </div>
                      <div>
                        <Label className="text-xs font-bold">Số điện thoại</Label>
                        <Input value={guardianPhone} onChange={e => setGuardianPhone(e.target.value)} placeholder="09xxxx..." className="mt-1 text-xs" />
                      </div>
                      <div>
                        <Label className="text-xs font-bold">Mối quan hệ</Label>
                        <select value={guardianRel} onChange={e => setGuardianRel(e.target.value as any)} className="w-full mt-1 h-9 rounded-md border text-xs px-2 bg-background font-bold">
                          <option value="FATHER">Bố (Father)</option>
                          <option value="MOTHER">Mẹ (Mother)</option>
                          <option value="GUARDIAN">Người giám hộ pháp lý</option>
                        </select>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-1">
                      <Button type="button" variant="ghost" size="sm" onClick={() => setShowAddGuardian(false)} className="text-xs">Hủy</Button>
                      <Button type="submit" size="sm" className="text-xs font-bold">Lưu thông tin</Button>
                    </div>
                  </form>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {guardians.map(g => (
                    <Card key={g.id} className="border-border shadow-xs">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-extrabold flex items-center justify-between">
                          <span>{g.fullName}</span>
                          <Badge variant="outline" className="text-[10px] font-bold">{g.relationship}</Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="text-xs space-y-1 text-muted-foreground">
                        <p><Phone className="h-3 w-3 inline mr-1" /> SĐT: <strong className="text-foreground">{g.phone}</strong></p>
                        <p><Mail className="h-3 w-3 inline mr-1" /> Email: <strong className="text-foreground">{g.email || "N/A"}</strong></p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 3: MỤC TIÊU HỌC TẬP (study_goal) */}
            <div className="mt-6 space-y-4 border-t pt-5">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h4 className="text-sm font-extrabold text-foreground">Danh sách Mục tiêu Học tập (Study Goals)</h4>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-muted-foreground">Lọc trạng thái:</span>
                  <select value={goalFilterStatus} onChange={e => setGoalFilterStatus(e.target.value)} className="h-8 text-xs font-bold rounded-lg border px-2 bg-background">
                    <option value="ALL">Tất cả</option>
                    <option value="IN_PROGRESS">IN_PROGRESS</option>
                    <option value="COMPLETED">COMPLETED</option>
                    <option value="FAILED">FAILED</option>
                  </select>
                </div>
              </div>

              <div className="space-y-3">
                {filteredGoals.map(g => (
                  <Card key={g.id} className="border-border shadow-xs">
                    <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-sm text-foreground">{g.goalType}</span>
                          <Badge variant={g.status === "COMPLETED" ? "default" : g.status === "IN_PROGRESS" ? "outline" : "destructive"} className="text-[10px] font-bold">
                            {g.status}
                          </Badge>
                          {g.status === "COMPLETED" && (
                            <span className="text-[10px] font-black text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3" /> Vừa Hoàn Thành!
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">Chỉ tiêu: <strong className="text-foreground">{g.targetValue}</strong> | Streak hiện tại: <strong className="text-amber-600">{g.currentStreak} ngày</strong></p>
                      </div>

                      <div className="w-full md:w-1/3 space-y-1">
                        <div className="flex justify-between text-xs font-bold">
                          <span>Tiến độ</span>
                          <span>{g.progressPercent}%</span>
                        </div>
                        <Progress value={g.progressPercent} className="h-2" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* TAB 4: SỞ THÍCH (interests) */}
            <div className="mt-6 space-y-4 border-t pt-5">
              <h4 className="text-sm font-extrabold text-foreground">Thẻ Sở thích & Định hướng khóa học</h4>
              
              <div className="flex flex-wrap gap-2 pt-2">
                {interests.map(item => (
                  <span key={item} className="px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 text-xs font-bold">{item}</span>
                ))}
                {!detailLoading && interests.length === 0 && <p className="text-xs text-muted-foreground">Học viên chưa chọn lĩnh vực quan tâm.</p>}
              </div>
            </div>

            {/* TAB 5: HOẠT ĐỘNG HỌC TẬP (Timeline & Active hours) */}
            <TabsContent value="activities" className="mt-0 space-y-4">
              <h4 className="text-sm font-extrabold text-foreground pt-2">Nhật ký hoạt động học tập</h4>
              {activitiesError && <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs font-semibold text-red-600">{activitiesError}</div>}
              <div className="space-y-2 text-xs">
                {activities.slice().sort((a, b) => b.occurredAt.localeCompare(a.occurredAt)).map(activity => (
                  <button type="button" key={activity.id} onClick={() => setExpandedActivityId(current => current === activity.id ? null : activity.id)} className="w-full p-3 rounded-xl border bg-card hover:border-primary/30 text-left">
                    <div className="flex justify-between items-center"><div><div className="font-bold text-foreground">{ACTIVITY_LABELS[activity.eventType] || activity.eventType}</div><div className="text-[10px] text-muted-foreground">{activity.entityName || activity.entityType} · {formatDateDisplay(activity.occurredAt)}</div></div><Badge variant="outline" className="text-[10px] font-bold">{activity.device || "Web"}</Badge></div>
                    {expandedActivityId === activity.id && <div className="mt-3 grid gap-2 rounded-lg bg-muted/30 p-3 text-xs"><div><span className="text-muted-foreground">Đối tượng:</span> {activity.entityName || "Không xác định được đối tượng từ nhật ký"}</div>{activity.courseId && <Link to={`/admin/courses/${activity.courseId}`} state={{ returnTo: "/admin/students", studentId: student.userId }} className="font-semibold text-primary hover:underline">Khóa học: {activity.courseName || "Xem chi tiết khóa học"}</Link>}<div><span className="text-muted-foreground">Thiết bị:</span> {activity.device || "Không xác định"}</div><div className="break-all"><span className="text-muted-foreground">Metadata:</span> {activity.metadata || "Không có"}</div></div>}
                  </button>
                ))}
                {!detailLoading && activities.length === 0 && <p className="py-8 text-center text-muted-foreground">Chưa ghi nhận hoạt động học tập.</p>}
              </div>
            </TabsContent>

            {/* TAB 6: HỌC PHÍ / THANH TOÁN */}
            <TabsContent value="tuition" className="mt-0 space-y-4">
              {ordersError && <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs font-semibold text-red-600">{ordersError}</div>}
              {orders.map(order => <Card key={order.id} className="overflow-hidden border-border shadow-xs">
                <CardContent className="p-4 text-xs">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div><p className="font-bold">Đơn hàng #{order.id}</p><p className="text-muted-foreground">{formatDateDisplay(order.createdAt)}</p></div>
                    <div className="flex items-center gap-3"><div className="text-right"><Badge>{order.status}</Badge><p className="mt-1 font-black">{Number(order.finalAmount).toLocaleString("vi-VN")} VNĐ</p></div><Button type="button" size="sm" variant="outline" onClick={() => void toggleOrderDetail(order.id)}>{selectedOrderId === order.id ? "Thu gọn" : "Xem chi tiết"}</Button></div>
                  </div>
                  {selectedOrderId === order.id && <div className="mt-4 border-t pt-4">
                    {orderDetailLoading ? <div className="flex items-center justify-center gap-2 py-6 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Đang tải chi tiết...</div> : orderDetailError ? <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-destructive">{orderDetailError}</div> : orderDetail && <div className="space-y-4">
                      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4"><div className="rounded-xl bg-muted/40 p-3"><span className="text-muted-foreground">Tạm tính</span><strong className="mt-1 block">{Number(orderDetail.totalAmount).toLocaleString("vi-VN")} VNĐ</strong></div><div className="rounded-xl bg-muted/40 p-3"><span className="text-muted-foreground">Giảm giá</span><strong className="mt-1 block">{Number(orderDetail.discountAmount || 0).toLocaleString("vi-VN")} VNĐ</strong></div><div className="rounded-xl bg-primary/5 p-3"><span className="text-muted-foreground">Thanh toán</span><strong className="mt-1 block text-primary">{Number(orderDetail.finalAmount).toLocaleString("vi-VN")} VNĐ</strong></div><div className="rounded-xl bg-muted/40 p-3"><span className="text-muted-foreground">Mã giảm giá</span><strong className="mt-1 block">{orderDetail.couponCode || "Không sử dụng"}</strong></div></div>
                      <div><p className="mb-2 font-bold">Gói học trong đơn</p><div className="space-y-2">{orderDetail.items?.map(item => <div key={item.id} className="flex justify-between rounded-lg border p-3"><div><p className="font-semibold">{item.coursePackageName || `Gói học #${item.coursePackageId}`}</p><p className="text-[10px] text-muted-foreground">{item.itemType}</p></div><strong>{Number(item.priceSnapshot).toLocaleString("vi-VN")} VNĐ</strong></div>)}</div></div>
                      <div><p className="mb-2 font-bold">Giao dịch thanh toán</p>{orderPayments.length ? <div className="space-y-2">{orderPayments.map(payment => <div key={payment.id} className="grid gap-2 rounded-lg border p-3 sm:grid-cols-4"><div><span className="text-muted-foreground">Phương thức</span><strong className="block">{payment.paymentMethod || "—"}</strong></div><div><span className="text-muted-foreground">Mã giao dịch</span><strong className="block font-mono">{payment.transactionRef || "—"}</strong></div><div><span className="text-muted-foreground">Số tiền</span><strong className="block">{Number(payment.amount).toLocaleString("vi-VN")} VNĐ</strong></div><div><span className="text-muted-foreground">Trạng thái</span><div><Badge variant="outline">{payment.status}</Badge></div></div></div>)}</div> : <p className="rounded-lg border border-dashed p-4 text-center text-muted-foreground">Đơn hàng chưa có giao dịch thanh toán.</p>}</div>
                    </div>}
                  </div>}
                </CardContent>
              </Card>)}
              {!detailLoading && orders.length === 0 && <p className="py-8 text-center text-xs text-muted-foreground">Chưa có dữ liệu học phí hoặc thanh toán.</p>}
            </TabsContent>

            {/* TAB 7: LỚP HỌC & KẾT QUẢ */}
            <TabsContent value="classes" className="mt-0 space-y-4">
              <div className="flex flex-wrap items-end justify-between gap-3"><h4 className="text-sm font-extrabold text-foreground">Lớp học đăng ký & Kết quả</h4><div className="flex gap-2"><select value={enrollmentClassFilter} onChange={event => setEnrollmentClassFilter(event.target.value)} className="h-9 rounded-lg border bg-background px-2 text-xs"><option value="ALL">Tất cả lớp học</option><option value="UNASSIGNED">Chưa xếp lớp</option>{Array.from(new Map(enrollments.filter(item => item.classId).map(item => [String(item.classId), item.className || `Lớp #${item.classId}`])).entries()).map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select><select value={enrollmentStatusFilter} onChange={event => setEnrollmentStatusFilter(event.target.value)} className="h-9 rounded-lg border bg-background px-2 text-xs"><option value="ALL">Tất cả trạng thái</option><option value="0">Đang học</option><option value="1">Hoàn thành</option><option value="2">Hết hạn</option><option value="3">Đã hủy</option></select></div></div>
              {enrollmentsError && <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs font-semibold text-red-600">{enrollmentsError}</div>}
              {filteredEnrollments.map(enrollment => <Card key={enrollment.id} className="border-border shadow-xs hover:border-primary/30"><CardContent className="p-4 flex justify-between text-xs"><div className="space-y-1"><Link to={`/admin/courses/${enrollment.courseId}`} state={{ returnTo: "/admin/students", studentId: student.userId }} className="font-bold text-primary hover:underline">{enrollment.courseName || `Khóa học #${enrollment.courseId}`}</Link>{enrollment.classId ? <div><Link to={`/admin/classes/${enrollment.classId}`} state={{ returnTo: "/admin/students", studentId: student.userId }} className="text-muted-foreground hover:text-primary hover:underline">{enrollment.className || `Lớp #${enrollment.classId}`}</Link></div> : <p className="text-muted-foreground">Chưa xếp lớp</p>}</div><Badge variant="outline">{enrollment.status === 0 ? "Đang học" : enrollment.status === 1 ? "Hoàn thành" : "Đã kết thúc"}</Badge></CardContent></Card>)}
              {!detailLoading && enrollments.length === 0 && <p className="py-8 text-center text-xs text-muted-foreground">Học viên chưa ghi danh khóa học.</p>}
            </TabsContent>

          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
