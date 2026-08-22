import React from "react";
import { AlertTriangle, Send } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface AtRiskStudentData {
  id: string;
  studentName: string;
  studentEmail: string;
  studentAvatar?: string;
  courseName: string;
  className: string;
  daysInactive: number;
  progressPercent: number;
  expectedPercent: number;
  avgQuizScore: number;
  riskReason: string;
}

interface StudentRiskRowProps {
  student: AtRiskStudentData;
  onSendReminder: (student: AtRiskStudentData) => void;
}

export const StudentRiskRow: React.FC<StudentRiskRowProps> = ({
  student,
  onSendReminder,
}) => {
  return (
    <tr className="border-b border-border/40 hover:bg-rose-50/50 dark:hover:bg-rose-950/20 transition-colors">
      <td className="p-3">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-full bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-200 flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden border border-rose-300 dark:border-rose-700/50">
            {student.studentAvatar ? (
              <img src={student.studentAvatar} alt="" className="h-full w-full object-cover" />
            ) : (
              student.studentName.charAt(0)
            )}
          </div>
          <div>
            <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
              {student.studentName}
              <span className="px-1.5 py-0.5 text-[9px] font-extrabold bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 rounded border border-rose-300 dark:border-rose-800">
                At Risk
              </span>
            </p>
            <p className="text-[11px] text-muted-foreground">{student.studentEmail}</p>
          </div>
        </div>
      </td>

      <td className="p-3 text-xs">
        <p className="font-semibold text-foreground">{student.className}</p>
        <p className="text-[11px] text-muted-foreground">{student.courseName}</p>
      </td>

      <td className="p-3 text-xs">
        <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-medium">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          <span>{student.daysInactive} ngày không truy cập</span>
        </div>
        <p className="text-[10px] text-muted-foreground mt-0.5">{student.riskReason}</p>
      </td>

      <td className="p-3 text-xs">
        <div className="space-y-1 min-w-[120px]">
          <div className="flex justify-between text-[10px] font-bold">
            <span className="text-rose-600 dark:text-rose-400">Thực tế: {student.progressPercent}%</span>
            <span className="text-muted-foreground">Kỳ vọng: {student.expectedPercent}%</span>
          </div>
          <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-rose-500 rounded-full"
              style={{ width: `${student.progressPercent}%` }}
            />
          </div>
        </div>
      </td>

      <td className="p-3 text-xs font-bold text-foreground">
        {student.avgQuizScore > 0 ? `${student.avgQuizScore}/10` : "Chưa làm"}
      </td>

      <td className="p-3 text-right">
        <Button
          size="sm"
          onClick={() => onSendReminder(student)}
          className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg gap-1.5 h-8 px-3 cursor-pointer shadow-xs"
        >
          <Send className="h-3.5 w-3.5" />
          Nhắc nhở
        </Button>
      </td>
    </tr>
  );
};
