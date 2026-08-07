import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, AlertCircle } from "lucide-react";

export const TeacherMatchingRequestPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 border-b pb-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate("/admin/pending-requests")}
          className="h-9 px-3 text-slate-700"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" /> Quay lai hang doi
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Chi tiet ghep giao vien
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Chua co API du lieu that cho man hinh nay.
          </p>
        </div>
      </div>

      <Card className="border-dashed border-2 p-8 text-center bg-slate-50 space-y-3">
        <AlertCircle className="w-10 h-10 text-amber-500 mx-auto" />
        <div className="space-y-1">
          <h3 className="font-bold text-slate-900 text-base">
            Khong co du lieu yeu cau
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Chuc nang nay chua co API du lieu that de hien thi. Khong su dung du lieu gia.
          </p>
        </div>
      </Card>
    </div>
  );
};
