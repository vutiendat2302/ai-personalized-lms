import { useEffect, useMemo, useState } from "react";
import type { QuizResponseDTO } from "@/api/courses/courseAuthoringApi";
import { studentApi } from "@/api/student/studentApi";
import type { QuestionItem } from "@/components/admin/course-builder/QuestionBuilderManager";
import { MathRenderer } from "@/components/common/MathRenderer";
import { useToast } from "@/hooks/useToast";
import { AlertCircle, Award, CheckCircle, Clock, HelpCircle, Loader2, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface LearningQuizPlayerProps {
  quiz: QuizResponseDTO;
  onComplete: () => void;
  persistAttempt?: boolean;
}

type AnswerValue = string | string[] | Record<string, string>;

interface QuizTextProps {
  content: string;
}

/** Hiển thị văn bản quiz và render công thức LaTeX inline bằng KaTeX. */
const QuizText = ({ content }: QuizTextProps) => {
  const parts = content.split(/(\$\$[\s\S]*?\$\$|\$[^$\n]+\$|\\\([\s\S]*?\\\))/g);
  return (
    <>
      {parts.map((part, index) => {
        const isMath = /^(\$\$[\s\S]*\$\$|\$[^$\n]+\$|\\\([\s\S]*\\\))$/.test(part);
        return isMath
          ? <MathRenderer key={`${part}-${String(index)}`} math={part} displayMode={false} />
          : <span key={`${part}-${String(index)}`}>{part}</span>;
      })}
    </>
  );
};

/** Làm quiz trong không gian học bằng attempt backend; preview quản trị không ghi dữ liệu. */
export const LearningQuizPlayer = ({ quiz, onComplete, persistAttempt = false }: LearningQuizPlayerProps) => {
  const toast = useToast();
  const [started, setStarted] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [starting, setStarting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const [score, setScore] = useState<number | null>(null);
  const [passed, setPassed] = useState(false);
  const [timeLeftSec, setTimeLeftSec] = useState<number | null>(null);
  const resultVisible = quiz.showResultAfterSubmit !== false;

  /** Chỉ đọc danh sách câu hỏi thật từ DTO; JSON mô tả được hỗ trợ cho dữ liệu cũ. */
  const questions = useMemo<QuestionItem[]>(() => {
    if (Array.isArray(quiz.questions)) return quiz.questions as QuestionItem[];
    if (!quiz.description?.trim().startsWith("[")) return [];
    try {
      const parsed = JSON.parse(quiz.description);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }, [quiz]);

  /** Khởi tạo lại bộ đếm khi đổi quiz. */
  useEffect(() => {
    setStarted(false);
    setSubmitted(false);
    setAttemptId(null);
    setAnswers({});
    setScore(null);
    setPassed(false);
    setTimeLeftSec(quiz.timeLimitMin != null ? quiz.timeLimitMin * 60 : null);
  }, [quiz]);

  /** Đếm ngược thời gian và tự nộp attempt khi hết giờ. */
  useEffect(() => {
    if (!started || submitted || timeLeftSec == null || submitting) return;
    if (timeLeftSec <= 0) {
      void handleSubmitQuiz();
      return;
    }
    const timer = window.setTimeout(() => setTimeLeftSec((value) => value == null ? null : value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [started, submitted, timeLeftSec, submitting]);

  /** Định dạng số giây còn lại thành mm:ss. */
  const formatTime = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  };

  /** Tạo lượt làm thật cho học viên hoặc mở preview không ghi dữ liệu. */
  const handleStart = async () => {
    if (!persistAttempt) {
      setStarted(true);
      return;
    }
    setStarting(true);
    try {
      const newAttemptId = await studentApi.startQuizAttempt(quiz.id);
      setAttemptId(newAttemptId);
      setStarted(true);
    } catch {
      toast.error("Không thể bắt đầu lượt làm. Có thể bạn đã hết lượt hoặc quiz chưa mở.");
    } finally {
      setStarting(false);
    }
  };

  /** Ghi một lựa chọn đơn hoặc nội dung tự luận. */
  const setAnswer = (questionId: string, value: AnswerValue) => {
    setAnswers((current) => ({ ...current, [questionId]: value }));
  };

  /** Bật hoặc tắt một lựa chọn trong câu hỏi nhiều đáp án. */
  const toggleMultipleAnswer = (questionId: string, optionId: string) => {
    const current = Array.isArray(answers[questionId]) ? answers[questionId] as string[] : [];
    setAnswer(questionId, current.includes(optionId) ? current.filter((id) => id !== optionId) : [...current, optionId]);
  };

  /** Chuyển câu trả lời giao diện thành DTO mà API quiz chấp nhận. */
  const buildSubmission = () => questions.map((question) => {
    const answer = answers[question.id];
    if (question.questionType === "MULTIPLE_CHOICE") {
      return { questionId: question.id, selectedOptionIds: Array.isArray(answer) ? answer : [] };
    }
    if (question.questionType === "SINGLE_CHOICE" || question.questionType === "TRUE_FALSE") {
      return { questionId: question.id, selectedOptionId: typeof answer === "string" ? answer : undefined };
    }
    return { questionId: question.id, answerText: typeof answer === "string" ? answer : JSON.stringify(answer ?? {}) };
  });

  /** Chấm cục bộ chỉ cho preview quản trị, không được dùng để cấp tiến độ học viên. */
  const gradePreview = () => {
    const total = questions.reduce((sum, question) => sum + (question.points ?? 0), 0);
    const earned = questions.reduce((sum, question) => {
      const answer = answers[question.id];
      if (question.questionType === "MULTIPLE_CHOICE") {
        const selected = Array.isArray(answer) ? answer : [];
        const correct = question.options.filter((option) => option.isCorrect).map((option, index) => option.id ?? String(index));
        return sum + (selected.length === correct.length && selected.every((id) => correct.includes(id)) ? question.points : 0);
      }
      if (question.questionType === "SINGLE_CHOICE" || question.questionType === "TRUE_FALSE") {
        const correct = question.options.find((option) => option.isCorrect);
        return sum + (answer === (correct?.id ?? String(question.options.indexOf(correct!))) ? question.points : 0);
      }
      return sum;
    }, 0);
    const normalizedScore = total > 0 ? Number(((earned / total) * 100).toFixed(2)) : 0;
    setScore(normalizedScore);
    setPassed(quiz.passScore != null ? normalizedScore >= quiz.passScore : false);
    setSubmitted(true);
  };

  /** Nộp câu trả lời lên backend và đọc kết quả đã chấm từ API học viên. */
  async function handleSubmitQuiz() {
    if (submitting) return;
    if (!persistAttempt) {
      gradePreview();
      return;
    }
    if (!attemptId) {
      toast.error("Không tìm thấy lượt làm quiz hợp lệ.");
      return;
    }
    setSubmitting(true);
    try {
      await studentApi.submitQuizAttempt(attemptId, buildSubmission());
      const quizResults = await studentApi.getQuizzes();
      const result = quizResults.find((item) => item.id === quiz.id);
      setScore(resultVisible ? result?.bestScore ?? null : null);
      setPassed(resultVisible && Boolean(result?.passed));
      setSubmitted(true);
      toast.success("Đã nộp quiz thành công.");
    } catch {
      toast.error("Không thể nộp quiz. Vui lòng kiểm tra thời gian và trạng thái lượt làm.");
    } finally {
      setSubmitting(false);
    }
  }

  /** Đưa giao diện về trạng thái bắt đầu để backend tạo lượt mới. */
  const resetAttempt = () => {
    setStarted(false);
    setSubmitted(false);
    setAttemptId(null);
    setAnswers({});
    setScore(null);
    setPassed(false);
    setTimeLeftSec(quiz.timeLimitMin != null ? quiz.timeLimitMin * 60 : null);
  };

  return (
    <div className="mx-auto my-4 w-full max-w-6xl flex-1 space-y-6 overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-sm md:p-10">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-4">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-amber-100 p-3 text-amber-800"><HelpCircle className="h-6 w-6" /></div>
          <div>
            <h2 className="text-xl font-bold">{quiz.title}</h2>
            <p className="text-xs text-muted-foreground">{questions.length} câu hỏi</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {quiz.timeLimitMin != null && <Badge variant="secondary"><Clock className="mr-1 h-3.5 w-3.5" />{quiz.timeLimitMin} phút</Badge>}
          {quiz.passScore != null && <Badge variant="secondary"><Award className="mr-1 h-3.5 w-3.5" />Điểm đạt: {quiz.passScore}</Badge>}
        </div>
      </div>

      {questions.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-12 text-center text-muted-foreground"><AlertCircle className="mx-auto mb-3 h-10 w-10" />Quiz chưa có câu hỏi.</div>
      ) : !started ? (
        <div className="space-y-5 py-10 text-center">
          <p className="text-sm text-muted-foreground">
            {persistAttempt
              ? "Lượt làm chỉ được tính sau khi backend tạo attempt thành công."
              : "Chế độ preview: kết quả chỉ hiển thị tại trình duyệt và không ghi tiến độ."}
          </p>
          <Button onClick={() => void handleStart()} disabled={starting} className="gap-2">
            {starting && <Loader2 className="h-4 w-4 animate-spin" />}{starting ? "Đang bắt đầu..." : "Bắt đầu làm quiz"}
          </Button>
        </div>
      ) : submitted ? (
        <div className="space-y-6 py-4">
          <div className={`rounded-2xl border p-8 text-center ${!resultVisible && persistAttempt ? "border-primary/20 bg-primary/5" : passed ? "border-emerald-200 bg-emerald-50 text-emerald-950" : "border-rose-200 bg-rose-50 text-rose-950"}`}>
            {!resultVisible && persistAttempt
              ? <Clock className="mx-auto mb-3 h-12 w-12 text-primary" />
              : passed ? <CheckCircle className="mx-auto mb-3 h-12 w-12 text-emerald-600" /> : <AlertCircle className="mx-auto mb-3 h-12 w-12 text-rose-600" />}
            <h3 className="text-xl font-bold">
              {!resultVisible && persistAttempt ? "Đã ghi nhận bài nộp" : passed ? "Bạn đã đạt quiz" : "Quiz chưa đạt yêu cầu"}
            </h3>
            {!resultVisible && persistAttempt
              ? <p className="mt-2 text-sm text-muted-foreground">Giáo viên chưa cho phép xem điểm ngay sau khi nộp.</p>
              : score != null && <p className="mt-2 text-2xl font-black">{persistAttempt ? "Điểm backend" : "Điểm preview"}: {score}</p>}
          </div>
          <div className="flex flex-wrap justify-between gap-3">
            <Button variant="outline" onClick={resetAttempt} className="gap-2"><RefreshCw className="h-4 w-4" />Làm lượt mới</Button>
            {(passed || (!resultVisible && persistAttempt)) && <Button onClick={onComplete} className="gap-2"><CheckCircle className="h-4 w-4" />Hoàn thành và tiếp tục</Button>}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {timeLeftSec != null && <div className={`flex items-center justify-between rounded-xl border p-3 text-sm font-semibold ${timeLeftSec <= 60 ? "border-rose-300 bg-rose-50 text-rose-700" : "border-amber-200 bg-amber-50 text-amber-800"}`}><span>Thời gian còn lại</span><span className="font-mono">{formatTime(timeLeftSec)}</span></div>}
          {questions.map((question, questionIndex) => (
            <div key={question.id} className="space-y-4 rounded-2xl border bg-muted/20 p-5">
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-sm font-semibold">Câu {questionIndex + 1}: <QuizText content={question.content} /></h3>
                {question.points != null && <Badge variant="outline">{question.points} điểm</Badge>}
              </div>
              {(question.questionType === "SINGLE_CHOICE" || question.questionType === "TRUE_FALSE") && (
                <div className="space-y-2">{question.options.map((option, optionIndex) => {
                  const optionId = option.id ?? String(optionIndex);
                  return <label key={optionId} className="flex cursor-pointer items-center gap-3 rounded-xl border bg-background p-3 text-sm"><input type="radio" name={question.id} checked={answers[question.id] === optionId} onChange={() => setAnswer(question.id, optionId)} /><QuizText content={option.content} /></label>;
                })}</div>
              )}
              {question.questionType === "MULTIPLE_CHOICE" && (
                <div className="space-y-2">{question.options.map((option, optionIndex) => {
                  const optionId = option.id ?? String(optionIndex);
                  const selected = Array.isArray(answers[question.id]) && (answers[question.id] as string[]).includes(optionId);
                  return <label key={optionId} className="flex cursor-pointer items-center gap-3 rounded-xl border bg-background p-3 text-sm"><input type="checkbox" checked={selected} onChange={() => toggleMultipleAnswer(question.id, optionId)} /><QuizText content={option.content} /></label>;
                })}</div>
              )}
              {(question.questionType === "SHORT_ANSWER" || question.questionType === "ESSAY") && <textarea rows={question.questionType === "ESSAY" ? 6 : 2} value={typeof answers[question.id] === "string" ? answers[question.id] as string : ""} onChange={(event) => setAnswer(question.id, event.target.value)} className="w-full rounded-xl border bg-background p-3 text-sm" placeholder="Nhập câu trả lời" />}
              {question.questionType === "MATCHING" && <p className="text-sm text-muted-foreground">Câu hỏi ghép đôi hiện được nộp theo nội dung cấu trúc từ trình soạn thảo.</p>}
            </div>
          ))}
          <Button className="w-full" onClick={() => void handleSubmitQuiz()} disabled={submitting}>{submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{submitting ? "Đang nộp..." : "Nộp bài quiz"}</Button>
        </div>
      )}
    </div>
  );
};
