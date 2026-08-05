import React, { useState } from "react";
import type { CourseCurriculumResponse } from "../../../api/courses/courseAuthoringApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, ChevronDown, ChevronRight, Video, FileText, HelpCircle, CheckSquare, Flag, BookOpen, MoveVertical, FolderPlus, Eye, EyeOff } from "lucide-react";

interface CurriculumOutlineProps {
  curriculum: CourseCurriculumResponse | null;
  selectedItem: { type: "lesson" | "quiz" | "assignment" | "section"; id: string } | null;
  onSelectItem: (item: { type: "lesson" | "quiz" | "assignment" | "section"; id: string; data?: any }) => void;
  onAddSection: (name: string) => void;
  onUpdateSection: (sectionId: string, name: string) => void;
  onToggleHideSection: (sectionId: string, currentStatus?: string, name?: string) => void;
  onDeleteSection: (sectionId: string) => void;
  onAddLesson: (sectionId: string, type: string) => void;
  onDeleteLesson: (lessonId: string) => void;
  onAddChapterQuiz: (sectionId: string) => void;
  onAddFinalExam: () => void;
}

export const CurriculumOutline: React.FC<CurriculumOutlineProps> = ({
  curriculum,
  selectedItem,
  onSelectItem,
  onAddSection,
  onUpdateSection,
  onToggleHideSection,
  onDeleteSection,
  onAddLesson,
  onDeleteLesson,
  onAddChapterQuiz,
  onAddFinalExam,
}) => {
  const [newSectionName, setNewSectionName] = useState("");
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [editingSectionName, setEditingSectionName] = useState("");
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  const sectionCount = curriculum?.sections?.length || 0;
  const isMaxSectionsReached = sectionCount >= 20;

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [sectionId]: prev[sectionId] !== undefined ? !prev[sectionId] : false,
    }));
  };

  const handleAddSectionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isMaxSectionsReached) return;
    if (newSectionName.trim()) {
      onAddSection(newSectionName.trim());
      setNewSectionName("");
    } else {
      onAddSection("Chương học mới");
    }
  };

  const handleSaveSectionName = (sectionId: string) => {
    if (editingSectionName.trim()) {
      onUpdateSection(sectionId, editingSectionName.trim());
    }
    setEditingSectionId(null);
  };

  const getItemIcon = (contentType: string) => {
    switch (contentType?.toUpperCase()) {
      case "VIDEO":
        return <Video className="w-4 h-4 text-blue-500" />;
      case "TEXT":
      case "PDF":
        return <FileText className="w-4 h-4 text-emerald-500" />;
      case "QUIZ":
        return <HelpCircle className="w-4 h-4 text-amber-500" />;
      case "ASSIGNMENT":
        return <CheckSquare className="w-4 h-4 text-purple-500" />;
      default:
        return <BookOpen className="w-4 h-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="w-80 border-r border-border/40 bg-muted/20 flex flex-col h-full overflow-y-auto p-3 select-none shrink-0">
      {/* Sidebar Top Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Cấu trúc ({sectionCount}/20)</h3>
        <Button
          onClick={onAddFinalExam}
          variant="outline"
          size="sm"
          className="h-7 px-2 text-[11px] font-bold gap-1 text-amber-700 bg-amber-50 border-amber-200 hover:bg-amber-100 cursor-pointer shrink-0"
        >
          <Flag className="w-3 h-3 text-amber-600" /> + Final Exam
        </Button>
      </div>

      {/* TOP ACTION: Add New Section Form (Max 20 Limit) */}
      <div className="mb-3 p-3 bg-card border border-border/40 rounded-xl shadow-2xs">
        <form onSubmit={handleAddSectionSubmit} className="space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-foreground">
            <span className="flex items-center gap-1.5">
              <FolderPlus className="w-4 h-4 text-primary" /> Tạo Chương học mới
            </span>
            {isMaxSectionsReached && (
              <Badge variant="secondary" className="text-[10px] bg-rose-100 text-rose-700 font-extrabold">
                Tối đa 20 chương
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <Input
              type="text"
              placeholder={isMaxSectionsReached ? "Đã đạt tối đa 20 chương" : "Nhập tên chương..."}
              value={newSectionName}
              disabled={isMaxSectionsReached}
              onChange={(e) => setNewSectionName(e.target.value)}
              className="h-8 text-xs bg-background flex-1 min-w-0"
            />
            <Button
              type="submit"
              size="sm"
              disabled={isMaxSectionsReached}
              className="h-8 px-3 text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 shrink-0 cursor-pointer disabled:opacity-50"
            >
              <Plus className="w-3.5 h-3.5 mr-0.5" /> Tạo
            </Button>
          </div>
        </form>
      </div>

      {/* Final Exam Section (if present) */}
      {((curriculum?.finalExamQuizzes && curriculum.finalExamQuizzes.length > 0) ||
        (curriculum?.finalExamAssignments && curriculum.finalExamAssignments.length > 0)) && (
        <div className="mb-3 p-3 bg-amber-50/70 border border-amber-200 rounded-xl shadow-2xs">
          <div className="flex items-center gap-2 text-amber-900 font-bold text-xs uppercase mb-2">
            <Flag className="w-4 h-4 text-amber-600" /> Kiểm tra cuối khóa
          </div>
          {curriculum?.finalExamQuizzes?.map((quiz) => (
            <div
              key={quiz.id}
              onClick={() => onSelectItem({ type: "quiz", id: quiz.id, data: quiz })}
              className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer text-xs mb-1 transition ${
                selectedItem?.type === "quiz" && selectedItem?.id === quiz.id
                  ? "bg-amber-200/80 font-bold text-amber-950"
                  : "bg-background/80 hover:bg-amber-100/60 text-foreground"
              }`}
            >
              <HelpCircle className="w-3.5 h-3.5 text-amber-600" />
              <span className="truncate flex-1">{quiz.title}</span>
            </div>
          ))}
          {curriculum?.finalExamAssignments?.map((ass) => (
            <div
              key={ass.id}
              onClick={() => onSelectItem({ type: "assignment", id: ass.id, data: ass })}
              className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer text-xs mb-1 transition ${
                selectedItem?.type === "assignment" && selectedItem?.id === ass.id
                  ? "bg-amber-200/80 font-bold text-amber-950"
                  : "bg-background/80 hover:bg-amber-100/60 text-foreground"
              }`}
            >
              <CheckSquare className="w-3.5 h-3.5 text-purple-600" />
              <span className="truncate flex-1">{ass.title}</span>
            </div>
          ))}
        </div>
      )}

      {/* Sections List */}
      <div className="space-y-3 flex-1">
        {curriculum?.sections?.map((section, sIndex) => {
          const isCollapsed = expandedSections[section.id] === false;
          const isHidden = section.status === "INACTIVE";

          return (
            <div
              key={section.id}
              className={`rounded-xl border border-border/40 shadow-2xs overflow-hidden transition ${
                isHidden ? "opacity-65 bg-muted/30 border-dashed" : "bg-card"
              }`}
            >
              {/* Section Header */}
              <div className="bg-muted/40 px-3 py-2 flex items-center justify-between border-b border-border/40">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleSection(section.id)}
                  className="h-6 w-6 p-0 text-muted-foreground cursor-pointer"
                >
                  {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </Button>

                {editingSectionId === section.id ? (
                  <Input
                    type="text"
                    value={editingSectionName}
                    onChange={(e) => setEditingSectionName(e.target.value)}
                    onBlur={() => handleSaveSectionName(section.id)}
                    onKeyDown={(e) => e.key === "Enter" && handleSaveSectionName(section.id)}
                    autoFocus
                    className="h-7 text-xs font-bold mx-2 bg-background"
                  />
                ) : (
                  <span
                    onClick={() => {
                      setEditingSectionId(section.id);
                      setEditingSectionName(section.name);
                    }}
                    className="flex-1 mx-2 text-xs font-bold text-foreground truncate cursor-pointer hover:text-primary flex items-center gap-1.5"
                    title="Click để đổi tên"
                  >
                    <span className="truncate">
                      Chương {sIndex + 1}: {section.name ? section.name.replace(/^Chương\s*\d+\s*[:\-]?\s*/i, "") : ""}
                    </span>
                    {isHidden && (
                      <Badge variant="outline" className="text-[9px] px-1 py-0 bg-gray-200 text-gray-700 font-bold shrink-0">
                        Đã ẩn
                      </Badge>
                    )}
                  </span>
                )}

                <div className="flex items-center gap-0.5">
                  {/* Eye Toggle Hide/Show Button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onToggleHideSection(section.id, section.status, section.name)}
                    className={`h-6 w-6 p-0 cursor-pointer ${
                      isHidden ? "text-gray-400 hover:text-emerald-600" : "text-emerald-600 hover:text-gray-400"
                    }`}
                    title={isHidden ? "Bấm để Hiển thị chương" : "Bấm để Ẩn chương khỏi học viên"}
                  >
                    {isHidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onAddChapterQuiz(section.id)}
                    className="h-6 w-6 p-0 text-amber-600 hover:bg-amber-50 cursor-pointer"
                    title="+ Thêm KT giữa chương"
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDeleteSection(section.id)}
                    className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive cursor-pointer"
                    title="Xóa chương"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>

              {/* Section Content */}
              {!isCollapsed && (
                <div className="p-2 space-y-2">
                  {/* TOP TOOLBAR INSIDE SECTION: 2x2 Grid for compact layout */}
                  <div className="pb-2 border-b border-border/30 flex flex-col gap-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-primary flex items-center gap-1">
                      <Plus className="w-3 h-3" /> Thêm bài học mới:
                    </span>
                    <div className="grid grid-cols-2 gap-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onAddLesson(section.id, "VIDEO")}
                        className="h-7 text-[11px] font-bold bg-blue-50/80 text-blue-700 hover:bg-blue-100 border-blue-200 justify-start px-2 cursor-pointer"
                      >
                        <Video className="w-3.5 h-3.5 mr-1 text-blue-600" /> Video
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onAddLesson(section.id, "TEXT")}
                        className="h-7 text-[11px] font-bold bg-emerald-50/80 text-emerald-700 hover:bg-emerald-100 border-emerald-200 justify-start px-2 cursor-pointer"
                      >
                        <FileText className="w-3.5 h-3.5 mr-1 text-emerald-600" /> Bài đọc
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onAddLesson(section.id, "QUIZ")}
                        className="h-7 text-[11px] font-bold bg-amber-50/80 text-amber-700 hover:bg-amber-100 border-amber-200 justify-start px-2 cursor-pointer"
                      >
                        <HelpCircle className="w-3.5 h-3.5 mr-1 text-amber-600" /> Quiz
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onAddLesson(section.id, "ASSIGNMENT")}
                        className="h-7 text-[11px] font-bold bg-purple-50/80 text-purple-700 hover:bg-purple-100 border-purple-200 justify-start px-2 cursor-pointer"
                      >
                        <CheckSquare className="w-3.5 h-3.5 mr-1 text-purple-600" /> Bài tập
                      </Button>
                    </div>
                  </div>

                  {/* Chapter Level Quizzes */}
                  {section.chapterQuizzes?.map((quiz) => (
                    <div
                      key={quiz.id}
                      onClick={() => onSelectItem({ type: "quiz", id: quiz.id, data: quiz })}
                      className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs cursor-pointer border border-dashed border-amber-300 ${
                        selectedItem?.type === "quiz" && selectedItem?.id === quiz.id
                          ? "bg-amber-100 text-amber-900 font-bold"
                          : "bg-amber-50/50 hover:bg-amber-100/50 text-foreground"
                      }`}
                    >
                      <HelpCircle className="w-3.5 h-3.5 text-amber-500" />
                      <span className="flex-1 truncate">{quiz.title} (Giữa chương)</span>
                    </div>
                  ))}

                  {/* Lessons List with Nested Lesson Quiz & Assignment */}
                  {section.lessons?.map((lesson, lIndex) => (
                    <div key={lesson.id} className="space-y-1">
                      <div
                        onClick={() => onSelectItem({ type: "lesson", id: lesson.id, data: lesson })}
                        className={`group flex items-center justify-between p-2 rounded-lg text-xs cursor-pointer transition ${
                          selectedItem?.type === "lesson" && selectedItem?.id === lesson.id
                            ? "bg-primary/10 text-primary font-bold border border-primary/20 shadow-2xs"
                            : "hover:bg-muted/50 text-foreground"
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate flex-1">
                          <MoveVertical className="w-3 h-3 text-muted-foreground/40 group-hover:text-muted-foreground cursor-grab" />
                          {getItemIcon(lesson.contentType)}
                          <span className="truncate">
                            {lIndex + 1}. {lesson.name}
                          </span>
                        </div>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteLesson(lesson.id);
                          }}
                          className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0 text-muted-foreground hover:text-destructive cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>

                      {/* Nested Quiz attached to this Lesson (only for Video/Text/PDF lessons) */}
                      {lesson.linkedQuiz && lesson.contentType !== "QUIZ" && (
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectItem({ type: "quiz", id: lesson.linkedQuiz!.id, data: lesson.linkedQuiz });
                          }}
                          className={`ml-5 flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] cursor-pointer border border-amber-200 ${
                            selectedItem?.type === "quiz" && selectedItem?.id === lesson.linkedQuiz.id
                              ? "bg-amber-100 font-bold text-amber-900 shadow-2xs"
                              : "bg-amber-50/70 hover:bg-amber-100/60 text-amber-900"
                          }`}
                        >
                          <HelpCircle className="w-3 h-3 text-amber-600 shrink-0" />
                          <span className="truncate flex-1">↳ Quiz đính kèm: {lesson.linkedQuiz.title}</span>
                        </div>
                      )}

                      {/* Nested Assignment attached to this Lesson (only for Video/Text/PDF lessons) */}
                      {lesson.linkedAssignment && lesson.contentType !== "ASSIGNMENT" && (
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectItem({ type: "assignment", id: lesson.linkedAssignment!.id, data: lesson.linkedAssignment });
                          }}
                          className={`ml-5 flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] cursor-pointer border border-purple-200 ${
                            selectedItem?.type === "assignment" && selectedItem?.id === lesson.linkedAssignment.id
                              ? "bg-purple-100 font-bold text-purple-900 shadow-2xs"
                              : "bg-purple-50/60 hover:bg-purple-100/60 text-purple-900"
                          }`}
                        >
                          <CheckSquare className="w-3 h-3 text-purple-600 shrink-0" />
                          <span className="truncate flex-1">↳ Bài tập đính kèm: {lesson.linkedAssignment.title}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
