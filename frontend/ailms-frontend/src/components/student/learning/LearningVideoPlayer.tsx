import React, { useRef, useEffect, useState } from "react";
import type { LessonCurriculumItem } from "../../../api/courses/courseAuthoringApi";
import { CheckCircle, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { resolveBackendAssetUrl } from "@/utils/avatarUrl";
import { MarkdownRenderer } from "@/components/common/MarkdownRenderer";

const VIDEO_COMPLETION_PERCENT = 70;

interface LearningVideoPlayerProps {
  lesson: LessonCurriculumItem;
  onProgressUpdate: (watchPercent: number, positionSec: number) => void;
  canPersistProgress: boolean;
}

/** Chuẩn hóa URL ngoài, API path hoặc raw MinIO key thành URL video Backend phục vụ được. */
const resolveVideoUrl = (contentUrl: string): string => {
  if (/^(https?:|blob:|data:)/i.test(contentUrl)) return contentUrl;
  if (contentUrl.startsWith("/api/") || contentUrl.startsWith("/v1/")) {
    return resolveBackendAssetUrl(contentUrl);
  }
  return resolveBackendAssetUrl(`/v1/files/download?fileKey=${encodeURIComponent(contentUrl)}`);
};

export const LearningVideoPlayer: React.FC<LearningVideoPlayerProps> = ({
  lesson,
  onProgressUpdate,
  canPersistProgress,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const lastReportedPercentRef = useRef(-1);
  const [watchPercent, setWatchPercent] = useState(lesson.progressPercent ?? 0);
  const [mediaDurationSec, setMediaDurationSec] = useState(lesson.durationSec ?? 0);

  /** Khởi tạo playback một lần cho bài mới, không reset khi tiến độ được đồng bộ. */
  useEffect(() => {
    setWatchPercent(lesson.progressPercent ?? 0);
    setMediaDurationSec(lesson.durationSec ?? 0);
    lastReportedPercentRef.current = -1;
    if (videoRef.current && lesson.completed) {
      videoRef.current.currentTime = 0;
    } else if (videoRef.current && lesson.lastPositionSec) {
      videoRef.current.currentTime = lesson.lastPositionSec;
    }
  }, [lesson.id]);

  /** Đồng bộ phần trăm hiển thị mà không can thiệp vào vị trí đang phát. */
  useEffect(() => {
    setWatchPercent(lesson.progressPercent ?? 0);
  }, [lesson.progressPercent]);

  /** Ghi nhận thời lượng thật mà trình duyệt đọc từ metadata video. */
  const handleLoadedMetadata = () => {
    if (!videoRef.current || !Number.isFinite(videoRef.current.duration)) return;
    setMediaDurationSec(Math.ceil(videoRef.current.duration));
    if (lesson.completed) {
      videoRef.current.currentTime = 0;
    } else if (lesson.lastPositionSec) {
      videoRef.current.currentTime = lesson.lastPositionSec;
    }
  };

  /** Đưa video về đầu khi học viên bấm phát lại sau khi đã xem hết. */
  const handlePlay = () => {
    if (videoRef.current?.ended) {
      videoRef.current.currentTime = 0;
    }
  };

  /** Cập nhật phần trăm xem theo thời lượng media thật và tránh gửi trùng cùng một phần trăm. */
  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const duration = videoRef.current.duration;
    const currentTime = videoRef.current.currentTime;

    if (duration > 0) {
      const percent = Math.round((currentTime / duration) * 100);
      setWatchPercent(percent);
      if (percent !== lastReportedPercentRef.current) {
        lastReportedPercentRef.current = percent;
        onProgressUpdate(percent, Math.floor(currentTime));
      }
    }
  };

  /** Định dạng thời lượng media theo mm:ss. */
  const formatDuration = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
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
                src={resolveVideoUrl(lesson.contentUrl)}
                controls
                onPlay={handlePlay}
                onLoadedMetadata={handleLoadedMetadata}
                onTimeUpdate={handleTimeUpdate}
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
          <div className="mt-1 max-w-3xl text-xs text-gray-300 [&_.markdown-body]:space-y-0 [&_h3]:hidden [&_p]:text-xs [&_p]:text-gray-300">
            {lesson.description ? <MarkdownRenderer content={lesson.description} /> : "Không có mô tả thêm"}
          </div>
          <div className="mt-2 flex items-center gap-2 text-[11px] text-gray-400">
            <span>Đã xem {watchPercent}%</span>
            {mediaDurationSec > 0 && <span>• {formatDuration(mediaDurationSec)}</span>}
            <span>• Hoàn thành khi đạt {VIDEO_COMPLETION_PERCENT}%</span>
          </div>
        </div>

        <Button
          type="button"
          disabled
          variant={lesson.completed ? "outline" : "default"}
          className={`px-4 py-2 text-xs font-semibold rounded-lg flex items-center gap-2 transition ${
            lesson.completed
              ? "bg-emerald-600/20 text-emerald-400 border border-emerald-500/30"
              : "shadow-sm"
          }`}
        >
          <CheckCircle className="w-4 h-4" />
          {lesson.completed
            ? "Đã hoàn thành"
            : !canPersistProgress
              ? "Preview không ghi tiến độ"
              : `Xem đủ ${VIDEO_COMPLETION_PERCENT}% để hoàn thành`}
        </Button>
      </div>
    </div>
  );
};
