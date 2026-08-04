import React, { useState, useEffect } from "react";
import type { QuizResponseDTO } from "../../../api/courses/courseAuthoringApi";
import { LearningQuizPlayer } from "@/components/student/learning/LearningQuizPlayer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Save, HelpCircle, Clock, Award, Eye, X } from "lucide-react";
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
      if ((quiz as any).questions && Array.isArray((quiz as any).questions)) {
        setQuestions((quiz as any).questions);
      } else {
        try {
          const parsed = JSON.parse(quiz.description || "[]");
          if (Array.isArray(parsed)) setQuestions(parsed);
        } catch (err) {
          setQuestions([]);
        }
      }
    }
  }, [quiz]);

  if (!quiz) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-muted-foreground">
        <HelpCircle className="w-12 h-12 mb-2 stroke-[1.5]" />
        <p className="text-sm font-medium">Chọn một bài Quiz từ danh sách để thiết lập</p>
      </div>
    );
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(quiz.id, {
      title,
      description: questions.length > 0 ? JSON.stringify(questions) : description,
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
    title: title || "Bài kiểm tra Quiz",
    description: description,
    timeLimitMin: timeLimitMin,
    passScore: passScore,
    maxAttempts: maxAttempts,
    shuffleQuestions: shuffleQuestions,
    questions: questions,
  };

  return (
    <Card className="flex-1 p-6 overflow-y-auto max-w-4xl mx-auto bg-card border-border/40 rounded-xl shadow-xs my-4 space-y-6 relative">
      <div className="flex items-center justify-between border-b border-border/40 pb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-amber-100 text-amber-700 rounded-lg">
            <HelpCircle className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">Thiết lập & Soạn thảo Quiz Trắc nghiệm</h2>
            <p className="text-xs text-muted-foreground">Mã Quiz: {quiz.code || quiz.id}</p>
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
            onClick={handleSubmit}
            size="sm"
            className="h-9 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs gap-2 cursor-pointer shadow-xs"
          >
            <Save className="w-4 h-4" /> Lưu cấu hình & Danh sách câu hỏi
          </Button>
        </div>
      </div>

      {/* Quiz Preview Modal */}
      {showPreviewModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-y-auto relative shadow-2xl border border-gray-200">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-3 flex items-center justify-between z-10">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-700 flex items-center gap-1.5">
                <Eye className="w-4 h-4" /> Chế độ xem trước bài kiểm tra (Teacher Preview)
              </span>
              <button
                onClick={() => setShowPreviewModal(false)}
                className="p-1.5 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-full cursor-pointer transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4">
              <LearningQuizPlayer quiz={previewQuizObj} onComplete={() => setShowPreviewModal(false)} />
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-1">
          <Label className="text-xs font-bold">Tiêu đề bài kiểm tra</Label>
          <Input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="h-9 text-sm"
            placeholder="Nhập tiêu đề Quiz..."
          />
        </div>

        <div className="space-y-1">
          <Label className="text-xs font-bold">Mô tả & Hướng dẫn làm bài</Label>
          <Textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Quy định làm bài..."
            className="text-xs"
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-1">
            <Label className="text-xs font-bold">Thời gian giới hạn (Phút)</Label>
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
            <Label className="text-xs font-bold">Điểm đạt (Pass Score)</Label>
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
    </Card>
  );
};
