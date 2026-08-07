import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Plus,
  Trash2,
  HelpCircle,
  ListChecks,
  FileText,
  Copy,
  ChevronDown,
  ChevronUp,
  Sparkles,
  ArrowRightLeft
} from "lucide-react";

export type QuestionType =
  | "SINGLE_CHOICE"
  | "MULTIPLE_CHOICE"
  | "TRUE_FALSE"
  | "SHORT_ANSWER"
  | "ESSAY"
  | "MATCHING";

export interface QuestionOptionItem {
  id?: string;
  content: string;
  isCorrect: boolean;
  matchingPair?: string;
}

export interface QuestionItem {
  id: string;
  content: string;
  questionType: QuestionType;
  points: number;
  explanation?: string;
  options: QuestionOptionItem[];
}

interface QuestionBuilderManagerProps {
  questions: QuestionItem[];
  onChange: (questions: QuestionItem[]) => void;
}

export const QuestionBuilderManager: React.FC<QuestionBuilderManagerProps> = ({ questions, onChange }) => {
  const [expandedId, setExpandedId] = useState<string | null>(questions[0]?.id || null);

  const handleAddQuestion = (type: QuestionType) => {
    const newId = "q_" + Date.now();
    let defaultOptions: QuestionOptionItem[] = [];

    if (type === "SINGLE_CHOICE" || type === "MULTIPLE_CHOICE") {
      defaultOptions = [
        { content: "Phương án A", isCorrect: true },
        { content: "Phương án B", isCorrect: false },
        { content: "Phương án C", isCorrect: false },
        { content: "Phương án D", isCorrect: false },
      ];
    } else if (type === "TRUE_FALSE") {
      defaultOptions = [
        { content: "Đúng (True)", isCorrect: true },
        { content: "Sai (False)", isCorrect: false },
      ];
    } else if (type === "MATCHING") {
      defaultOptions = [
        { content: "Khái niệm A", matchingPair: "Định nghĩa A", isCorrect: true },
        { content: "Khái niệm B", matchingPair: "Định nghĩa B", isCorrect: true },
      ];
    } else if (type === "SHORT_ANSWER") {
      defaultOptions = [{ content: "Từ khóa đáp án đúng", isCorrect: true }];
    }

    const newQ: QuestionItem = {
      id: newId,
      content: "",
      questionType: type,
      points: 1.0,
      explanation: "",
      options: defaultOptions,
    };

    const updated = [...questions, newQ];
    onChange(updated);
    setExpandedId(newId);
  };

  const handleRemoveQuestion = (id: string) => {
    const updated = questions.filter((q) => q.id !== id);
    onChange(updated);
    if (expandedId === id) setExpandedId(updated[0]?.id || null);
  };

  const handleDuplicateQuestion = (id: string) => {
    const target = questions.find((q) => q.id === id);
    if (!target) return;
    const dup: QuestionItem = {
      ...JSON.parse(JSON.stringify(target)),
      id: "q_" + Date.now(),
      content: target.content + " (Bản sao)",
    };
    const updated = [...questions, dup];
    onChange(updated);
    setExpandedId(dup.id);
  };

  const handleUpdateQuestion = (id: string, fields: Partial<QuestionItem>) => {
    const updated = questions.map((q) => (q.id === id ? { ...q, ...fields } : q));
    onChange(updated);
  };

  const handleAddOption = (qId: string) => {
    const updated = questions.map((q) => {
      if (q.id !== qId) return q;
      const nextChar = String.fromCharCode(65 + q.options.length);
      const newOpt: QuestionOptionItem = {
        content: `Phương án ${nextChar}`,
        isCorrect: false,
        matchingPair: q.questionType === "MATCHING" ? `Định nghĩa ${nextChar}` : undefined,
      };
      return { ...q, options: [...q.options, newOpt] };
    });
    onChange(updated);
  };

  const handleRemoveOption = (qId: string, optIndex: number) => {
    const updated = questions.map((q) => {
      if (q.id !== qId) return q;
      return { ...q, options: q.options.filter((_, idx) => idx !== optIndex) };
    });
    onChange(updated);
  };

  const handleUpdateOption = (qId: string, optIndex: number, fields: Partial<QuestionOptionItem>) => {
    const updated = questions.map((q) => {
      if (q.id !== qId) return q;
      const newOpts = q.options.map((opt, idx) => {
        if (idx !== optIndex) {
          if (q.questionType === "SINGLE_CHOICE" && fields.isCorrect) {
            return { ...opt, isCorrect: false };
          }
          return opt;
        }
        return { ...opt, ...fields };
      });
      return { ...q, options: newOpts };
    });
    onChange(updated);
  };

  const getQuestionTypeBadge = (type: QuestionType) => {
    switch (type) {
      case "SINGLE_CHOICE":
        return <Badge className="bg-blue-100 text-blue-900 border-blue-200">Trắc nghiệm 1 đáp án</Badge>;
      case "MULTIPLE_CHOICE":
        return <Badge className="bg-indigo-100 text-indigo-900 border-indigo-200">Trắc nghiệm nhiều đáp án</Badge>;
      case "TRUE_FALSE":
        return <Badge className="bg-emerald-100 text-emerald-900 border-emerald-200">Đúng / Sai</Badge>;
      case "SHORT_ANSWER":
        return <Badge className="bg-amber-100 text-amber-900 border-amber-200">Điền đáp án ngắn</Badge>;
      case "ESSAY":
        return <Badge className="bg-purple-100 text-purple-900 border-purple-200">Tự luận</Badge>;
      case "MATCHING":
        return <Badge className="bg-rose-100 text-rose-900 border-rose-200">Nối cặp đáp án</Badge>;
      default:
        return <Badge variant="outline">Trắc nghiệm</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-border/40 pb-3">
        <div>
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <ListChecks className="w-4 h-4 text-amber-600" /> Danh sách câu hỏi Quiz ({questions.length} câu)
          </h3>
          <p className="text-[11px] text-muted-foreground">Tạo và thiết lập các loại câu hỏi trắc nghiệm, tự luận & nối đáp án trực tiếp</p>
        </div>

        {/* Question Type Creator Selector Dropdown */}
        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleAddQuestion("SINGLE_CHOICE")}
            className="h-8 text-xs font-bold gap-1 text-blue-700 bg-blue-50/50 border-blue-200 hover:bg-blue-100 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> + 1 Đáp án
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleAddQuestion("MULTIPLE_CHOICE")}
            className="h-8 text-xs font-bold gap-1 text-indigo-700 bg-indigo-50/50 border-indigo-200 hover:bg-indigo-100 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> + Nhiều đáp án
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleAddQuestion("TRUE_FALSE")}
            className="h-8 text-xs font-bold gap-1 text-emerald-700 bg-emerald-50/50 border-emerald-200 hover:bg-emerald-100 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> + Đúng/Sai
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleAddQuestion("MATCHING")}
            className="h-8 text-xs font-bold gap-1 text-rose-700 bg-rose-50/50 border-rose-200 hover:bg-rose-100 cursor-pointer"
          >
            <ArrowRightLeft className="w-3.5 h-3.5" /> + Nối cặp
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleAddQuestion("SHORT_ANSWER")}
            className="h-8 text-xs font-bold gap-1 text-amber-700 bg-amber-50/50 border-amber-200 hover:bg-amber-100 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> + Điền đáp án
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleAddQuestion("ESSAY")}
            className="h-8 text-xs font-bold gap-1 text-purple-700 bg-purple-50/50 border-purple-200 hover:bg-purple-100 cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5" /> + Tự luận
          </Button>
        </div>
      </div>

      {/* Empty State */}
      {questions.length === 0 && (
        <div className="p-8 border-2 border-dashed border-border/50 rounded-2xl text-center bg-muted/10 space-y-3">
          <HelpCircle className="w-10 h-10 text-muted-foreground mx-auto stroke-[1.5]" />
          <p className="text-xs font-bold text-foreground">Chưa có câu hỏi nào trong bài Quiz này</p>
          <p className="text-[11px] text-muted-foreground">Nhấp vào các nút bên trên để tạo mới câu hỏi trắc nghiệm, đúng/sai, tự luận hoặc nối cặp đáp án.</p>
        </div>
      )}

      {/* Question Accordion List */}
      <div className="space-y-3">
        {questions.map((q, idx) => {
          const isExpanded = expandedId === q.id;

          return (
            <Card key={q.id} className="border border-border/60 shadow-2xs rounded-2xl overflow-hidden transition">
              {/* Question Item Header */}
              <div
                onClick={() => setExpandedId(isExpanded ? null : q.id)}
                className="p-3.5 bg-muted/20 hover:bg-muted/40 cursor-pointer flex items-center justify-between transition"
              >
                <div className="flex items-center gap-3 truncate">
                  <span className="w-6 h-6 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center shrink-0">
                    {idx + 1}
                  </span>
                  <span className="text-xs font-bold text-foreground truncate max-w-md">
                    {q.content.trim() || `Câu hỏi #${idx + 1} (Chưa nhập nội dung)`}
                  </span>
                  {getQuestionTypeBadge(q.questionType)}
                  <Badge variant="outline" className="text-[10px] text-muted-foreground">
                    {q.points} điểm
                  </Badge>
                </div>

                <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDuplicateQuestion(q.id)}
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground cursor-pointer"
                    title="Nhân bản câu hỏi"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveQuestion(q.id)}
                    className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10 cursor-pointer"
                    title="Xóa câu hỏi"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setExpandedId(isExpanded ? null : q.id)}
                    className="h-7 w-7 p-0 text-muted-foreground cursor-pointer"
                  >
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              {/* Question Detailed Form */}
              {isExpanded && (
                <div className="p-4 space-y-4 border-t border-border/40 bg-background">
                  {/* Top Bar: Question Content & Type & Points */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div className="md:col-span-2 space-y-1">
                      <Label className="text-xs font-bold">Nội dung câu hỏi</Label>
                      <Input
                        type="text"
                        value={q.content}
                        onChange={(e) => handleUpdateQuestion(q.id, { content: e.target.value })}
                        placeholder="Nhập nội dung đề bài câu hỏi..."
                        className="h-9 text-xs"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs font-bold">Dạng câu hỏi</Label>
                      <select
                        value={q.questionType}
                        onChange={(e) => handleUpdateQuestion(q.id, { questionType: e.target.value as QuestionType })}
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-xs font-semibold outline-none"
                      >
                        <option value="SINGLE_CHOICE">Trắc nghiệm 1 đáp án</option>
                        <option value="MULTIPLE_CHOICE">Trắc nghiệm nhiều đáp án</option>
                        <option value="TRUE_FALSE">Đúng / Sai</option>
                        <option value="MATCHING">Nối cặp vế A - vế B</option>
                        <option value="SHORT_ANSWER">Điền đáp án ngắn</option>
                        <option value="ESSAY">Bài tự luận</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs font-bold">Điểm số</Label>
                      <Input
                        type="number"
                        step="0.5"
                        min={0.5}
                        value={q.points}
                        onChange={(e) => handleUpdateQuestion(q.id, { points: parseFloat(e.target.value) || 1.0 })}
                        className="h-9 text-xs"
                      />
                    </div>
                  </div>

                  {/* Options Builder Section */}
                  {(q.questionType === "SINGLE_CHOICE" || q.questionType === "MULTIPLE_CHOICE" || q.questionType === "TRUE_FALSE") && (
                    <div className="space-y-2.5 pt-2 border-t border-border/30">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-bold text-foreground">
                          Các lựa chọn phương án (Tích chọn đáp án đúng)
                        </Label>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleAddOption(q.id)}
                          className="h-6 text-xs font-bold text-primary hover:bg-primary/10 cursor-pointer"
                        >
                          + Thêm phương án
                        </Button>
                      </div>

                      <div className="space-y-2">
                        {q.options.map((opt, optIdx) => (
                          <div key={optIdx} className="flex items-center gap-2">
                            <input
                              type={q.questionType === "SINGLE_CHOICE" || q.questionType === "TRUE_FALSE" ? "radio" : "checkbox"}
                              name={`correct_${q.id}`}
                              checked={opt.isCorrect}
                              onChange={(e) => handleUpdateOption(q.id, optIdx, { isCorrect: e.target.checked })}
                              className="w-4 h-4 text-primary cursor-pointer accent-primary"
                              title="Đánh dấu đáp án đúng"
                            />
                            <span className="text-xs font-mono font-bold w-5 text-muted-foreground">
                              {String.fromCharCode(65 + optIdx)}.
                            </span>
                            <Input
                              type="text"
                              value={opt.content}
                              onChange={(e) => handleUpdateOption(q.id, optIdx, { content: e.target.value })}
                              placeholder={`Phương án ${String.fromCharCode(65 + optIdx)}...`}
                              className="h-8 text-xs flex-1"
                            />
                            {q.options.length > 2 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveOption(q.id, optIdx)}
                                className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* MATCHING Pairs Builder */}
                  {q.questionType === "MATCHING" && (
                    <div className="space-y-2.5 pt-2 border-t border-border/30">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-bold text-foreground">
                          Thiết lập các cặp vế ghép nối (Vế A <ArrowRightLeft className="w-3 h-3 inline mx-1" /> Vế B)
                        </Label>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleAddOption(q.id)}
                          className="h-6 text-xs font-bold text-primary hover:bg-primary/10 cursor-pointer"
                        >
                          + Thêm cặp nối
                        </Button>
                      </div>

                      <div className="space-y-2">
                        {q.options.map((opt, optIdx) => (
                          <div key={optIdx} className="grid grid-cols-1 md:grid-cols-2 gap-2 p-2 bg-muted/10 border border-border/40 rounded-xl">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-primary shrink-0">Vế {optIdx + 1}:</span>
                              <Input
                                type="text"
                                value={opt.content}
                                onChange={(e) => handleUpdateOption(q.id, optIdx, { content: e.target.value })}
                                placeholder="Khái niệm / Từ khóa vế trái..."
                                className="h-8 text-xs bg-background"
                              />
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-emerald-600 shrink-0">Nối với:</span>
                              <Input
                                type="text"
                                value={opt.matchingPair || ""}
                                onChange={(e) => handleUpdateOption(q.id, optIdx, { matchingPair: e.target.value })}
                                placeholder="Giải thích / Định nghĩa vế phải..."
                                className="h-8 text-xs bg-background"
                              />
                              {q.options.length > 1 && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRemoveOption(q.id, optIdx)}
                                  className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10 cursor-pointer shrink-0"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* SHORT ANSWER / FILL BLANK */}
                  {q.questionType === "SHORT_ANSWER" && (
                    <div className="space-y-2 pt-2 border-t border-border/30">
                      <Label className="text-xs font-bold text-foreground">
                        Đáp án đúng chính xác (Có thể phân cách bằng phẩy nếu có nhiều từ đồng nghĩa)
                      </Label>
                      <Input
                        type="text"
                        value={q.options[0]?.content || ""}
                        onChange={(e) => handleUpdateOption(q.id, 0, { content: e.target.value, isCorrect: true })}
                        placeholder="VD: Java, Spring Boot, React..."
                        className="h-8 text-xs font-mono"
                      />
                    </div>
                  )}

                  {/* Explanation / Solution Guide */}
                  <div className="space-y-1 pt-2 border-t border-border/30">
                    <Label className="text-xs font-bold text-muted-foreground flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Lời giải thích & Hướng dẫn đáp án (Giải thích khi xem kết quả)
                    </Label>
                    <Textarea
                      rows={2}
                      value={q.explanation || ""}
                      onChange={(e) => handleUpdateQuestion(q.id, { explanation: e.target.value })}
                      placeholder="Nhập hướng dẫn hoặc lý do chọn đáp án đúng..."
                      className="text-xs"
                    />
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
};
