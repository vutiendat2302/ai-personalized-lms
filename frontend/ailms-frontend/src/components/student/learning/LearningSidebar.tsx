import React from "react";
import type { CourseCurriculumResponse, LessonCurriculumItem } from "../../../api/courses/courseAuthoringApi";
import { CheckCircle2, Circle, Lock, Video, FileText, HelpCircle, CheckSquare, ChevronDown } from "lucide-react";

interface LearningSidebarProps {
  curriculum: CourseCurriculumResponse | null;
  activeLessonId: string | null;
  onSelectLesson: (lesson: LessonCurriculumItem) => void;
  isCanBypassLock?: boolean;
}

export const LearningSidebar: React.FC<LearningSidebarProps> = ({
  curriculum,
  activeLessonId,
  onSelectLesson,
  isCanBypassLock = false,
}) => {
  const getIcon = (type: string) => {
    switch (type?.toUpperCase()) {
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
        return <FileText className="w-4 h-4 text-gray-500" />;
    }
  };

  return (
    <div className="w-72 bg-white border-r border-gray-200 h-full flex flex-col overflow-y-auto select-none">
      <div className="p-4 border-b border-gray-100 bg-gray-50/50">
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Nội dung khóa học</h3>
        <p className="text-xs text-gray-400 mt-0.5">{curriculum?.totalLessons || 0} bài học</p>
      </div>

      <div className="flex-1 space-y-1 p-2">
        {curriculum?.sections?.map((section, sIndex) => (
          <div key={section.id} className="mb-2">
            <div className="flex items-center justify-between px-3 py-2 text-xs font-bold text-gray-700 bg-gray-100/70 rounded-md">
              <span className="truncate">Chương {sIndex + 1}: {section.name}</span>
              <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
            </div>

            <div className="mt-1 space-y-0.5">
              {section.lessons?.map((lesson) => {
                const isActive = activeLessonId === lesson.id;
                const isCompleted = lesson.completed;
                const isLocked = !isCanBypassLock && lesson.previewType === "LOCKED";

                return (
                  <div
                    key={lesson.id}
                    onClick={() => !isLocked && onSelectLesson(lesson)}
                    className={`flex items-center gap-2.5 p-2 rounded-lg text-xs cursor-pointer transition ${
                      isActive
                        ? "bg-blue-50 text-blue-700 font-semibold"
                        : "hover:bg-gray-50 text-gray-700"
                    } ${isLocked ? "opacity-60 cursor-not-allowed" : ""}`}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    ) : isLocked ? (
                      <Lock className="w-4 h-4 text-gray-400 shrink-0" />
                    ) : (
                      <Circle className="w-4 h-4 text-gray-300 shrink-0" />
                    )}

                    <div className="flex items-center gap-1.5 flex-1 truncate">
                      {getIcon(lesson.contentType)}
                      <span className="truncate">{lesson.name}</span>
                    </div>

                    {lesson.durationMin && (
                      <span className="text-[10px] text-gray-400 font-medium shrink-0">
                        {lesson.durationMin} phút
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
