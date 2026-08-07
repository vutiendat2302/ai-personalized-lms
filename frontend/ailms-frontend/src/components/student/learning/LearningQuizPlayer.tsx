import React, { useState, useEffect } from "react";
import type { QuizResponseDTO } from "../../../api/courses/courseAuthoringApi";
import type { QuestionItem } from "@/components/admin/course-builder/QuestionBuilderManager";
import { HelpCircle, Clock, Award, CheckCircle, AlertCircle, Sparkles, RefreshCw, AlertTriangle, Eye, EyeOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface LearningQuizPlayerProps {
  quiz: QuizResponseDTO;
  onComplete: () => void;
}

export const LearningQuizPlayer: React.FC<LearningQuizPlayerProps> = ({ quiz, onComplete }) => {
  const [started, setStarted] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [showAnswerKey, setShowAnswerKey] = useState(false);
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [studentAnswers, setStudentAnswers] = useState<Record<string, any>>({});
  const [score, setScore] = useState<number>(0);
  const [isPassed, setIsPassed] = useState<boolean>(false);
  
  // Timer State (seconds)
  const timeLimitMinutes = quiz.timeLimitMin || 15;
  const [timeLeftSec, setTimeLeftSec] = useState<number>(timeLimitMinutes * 60);

  // Parse questions strictly
  useEffect(() => {
    let parsedQuestions: QuestionItem[] = [];

    // 1. Direct questions array on quiz object
    if ((quiz as any).questions && Array.isArray((quiz as any).questions) && (quiz as any).questions.length > 0) {
      parsedQuestions = (quiz as any).questions.filter(
        (q: any) => q && q.questionType && Array.isArray(q.options)
      );
    }
    // 2. Parsed JSON from description IF AND ONLY IF it's valid QuestionItem array
    else if (quiz.description && quiz.description.trim().startsWith("[")) {
      try {
        const parsed = JSON.parse(quiz.description);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const validQuestions = parsed.filter(
            (q: any) => q && q.questionType && (Array.isArray(q.options) || q.questionType === "SHORT_ANSWER" || q.questionType === "ESSAY")
          );
          if (validQuestions.length > 0) {
            parsedQuestions = validQuestions;
          }
        }
      } catch (err) {
        // Not a question array JSON (e.g. lesson blocks) -> ignore
      }
    }

    setQuestions(parsedQuestions);
    setTimeLeftSec((quiz.timeLimitMin || 15) * 60);
  }, [quiz]);

  // Live Countdown Timer
  useEffect(() => {
    if (!started || submitted) return;

    const timer = setInterval(() => {
      setTimeLeftSec((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmitQuiz(); // Auto submit when time expires
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [started, submitted]);

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Option selection handlers
  const handleSelectOption = (questionId: string, optionIndex: number, isMultiple: boolean) => {
    setStudentAnswers((prev) => {
      if (isMultiple) {
        const currentList: number[] = prev[questionId] || [];
        const exists = currentList.includes(optionIndex);
        const updatedList = exists
          ? currentList.filter((i) => i !== optionIndex)
          : [...currentList, optionIndex];
        return { ...prev, [questionId]: updatedList };
      }
      return { ...prev, [questionId]: optionIndex };
    });
  };

  const handleTextAnswer = (questionId: string, value: string) => {
    setStudentAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const handleMatchingAnswer = (questionId: string, optIndex: number, pairValue: string) => {
    setStudentAnswers((prev) => {
      const currentMap: Record<number, string> = prev[questionId] || {};
      return {
        ...prev,
        [questionId]: { ...currentMap, [optIndex]: pairValue },
      };
    });
  };

  // Submit and scoring
  const handleSubmitQuiz = () => {
    let totalMaxPoints = 0;
    let totalEarnedPoints = 0;

    questions.forEach((q) => {
      const pointValue = typeof q.points === "number" ? q.points : 1.0;
      totalMaxPoints += pointValue;

      const userAns = studentAnswers[q.id];

      if (q.questionType === "SINGLE_CHOICE" || q.questionType === "TRUE_FALSE") {
        if (typeof userAns === "number" && q.options && q.options[userAns]?.isCorrect) {
          totalEarnedPoints += pointValue;
        }
      } else if (q.questionType === "MULTIPLE_CHOICE") {
        const selectedIndices: number[] = Array.isArray(userAns) ? userAns : [];
        const correctIndices = (q.options || [])
          .map((opt, idx) => (opt.isCorrect ? idx : null))
          .filter((i) => i !== null) as number[];

        const isExactMatch =
          selectedIndices.length === correctIndices.length &&
          selectedIndices.every((i) => correctIndices.includes(i));
        if (isExactMatch) totalEarnedPoints += pointValue;
      } else if (q.questionType === "SHORT_ANSWER") {
        const targetStr = (q.options && q.options[0]?.content || "").toLowerCase().trim();
        const userStr = String(userAns || "").toLowerCase().trim();
        if (targetStr && userStr && (targetStr.includes(userStr) || userStr.includes(targetStr))) {
          totalEarnedPoints += pointValue;
        }
      } else if (q.questionType === "ESSAY") {
        if (String(userAns || "").trim().length > 5) {
          totalEarnedPoints += pointValue;
        }
      } else if (q.questionType === "MATCHING") {
        const userMatches: Record<number, string> = userAns || {};
        let correctPairCount = 0;
        const opts = q.options || [];
        opts.forEach((opt, idx) => {
          if (opt.matchingPair && userMatches[idx] === opt.matchingPair) {
            correctPairCount++;
          }
        });
        if (opts.length > 0) {
          totalEarnedPoints += pointValue * (correctPairCount / opts.length);
        }
      }
    });

    const calculatedScore = totalMaxPoints > 0 ? (totalEarnedPoints / totalMaxPoints) * 10 : 0;
    const finalScore = parseFloat(calculatedScore.toFixed(1));
    const passThreshold = quiz.passScore || 8.0;
    const passed = finalScore >= passThreshold;

    setScore(finalScore);
    setIsPassed(passed);
    setSubmitted(true);
  };

  const isWarningTime = timeLeftSec <= 60; // 1 minute remaining warning

  return (
    <div className="flex-1 p-6 md:p-10 overflow-y-auto w-full max-w-6xl mx-auto bg-white border border-gray-200 rounded-2xl shadow-sm my-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-amber-100 text-amber-800 rounded-2xl shrink-0">
            <HelpCircle className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">{quiz.title}</h2>
            <p className="text-xs text-gray-500">Mã bài thi: {quiz.code || quiz.id} • Tổng số {questions.length} câu hỏi</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowAnswerKey(!showAnswerKey)}
            className={`px-3.5 py-1.5 font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer transition shadow-2xs ${
              showAnswerKey
                ? "bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-700"
                : "bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300"
            }`}
            title="Bật/Tắt chế độ xem đáp án đúng và lời giải chi tiết"
          >
            {showAnswerKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            <span>{showAnswerKey ? "Ẩn đáp án" : "Xem đáp án (Answer Key)"}</span>
          </button>

          <Badge className="bg-amber-100 text-amber-900 border-amber-300 font-bold px-3.5 py-1 text-xs">
            Yêu cầu đạt: {quiz.passScore || 8.0} / 10.0 điểm
          </Badge>
        </div>
      </div>

      {questions.length === 0 ? (
        <div className="text-center py-12 px-4 space-y-3 bg-amber-50/50 border border-amber-200 rounded-2xl">
          <AlertCircle className="w-12 h-12 text-amber-600 mx-auto" />
          <h3 className="text-base font-bold text-amber-950">Chưa có câu hỏi nào trong bài Quiz này</h3>
          <p className="text-xs text-amber-800 max-w-md mx-auto">
            Giảng viên phụ trách chưa bổ sung câu hỏi cho bài kiểm tra này. Vui lòng quay lại sau hoặc liên hệ giảng viên.
          </p>
        </div>
      ) : !started ? (
        <div className="space-y-6 text-center py-8">
          <p className="text-sm text-gray-600 max-w-xl mx-auto leading-relaxed font-medium">
            Sẵn sàng làm bài kiểm tra Quiz với {questions.length} câu hỏi. Hãy kiểm tra kỹ thời gian làm bài trước khi bấm bắt đầu.
          </p>

          <div className="flex justify-center gap-6 text-xs text-gray-600">
            <div className="flex items-center gap-2 bg-gray-50 px-4 py-2.5 rounded-xl border border-gray-200 font-semibold">
              <Clock className="w-4 h-4 text-amber-600" />
              <span>Thời gian làm bài: <strong>{timeLimitMinutes} phút</strong></span>
            </div>
            <div className="flex items-center gap-2 bg-gray-50 px-4 py-2.5 rounded-xl border border-gray-200 font-semibold">
              <Award className="w-4 h-4 text-amber-600" />
              <span>Thang điểm: <strong>10.0 (Tổng {questions.reduce((acc, q) => acc + (q.points || 1), 0)} điểm)</strong></span>
            </div>
          </div>

          <button
            onClick={() => setStarted(true)}
            className="px-8 py-3.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm rounded-xl shadow-md cursor-pointer transition"
          >
            Bắt đầu làm bài Quiz ngay
          </button>
        </div>
      ) : submitted ? (
        <div className="space-y-6 py-2">
          {/* Result Card */}
          <div className={`p-6 rounded-2xl border text-center space-y-3 ${isPassed ? "bg-emerald-50 border-emerald-200 text-emerald-950" : "bg-rose-50 border-rose-200 text-rose-950"}`}>
            {isPassed ? (
              <CheckCircle className="w-14 h-14 text-emerald-500 mx-auto" />
            ) : (
              <AlertCircle className="w-14 h-14 text-rose-500 mx-auto" />
            )}
            <h3 className="text-xl font-bold">
              {isPassed ? "Chúc mừng! Bạn đã ĐẠT bài Quiz này 🎉" : "Chưa đạt điểm tối thiểu. Hãy xem lại bài làm và làm lại!"}
            </h3>
            <div className="text-3xl font-black">
              Điểm số bài thi: <span className={isPassed ? "text-emerald-600" : "text-rose-600"}>{score}</span> / 10.0
            </div>
            <p className="text-xs opacity-80">
              Yêu cầu điểm đạt tối thiểu: {quiz.passScore || 8.0}/10
            </p>
          </div>

          {/* Results Review per Question */}
          <div className="space-y-4 pt-2">
            <h4 className="text-sm font-bold text-gray-900 border-b border-gray-100 pb-2">
              Chi tiết câu trả lời & Hướng dẫn đáp án:
            </h4>
            {questions.map((q, qIdx) => (
              <div key={q.id || qIdx} className="p-4 bg-gray-50 border border-gray-200 rounded-2xl space-y-2 text-xs">
                <div className="flex items-center justify-between font-bold text-gray-900">
                  <span>Câu {qIdx + 1}: {q.content}</span>
                  <Badge variant="outline" className="text-[10px] font-bold">Points: {q.points || 1.0}</Badge>
                </div>

                {/* Show correct answers for each question in submission review */}
                {Array.isArray(q.options) && q.options.length > 0 && (
                  <div className="space-y-1 pl-2 pt-1">
                    {q.options.map((opt, oIdx) => (
                      <div
                        key={oIdx}
                        className={`p-2 rounded-lg text-xs border flex items-center justify-between ${
                          opt.isCorrect
                            ? "bg-emerald-500/10 border-emerald-400 font-bold text-emerald-800"
                            : "bg-white border-gray-200 text-gray-600"
                        }`}
                      >
                        <span>{opt.content}</span>
                        {opt.isCorrect && <Badge className="bg-emerald-600 text-white text-[9px]">Đáp án đúng</Badge>}
                      </div>
                    ))}
                  </div>
                )}

                {q.explanation && (
                  <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-[11px] flex items-start gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <span><strong>Lời giải chi tiết:</strong> {q.explanation}</span>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-gray-100 gap-4">
            <button
              onClick={() => {
                setSubmitted(false);
                setStudentAnswers({});
                setTimeLeftSec((quiz.timeLimitMin || 15) * 60);
              }}
              className="px-5 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-bold text-xs rounded-xl flex items-center gap-2 cursor-pointer transition shadow-2xs shrink-0"
            >
              <RefreshCw className="w-4 h-4 text-amber-700" /> Quay lại làm lại bài thi
            </button>

            {isPassed ? (
              <button
                onClick={onComplete}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer ml-auto flex items-center gap-2 transition"
              >
                <CheckCircle className="w-4 h-4" /> Hoàn thành & Tiếp tục bài học
              </button>
            ) : (
              <div className="flex items-center gap-2 text-rose-800 text-xs font-bold bg-rose-50 px-4 py-2.5 rounded-xl border border-rose-200 ml-auto">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>Chưa đạt điểm sàn yêu cầu ({quiz.passScore || 8.0}/10). Vui lòng làm lại bài thi để hoàn thành bài học.</span>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Live Countdown Timer Badge */}
          <div
            className={`p-3.5 rounded-xl border text-xs flex justify-between items-center font-bold transition-all ${
              isWarningTime
                ? "bg-rose-100 text-rose-800 border-rose-300 animate-pulse shadow-md"
                : "bg-amber-50 text-amber-900 border-amber-200"
            }`}
          >
            <span className="flex items-center gap-2">
              {isWarningTime && <AlertTriangle className="w-4 h-4 text-rose-600 animate-bounce" />}
              <span>{isWarningTime ? "SẮP HẾT THỜI GIAN LÀM BÀI!" : "Đang trong thời gian làm bài kiểm tra..."}</span>
            </span>
            <span className="font-mono text-sm tracking-wider flex items-center gap-1.5">
              <Clock className="w-4 h-4" /> {formatTime(timeLeftSec)}
            </span>
          </div>

          {/* Render Questions List */}
          <div className="space-y-6">
            {questions.map((q, qIdx) => (
              <div key={q.id || qIdx} className="p-5 bg-gray-50/90 border border-gray-200 rounded-2xl space-y-3 shadow-2xs">
                <div className="flex items-start justify-between gap-3">
                  <h4 className="text-sm font-bold text-gray-900 leading-snug">
                    Câu {qIdx + 1}: {q.content || "Nội dung câu hỏi"}
                  </h4>
                  <Badge variant="secondary" className="text-[10px] font-bold shrink-0">
                    {q.points || 1.0} điểm
                  </Badge>
                </div>

                {/* SINGLE CHOICE / TRUE FALSE */}
                {(q.questionType === "SINGLE_CHOICE" || q.questionType === "TRUE_FALSE") && (
                  <div className="space-y-2 pt-1">
                    {(q.options || []).map((opt, optIdx) => {
                      const isSelected = studentAnswers[q.id] === optIdx;
                      const isCorrectOpt = opt.isCorrect;
                      return (
                        <label
                          key={optIdx}
                          onClick={() => handleSelectOption(q.id, optIdx, false)}
                          className={`flex items-center justify-between p-3 rounded-xl border text-xs cursor-pointer transition ${
                            showAnswerKey && isCorrectOpt
                              ? "bg-emerald-50 border-emerald-400 font-bold text-emerald-950 shadow-2xs"
                              : isSelected
                              ? "bg-amber-50 border-amber-400 font-bold text-amber-950 shadow-2xs"
                              : "bg-white border-gray-200 hover:bg-gray-100 text-gray-700"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="radio"
                              name={`q_${q.id}`}
                              checked={isSelected}
                              onChange={() => {}}
                              className="w-4 h-4 text-amber-600 accent-amber-600 cursor-pointer"
                            />
                            <span>{opt.content}</span>
                          </div>
                          {showAnswerKey && isCorrectOpt && (
                            <Badge className="bg-emerald-600 text-white text-[9px] font-bold">
                              ✓ Đáp án đúng
                            </Badge>
                          )}
                        </label>
                      );
                    })}
                  </div>
                )}

                {/* MULTIPLE CHOICE */}
                {q.questionType === "MULTIPLE_CHOICE" && (
                  <div className="space-y-2 pt-1">
                    {(q.options || []).map((opt, optIdx) => {
                      const currentSelected: number[] = studentAnswers[q.id] || [];
                      const isChecked = currentSelected.includes(optIdx);
                      const isCorrectOpt = opt.isCorrect;
                      return (
                        <label
                          key={optIdx}
                          onClick={() => handleSelectOption(q.id, optIdx, true)}
                          className={`flex items-center justify-between p-3 rounded-xl border text-xs cursor-pointer transition ${
                            showAnswerKey && isCorrectOpt
                              ? "bg-emerald-50 border-emerald-400 font-bold text-emerald-950 shadow-2xs"
                              : isChecked
                              ? "bg-indigo-50 border-indigo-400 font-bold text-indigo-950 shadow-2xs"
                              : "bg-white border-gray-200 hover:bg-gray-100 text-gray-700"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {}}
                              className="w-4 h-4 text-indigo-600 accent-indigo-600 cursor-pointer"
                            />
                            <span>{opt.content}</span>
                          </div>
                          {showAnswerKey && isCorrectOpt && (
                            <Badge className="bg-emerald-600 text-white text-[9px] font-bold">
                              ✓ Đáp án đúng
                            </Badge>
                          )}
                        </label>
                      );
                    })}
                  </div>
                )}

                {/* MATCHING PAIRS */}
                {q.questionType === "MATCHING" && (
                  <div className="space-y-2.5 pt-1">
                    <p className="text-xs text-gray-500 font-medium italic">
                      Hãy chọn đáp án ghép nối ở cột phải phù hợp với vế bên trái:
                    </p>
                    <div className="space-y-2">
                      {(q.options || []).map((opt, optIdx) => {
                        const currentMatches: Record<number, string> = studentAnswers[q.id] || {};
                        return (
                          <div key={optIdx} className="grid grid-cols-1 md:grid-cols-2 gap-2 p-3 bg-white border border-gray-200 rounded-xl text-xs">
                            <div className="font-bold text-gray-800 flex items-center gap-2">
                              <span className="w-5 h-5 rounded-full bg-rose-100 text-rose-700 font-bold flex items-center justify-center text-[10px]">
                                {optIdx + 1}
                              </span>
                              <span>{opt.content}</span>
                            </div>
                            <select
                              value={currentMatches[optIdx] || ""}
                              onChange={(e) => handleMatchingAnswer(q.id, optIdx, e.target.value)}
                              className="h-9 w-full rounded-lg border border-gray-300 bg-white px-2.5 text-xs font-semibold outline-none focus:border-amber-500"
                            >
                              <option value="">-- Chọn đáp án ghép nối --</option>
                              {(q.options || []).map((pairOpt, pIdx) => (
                                <option key={pIdx} value={pairOpt.matchingPair || pairOpt.content}>
                                  {pairOpt.matchingPair || pairOpt.content}
                                </option>
                              ))}
                            </select>
                          </div>
                        );
                      })}
                    </div>

                    {showAnswerKey && (
                      <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-950 text-xs space-y-1">
                        <p className="font-bold">Các cặp ghép nối chính xác:</p>
                        <ul className="list-disc pl-4 space-y-0.5 text-[11px]">
                          {(q.options || []).map((opt, idx) => (
                            <li key={idx}>
                              <strong>{opt.content}</strong> ➔ <span className="text-emerald-700 font-semibold">{opt.matchingPair || opt.content}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {/* SHORT ANSWER */}
                {q.questionType === "SHORT_ANSWER" && (
                  <div className="space-y-1.5 pt-1">
                    <input
                      type="text"
                      value={studentAnswers[q.id] || ""}
                      onChange={(e) => handleTextAnswer(q.id, e.target.value)}
                      placeholder="Nhập từ khóa đáp án đúng của bạn..."
                      className="w-full h-10 px-3.5 border border-gray-300 rounded-xl text-xs font-semibold bg-white outline-none focus:ring-2 focus:ring-amber-500"
                    />
                    {showAnswerKey && (
                      <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-950 text-xs font-medium">
                        <strong>Từ khóa đáp án đúng:</strong> {q.options && q.options[0]?.content ? q.options[0].content : "Từ khóa chuẩn"}
                      </div>
                    )}
                  </div>
                )}

                {/* ESSAY */}
                {q.questionType === "ESSAY" && (
                  <div className="space-y-1.5 pt-1">
                    <textarea
                      rows={4}
                      value={studentAnswers[q.id] || ""}
                      onChange={(e) => handleTextAnswer(q.id, e.target.value)}
                      placeholder="Nhập bài làm tự luận của bạn tại đây..."
                      className="w-full p-3.5 border border-gray-300 rounded-xl text-xs bg-white outline-none focus:ring-2 focus:ring-amber-500 font-sans"
                    />
                  </div>
                )}

                {/* EXPLANATION NOTE WHEN SHOW ANSWER KEY IS ACTIVE */}
                {showAnswerKey && q.explanation && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs font-medium space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-amber-950">
                      <Sparkles className="w-4 h-4 text-amber-600" />
                      <span>Lời giải chi tiết từ giảng viên:</span>
                    </div>
                    <p className="text-[11px] leading-relaxed">{q.explanation}</p>
                  </div>
                )}
              </div>
            ))}
          </div>

          <button
            onClick={handleSubmitQuiz}
            className="w-full py-3.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer transition"
          >
            Nộp bài kiểm tra Quiz
          </button>
        </div>
      )}
    </div>
  );
};
