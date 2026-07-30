import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  X,
  FileText,
  Upload,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  FileCode2,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  DollarSign,
  Calendar,
  Clock,
  Briefcase,
  User,
  Building2,
  Eye,
  Loader2,
} from "lucide-react";
import { employeeApi } from "@/api/employees/employeeApi";
import { DatePickerInput } from "@/components/ui/DatePickerInput";
import type { EmployeeExtended } from "@/types/employee";

interface NewContractWizardModalProps {
  open: boolean;
  onClose: () => void;
  employee: EmployeeExtended;
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
}

export const NewContractWizardModal: React.FC<NewContractWizardModalProps> = ({
  open,
  onClose,
  employee,
  onSuccess,
  onError,
}) => {
  if (!open || !employee) return null;

  // Active check states
  const [checkingActive, setCheckingActive] = useState(true);
  const [activeContractInfo, setActiveContractInfo] = useState<{
    hasActiveContract: boolean;
    activeContractId?: number;
    activeContractType?: string;
    startDate?: string;
  } | null>(null);

  const [terminatingActive, setTerminatingActive] = useState(false);

  // Branch Selection: "BRANCH_A" (Has file) | "BRANCH_B" (Template generate)
  const [selectedBranch, setSelectedBranch] = useState<"BRANCH_A" | "BRANCH_B">("BRANCH_A");
  const [wizardStep, setWizardStep] = useState<"SELECT_BRANCH" | "BRANCH_A_FORM" | "BRANCH_B_FORM">("SELECT_BRANCH");

  // Form Fields Common
  const [contractType, setContractType] = useState<"PROBATION" | "FIXED_TERM" | "INDEFINITE" | "SEASONAL">("PROBATION");
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState<string>("");
  const [baseSalary, setBaseSalary] = useState<number>(20000000);
  const [salaryType, setSalaryType] = useState<"MONTHLY" | "DAILY" | "HOURLY">("MONTHLY");
  const [signedAt, setSignedAt] = useState<string>(new Date().toISOString().slice(0, 10));

  // Branch A States (Upload)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string>("");
  const [submittingA, setSubmittingA] = useState(false);

  // Branch B States (Template Generator)
  const [templates, setTemplates] = useState<Array<{
    templateId: number;
    name: string;
    contractTypeEnum: string;
    templateContent: string;
    placeholders: string[];
    version: number;
  }>>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
  const [submittingB, setSubmittingB] = useState(false);

  // Load Active Check
  const runActiveCheck = async () => {
    setCheckingActive(true);
    try {
      const targetId = employee.userId || employee.id;
      const res = await employeeApi.checkActiveContract(targetId);
      if (res.data) {
        setActiveContractInfo(res.data);
      }
    } catch (e: any) {
      console.warn("Active contract check failed", e);
    } finally {
      setCheckingActive(false);
    }
  };

  useEffect(() => {
    runActiveCheck();
    // Pre-load templates
    employeeApi.getContractTemplates().then((res) => {
      if (res.data && Array.isArray(res.data)) {
        setTemplates(res.data);
        if (res.data.length > 0) {
          setSelectedTemplateId(res.data[0].templateId);
        }
      }
    }).catch((e) => console.warn("Failed to load templates", e));
  }, [employee]);

  // Update selected template when contractType changes in Branch B
  useEffect(() => {
    if (templates.length > 0) {
      const matched = templates.find((t) => t.contractTypeEnum === contractType);
      if (matched) {
        setSelectedTemplateId(matched.templateId);
      } else {
        setSelectedTemplateId(templates[0].templateId);
      }
    }
  }, [contractType, templates]);

  // Terminate Active Contract Action
  const handleTerminateActiveContract = async () => {
    if (!activeContractInfo?.activeContractId) return;
    setTerminatingActive(true);
    try {
      await employeeApi.terminateContract(activeContractInfo.activeContractId, "Chấm dứt tự động trước khi tạo hợp đồng mới");
      onSuccess("Đã chấm dứt hợp đồng cũ thành công! Bây giờ bạn có thể tiếp tục tạo hợp đồng mới.");
      await runActiveCheck();
    } catch (e: any) {
      onError(e.message || "Lỗi chấm dứt hợp đồng cũ");
    } finally {
      setTerminatingActive(false);
    }
  };

  // Handle File Change (Branch A)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileError("");
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 10 * 1024 * 1024) {
        setFileError("Dung lượng tệp vượt quá giới hạn 10MB!");
        return;
      }
      const lower = file.name.toLowerCase();
      if (!lower.endsWith(".pdf") && !lower.endsWith(".docx")) {
        setFileError("Chỉ hỗ trợ định dạng tệp .pdf hoặc .docx!");
        return;
      }
      setUploadedFile(file);
    }
  };

  // Submit Branch A
  const handleSubmitBranchA = async () => {
    if (!uploadedFile) {
      setFileError("Vui lòng chọn tệp hợp đồng đính kèm!");
      return;
    }
    setSubmittingA(true);
    try {
      const targetId = employee.userId || employee.id;
      // Step A1: Create record
      const createRes = await employeeApi.createContract({
        employeeId: targetId,
        contractTypeEnum: contractType,
        startDate,
        endDate: endDate || undefined,
        baseSalary,
        salaryTypeEnum: salaryType,
        signedAt: signedAt ? `${signedAt}T00:00:00` : undefined,
      });

      const contractId = createRes.data?.data?.id;
      if (!contractId) {
        throw new Error("Không lấy được ID hợp đồng sau khi tạo");
      }

      // Step A2: Upload file
      await employeeApi.uploadContractFile(contractId, uploadedFile);

      onSuccess("Tạo hợp đồng và tải file đính kèm thành công!");
      onClose();
    } catch (e: any) {
      onError(e.message || "Lỗi tạo hợp đồng ở Nhánh A");
    } finally {
      setSubmittingA(false);
    }
  };

  // Submit Branch B
  const handleSubmitBranchB = async () => {
    if (!selectedTemplateId) {
      onError("Vui lòng chọn mẫu hợp đồng!");
      return;
    }
    setSubmittingB(true);
    try {
      const targetId = employee.userId || employee.id;
      await employeeApi.generateContract({
        employeeId: targetId,
        contractTypeEnum: contractType,
        templateId: selectedTemplateId,
        startDate,
        endDate: endDate || undefined,
        baseSalary,
        salaryTypeEnum: salaryType,
        signedAt: signedAt ? `${signedAt}T00:00:00` : undefined,
      });

      onSuccess("Sinh file PDF từ template và khởi tạo hợp đồng thành công!");
      onClose();
    } catch (e: any) {
      onError(e.message || "Lỗi sinh hợp đồng ở Nhánh B");
    } finally {
      setSubmittingB(false);
    }
  };

  // Calculate live preview HTML for Branch B
  const getLivePreviewHtml = () => {
    const selectedTpl = templates.find((t) => t.templateId === selectedTemplateId);
    if (!selectedTpl) return "<div style='padding:20px;text-align:center;'>Vui lòng chọn template</div>";

    let html = selectedTpl.templateContent || "";
    const values: Record<string, string> = {
      employeeName: employee.fullName || "Nguyễn Văn A",
      email: employee.userEmail || "",
      phone: employee.phone || "",
      address: employee.address || "",
      position: employee.position || "",
      department: employee.departmentName || "",
      contractType: contractType,
      startDate: startDate || "DD/MM/YYYY",
      endDate: endDate || "Vô thời hạn",
      baseSalary: baseSalary ? `${Number(baseSalary).toLocaleString()} VNĐ` : "0 VNĐ",
      salaryType: salaryType,
      signedAt: signedAt || new Date().toLocaleDateString("vi-VN"),
      companyName: "CÔNG TY CỔ PHẦN GIÁO DỤC AILMS",
      companyAddress: "Số 1 Đại Cồ Việt, Hai Bà Trưng, Hà Nội",
      companyTaxCode: "0101234567",
      companyRepresentative: "Nguyễn Văn Admin",
      companyRepresentativeTitle: "Giám Đốc Điều Hành",
      companyPhone: "1900 6868",
      companyEmail: "hr@ailms.edu.vn",
    };

    for (const [key, val] of Object.entries(values)) {
      html = html.replaceAll(`{{${key}}}`, val);
    }
    return html;
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-card border border-border/60 w-full max-w-5xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* HEADER */}
        <div className="p-5 bg-muted/40 border-b border-border/40 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-foreground tracking-tight">
                Tạo hợp đồng mới cho nhân viên
              </h3>
              <p className="text-xs text-muted-foreground">
                {employee.fullName} ({employee.employeeCode}) &bull; {employee.position || "Nhân viên"}
              </p>
            </div>
          </div>
          <Button size="icon" variant="ghost" onClick={onClose} className="h-8 w-8 rounded-full text-muted-foreground">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* CONTENT BODY */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* STEP 0: CHECKING / ACTIVE WARNING MODAL */}
          {checkingActive ? (
            <div className="py-12 text-center space-y-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
              <p className="text-xs text-muted-foreground font-medium">Đang kiểm tra hợp đồng hiệu lực của nhân viên...</p>
            </div>
          ) : activeContractInfo?.hasActiveContract ? (
            /* ACTIVE WARNING MODAL (QUY TẮC 1.1) */
            <div className="space-y-6 animate-in zoom-in-95 duration-200">
              <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 space-y-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-6 w-6 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <h4 className="text-sm font-extrabold">Cảnh báo: Nhân viên đang có hợp đồng hiệu lực!</h4>
                    <p className="text-xs leading-relaxed opacity-90">
                      Hệ thống quy định mỗi nhân viên <strong>chỉ được phép có tối đa 1 hợp đồng ở trạng thái ACTIVE</strong> tại một thời điểm.
                      Vui lòng chấm dứt hợp đồng hiện tại trước khi tiếp tục tạo hợp đồng mới.
                    </p>
                  </div>
                </div>

                <div className="p-3.5 bg-background/60 rounded-xl border border-amber-500/20 text-xs flex items-center justify-between">
                  <div>
                    <span className="text-muted-foreground font-semibold">Mã HĐ Active:</span>{" "}
                    <strong className="text-foreground font-mono">#{activeContractInfo.activeContractId}</strong>
                    {" &bull; "}
                    <span className="text-muted-foreground font-semibold">Loại:</span>{" "}
                    <Badge variant="outline" className="text-[10px] uppercase">{activeContractInfo.activeContractType}</Badge>
                  </div>
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={terminatingActive}
                    onClick={handleTerminateActiveContract}
                    className="h-8 text-xs font-bold gap-1 rounded-xl shadow-md cursor-pointer"
                  >
                    {terminatingActive ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <AlertCircle className="h-3.5 w-3.5" />}
                    Chấm dứt hợp đồng cũ
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            /* PASSED ACTIVE CHECK -> 2 BRANCH FLOW */
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* WIZARD BREADCRUMB */}
              <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground border-b border-border/30 pb-3">
                <span className={`px-2 py-0.5 rounded-lg ${wizardStep === "SELECT_BRANCH" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                  1. Chọn phương thức
                </span>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/50" />
                <span className={`px-2 py-0.5 rounded-lg ${wizardStep !== "SELECT_BRANCH" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                  2. Nhập thông tin & Xử lý file
                </span>
              </div>

              {/* STEP 1: SELECT BRANCH */}
              {wizardStep === "SELECT_BRANCH" && (
                <div className="space-y-5">
                  <div className="text-center max-w-lg mx-auto space-y-1">
                    <h4 className="text-sm font-extrabold text-foreground">Chọn phương thức tạo hợp đồng</h4>
                    <p className="text-xs text-muted-foreground">Vui lòng chọn 1 trong 2 tùy chọn bên dưới để tiến hành tạo hợp đồng mới.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                    {/* BRANCH A CARD */}
                    <div
                      onClick={() => setSelectedBranch("BRANCH_A")}
                      className={`p-5 rounded-2xl border-2 transition-all cursor-pointer space-y-3 relative overflow-hidden ${
                        selectedBranch === "BRANCH_A"
                          ? "border-primary bg-primary/5 shadow-lg ring-2 ring-primary/20"
                          : "border-border/60 hover:border-border bg-card"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="h-10 w-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center border border-blue-500/20">
                          <Upload className="h-5 w-5" />
                        </div>
                        {selectedBranch === "BRANCH_A" && <CheckCircle2 className="h-5 w-5 text-primary" />}
                      </div>
                      <div>
                        <h5 className="text-sm font-extrabold text-foreground">Đã có file hợp đồng sẵn</h5>
                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                          Nhập thông tin cơ bản hợp đồng và tải file đính kèm sẵn có (.pdf / .docx) từ máy tính lên MinIO.
                        </p>
                      </div>
                      <Badge variant="secondary" className="text-[10px] font-bold">Nhánh A — Upload File</Badge>
                    </div>

                    {/* BRANCH B CARD */}
                    <div
                      onClick={() => setSelectedBranch("BRANCH_B")}
                      className={`p-5 rounded-2xl border-2 transition-all cursor-pointer space-y-3 relative overflow-hidden ${
                        selectedBranch === "BRANCH_B"
                          ? "border-primary bg-primary/5 shadow-lg ring-2 ring-primary/20"
                          : "border-border/60 hover:border-border bg-card"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="h-10 w-10 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center border border-purple-500/20">
                          <Sparkles className="h-5 w-5" />
                        </div>
                        {selectedBranch === "BRANCH_B" && <CheckCircle2 className="h-5 w-5 text-primary" />}
                      </div>
                      <div>
                        <h5 className="text-sm font-extrabold text-foreground">Chưa có file — Tạo mới trên hệ thống</h5>
                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                          Chọn loại hợp đồng, điền form dữ liệu, xem trước Live Preview HTML và hệ thống tự động sinh file PDF chuẩn.
                        </p>
                      </div>
                      <Badge variant="secondary" className="text-[10px] font-bold bg-purple-500/10 text-purple-600 border border-purple-500/20">Nhánh B — Sinh PDF từ Template</Badge>
                    </div>
                  </div>

                  <div className="flex justify-end pt-4 border-t border-border/30">
                    <Button
                      onClick={() => setWizardStep(selectedBranch === "BRANCH_A" ? "BRANCH_A_FORM" : "BRANCH_B_FORM")}
                      className="rounded-xl text-xs font-bold gap-1.5 bg-primary px-5"
                    >
                      Tiếp tục <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              )}

              {/* STEP 2A: BRANCH A FORM */}
              {wizardStep === "BRANCH_A_FORM" && (
                <div className="space-y-5 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-extrabold uppercase text-muted-foreground tracking-wider flex items-center gap-1.5">
                      <Upload className="h-4 w-4 text-blue-600" /> Nhánh A: Nhập thông tin & Upload file
                    </h4>
                    <Button size="sm" variant="ghost" onClick={() => setWizardStep("SELECT_BRANCH")} className="h-7 text-xs gap-1 text-muted-foreground">
                      <ArrowLeft className="h-3 w-3" /> Đổi phương thức
                    </Button>
                  </div>

                  {/* FORM FIELDS */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label className="text-xs font-bold text-muted-foreground">Loại hợp đồng</Label>
                      <Select value={contractType} onValueChange={(v: any) => setContractType(v)}>
                        <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="PROBATION">Hợp đồng thử việc (PROBATION)</SelectItem>
                          <SelectItem value="FIXED_TERM">Hợp đồng xác định thời hạn (FIXED_TERM)</SelectItem>
                          <SelectItem value="INDEFINITE">Hợp đồng không xác định thời hạn (INDEFINITE)</SelectItem>
                          <SelectItem value="SEASONAL">Hợp đồng theo mùa vụ (SEASONAL)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs font-bold text-muted-foreground">Hình thức trả lương</Label>
                      <Select value={salaryType} onValueChange={(v: any) => setSalaryType(v)}>
                        <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="MONTHLY">Trả theo tháng (MONTHLY)</SelectItem>
                          <SelectItem value="DAILY">Trả theo ngày (DAILY)</SelectItem>
                          <SelectItem value="HOURLY">Trả theo giờ (HOURLY)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs font-bold text-muted-foreground">Mức lương cơ bản (VNĐ)</Label>
                      <Input
                        type="number"
                        value={baseSalary}
                        onChange={(e) => setBaseSalary(Number(e.target.value))}
                        className="h-9 text-xs font-semibold"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs font-bold text-muted-foreground">Ngày ký kết</Label>
                      <DatePickerInput value={signedAt} onChange={setSignedAt} placeholder="dd/mm/yyyy" />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs font-bold text-muted-foreground">Ngày bắt đầu hiệu lực</Label>
                      <DatePickerInput value={startDate} onChange={setStartDate} placeholder="dd/mm/yyyy" />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs font-bold text-muted-foreground">Ngày kết thúc (để trống nếu vô thời hạn)</Label>
                      <DatePickerInput value={endDate} onChange={setEndDate} placeholder="dd/mm/yyyy" clearable />
                    </div>
                  </div>

                  {/* FILE UPLOAD INPUT */}
                  <div className="space-y-2 pt-2 border-t border-border/30">
                    <Label className="text-xs font-bold text-muted-foreground flex items-center justify-between">
                      <span>File hợp đồng đính kèm (.pdf / .docx) *</span>
                      <span className="text-[10px] text-muted-foreground/70">Tối đa 10MB</span>
                    </Label>

                    <div className="border-2 border-dashed border-border/80 hover:border-primary/60 rounded-2xl p-5 text-center transition-all bg-muted/20 relative">
                      <input
                        type="file"
                        accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                        onChange={handleFileChange}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      />
                      <div className="flex flex-col items-center gap-2 pointer-events-none">
                        <Upload className="h-6 w-6 text-muted-foreground" />
                        {uploadedFile ? (
                          <div className="space-y-0.5">
                            <p className="text-xs font-extrabold text-emerald-600 flex items-center gap-1">
                              <CheckCircle2 className="h-3.5 w-3.5" /> {uploadedFile.name}
                            </p>
                            <p className="text-[10px] text-muted-foreground">{(uploadedFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                          </div>
                        ) : (
                          <div>
                            <p className="text-xs font-bold text-foreground">Kéo thả hoặc bấm để chọn tệp</p>
                            <p className="text-[10px] text-muted-foreground">Định dạng hỗ trợ: PDF, DOCX</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {fileError && <p className="text-xs font-bold text-red-500 flex items-center gap-1 mt-1"><AlertCircle className="h-3.5 w-3.5" /> {fileError}</p>}
                  </div>

                  {/* FOOTER ACTIONS */}
                  <div className="flex justify-end gap-2 pt-4 border-t border-border/30">
                    <Button variant="ghost" onClick={onClose} className="h-9 text-xs font-bold">Hủy</Button>
                    <Button
                      onClick={handleSubmitBranchA}
                      disabled={submittingA}
                      className="h-9 text-xs font-bold gap-1.5 bg-primary px-5"
                    >
                      {submittingA ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                      {submittingA ? "Đang khởi tạo..." : "Xác nhận & Upload hợp đồng"}
                    </Button>
                  </div>
                </div>
              )}

              {/* STEP 2B: BRANCH B FORM + LIVE PREVIEW */}
              {wizardStep === "BRANCH_B_FORM" && (
                <div className="space-y-5 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-extrabold uppercase text-muted-foreground tracking-wider flex items-center gap-1.5">
                      <Sparkles className="h-4 w-4 text-purple-600" /> Nhánh B: Sinh file PDF từ HTML Template
                    </h4>
                    <Button size="sm" variant="ghost" onClick={() => setWizardStep("SELECT_BRANCH")} className="h-7 text-xs gap-1 text-muted-foreground">
                      <ArrowLeft className="h-3 w-3" /> Đổi phương thức
                    </Button>
                  </div>

                  {/* GRID FORM & LIVE PREVIEW */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* LEFT: FORM DATA (5 Cols) */}
                    <div className="lg:col-span-5 space-y-4">
                      <div className="space-y-1">
                        <Label className="text-xs font-bold text-muted-foreground">Loại hợp đồng (ContractType)</Label>
                        <Select value={contractType} onValueChange={(v: any) => setContractType(v)}>
                          <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="PROBATION">Thử việc (PROBATION)</SelectItem>
                            <SelectItem value="FIXED_TERM">Xác định thời hạn (FIXED_TERM)</SelectItem>
                            <SelectItem value="INDEFINITE">Không xác định thời hạn (INDEFINITE)</SelectItem>
                            <SelectItem value="SEASONAL">Theo mùa vụ (SEASONAL)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs font-bold text-muted-foreground">Mẫu template HTML</Label>
                        <Select
                          value={selectedTemplateId ? String(selectedTemplateId) : ""}
                          onValueChange={(v) => setSelectedTemplateId(Number(v))}
                        >
                          <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Chọn mẫu..." /></SelectTrigger>
                          <SelectContent>
                            {templates.map((tpl) => (
                              <SelectItem key={tpl.templateId} value={String(tpl.templateId)}>
                                {tpl.name} ({tpl.contractTypeEnum})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs font-bold text-muted-foreground">Hình thức trả lương</Label>
                          <Select value={salaryType} onValueChange={(v: any) => setSalaryType(v)}>
                            <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="MONTHLY">Tháng</SelectItem>
                              <SelectItem value="DAILY">Ngày</SelectItem>
                              <SelectItem value="HOURLY">Giờ</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs font-bold text-muted-foreground">Mức lương cơ bản</Label>
                          <Input
                            type="number"
                            value={baseSalary}
                            onChange={(e) => setBaseSalary(Number(e.target.value))}
                            className="h-9 text-xs font-semibold"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs font-bold text-muted-foreground">Ngày ký kết</Label>
                          <DatePickerInput value={signedAt} onChange={setSignedAt} placeholder="dd/mm/yyyy" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs font-bold text-muted-foreground">Ngày bắt đầu</Label>
                          <DatePickerInput value={startDate} onChange={setStartDate} placeholder="dd/mm/yyyy" />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs font-bold text-muted-foreground">Ngày kết thúc (null nếu vô thời hạn)</Label>
                        <DatePickerInput value={endDate} onChange={setEndDate} placeholder="dd/mm/yyyy" clearable />
                      </div>
                    </div>

                    {/* RIGHT: LIVE PREVIEW (7 Cols) */}
                    <div className="lg:col-span-7 space-y-2 flex flex-col">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
                          <Eye className="h-3.5 w-3.5 text-purple-600" /> Live Preview (Thời gian thực)
                        </Label>
                        <span className="text-[10px] italic text-muted-foreground">Tự động cập nhật theo dữ liệu đang nhập</span>
                      </div>

                      <div className="flex-1 min-h-[360px] max-h-[440px] rounded-2xl border border-border/80 bg-white dark:bg-slate-950 p-4 overflow-y-auto shadow-inner text-black dark:text-slate-100 text-xs">
                        <div
                          dangerouslySetInnerHTML={{ __html: getLivePreviewHtml() }}
                          className="prose prose-sm max-w-none dark:prose-invert"
                        />
                      </div>
                    </div>
                  </div>

                  {/* FOOTER ACTIONS */}
                  <div className="flex justify-end gap-2 pt-4 border-t border-border/30">
                    <Button variant="ghost" onClick={onClose} className="h-9 text-xs font-bold">Hủy</Button>
                    <Button
                      onClick={handleSubmitBranchB}
                      disabled={submittingB}
                      className="h-9 text-xs font-bold gap-1.5 bg-primary px-5"
                    >
                      {submittingB ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                      {submittingB ? "Đang sinh PDF..." : "Tiếp tục & Sinh hợp đồng PDF"}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
