import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
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
  X,
  FileText,
  Upload,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Eye,
  Loader2,
} from "lucide-react";
import { employeeApi } from "@/api/employees/employeeApi";
import { DatePickerInput } from "@/components/ui/DatePickerInput";
import type { EmployeeExtended } from "@/types/employee";
import sourceSansRegularUrl from "@fontsource/source-sans-3/files/source-sans-3-vietnamese-400-normal.woff2?url";
import sourceSansItalicUrl from "@fontsource/source-sans-3/files/source-sans-3-vietnamese-400-italic.woff2?url";
import sourceSansBoldUrl from "@fontsource/source-sans-3/files/source-sans-3-vietnamese-700-normal.woff2?url";
import sourceSansBoldItalicUrl from "@fontsource/source-sans-3/files/source-sans-3-vietnamese-700-italic.woff2?url";

interface NewContractWizardModalProps {
  open: boolean;
  onClose: () => void;
  employee: EmployeeExtended;
  onSuccess: (msg: string, contract?: { id?: string }) => void;
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
  const [activeCheckError, setActiveCheckError] = useState("");
  const [activeContractInfo, setActiveContractInfo] = useState<{
    hasActiveContract: boolean;
    activeContractId?: string;
    activeContractType?: string;
    startDate?: string;
  } | null>(null);

  const [terminatingActive, setTerminatingActive] = useState(false);

  // Branch Selection: "BRANCH_A" (Has file) | "BRANCH_B" (Template generate)
  const [selectedBranch, setSelectedBranch] = useState<"BRANCH_A" | "BRANCH_B">("BRANCH_A");
  const [wizardStep, setWizardStep] = useState<"SELECT_BRANCH" | "BRANCH_A_FORM" | "BRANCH_B_FORM">("SELECT_BRANCH");

  // Form Fields Common
  const [contractType, setContractType] = useState<"PROBATION" | "FIXED_TERM" | "INDEFINITE">("PROBATION");
  const todayLocal = (() => {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  })();
  const [startDate, setStartDate] = useState<string>(todayLocal);
  const [endDate, setEndDate] = useState<string>("");
  const [baseSalary, setBaseSalary] = useState<number>(20000000);
  const [salaryType, setSalaryType] = useState<"MONTHLY" | "DAILY" | "HOURLY">("MONTHLY");
  const [signedAt, setSignedAt] = useState<string>(todayLocal);

  // Branch A States (Upload)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string>("");
  const [formError, setFormError] = useState<string>("");
  const [submittingA, setSubmittingA] = useState(false);

  // Branch B States (Template Generator)
  const [templates, setTemplates] = useState<Array<{
    templateId: string;
    name: string;
    contractTypeEnum: string;
    templateContent: string;
    placeholders: string[];
    version: number;
  }>>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [templatesError, setTemplatesError] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [submittingB, setSubmittingB] = useState(false);
  const [generateConfirmOpen, setGenerateConfirmOpen] = useState(false);

  /**
   * Định dạng chuỗi hiển thị số tiền lương theo định dạng vi-VN
   */
  const formatSalaryInput = (value: number) => value > 0 ? value.toLocaleString("vi-VN") : "";

  /**
   * Xử lý thay đổi số tiền lương nhập vào từ ô input
   */
  const handleSalaryChange = (rawValue: string) => {
    const digits = rawValue.replace(/\D/g, "").replace(/^0+(?=\d)/, "");
    setBaseSalary(digits ? Number(digits) : 0);
    setFormError("");
  };

  /**
   * Kiểm tra xem nhân viên có hợp đồng đang hiệu lực hay không
   */
  const runActiveCheck = async () => {
    setCheckingActive(true);
    setActiveCheckError("");
    try {
      const targetId = employee.userId || employee.id;
      const res = await employeeApi.checkActiveContract(targetId);
      if (res.data) {
        setActiveContractInfo(res.data);
      }
    } catch (e: any) {
      console.warn("Active contract check failed", e);
      setActiveContractInfo(null);
      setActiveCheckError(e?.message || "Không thể kiểm tra hợp đồng đang hiệu lực. Vui lòng thử lại.");
    } finally {
      setCheckingActive(false);
    }
  };

  useEffect(() => {
    runActiveCheck();
  }, [employee]);

  // Mỗi loại hợp đồng tải đúng danh sách template tương ứng và reset live preview.
  useEffect(() => {
    let active = true;
    setSelectedTemplateId(null);
    setTemplatesLoading(true);
    setTemplatesError("");
    employeeApi.getContractTemplates(contractType).then((res) => {
      if (!active) return;
      const matchingTemplates = Array.isArray(res.data) ? res.data.filter(template => template.contractTypeEnum === contractType) : [];
      setTemplates(matchingTemplates);
      if (matchingTemplates.length > 0) {
        setSelectedTemplateId(matchingTemplates[0].templateId);
      }
    }).catch(() => {
      if (active) {
        setTemplates([]);
        setTemplatesError("Không tải được mẫu hợp đồng từ máy chủ.");
      }
    }).finally(() => {
      if (active) setTemplatesLoading(false);
    });
    return () => { active = false; };
  }, [contractType]);

  /**
   * Chấm dứt hợp đồng đang hiệu lực cũ của nhân viên
   */
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

  /**
   * Xử lý chọn file hợp đồng đính kèm ở Nhánh A
   */
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

  /**
   * Kiểm tra tính hợp lệ của dữ liệu hợp đồng trước khi submit
   */
  const validateContractInformation = (requireFile: boolean) => {
    const errors: string[] = [];
    if (!contractType) errors.push("loại hợp đồng");
    if (!salaryType) errors.push("hình thức trả lương");
    if (!startDate) errors.push("ngày bắt đầu");
    if (!signedAt) errors.push("ngày ký kết");
    if (!Number.isFinite(baseSalary) || baseSalary <= 0) errors.push("mức lương lớn hơn 0");
    if (startDate && endDate && endDate <= startDate) errors.push("ngày kết thúc phải sau ngày bắt đầu");
    if (signedAt && startDate && signedAt > startDate) errors.push("ngày ký không được sau ngày bắt đầu hiệu lực");
    if (requireFile && !uploadedFile) errors.push("file hợp đồng");
    const message = errors.length ? `Vui lòng kiểm tra: ${errors.join(", ")}.` : "";
    setFormError(message);
    return errors.length === 0;
  };

  /**
   * Thực hiện tạo hợp đồng và upload file ở Nhánh A
   */
  const handleSubmitBranchA = async () => {
    if (!validateContractInformation(true)) return;
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
      const uploadResponse = await employeeApi.uploadContractFile(contractId, uploadedFile!);

      onSuccess("Tạo hợp đồng và tải file đính kèm thành công!", uploadResponse.data?.data || { id: contractId });
      onClose();
    } catch (e: any) {
      onError(e.message || "Lỗi tạo hợp đồng ở Nhánh A");
    } finally {
      setSubmittingA(false);
    }
  };

  /**
   * Thực hiện sinh file PDF hợp đồng từ mẫu ở Nhánh B
   */
  const handleSubmitBranchB = async () => {
    if (!validateContractInformation(false)) return;
    if (!selectedTemplateId) {
      onError("Vui lòng chọn mẫu hợp đồng!");
      return;
    }
    setSubmittingB(true);
    try {
      const targetId = employee.userId || employee.id;
      const generateResponse = await employeeApi.generateContract({
        employeeId: targetId,
        contractTypeEnum: contractType,
        templateId: selectedTemplateId,
        startDate,
        endDate: endDate || undefined,
        baseSalary,
        salaryTypeEnum: salaryType,
        signedAt: signedAt ? `${signedAt}T00:00:00` : undefined,
      });

      onSuccess("Sinh file PDF từ template và khởi tạo hợp đồng thành công!", generateResponse.data?.data);
      onClose();
    } catch (e: any) {
      onError(e.message || "Lỗi sinh hợp đồng ở Nhánh B");
    } finally {
      setSubmittingB(false);
    }
  };

  /**
   * Sinh HTML xem trước trực tiếp hợp đồng ở Nhánh B
   */
  const getLivePreviewHtml = () => {
    const selectedTpl = templates.find((t) => t.templateId === selectedTemplateId);
    if (!selectedTpl) return "";

    let html = selectedTpl.templateContent || "";
    const now = new Date();
    const formatContractDate = (value?: string) => value
      ? new Intl.DateTimeFormat("vi-VN").format(new Date(`${value}T00:00:00`))
      : "";
    const values: Record<string, string> = {
      contractNumber: `HDLD-${employee.employeeCode || employee.userId || employee.id}/${contractType}`,
      currentDay: String(now.getDate()).padStart(2, "0"),
      currentMonth: String(now.getMonth() + 1).padStart(2, "0"),
      currentYear: String(now.getFullYear()),
      employeeName: employee.fullName || "Nguyễn Văn A",
      gender: employee.gender === 1 ? "Nữ" : employee.gender === 2 ? "Khác" : "Nam",
      dateOfBirth: employee.dateOfBirth ? formatContractDate(employee.dateOfBirth.slice(0, 10)) : "01/01/1995",
      nationality: "Việt Nam",
      citizenId: "001090123456",
      citizenIssueDate: "15/08/2021",
      citizenIssuePlace: "Cục Cảnh sát QLHC về trật tự xã hội",
      email: employee.userEmail || "",
      phone: employee.phone || "",
      address: employee.address || "",
      position: employee.position || "",
      department: employee.departmentName || "",
      contractType: contractType,
      contractStartDate: formatContractDate(startDate) || "DD/MM/YYYY",
      contractEndDate: formatContractDate(endDate) || "Vô thời hạn",
      startDate: formatContractDate(startDate) || "DD/MM/YYYY",
      endDate: formatContractDate(endDate) || "Vô thời hạn",
      probationPeriod: "02 tháng",
      workingLocation: "Văn phòng Công ty Cổ phần Giáo dục AILMS - Số 1 Đại Cồ Việt, Hai Bà Trưng, Hà Nội",
      salary: baseSalary ? `${Number(baseSalary).toLocaleString("vi-VN")} VNĐ` : "0 VNĐ",
      baseSalary: baseSalary ? `${Number(baseSalary).toLocaleString("vi-VN")} VNĐ` : "0 VNĐ",
      salaryType: salaryType,
      payDay: "05",
      allowance: "Phụ cấp ăn trưa 730.000 VNĐ/tháng, phụ cấp xăng xe 500.000 VNĐ/tháng",
      workingHours: "08 giờ/ngày (từ 08h00 đến 17h00, từ Thứ Hai đến Thứ Sáu)",
      noticePeriod: "30",
      signedAt: formatContractDate(signedAt) || now.toLocaleDateString("vi-VN"),
      companyName: "CÔNG TY CỔ PHẦN GIÁO DỤC AILMS",
      companyAddress: "Số 1 Đại Cồ Việt, Hai Bà Trưng, Hà Nội",
      companyTaxCode: "0101234567",
      companyRepresentative: "Nguyễn Văn Admin",
      companyRepresentativeTitle: "Giám Đốc Điều Hành",
      companyPhone: "1900 6868",
      companyEmail: "hr@ailms.edu.vn",
    };

    for (const [key, val] of Object.entries(values)) {
      const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      html = html.replace(new RegExp(`{{\\s*${escapedKey}\\s*}}`, "g"), val);
    }
    const vietnameseFontStyle = `<style>
      @font-face { font-family: 'Source Sans 3 Contract'; src: url('${sourceSansRegularUrl}') format('woff2'); font-style: normal; font-weight: 400; }
      @font-face { font-family: 'Source Sans 3 Contract'; src: url('${sourceSansItalicUrl}') format('woff2'); font-style: italic; font-weight: 400; }
      @font-face { font-family: 'Source Sans 3 Contract'; src: url('${sourceSansBoldUrl}') format('woff2'); font-style: normal; font-weight: 700; }
      @font-face { font-family: 'Source Sans 3 Contract'; src: url('${sourceSansBoldItalicUrl}') format('woff2'); font-style: italic; font-weight: 700; }
      html, body, body * { font-family: 'Source Sans 3 Contract', 'Source Sans 3', Arial, sans-serif !important; }
      body { text-rendering: optimizeLegibility; -webkit-font-smoothing: antialiased; }
    </style>`;
    if (/<head[^>]*>/i.test(html)) {
      return html.replace(/<head([^>]*)>/i, `<head$1><meta charset="UTF-8"/>${vietnameseFontStyle}`);
    }
    return `<!doctype html><html lang="vi"><head><meta charset="UTF-8"/>${vietnameseFontStyle}</head><body>${html}</body></html>`;
  };

  return (
    <div
      onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}
      className="fixed inset-0 z-60 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-card border border-border/60 w-[96vw] max-w-[96vw] rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[96vh] max-h-[96vh]"
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
          ) : activeCheckError ? (
            <div className="py-10 text-center space-y-4 rounded-2xl border border-destructive/30 bg-destructive/5">
              <AlertCircle className="h-8 w-8 text-destructive mx-auto" />
              <div className="space-y-1">
                <p className="text-sm font-extrabold text-destructive">Không thể kiểm tra hợp đồng hiện tại</p>
                <p className="text-xs text-muted-foreground">{activeCheckError}</p>
              </div>
              <Button size="sm" variant="outline" onClick={runActiveCheck}>Thử lại</Button>
            </div>
          ) : activeContractInfo?.hasActiveContract ? (
            /* ACTIVE WARNING MODAL (QUY TẮC 1.1) */
            <div className="space-y-6 animate-in zoom-in-95 duration-200">
              <div className="p-5 rounded-2xl bg-chart-1/10 border border-chart-1/30 text-chart-1 space-y-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-6 w-6 text-chart-1 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <h4 className="text-sm font-extrabold">Cảnh báo: Nhân viên đang có hợp đồng hiệu lực!</h4>
                    <p className="text-xs leading-relaxed opacity-90">
                      Hệ thống quy định mỗi nhân viên <strong>chỉ được phép có tối đa 1 hợp đồng ở trạng thái ACTIVE</strong> tại một thời điểm.
                      Vui lòng chấm dứt hợp đồng hiện tại trước khi tiếp tục tạo hợp đồng mới.
                    </p>
                  </div>
                </div>

                <div className="p-3.5 bg-background/60 rounded-xl border border-chart-1/20 text-xs flex items-center justify-between">
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
                        <div className="h-10 w-10 rounded-xl bg-brand-cobalt/10 text-brand-cobalt flex items-center justify-center border border-brand-cobalt/20">
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
                        <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
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
                      <Badge variant="secondary" className="text-[10px] font-bold bg-primary/10 text-primary border border-primary/20">Nhánh B — Sinh PDF từ Template</Badge>
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
                      <Upload className="h-4 w-4 text-brand-cobalt" /> Nhánh A: Nhập thông tin & Upload file
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
                          <SelectItem value="PROBATION">Hợp đồng thử việc</SelectItem>
                          <SelectItem value="FIXED_TERM">Hợp đồng xác định thời hạn</SelectItem>
                          <SelectItem value="INDEFINITE">Hợp đồng không xác định thời hạn</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs font-bold text-muted-foreground">Hình thức trả lương</Label>
                      <Select value={salaryType} onValueChange={(v: any) => setSalaryType(v)}>
                        <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="MONTHLY">Trả theo tháng</SelectItem>
                          <SelectItem value="DAILY">Trả theo ngày</SelectItem>
                          <SelectItem value="HOURLY">Trả theo giờ</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs font-bold text-muted-foreground">Mức lương cơ bản (VNĐ)</Label>
                      <Input
                        type="text"
                        inputMode="numeric"
                        value={formatSalaryInput(baseSalary)}
                        onChange={(e) => handleSalaryChange(e.target.value)}
                        placeholder="Ví dụ: 20.000.000"
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
                            <p className="text-xs font-extrabold text-success-forest flex items-center gap-1">
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

                    {fileError && <p className="text-xs font-bold text-destructive flex items-center gap-1 mt-1"><AlertCircle className="h-3.5 w-3.5" /> {fileError}</p>}
                  </div>

                  {formError && <p className="text-xs font-bold text-destructive flex items-center gap-1"><AlertCircle className="h-3.5 w-3.5" /> {formError}</p>}
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
                      <Sparkles className="h-4 w-4 text-primary" /> Nhánh B: Sinh file PDF từ HTML Template
                    </h4>
                    <Button size="sm" variant="ghost" onClick={() => setWizardStep("SELECT_BRANCH")} className="h-7 text-xs gap-1 text-muted-foreground">
                      <ArrowLeft className="h-3 w-3" /> Đổi phương thức
                    </Button>
                  </div>

                  {/* GRID FORM & LIVE PREVIEW */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* LEFT: FORM DATA (5 Cols) */}
                    <div className="lg:col-span-4 space-y-4">
                      <div className="space-y-1">
                        <Label className="text-xs font-bold text-muted-foreground">Loại hợp đồng</Label>
                        <Select value={contractType} onValueChange={(v: any) => setContractType(v)}>
                          <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="PROBATION">Thử việc</SelectItem>
                            <SelectItem value="FIXED_TERM">Xác định thời hạn</SelectItem>
                            <SelectItem value="INDEFINITE">Không xác định thời hạn</SelectItem>
                            <SelectItem value="SEASONAL">Theo mùa vụ</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs font-bold text-muted-foreground">Mẫu template HTML</Label>
                        <Select
                          value={selectedTemplateId ? String(selectedTemplateId) : ""}
                          onValueChange={(v) => setSelectedTemplateId(v)}
                          disabled={templatesLoading || templates.length === 0}
                        >
                          <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Chọn mẫu..." /></SelectTrigger>
                          <SelectContent>
                            {templates.filter((tpl) => tpl.contractTypeEnum === contractType).map((tpl) => (
                              <SelectItem key={tpl.templateId} value={String(tpl.templateId)}>
                                {tpl.name} ({tpl.contractTypeEnum})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {templatesLoading && <p className="text-[11px] text-muted-foreground">Đang tải mẫu hợp đồng...</p>}
                        {!templatesLoading && (templatesError || templates.length === 0) && (
                          <p className="text-[11px] font-semibold text-destructive">
                            {templatesError || `Chưa có mẫu ACTIVE cho loại ${contractType}.`}
                          </p>
                        )}
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
                            type="text"
                            inputMode="numeric"
                            value={formatSalaryInput(baseSalary)}
                            onChange={(e) => handleSalaryChange(e.target.value)}
                            placeholder="Ví dụ: 20.000.000"
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
                    <div className="lg:col-span-8 space-y-2 flex flex-col">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
                          <Eye className="h-3.5 w-3.5 text-primary" /> Live Preview (Thời gian thực)
                        </Label>
                        <span className="text-[10px] italic text-muted-foreground">Tự động cập nhật theo dữ liệu đang nhập</span>
                      </div>

                      <div className="flex-1 min-h-[62vh] rounded-2xl border border-border/80 bg-white overflow-hidden shadow-inner">
                        {getLivePreviewHtml() ? (
                          <iframe
                            title="Xem trước hợp đồng"
                            srcDoc={getLivePreviewHtml()}
                            sandbox=""
                            className="w-full h-[62vh] border-0 bg-white"
                          />
                        ) : (
                          <div className="h-[62vh] grid place-items-center p-6 text-center text-xs text-muted-foreground">
                            {templatesLoading ? "Đang tải bản xem trước..." : "Chọn một mẫu hợp đồng để xem preview."}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {formError && <p className="text-xs font-bold text-destructive flex items-center gap-1"><AlertCircle className="h-3.5 w-3.5" /> {formError}</p>}
                  {/* FOOTER ACTIONS */}
                  <div className="flex justify-end gap-2 pt-4 border-t border-border/30">
                    <Button variant="ghost" onClick={onClose} className="h-9 text-xs font-bold">Hủy</Button>
                    <Button
                      onClick={() => { if (validateContractInformation(false) && selectedTemplateId) setGenerateConfirmOpen(true); }}
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
      {generateConfirmOpen && (
        <div className="fixed inset-0 z-250 bg-black/60 flex items-center justify-center p-4" onMouseDown={() => setGenerateConfirmOpen(false)}>
          <div className="w-full max-w-md rounded-2xl bg-card border border-border p-5 shadow-2xl space-y-4" onMouseDown={(event) => event.stopPropagation()}>
            <div>
              <h4 className="text-base font-black">Xác nhận sinh hợp đồng PDF</h4>
              <p className="text-xs text-muted-foreground mt-1">Hãy xác nhận bạn đã kiểm tra loại hợp đồng, template, mức lương và các mốc thời gian trong bản xem trước.</p>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setGenerateConfirmOpen(false)}>Quay lại kiểm tra</Button>
              <Button size="sm" disabled={submittingB} onClick={() => { setGenerateConfirmOpen(false); handleSubmitBranchB(); }}>
                Xác nhận & Sinh PDF
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
