import React, { useRef, useEffect } from "react";
import type { LessonCurriculumItem } from "../../../api/courses/courseAuthoringApi";
import { CheckCircle, Play } from "lucide-react";

interface LearningVideoPlayerProps {
  lesson: LessonCurriculumItem;
  onProgressUpdate: (watchPercent: number, positionSec: number) => void;
  onComplete: () => void;
}

export const LearningVideoPlayer: React.FC<LearningVideoPlayerProps> = ({
  lesson,
  onProgressUpdate,
  onComplete,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (videoRef.current && lesson.lastPositionSec) {
      videoRef.current.currentTime = lesson.lastPositionSec;
    }
  }, [lesson]);

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const duration = videoRef.current.duration;
    const currentTime = videoRef.current.currentTime;

    if (duration > 0) {
      const percent = Math.round((currentTime / duration) * 100);
      onProgressUpdate(percent, Math.floor(currentTime));

      if (percent >= 80 && !lesson.completed) {
        onComplete();
      }
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-black">
      <div className="flex-1 relative flex items-center justify-center">
        {lesson.contentUrl ? (
          (() => {
            const regExp = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
            const match = lesson.contentUrl.match(regExp);
            const ytId = match && match[1] ? match[1] : null;
            if (ytId) {
              return (
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${ytId}?controls=1&enablejsapi=1&modestbranding=1&rel=0`}
                  title={lesson.name}
                  className="w-full h-full border-0 aspect-video"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              );
            }
            return (
              <video
                ref={videoRef}
                src={lesson.contentUrl}
                controls
                onTimeUpdate={handleTimeUpdate}
                onEnded={onComplete}
                className="w-full h-full object-contain"
              />
            );
          })()
        ) : (
          <div className="text-gray-500 flex flex-col items-center">
            <Play className="w-12 h-12 mb-2 stroke-1" />
            <p className="text-sm">Video chưa có sẵn URL</p>
          </div>
        )}
      </div>

      <div className="bg-gray-900 text-white p-4 flex items-center justify-between border-t border-gray-800">
        <div>
          <h2 className="text-base font-bold">{lesson.name}</h2>
          <p className="text-xs text-gray-400 mt-0.5">{lesson.description || "Không có mô tả thêm"}</p>
        </div>

        <button
          onClick={onComplete}
          className={`px-4 py-2 text-xs font-semibold rounded-lg flex items-center gap-2 transition ${
            lesson.completed
              ? "bg-emerald-600/20 text-emerald-400 border border-emerald-500/30"
              : "bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
          }`}
        >
          <CheckCircle className="w-4 h-4" /> {lesson.completed ? "Đã hoàn thành" : "Đánh dấu hoàn thành"}
        </button>
      </div>
    </div>
  );
};
