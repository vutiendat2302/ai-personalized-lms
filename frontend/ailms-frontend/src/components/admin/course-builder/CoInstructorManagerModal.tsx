import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../../../components/ui/dialog";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Badge } from "../../../components/ui/badge";
import { courseAuthoringApi } from "../../../api/courses/courseAuthoringApi";
import { Users, Mail, UserPlus, Trash2, Crown, CheckCircle2, Clock, Loader2, AlertCircle, Search, Building2, IdCard } from "lucide-react";
import { useToast } from "@/hooks/useToast";

interface CoInstructorManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  courseId: string;
  courseName: string;
  isOwner: boolean;
}

export const CoInstructorManagerModal: React.FC<CoInstructorManagerModalProps> = ({
  isOpen,
  onClose,
  courseId,
  courseName,
  isOwner,
}) => {
  const toast = useToast();
  const [instructors, setInstructors] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Invite Mode: "system" | "email"
  const [inviteTab, setInviteTab] = useState<"system" | "email">("system");

  // System Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [systemTeachers, setSystemTeachers] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [invitingId, setInvitingId] = useState<string | null>(null);

  // Email Invite State
  const [inviteEmail, setInviteEmail] = useState("");
  const [invitingEmail, setInvitingEmail] = useState(false);

  const fetchInstructors = async () => {
    if (!courseId) return;
    try {
      setLoading(true);
      const data = await courseAuthoringApi.getCourseInstructors(courseId);
      setInstructors(data || []);
    } catch (err: any) {
      toast.error("Không thể tải danh sách giảng viên phụ trách.");
    } finally {
      setLoading(false);
    }
  };

  const handleSearchTeachers = async (q: string) => {
    try {
      setSearching(true);
      const list = await courseAuthoringApi.searchTeachers(q);
      setSystemTeachers(list || []);
    } catch (err) {
      console.error("Search teachers failed:", err);
    } finally {
      setSearching(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchInstructors();
      if (isOwner) {
        handleSearchTeachers("");
      }
    }
  }, [isOpen, courseId]);

  useEffect(() => {
    if (isOpen && isOwner && inviteTab === "system") {
      const timer = setTimeout(() => {
        handleSearchTeachers(searchQuery);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [searchQuery, inviteTab]);

  const handleInviteById = async (instructorId: string, name: string) => {
    try {
      setInvitingId(instructorId);
      await courseAuthoringApi.inviteInstructor(courseId, { instructorId });
      toast.success(`Đã gửi thông báo lời mời tới giảng viên ${name}!`);
      fetchInstructors();
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || "Gửi lời mời thất bại.");
    } finally {
      setInvitingId(null);
    }
  };

  const handleInviteByEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    try {
      setInvitingEmail(true);
      await courseAuthoringApi.inviteInstructor(courseId, { email: inviteEmail.trim() });
      toast.success(`Đã gửi lời mời tới ${inviteEmail.trim()} thành công!`);
      setInviteEmail("");
      fetchInstructors();
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || "Gửi lời mời thất bại.");
    } finally {
      setInvitingEmail(false);
    }
  };

  const handleRemove = async (instructorId: string, name: string) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa giảng viên ${name} khỏi khóa học?`)) return;

    try {
      await courseAuthoringApi.removeInstructor(courseId, instructorId);
      toast.success(`Đã xóa giảng viên ${name} khỏi khóa học.`);
      fetchInstructors();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Xóa giảng viên thất bại.");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl rounded-2xl bg-card border border-border/40 shadow-xl p-6">
        <DialogHeader className="border-b border-border/40 pb-4">
          <DialogTitle className="text-lg font-bold flex items-center gap-2 text-foreground">
            <Users className="w-5 h-5 text-primary" />
            Giảng viên phụ trách khóa học
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Khóa học: <span className="font-semibold text-foreground">{courseName}</span>
          </DialogDescription>
        </DialogHeader>

        {/* Invite Form (Owner Only) */}
        {isOwner ? (
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-foreground">Mời thêm giảng viên phụ trách</label>
              <div className="flex bg-muted/60 p-0.5 rounded-lg text-xs">
                <button
                  type="button"
                  onClick={() => setInviteTab("system")}
                  className={`px-2.5 py-1 rounded-md font-bold transition text-[11px] ${
                    inviteTab === "system" ? "bg-background text-primary shadow-xs" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Tìm trong hệ thống
                </button>
                <button
                  type="button"
                  onClick={() => setInviteTab("email")}
                  className={`px-2.5 py-1 rounded-md font-bold transition text-[11px] ${
                    inviteTab === "email" ? "bg-background text-primary shadow-xs" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Mời qua Email
                </button>
              </div>
            </div>

            {inviteTab === "system" ? (
              <div className="space-y-3">
                <div className="relative">
                  <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-2.5" />
                  <Input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Tìm theo tên giảng viên, mã NV hoặc phòng ban..."
                    className="pl-9 h-9 text-xs"
                  />
                  {searching && <Loader2 className="w-3.5 h-3.5 animate-spin absolute right-3 top-2.5 text-muted-foreground" />}
                </div>

                {/* System Teachers Search List */}
                <div className="max-h-44 overflow-y-auto border border-border/40 rounded-xl divide-y divide-border/30 bg-muted/10 pr-1">
                  {systemTeachers.length === 0 ? (
                    <div className="p-4 text-center text-xs text-muted-foreground italic">
                      {searching ? "Đang tìm kiếm giảng viên..." : "Không tìm thấy giảng viên nào phù hợp."}
                    </div>
                  ) : (
                    systemTeachers.map((t) => {
                      const alreadyInCourse = instructors.some((i) => String(i.instructorId) === String(t.id));
                      return (
                        <div key={t.id} className="p-2.5 flex items-center justify-between text-xs hover:bg-muted/40 transition">
                          <div className="min-w-0 pr-2">
                            <div className="font-bold text-foreground truncate">{t.fullName}</div>
                            <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-0.5">
                              <span className="flex items-center gap-1 font-mono text-primary font-medium">
                                <IdCard className="w-3 h-3" /> {t.employeeCode}
                              </span>
                              <span className="flex items-center gap-1 truncate">
                                <Building2 className="w-3 h-3" /> {t.departmentName}
                              </span>
                            </div>
                          </div>

                          <Button
                            type="button"
                            size="sm"
                            disabled={alreadyInCourse || invitingId === String(t.id)}
                            onClick={() => handleInviteById(String(t.id), t.fullName)}
                            className="h-7 text-[11px] font-bold gap-1 px-3 cursor-pointer shrink-0"
                          >
                            {invitingId === String(t.id) ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : alreadyInCourse ? (
                              "Đã mời/Phụ trách"
                            ) : (
                              <>
                                <UserPlus className="w-3 h-3" /> Mời phụ trách
                              </>
                            )}
                          </Button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            ) : (
              <form onSubmit={handleInviteByEmail} className="space-y-3">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Mail className="w-4 h-4 text-muted-foreground absolute left-3 top-2.5" />
                    <Input
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="Nhập địa chỉ email giảng viên..."
                      className="pl-9 h-9 text-xs"
                      required
                    />
                  </div>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={invitingEmail || !inviteEmail.trim()}
                    className="h-9 text-xs font-bold gap-1.5 px-4 cursor-pointer"
                  >
                    {invitingEmail ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
                    Gửi lời mời
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground italic">
                  Lời mời sẽ được gửi qua Email & Thông báo hệ thống.
                </p>
              </form>
            )}
          </div>
        ) : (
          <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Bạn đang là <b>Giảng viên phụ trách</b>. Chỉ <b>Người tạo khóa học</b> mới có quyền mời hoặc xóa giảng viên khác.</span>
          </div>
        )}

        {/* Assigned Instructors List */}
        <div className="space-y-3 pt-4 border-t border-border/40">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-foreground uppercase tracking-wider">
              Danh sách giảng viên phụ trách khóa học ({instructors.length})
            </span>
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />}
          </div>

          <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
            {instructors.map((inst) => (
              <div
                key={inst.id}
                className="flex items-center justify-between p-3 bg-muted/30 border border-border/40 rounded-xl text-xs"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary shrink-0">
                    {inst.instructorName?.charAt(0)?.toUpperCase() || "T"}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-foreground truncate">{inst.instructorName}</span>
                      {inst.isOwner && (
                        <Badge className="bg-amber-500/10 text-amber-600 border-amber-300 text-[10px] font-bold gap-1 py-0 px-1.5">
                          <Crown className="w-3 h-3 text-amber-500" /> Chủ sở hữu
                        </Badge>
                      )}
                    </div>
                    <span className="text-[11px] text-muted-foreground block truncate">{inst.instructorEmail}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {inst.status === "ACCEPTED" ? (
                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300 text-[10px] font-bold gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Đã tham gia
                    </Badge>
                  ) : inst.status === "PENDING" ? (
                    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300 text-[10px] font-bold gap-1">
                      <Clock className="w-3 h-3 text-amber-600 animate-pulse" /> Đang chờ
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-300 text-[10px] font-bold">
                      Từ chối
                    </Badge>
                  )}

                  {isOwner && !inst.isOwner && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemove(inst.instructorId, inst.instructorName)}
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive cursor-pointer"
                      title="Xóa giảng viên này khỏi khóa học"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
