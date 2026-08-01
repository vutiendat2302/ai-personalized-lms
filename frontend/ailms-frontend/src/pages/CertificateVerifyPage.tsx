import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ShieldCheck, XCircle, AlertTriangle, Search, Award, CheckCircle2, Loader2 } from "lucide-react";
import { certificateApi } from "@/api/certificates/certificateApi";

interface CertificateDetail {
  code: string;
  studentName: string;
  courseName: string;
  issueDate: string;
  status: "ISSUED" | "REVOKED";
  issuer?: string;
}

export const CertificateVerifyPage: React.FC = () => {
  const { certificateCode } = useParams<{ certificateCode: string }>();
  const [inputCode, setInputCode] = useState(certificateCode || "");
  const [certData, setCertData] = useState<CertificateDetail | null>(null);
  const [statusState, setStatusState] = useState<"IDLE" | "LOADING" | "VALID" | "REVOKED" | "INVALID">("IDLE");

  const handleVerify = async (codeToTest: string) => {
    if (!codeToTest.trim()) return;
    setStatusState("LOADING");

    try {
      const result = await certificateApi.verify(codeToTest.trim().toUpperCase());
      const match: CertificateDetail = {
        code: result.certificateCode || codeToTest.trim().toUpperCase(),
        studentName: result.studentName || "Học viên hệ thống",
        courseName: result.courseName || "Khóa học chứng chỉ",
        issueDate: result.issuedAt ? result.issuedAt.substring(0, 10) : "Đã xác thực",
        status: result.status,
        issuer: "AILMS EdTech Academy",
      };

      if (result.status === "REVOKED") {
        setStatusState("REVOKED");
        setCertData(match);
      } else {
        setStatusState("VALID");
        setCertData(match);
      }
    } catch {
      setStatusState("INVALID");
      setCertData(null);
    }
  };

  useEffect(() => {
    if (certificateCode) {
      handleVerify(certificateCode);
    }
  }, [certificateCode]);

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans">
      {/* Subtle Dignified Background Elements */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-primary/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:24px_24px] opacity-20 pointer-events-none" />

      <div className="w-full max-w-xl space-y-8 z-10 text-center">
        {/* Standalone Brand Header */}
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/30 text-primary text-xs font-extrabold uppercase tracking-wider">
            <ShieldCheck className="h-4 w-4" /> Cổng Xác Thực Chứng Chỉ Công Khai
          </div>

          <h1 className="text-3xl font-extrabold tracking-tight">Xác Thực Chứng Chỉ Số AILMS</h1>

          <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
            Tra cứu và kiểm tra tính hợp pháp của các văn bằng, chứng nhận được phát hành bởi hệ thống đào tạo AILMS.
          </p>
        </div>

        {/* Form Search Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleVerify(inputCode);
          }}
          className="flex gap-2 max-w-md mx-auto"
        >
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
            <Input
              type="text"
              placeholder="Nhập mã chứng chỉ (VD: CERT-AILMS-8892)"
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value)}
              className="pl-10 h-11 bg-slate-900 border-slate-700 text-white rounded-xl text-xs font-mono font-bold uppercase placeholder:text-slate-500"
            />
          </div>
          <Button
            type="submit"
            disabled={statusState === "LOADING" || !inputCode.trim()}
            className="h-11 px-6 rounded-xl font-bold bg-primary hover:bg-primary/90 text-primary-foreground text-xs shadow-md shrink-0 gap-1.5"
          >
            {statusState === "LOADING" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Tra Cứu
          </Button>
        </form>

        {/* RESULTS PANELS */}

        {/* VALID STATE: ValidCertificateCard */}
        {statusState === "VALID" && certData && (
          <div className="relative p-8 rounded-3xl bg-slate-900/90 border-2 border-emerald-500/50 shadow-2xl text-left space-y-6 animate-in zoom-in-95 duration-300">
            {/* Decorative Gold Inner Border Frame */}
            <div className="absolute inset-2 border border-emerald-500/20 rounded-2xl pointer-events-none" />

            {/* Header Badge */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 relative z-10">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  <Award className="h-8 w-8" />
                </div>
                <div>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-extrabold uppercase border border-emerald-500/30">
                    Mã Hợp Lệ • Đã Xác Thực
                  </span>
                  <h3 className="font-mono font-extrabold text-white text-sm tracking-wider mt-1">{certData.code}</h3>
                </div>
              </div>
              <CheckCircle2 className="h-8 w-8 text-emerald-400 shrink-0" />
            </div>

            {/* Certificate Data Body */}
            <div className="space-y-4 text-xs relative z-10">
              <div>
                <span className="text-slate-400 text-[10px] uppercase font-bold block tracking-wider">Học Viên Được Cấp:</span>
                <span className="text-2xl font-black text-white">{certData.studentName}</span>
              </div>

              <div>
                <span className="text-slate-400 text-[10px] uppercase font-bold block tracking-wider">Khóa Học Phụ Trách / Chương Trình:</span>
                <span className="text-base font-bold text-primary">{certData.courseName}</span>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-800 text-[11px]">
                <div>
                  <span className="text-slate-400 block text-[10px]">Ngày Cấp Chứng Chỉ:</span>
                  <span className="font-bold text-white">{certData.issueDate}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Đơn Vị Phát Hành:</span>
                  <span className="font-bold text-white">{certData.issuer}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* INVALID / REVOKED STATE: InvalidCertificateCard */}
        {statusState === "REVOKED" && (
          <div className="p-8 rounded-3xl bg-slate-900/90 border border-rose-500/40 shadow-2xl text-center space-y-3 animate-in zoom-in-95 duration-300">
            <XCircle className="h-10 w-10 text-rose-500 mx-auto" />
            <h3 className="text-base font-bold text-rose-500">Mã Chứng Chỉ Đã Bị Thu Hồi</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Chứng chỉ với mã <strong className="font-mono text-white">{inputCode}</strong> không còn hiệu lực sử dụng trên hệ thống.
            </p>
          </div>
        )}

        {statusState === "INVALID" && (
          <div className="p-8 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-2xl text-center space-y-3 animate-in zoom-in-95 duration-300">
            <AlertTriangle className="h-10 w-10 text-slate-400 mx-auto" />
            <h3 className="text-base font-bold text-slate-200">Mã chứng chỉ không hợp lệ hoặc đã bị thu hồi</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Không tìm thấy thông tin chứng chỉ trùng khớp. Vui lòng kiểm tra lại chính xác các ký tự mã tra cứu.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CertificateVerifyPage;
