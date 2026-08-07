import React, { useState, useEffect } from "react";
import type { QuizResponseDTO } from "../../../api/courses/courseAuthoringApi";
import { LearningQuizPlayer } from "@/components/student/learning/LearningQuizPlayer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Save, HelpCircle, Clock, Award, Eye } from "lucide-react";
import { QuestionBuilderManager, type QuestionItem } from "./QuestionBuilderManager";

interface QuizBuilderProps {
  quiz: QuizResponseDTO | null;
  onSave: (quizId: string, updatedData: any) => void;
}

export const QuizBuilder: React.FC<QuizBuilderProps> = ({ quiz, onSave }) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [timeLimitMin, setTimeLimitMin] = useState(15);
  const [passScore, setPassScore] = useState(8.0);
  const [maxAttempts, setMaxAttempts] = useState(3);
  const [shuffleQuestions, setShuffleQuestions] = useState(true);
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  useEffect(() => {
    if (quiz) {
      setTitle(quiz.title || "");
      setDescription(quiz.description || "");
      setTimeLimitMin(quiz.timeLimitMin || 15);
      setPassScore(quiz.passScore || 8.0);
      setMaxAttempts(quiz.maxAttempts || 3);
      setShuffleQuestions(quiz.shuffleQuestions !== false);
      if ((quiz as any).questions && Array.isArray((quiz as any).questions) && (quiz as any).questions.length > 0) {
        setQuestions((quiz as any).questions);
      } else if (quiz.description && quiz.description.trim().startsWith("[")) {
        try {
          const parsed = JSON.parse(quiz.description);
          if (Array.isArray(parsed)) {
            setQuestions(parsed);
          }
        } catch {
          // Keep description fallback
        }
      } else {
        setQuestions([]);
      }
    }
  }, [quiz]);

  if (!quiz) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
        Chọn một bài kiểm tra Quiz từ danh sách bên trái để chỉnh sửa
      </div>
    );
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(quiz.id, {
      title,
      description: questions.length > 0
        ? JSON.stringify(questions)
        : (quiz.description && quiz.description.trim().startsWith("[") ? quiz.description : description),
      timeLimitMin,
      passScore,
      maxAttempts,
      shuffleQuestions,
      questions,
    });
  };

  const previewQuizObj: QuizResponseDTO = {
    id: quiz.id,
    code: quiz.code,
    title: title || "Bài kiểm tra Quiz (Preview)",
    description: description,
    timeLimitMin: timeLimitMin,
    passScore: passScore,
    maxAttempts: maxAttempts,
    shuffleQuestions: shuffleQuestions,
    questions: questions,
  };

  return (
    <Card className="flex-1 p-6 overflow-y-auto max-w-4xl mx-auto bg-card border-border/40 rounded-xl shadow-xs my-4 space-y-6 relative">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex items-center justify-between border-b border-border/40 pb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">Soạn thảo Bài kiểm tra Quiz</h3>
              <p className="text-xs text-muted-foreground">ID: {quiz.id} {quiz.code ? `• Mã: ${quiz.code}` : ""}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowPreviewModal(true)}
              className="h-9 text-xs font-bold gap-1.5 text-amber-900 bg-amber-50 border-amber-300 hover:bg-amber-100 cursor-pointer shadow-2xs"
            >
              <Eye className="w-4 h-4 text-amber-700" /> Xem trước Quiz (Preview)
            </Button>

            <Button
              type="submit"
              size="sm"
              className="h-9 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs gap-2 cursor-pointer shadow-xs"
            >
              <Save className="w-4 h-4" /> Lưu cấu hình & Danh sách câu hỏi
            </Button>
          </div>
        </div>

        <div className="space-y-1">
          <Label className="text-xs font-bold">Tiêu đề bài kiểm tra</Label>
          <Input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="h-9 text-sm"
            placeholder="Nhập tiêu đề bài kiểm tra..."
          />
        </div>

        <div className="space-y-1">
          <Label className="text-xs font-bold">Mô tả / Hướng dẫn làm bài</Label>
          <Textarea
            value={description.startsWith("[") ? "" : description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="text-xs"
            placeholder="Ghi chú hướng dẫn cho học viên trước khi làm bài..."
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-1">
            <Label className="text-xs font-bold">Thời gian làm bài (Phút)</Label>
            <div className="relative">
              <Input
                type="number"
                min={1}
                value={timeLimitMin}
                onChange={(e) => setTimeLimitMin(parseInt(e.target.value) || 1)}
                className="h-9 pl-8 text-sm"
              />
              <Clock className="w-4 h-4 text-muted-foreground absolute left-2.5 top-2.5" />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-bold">Điểm đạt tối thiểu (Thang điểm 10)</Label>
            <div className="relative">
              <Input
                type="number"
                step="0.5"
                min={0}
                max={10}
                value={passScore}
                onChange={(e) => setPassScore(parseFloat(e.target.value) || 0)}
                className="h-9 pl-8 text-sm"
              />
              <Award className="w-4 h-4 text-muted-foreground absolute left-2.5 top-2.5" />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-bold">Số lần cho phép làm lại</Label>
            <Input
              type="number"
              min={1}
              value={maxAttempts}
              onChange={(e) => setMaxAttempts(parseInt(e.target.value) || 1)}
              className="h-9 text-sm"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 pt-2">
          <Checkbox
            id="shuffle"
            checked={shuffleQuestions}
            onCheckedChange={(checked) => setShuffleQuestions(Boolean(checked))}
          />
          <Label htmlFor="shuffle" className="text-xs font-medium cursor-pointer">
            Xáo trộn ngẫu nhiên thứ tự câu hỏi khi làm bài
          </Label>
        </div>

        {/* Embedded Interactive Question Builder Manager */}
        <div className="pt-4 border-t border-border/40">
          <QuestionBuilderManager questions={questions} onChange={setQuestions} />
        </div>
      </form>

      {/* Interactive Quiz Preview Modal */}
      <Dialog open={showPreviewModal} onOpenChange={setShowPreviewModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl bg-card border border-border/40 shadow-2xl p-6">
          <DialogHeader className="border-b border-border/40 pb-3 flex items-center justify-between">
            <div>
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <Eye className="w-4 h-4 text-amber-600" /> Xem trước Bài kiểm tra Quiz (Học viên UI)
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Giao diện học viên trải nghiệm khi làm bài Quiz trực tiếp.
              </DialogDescription>
            </div>
          </DialogHeader>

          <div className="pt-2">
            <LearningQuizPlayer
              quiz={previewQuizObj}
              onComplete={() => {
                setShowPreviewModal(false);
              }}
            />
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
