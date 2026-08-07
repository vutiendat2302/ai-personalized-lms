import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  CheckCircle2,
  AlertCircle,
  Clock,
  ShieldCheck,
  Download,
  RotateCcw,
  Loader2,
  User,
  Lock,
} from "lucide-react";
import { employeeApi } from "@/api/employees/employeeApi";

export const ContractSigningPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [signingData, setSigningData] = useState<{
    employeeName: string;
    employeeEmail: string;
    employeePhone: string;
    contractTypeEnum: string;
    baseSalary: number;
    startDate: string;
    endDate?: string;
    signingStatus: string;
    companySignedFileUrl: string;
    tokenExpiresAt: string;
  } | null>(null);

  const [otp, setOtp] = useState("");
  const [signerFullName, setSignerFullName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [finalDownloadUrl, setFinalDownloadUrl] = useState("");
  const [activeTab, setActiveTab] = useState<"REVIEW" | "SIGN">("REVIEW");

  // Countdown timer for OTP resend
  const [resendTimer, setResendTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [resendingOtp, setResendingOtp] = useState(false);
  const [otpRequested, setOtpRequested] = useState(false);

  // Canvas Signature Pad State
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  // Load public signing info
  const fetchSigningInfo = async () => {
    if (!token) return;
    setLoading(true);
    setErrorMsg("");
    try {
      const res = await employeeApi.getPublicSigningInfo(token);
      if (res?.success && res.data) {
        setSigningData(res.data);
        setResendTimer(0);
        setCanResend(true);
      } else {
        setErrorMsg(res?.message || "Không thể nạp thông tin hợp đồng.");
      }
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.message || err?.message || "Liên kết ký hợp đồng không hợp lệ hoặc đã hết hạn.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSigningInfo();
  }, [token]);

  // Resend timer tick
  useEffect(() => {
    if (resendTimer > 0) {
      const interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(interval);
    } else {
      setCanResend(true);
    }
  }, [resendTimer]);

  // Canvas Drawing Handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    setIsDrawing(true);
    const rect = canvas.getBoundingClientRect();
    const x = "touches" in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = "touches" in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = "touches" in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = "touches" in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasSignature(true);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  // Cấp OTP mới sau khi thời gian chờ gửi lại kết thúc.
  const handleResendOtp = async () => {
    if (!token || !canResend) return;
    setResendingOtp(true);
    setErrorMsg("");
    try {
      await employeeApi.resendSigningOtp(token);
      setOtp("");
      setResendTimer(60);
      setCanResend(false);
      setSuccessMsg("");
    } catch (err: any) {
      setErrorMsg(err?.message || "Không thể gửi lại OTP.");
    } finally {
      setResendingOtp(false);
    }
  };

  // Chuyển sang bước ký và chỉ tự động gửi OTP một lần.
  const handleStartSigning = async () => {
    setActiveTab("SIGN");
    if (!token || otpRequested || resendingOtp) return;
    setResendingOtp(true);
    setErrorMsg("");
    try {
      await employeeApi.resendSigningOtp(token);
      setOtpRequested(true);
      setOtp("");
      setResendTimer(60);
      setCanResend(false);
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.message || err?.message || "Không thể gửi OTP ký hợp đồng.");
    } finally {
      setResendingOtp(false);
    }
  };

  // Confirm Signature Submission
  const handleConfirmSignature = async () => {
    if (!token) return;
    if (!otp || otp.trim().length !== 6) {
      setErrorMsg("Vui lòng nhập đầy đủ mã OTP 6 chữ số.");
      return;
    }
    if (!hasSignature || !canvasRef.current) {
      setErrorMsg("Vui lòng vẽ chữ ký trước khi xác nhận.");
      return;
    }
    if (!signerFullName.trim()) {
      setErrorMsg("Vui lòng nhập họ và tên người ký.");
      return;
    }

    setSubmitting(true);
    setErrorMsg("");

    const sigBase64 = canvasRef.current.toDataURL("image/png");

    try {
      const res = await employeeApi.confirmEmployeeSigning(token, {
        otp: otp.trim(),
        signerFullName: signerFullName.trim(),
        signatureImageBase64: sigBase64,
      });

      if (res?.data?.success) {
        setSuccessMsg("Xác nhận ký hợp đồng lao động thành công!");
        setFinalDownloadUrl(res.data.data?.downloadUrl || "");
      } else {
        setErrorMsg(res?.data?.message || "Xác nhận ký hợp đồng thất bại.");
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "Xác thực OTP thất bại.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <Loader2 className="h-10 w-10 text-primary animate-spin mb-4" />
        <p className="text-sm font-bold text-slate-600">Đang kiểm tra liên kết ký hợp đồng...</p>
      </div>
    );
  }

  if (errorMsg && !signingData) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <Card className="max-w-md w-full border-red-200 shadow-lg">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-2">
              <AlertCircle className="h-6 w-6 text-red-600" />
            </div>
            <CardTitle className="text-lg font-bold text-red-700">Liên kết không hợp lệ</CardTitle>
            <CardDescription className="text-xs text-slate-600">{errorMsg}</CardDescription>
          </CardHeader>
          <CardContent className="pt-4 text-center">
            <Button onClick={() => navigate("/")} variant="outline" className="text-xs font-bold">
              Về trang chủ
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (successMsg) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <Card className="max-w-lg w-full border-emerald-200 shadow-xl">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mb-3">
              <CheckCircle2 className="h-8 w-8 text-emerald-600" />
            </div>
            <CardTitle className="text-xl font-extrabold text-emerald-700">Ký Hợp Đồng Thành Công!</CardTitle>
            <CardDescription className="text-xs text-slate-600 mt-1">
              Hợp đồng lao động của anh/chị <strong>{signingData?.employeeName}</strong> đã được niêm phong chữ ký điện tử nội bộ và lưu trữ an toàn trên AILMS.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-4 text-center">
            <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200 text-xs text-emerald-800 flex items-center justify-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              <span>Chứng nhận ký điện tử theo khoản 1 Điều 14 Bộ luật Lao động 2019</span>
            </div>

            {finalDownloadUrl && (
              <a
                href={finalDownloadUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs shadow transition-colors"
              >
                <Download className="h-4 w-4" /> Tải về Hợp đồng Lao động đã ký (.PDF)
              </a>
            )}

            <Button variant="ghost" onClick={() => navigate("/")} className="text-xs text-slate-500 font-bold">
              Hoàn tất
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* HEADER BRAND */}
        <div className="flex items-center justify-between bg-white p-4 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary font-black text-xl">
              A
            </div>
            <div>
              <h1 className="text-base font-extrabold text-slate-900 tracking-tight">CỔNG KÝ ĐIỆN TỬ HỢP ĐỒNG LAO ĐỘNG</h1>
              <p className="text-xs text-slate-500">CÔNG TY CỔ PHẦN GIÁO DỤC AILMS</p>
            </div>
          </div>
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-xs font-bold gap-1">
            <Clock className="h-3.5 w-3.5" /> Chờ nhân viên ký (OTP)
          </Badge>
        </div>

        <div className="grid grid-cols-2 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
          <button
            type="button"
            onClick={() => setActiveTab("REVIEW")}
            className={`rounded-lg px-4 py-2.5 text-xs font-bold transition-colors ${activeTab === "REVIEW" ? "bg-primary text-white shadow" : "text-slate-500 hover:bg-slate-50"}`}
          >
            1. Xem và kiểm tra hợp đồng
          </button>
          <button
            type="button"
            onClick={handleStartSigning}
            className={`rounded-lg px-4 py-2.5 text-xs font-bold transition-colors ${activeTab === "SIGN" ? "bg-primary text-white shadow" : "text-slate-500 hover:bg-slate-50"}`}
          >
            2. Ký và xác thực OTP
          </button>
        </div>

        {/* SUMMARY + PDF VIEW GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT: SUMMARY INFO & SIGNING FORM (5 COLS) */}
          <div className={`${activeTab === "SIGN" ? "lg:col-span-12 max-w-xl w-full mx-auto" : "lg:col-span-5"} space-y-6`}>
            {/* CONTRACT SUMMARY CARD */}
            <Card className={`${activeTab === "SIGN" ? "hidden" : ""} border-slate-200 shadow-sm`}>
              <CardHeader className="pb-3 border-b border-slate-100">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <User className="h-4 w-4 text-primary" /> Thông tin Người lao động
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-3 space-y-2.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Họ và tên:</span>
                  <span className="font-bold text-slate-900">{signingData?.employeeName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Email:</span>
                  <span className="font-bold text-slate-900">{signingData?.employeeEmail}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Loại hợp đồng:</span>
                  <Badge variant="secondary" className="font-bold text-[10px]">{signingData?.contractTypeEnum}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Mức lương cơ bản:</span>
                  <span className="font-bold text-emerald-600">{signingData?.baseSalary ? `${signingData.baseSalary.toLocaleString("vi-VN")} VNĐ` : "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Ngày hiệu lực:</span>
                  <span className="font-medium text-slate-800">{signingData?.startDate}</span>
                </div>
              </CardContent>
            </Card>

            {activeTab === "REVIEW" && (
              <Button onClick={handleStartSigning} disabled={resendingOtp} className="w-full h-10 text-xs font-bold">
                {resendingOtp ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Hợp đồng chính xác — Gửi OTP và tiếp tục ký
              </Button>
            )}

            {/* E-SIGNATURE FORM CARD */}
            <Card className={`${activeTab === "REVIEW" ? "hidden" : ""} border-primary/30 shadow-md bg-white`}>
              <CardHeader className="pb-3 border-b border-slate-100 bg-primary/5 rounded-t-xl">
                <CardTitle className="text-sm font-bold text-primary flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4" /> Xác thực &amp; Ký điện tử
                </CardTitle>
                <CardDescription className="text-[11px] text-slate-600">
                  Mã OTP vừa được gửi riêng tới <strong>{signingData?.employeeEmail}</strong> khi anh/chị bắt đầu bước ký.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Họ và tên người ký *</label>
                  <Input
                    type="text"
                    maxLength={100}
                    placeholder="Nhập đầy đủ họ và tên"
                    value={signerFullName}
                    onChange={(e) => setSignerFullName(e.target.value)}
                    className="h-10 border-slate-300 focus:border-primary"
                  />
                  <p className="text-[10px] text-slate-400 italic">Họ tên này sẽ được ghi bên dưới chữ ký trong hợp đồng.</p>
                </div>
                {/* DRAW SIGNATURE CANVAS */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700">Vẽ chữ ký *</label>
                    {hasSignature && (
                      <Button variant="ghost" size="sm" onClick={clearSignature} className="h-6 text-[10px] text-red-500 hover:text-red-700 gap-1">
                        <RotateCcw className="h-3 w-3" /> Xóa vẽ lại
                      </Button>
                    )}
                  </div>
                  <div className="border-2 border-dashed border-slate-300 rounded-lg bg-slate-50 touch-none">
                    <canvas
                      ref={canvasRef}
                      width={340}
                      height={120}
                      className="w-full h-[120px] cursor-crosshair"
                      onMouseDown={startDrawing}
                      onMouseMove={draw}
                      onMouseUp={stopDrawing}
                      onMouseLeave={stopDrawing}
                      onTouchStart={startDrawing}
                      onTouchMove={draw}
                      onTouchEnd={stopDrawing}
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 italic">Dùng chuột hoặc ngón tay để vẽ chữ ký của bạn vào khung trên.</p>
                </div>

                {/* OTP INPUT */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700">Mã OTP xác thực (6 chữ số)</label>
                    <button
                      type="button"
                      disabled={!canResend || resendingOtp}
                      onClick={handleResendOtp}
                      className="text-[11px] font-bold text-primary disabled:text-slate-400 hover:underline"
                    >
                      {resendingOtp ? "Đang gửi..." : canResend ? "Gửi lại OTP" : `Gửi lại sau (${resendTimer}s)`}
                    </button>
                  </div>
                  <Input
                    type="text"
                    maxLength={6}
                    placeholder="123456"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                    className="h-10 text-center font-mono font-bold text-lg tracking-widest border-slate-300 focus:border-primary"
                  />
                </div>

                {errorMsg && (
                  <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg text-xs font-medium text-red-600 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {/* SUBMIT BUTTON */}
                <Button
                  onClick={handleConfirmSignature}
                  disabled={submitting || otp.length !== 6 || !hasSignature || !signerFullName.trim()}
                  className="w-full h-10 text-xs font-bold gap-2 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20"
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                  {submitting ? "Đang xác thực & ký..." : "Xác nhận Ký Hợp Đồng"}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* RIGHT: PDF PREVIEW (7 COLS) */}
          <div className={`${activeTab === "SIGN" ? "hidden" : "lg:col-span-7"} space-y-3`}>
            <div className="flex items-center justify-between bg-white px-4 py-2.5 rounded-lg border border-slate-200">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <FileText className="h-4 w-4 text-primary" /> Hợp đồng Đại diện Công ty đã ký (Xem trước)
              </span>
              {signingData?.companySignedFileUrl && (
                <a
                  href={signingData.companySignedFileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] font-bold text-primary hover:underline flex items-center gap-1"
                >
                  <Download className="h-3.5 w-3.5" /> Tải file gốc
                </a>
              )}
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden h-[620px]">
              {signingData?.companySignedFileUrl ? (
                <iframe
                  src={signingData.companySignedFileUrl}
                  title="Company Signed Contract Preview"
                  className="w-full h-full border-none"
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-slate-400">
                  <FileText className="h-12 w-12 mb-2" />
                  <p className="text-xs">Không thể xem trước tệp PDF.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContractSigningPage;
