import React, { useState, useEffect } from "react";
import type { AssignmentResponseDTO } from "../../../api/courses/courseAuthoringApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Save, CheckSquare, Calendar, Award } from "lucide-react";

interface AssignmentBuilderProps {
  assignment: AssignmentResponseDTO | null;
  onSave: (assignmentId: string, updatedData: any) => void;
}

export const AssignmentBuilder: React.FC<AssignmentBuilderProps> = ({ assignment, onSave }) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [maxScore, setMaxScore] = useState(10.0);
  const [dueDate, setDueDate] = useState("");
  const [allowLate, setAllowLate] = useState(false);

  useEffect(() => {
    if (assignment) {
      setTitle(assignment.title || "");
      setDescription(assignment.description || "");
      setMaxScore(assignment.maxScore || 10.0);
      setDueDate(assignment.dueDate ? assignment.dueDate.substring(0, 16) : "");
      setAllowLate(assignment.allowLate || false);
    }
  }, [assignment]);

  if (!assignment) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-muted-foreground">
        <CheckSquare className="w-12 h-12 mb-2 stroke-[1.5]" />
        <p className="text-sm font-medium">Chọn một Bài tập tự luận để soạn thảo nội dung</p>
      </div>
    );
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(assignment.id, {
      title,
      description,
      maxScore,
      dueDate,
      allowLate,
    });
  };

  return (
    <Card className="flex-1 p-6 overflow-y-auto max-w-4xl mx-auto bg-card border-border/40 rounded-xl shadow-xs my-4">
      <div className="flex items-center justify-between border-b border-border/40 pb-4 mb-6">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-purple-100 text-purple-700 rounded-lg">
            <CheckSquare className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">Thiết lập Bài tập tự luận</h2>
            <p className="text-xs text-muted-foreground">ID: {assignment.id}</p>
          </div>
        </div>
        <Button
          onClick={handleSubmit}
          size="sm"
          className="h-9 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs gap-2 cursor-pointer shadow-xs"
        >
          <Save className="w-4 h-4" /> Lưu bài tập
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-1">
          <Label className="text-xs font-bold">Tiêu đề bài tập</Label>
          <Input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="h-9 text-sm"
            placeholder="Nhập tiêu đề bài tập..."
          />
        </div>

        <div className="space-y-1">
          <Label className="text-xs font-bold">Yêu cầu & Hướng dẫn làm bài (Markdown/Text)</Label>
          <Textarea
            rows={8}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Mô tả chi tiết đề bài..."
            className="text-xs font-mono"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label className="text-xs font-bold">Điểm tối đa</Label>
            <div className="relative">
              <Input
                type="number"
                step="0.5"
                min={1}
                value={maxScore}
                onChange={(e) => setMaxScore(parseFloat(e.target.value) || 10)}
                className="h-9 pl-8 text-sm"
              />
              <Award className="w-4 h-4 text-muted-foreground absolute left-2.5 top-2.5" />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-bold">Hạn nộp (Due Date)</Label>
            <div className="relative">
              <Input
                type="datetime-local"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="h-9 pl-8 text-sm"
              />
              <Calendar className="w-4 h-4 text-muted-foreground absolute left-2.5 top-2.5" />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 pt-2">
          <Checkbox
            id="allowLate"
            checked={allowLate}
            onCheckedChange={(checked) => setAllowLate(Boolean(checked))}
          />
          <Label htmlFor="allowLate" className="text-xs font-medium cursor-pointer">
            Cho phép nộp muộn sau hạn nộp (đánh dấu Late Submission)
          </Label>
        </div>
      </form>
    </Card>
  );
};
