import React, { useState, useEffect } from "react";
import { studentApi, type StudentCertificateCard } from "@/api/student/studentApi";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/useToast";
import { Award, Download, Share2, Lock, CheckCircle2 } from "lucide-react";

export const StudentCertificatesPage: React.FC = () => {
  const { success } = useToast();
  const [certs, setCerts] = useState<StudentCertificateCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    studentApi.getCertificates().then((res) => {
      setCerts(res);
      setLoading(false);
    });
  }, []);

  const handleShareLink = (code: string) => {
    const url = `${window.location.origin}/verify/${code}`;
    navigator.clipboard.writeText(url);
    success(`Đã sao chép đường dẫn xác thực chứng chỉ: ${url}`);
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-muted-foreground">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-3" />
        <p className="text-xs font-semibold">Đang tải danh sách chứng chỉ...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <Award className="h-6 w-6 text-primary" />
          Chứng chỉ & Kết quả học tập
        </h1>
        <p className="text-xs text-muted-foreground mt-1">
          Hồ sơ chứng chỉ hoàn thành khóa học, tải file PDF và đường dẫn xác thực công khai.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {certs.map((c) => (
          <Card
            key={c.id}
            className={`p-6 space-y-4 shadow-sm relative overflow-hidden ${
              c.isUnlocked
                ? "bg-card border-primary/40"
                : "bg-muted/30 border-border/40 opacity-70"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="p-2.5 bg-primary/10 text-primary rounded-xl border border-primary/20">
                <Award className="h-6 w-6" />
              </div>
              <span className="text-[10px] font-mono font-bold text-muted-foreground">{c.certificateCode}</span>
            </div>

            <div>
              <h3 className="text-base font-bold text-foreground">{c.courseName}</h3>
              {c.isUnlocked ? (
                <p className="text-xs text-primary font-bold mt-1 flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Đã cấp ngày: {c.issuedAt}
                </p>
              ) : (
                <p className="text-xs text-rose-600 dark:text-rose-400 font-semibold mt-1 flex items-center gap-1">
                  <Lock className="h-3.5 w-3.5" />
                  {c.requiredConditionText}
                </p>
              )}
            </div>

            <div className="pt-2 border-t border-border/40 flex items-center justify-end gap-2">
              {c.isUnlocked ? (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleShareLink(c.certificateCode)}
                    className="text-xs border-border text-foreground hover:bg-muted cursor-pointer gap-1.5"
                  >
                    <Share2 className="h-3.5 w-3.5" />
                    Chia sẻ link
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => success("Đang tải file PDF Chứng chỉ hoàn thành...")}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold rounded-lg gap-1.5 cursor-pointer"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Tải PDF
                  </Button>
                </>
              ) : (
                <span className="text-xs text-muted-foreground italic">Chưa đủ điều kiện nhận chứng chỉ</span>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
