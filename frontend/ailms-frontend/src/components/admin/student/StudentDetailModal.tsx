import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  GraduationCap,
  UserCheck,
  ShieldAlert,
  Flame,
  Award,
  BookOpen,
  Clock,
  DollarSign,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Trash2,
  Edit2,
  Save,
  X,
  Mail,
  Phone,
  User,
  Heart,
  Activity,
  CreditCard
} from "lucide-react";
import { studentApi, type StudentProfileData, type GuardianData, type StudyGoalData } from "@/api/students/studentApi";

interface StudentDetailModalProps {
  open: boolean;
  onClose: () => void;
  student: StudentProfileData | null;
  onUpdateStudent?: (updated: Partial<StudentProfileData>) => void;
  onShowBanner?: (msg: string, isError?: boolean) => void;
}

export const StudentDetailModal: React.FC<StudentDetailModalProps> = ({
  open,
  onClose,
  student,
  onUpdateStudent,
  onShowBanner
}) => {
  if (!student) return null;

  const [activeTab, setActiveTab] = useState("general");
  
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
  const [newInterestInput, setNewInterestInput] = useState("");

  useEffect(() => {
    if (student) {
      setFullNameInput(student.fullName || "");
      setEmailInput(student.email || "");
      setPhoneInput(student.phone || "");
      setDobInput(student.dateOfBirth || "");
      setAddressInput(student.address || "");
      setSchoolInput(student.schoolName || "");

      // Load Guardians if minor
      if (student.isMinor) {
        studentApi.getGuardians(student.id).then(setGuardians);
      }
      studentApi.getStudyGoals(student.id).then(setGoals);
      studentApi.getStudentInterests(student.id).then(setInterests);
    }
  }, [student]);

  const handleSaveGeneral = () => {
    const updated = {
      fullName: fullNameInput,
      email: emailInput,
      phone: phoneInput,
      dateOfBirth: dobInput,
      address: addressInput,
      schoolName: schoolInput
    };
    if (onUpdateStudent) onUpdateStudent(updated);
    setEditingGeneral(false);
    if (onShowBanner) onShowBanner("Cập nhật thông tin học viên thành công!");
  };

  const handleAddGuardianSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!guardianName.trim() || !guardianPhone.trim()) return;
    const newG: GuardianData = {
      id: `g-${Date.now()}`,
      fullName: guardianName,
      phone: guardianPhone,
      relationship: guardianRel
    };
    setGuardians([...guardians, newG]);
    setGuardianName("");
    setGuardianPhone("");
    setShowAddGuardian(false);
    if (onShowBanner) onShowBanner("Thêm người giám hộ thành công!");
  };

  const handleAddInterest = () => {
    if (!newInterestInput.trim()) return;
    if (!interests.includes(newInterestInput.trim())) {
      setInterests([...interests, newInterestInput.trim()]);
    }
    setNewInterestInput("");
  };

  const handleRemoveInterest = (item: string) => {
    setInterests(interests.filter(i => i !== item));
  };

  const filteredGoals = goalFilterStatus === "ALL"
    ? goals
    : goals.filter(g => g.status === goalFilterStatus);

  return (
    <Dialog open={open} onOpenChange={(val) => { if (!val) onClose(); }}>
      <DialogContent className="max-w-6xl w-[94vw] max-h-[94vh] flex flex-col p-0 overflow-hidden rounded-2xl bg-card border border-border/40 shadow-2xl backdrop-blur-xs">

        
        {/* FIXED HEADER (Avatar, Name, student_code, is_minor badge, current_streak, quick actions) */}
        <DialogHeader className="p-6 bg-gradient-to-r from-primary/10 via-card to-card border-b border-border/40 shrink-0">
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
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-600 font-extrabold text-sm">
                <Flame className="h-5 w-5 fill-amber-500 text-amber-500" />
                <span>Streak: {student.currentStreak || 5} ngày</span>
              </div>

              <Button size="sm" onClick={() => setActiveTab("goals")} className="font-bold text-xs gap-1">
                <Award className="h-4 w-4" /> Tiến độ
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* 7 TABS NAVIGATION */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <TabsList className="px-6 border-b border-border/30 bg-muted/20 justify-start gap-4 rounded-none h-12 overflow-x-auto">
            <TabsTrigger value="general" className="font-bold text-xs gap-1.5"><User className="h-3.5 w-3.5" /> Thông tin chung</TabsTrigger>
            {student.isMinor && (
              <TabsTrigger value="guardian" className="font-bold text-xs gap-1.5 text-red-600"><ShieldAlert className="h-3.5 w-3.5" /> Người giám hộ ({guardians.length})</TabsTrigger>
            )}
            <TabsTrigger value="goals" className="font-bold text-xs gap-1.5"><Award className="h-3.5 w-3.5" /> Mục tiêu học tập</TabsTrigger>
            <TabsTrigger value="interests" className="font-bold text-xs gap-1.5"><Heart className="h-3.5 w-3.5" /> Sở thích ({interests.length})</TabsTrigger>
            <TabsTrigger value="activities" className="font-bold text-xs gap-1.5"><Activity className="h-3.5 w-3.5" /> Hoạt động học tập</TabsTrigger>
            <TabsTrigger value="tuition" className="font-bold text-xs gap-1.5"><CreditCard className="h-3.5 w-3.5" /> Học phí / Thanh toán</TabsTrigger>
            <TabsTrigger value="classes" className="font-bold text-xs gap-1.5"><BookOpen className="h-3.5 w-3.5" /> Lớp học & Kết quả</TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            
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
                    <Button size="sm" onClick={handleSaveGeneral} className="gap-1 font-bold text-xs bg-emerald-600 text-white">
                      <Save className="h-3.5 w-3.5" /> Lưu
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingGeneral(false)} className="gap-1 text-xs">
                      Hủy
                    </Button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-bold text-muted-foreground">Mã Học viên (Readonly)</Label>
                  <Input value={student.studentCode} disabled className="mt-1 bg-muted/30 font-mono font-bold text-xs" />
                </div>

                <div>
                  <Label className="text-xs font-bold text-muted-foreground">User ID (Readonly)</Label>
                  <Input value={student.userId} disabled className="mt-1 bg-muted/30 font-mono font-bold text-xs" />
                </div>

                <div>
                  <Label className="text-xs font-bold text-muted-foreground">Họ và Tên</Label>
                  <Input value={fullNameInput} onChange={e => setFullNameInput(e.target.value)} disabled={!editingGeneral} className="mt-1 text-xs font-bold" />
                </div>

                <div>
                  <Label className="text-xs font-bold text-muted-foreground">Email</Label>
                  <Input value={emailInput} onChange={e => setEmailInput(e.target.value)} disabled={!editingGeneral} className="mt-1 text-xs" />
                </div>

                <div>
                  <Label className="text-xs font-bold text-muted-foreground">Số điện thoại</Label>
                  <Input value={phoneInput} onChange={e => setPhoneInput(e.target.value)} disabled={!editingGeneral} className="mt-1 text-xs" />
                </div>

                <div>
                  <Label className="text-xs font-bold text-muted-foreground">Ngày sinh</Label>
                  <Input type="date" value={dobInput} onChange={e => setDobInput(e.target.value)} disabled={!editingGeneral} className="mt-1 text-xs" />
                </div>

                <div>
                  <Label className="text-xs font-bold text-muted-foreground">Trường học / Đào tạo</Label>
                  <Input value={schoolInput} onChange={e => setSchoolInput(e.target.value)} disabled={!editingGeneral} className="mt-1 text-xs" />
                </div>

                <div>
                  <Label className="text-xs font-bold text-muted-foreground">Địa chỉ liên hệ</Label>
                  <Input value={addressInput} onChange={e => setAddressInput(e.target.value)} disabled={!editingGeneral} className="mt-1 text-xs" />
                </div>
              </div>
            </TabsContent>

            {/* TAB 2: NGƯỜI GIÁM HỘ (chỉ hiện khi is_minor = true) */}
            {student.isMinor && (
              <TabsContent value="guardian" className="mt-0 space-y-4">
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
              </TabsContent>
            )}

            {/* TAB 3: MỤC TIÊU HỌC TẬP (study_goal) */}
            <TabsContent value="goals" className="mt-0 space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h4 className="text-sm font-extrabold text-foreground">Danh sách Mục tiêu Học tập (Study Goals)</h4>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-muted-foreground">Lọc trạng thái:</span>
                  <select value={goalFilterStatus} onChange={e => setGoalFilterStatus(e.target.value)} className="h-8 text-xs font-bold rounded-lg border px-2 bg-background">
                    <option value="ALL">Tất cả</option>
                    <option value="ACTIVE">ACTIVE</option>
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
                          <Badge variant={g.status === "COMPLETED" ? "default" : g.status === "ACTIVE" ? "outline" : "destructive"} className="text-[10px] font-bold">
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
            </TabsContent>

            {/* TAB 4: SỞ THÍCH (interests) */}
            <TabsContent value="interests" className="mt-0 space-y-4">
              <h4 className="text-sm font-extrabold text-foreground">Thẻ Sở thích & Định hướng khóa học</h4>
              
              <div className="flex items-center gap-2">
                <Input
                  value={newInterestInput}
                  onChange={e => setNewInterestInput(e.target.value)}
                  placeholder="Thêm sở thích mới (VD: AI, Mobile Flutter...)"
                  className="max-w-xs text-xs"
                />
                <Button size="sm" onClick={handleAddInterest} className="text-xs font-bold gap-1">
                  <Plus className="h-3.5 w-3.5" /> Thêm
                </Button>
              </div>

              <div className="flex flex-wrap gap-2 pt-2">
                {interests.map(item => (
                  <span key={item} className="px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 text-xs font-bold flex items-center gap-1.5">
                    {item}
                    <X onClick={() => handleRemoveInterest(item)} className="h-3 w-3 cursor-pointer hover:text-red-600" />
                  </span>
                ))}
              </div>

              <Card className="border-border shadow-xs bg-muted/20 mt-4">
                <CardHeader className="pb-2"><CardTitle className="text-xs font-bold text-primary">Gợi ý Khóa học Phù hợp (Recommendation Module)</CardTitle></CardHeader>
                <CardContent className="text-xs space-y-2">
                  <div className="p-2.5 rounded-lg bg-background border flex justify-between items-center">
                    <div>
                      <div className="font-bold">Khóa Lập trình Web Fullstack React/Node.js</div>
                      <div className="text-[10px] text-muted-foreground">Phù hợp dựa trên sở thích Lập trình Web</div>
                    </div>
                    <Button size="sm" variant="outline" className="text-[11px] font-bold">Xem chi tiết</Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB 5: HOẠT ĐỘNG HỌC TẬP (Timeline & Active hours) */}
            <TabsContent value="activities" className="mt-0 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="border-border shadow-xs">
                  <CardHeader className="pb-2"><CardTitle className="text-xs font-bold">Tổng thời gian học tập tích lũy</CardTitle></CardHeader>
                  <CardContent className="text-3xl font-black text-primary">48 Giờ 15 Phút</CardContent>
                </Card>

                <Card className="border-border shadow-xs">
                  <CardHeader className="pb-2"><CardTitle className="text-xs font-bold">Lần học gần nhất</CardTitle></CardHeader>
                  <CardContent className="text-sm font-bold text-foreground">Hôm nay - 09:30 AM (Bài 4: React Query)</CardContent>
                </Card>
              </div>

              <h4 className="text-sm font-extrabold text-foreground pt-2">Nhật ký phiên học (Learning Sessions)</h4>
              <div className="space-y-2 text-xs">
                <div className="p-3 rounded-xl border bg-card flex justify-between items-center">
                  <div>
                    <div className="font-bold text-foreground">Session #802 - Bài học Flexbox CSS</div>
                    <div className="text-[10px] text-muted-foreground">Thời gian active: 45 phút | Lý do kết thúc: Normal</div>
                  </div>
                  <Badge variant="outline" className="text-[10px] font-bold text-emerald-600 border-emerald-500/30">normal</Badge>
                </div>
                <div className="p-3 rounded-xl border bg-card flex justify-between items-center">
                  <div>
                    <div className="font-bold text-foreground">Session #801 - Kiểm tra trắc nghiệm HTML</div>
                    <div className="text-[10px] text-muted-foreground">Thời gian active: 15 phút | Lý do kết thúc: IDLE_TIMEOUT</div>
                  </div>
                  <Badge variant="outline" className="text-[10px] font-bold text-amber-600 border-amber-500/30">IDLE_TIMEOUT</Badge>
                </div>
              </div>
            </TabsContent>

            {/* TAB 6: HỌC PHÍ / THANH TOÁN */}
            <TabsContent value="tuition" className="mt-0 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="border-border shadow-xs bg-emerald-500/5 border-emerald-500/20">
                  <CardHeader className="pb-2"><CardTitle className="text-xs font-bold text-emerald-600">Công nợ hiện tại</CardTitle></CardHeader>
                  <CardContent className="text-2xl font-black text-emerald-600">0 VNĐ (Đã hoàn tất)</CardContent>
                </Card>
                <Card className="border-border shadow-xs">
                  <CardHeader className="pb-2"><CardTitle className="text-xs font-bold text-muted-foreground">Hạn thanh toán tiếp theo</CardTitle></CardHeader>
                  <CardContent className="text-2xl font-black text-foreground">15/08/2026</CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* TAB 7: LỚP HỌC & KẾT QUẢ */}
            <TabsContent value="classes" className="mt-0 space-y-4">
              <h4 className="text-sm font-extrabold text-foreground">Lớp học đăng ký & Nhận xét giảng viên</h4>
              <Card className="border-border shadow-xs">
                <CardContent className="p-4 space-y-2 text-xs">
                  <div className="flex justify-between font-bold text-sm">
                    <span>Lớp WEB-FULLSTACK-K26</span>
                    <Badge className="bg-emerald-600 text-white text-[10px]">Đang học</Badge>
                  </div>
                  <p className="text-muted-foreground">Giảng viên: Lê Minh Triết | Chuyên cần: <strong className="text-emerald-600">95%</strong></p>
                  <p className="text-muted-foreground">Nhận xét: Học viên tiếp thu bài nhanh, streak học tập đều đặn.</p>
                </CardContent>
              </Card>
            </TabsContent>

          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
