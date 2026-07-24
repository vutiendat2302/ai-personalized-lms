import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ShieldCheck, XCircle, AlertTriangle, Search, Award, CheckCircle2 } from "lucide-react";

interface CertificateDetail {
  code: string;
  studentName: string;
  courseName: string;
  issueDate: string;
  status: "ISSUED" | "REVOKED";
  issuer: string;
}

export const CertificateVerifyPage: React.FC = () => {
  const { certificateCode } = useParams<{ certificateCode: string }>();
  const [inputCode, setInputCode] = useState(certificateCode || "");
  const [certData, setCertData] = useState<CertificateDetail | null>(null);
  const [statusState, setStatusState] = useState<"IDLE" | "LOADING" | "VALID" | "REVOKED" | "INVALID">("IDLE");

  const MOCK_DB: Record<string, CertificateDetail> = {
    "CERT-AILMS-9821": {
      code: "CERT-AILMS-9821",
      studentName: "Vũ Tiến Đạt",
      courseName: "Chuyên Gia Cấu Trúc Dữ Liệu & Giải Thuật C++",
      issueDate: "2026-07-20",
      status: "ISSUED",
      issuer: "Học Viện Đào Tạo Công Nghệ AILMS EdTech",
    },
    "CERT-AILMS-0000": {
      code: "CERT-AILMS-0000",
      studentName: "Lê Văn Hùng",
      courseName: "Lập trình Web Frontend Basics",
      issueDate: "2026-01-15",
      status: "REVOKED",
      issuer: "Học Viện Đào Tạo Công Nghệ AILMS EdTech",
    },
  };

  const handleVerify = (codeToTest: string) => {
    if (!codeToTest.trim()) return;
    setStatusState("LOADING");

    setTimeout(() => {
      const match = MOCK_DB[codeToTest.trim().toUpperCase()];
      if (!match) {
        setStatusState("INVALID");
        setCertData(null);
      } else if (match.status === "REVOKED") {
        setStatusState("REVOKED");
        setCertData(match);
      } else {
        setStatusState("VALID");
        setCertData(match);
      }
    }, 600);
  };

  useEffect(() => {
    if (certificateCode) {
      handleVerify(certificateCode);
    }
  }, [certificateCode]);

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-primary/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-xl space-y-8 z-10 text-center">
        {/* Brand Header */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/30 text-primary text-xs font-extrabold uppercase tracking-wider">
            <ShieldCheck className="h-4 w-4" /> Tra Cứu & Xác Thực Chứng Chỉ Công Khai
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">Cổng Xác Thực AILMS Certificate</h1>
          <p className="text-xs text-slate-400">
            Hệ thống xác thực mã chứng chỉ học thuật được bảo mật mã hóa SSL 256-bit
          </p>
        </div>

        {/* Input Form */}
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
              placeholder="Nhập mã chứng chỉ (VD: CERT-AILMS-9821)"
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value)}
              className="pl-10 h-11 bg-slate-900 border-slate-700 text-white rounded-xl text-xs font-mono font-bold uppercase placeholder:text-slate-500"
            />
          </div>
          <Button type="submit" className="h-11 px-6 rounded-xl font-bold bg-primary hover:bg-primary/90 text-xs">
            Xác Thực
          </Button>
        </form>

        {/* RESULT STATES */}
        {statusState === "LOADING" && (
          <div className="p-8 text-center text-xs text-slate-400 animate-pulse">
            Đang truy xuất cơ sở dữ liệu chứng chỉ toàn quốc...
          </div>
        )}

        {statusState === "VALID" && certData && (
          <div className="p-8 rounded-3xl bg-slate-900/90 border-2 border-emerald-500/50 shadow-2xl text-left space-y-6 animate-in zoom-in-95 duration-300">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <Award className="h-8 w-8" />
                </div>
                <div>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-extrabold uppercase border border-emerald-500/30">
                    Mã Hợp Lệ • Đã Xác Thực
                  </span>
                  <h3 className="font-mono font-extrabold text-white text-base mt-1">{certData.code}</h3>
                </div>
              </div>
              <CheckCircle2 className="h-8 w-8 text-emerald-400 shrink-0" />
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <span className="text-slate-400 text-[10px] uppercase font-bold block">Học viên được cấp:</span>
                <span className="text-xl font-black text-white">{certData.studentName}</span>
              </div>

              <div>
                <span className="text-slate-400 text-[10px] uppercase font-bold block">Chương trình / Khóa học:</span>
                <span className="text-sm font-bold text-primary">{certData.courseName}</span>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-800 text-[11px]">
                <div>
                  <span className="text-slate-400 block">Ngày cấp chứng chỉ:</span>
                  <span className="font-bold text-white">{certData.issueDate}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Đơn vị cấp:</span>
                  <span className="font-bold text-white">{certData.issuer}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {statusState === "REVOKED" && (
          <div className="p-8 rounded-3xl bg-slate-900/90 border-2 border-rose-500/50 shadow-2xl text-center space-y-4 animate-in zoom-in-95 duration-300">
            <XCircle className="h-12 w-12 text-rose-500 mx-auto" />
            <h3 className="text-xl font-extrabold text-rose-500">Chứng Chỉ Đã Bị Thu Hồi (Revoked)</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Mã chứng chỉ <strong className="font-mono text-white">{inputCode}</strong> đã bị đơn vị đào tạo thu hồi vô thời hạn do vi phạm quy chế học thuật.
            </p>
          </div>
        )}

        {statusState === "INVALID" && (
          <div className="p-8 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-2xl text-center space-y-4 animate-in zoom-in-95 duration-300">
            <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto" />
            <h3 className="text-lg font-extrabold text-white">Không Tìm Thấy Chứng Chỉ</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Mã chứng chỉ không tồn tại trên hệ thống. Vui lòng kiểm tra lại chính xác ký tự chữ và số.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
