import { useEffect, useRef, useState } from "react";
import httpClient from "@/api/httpClient";

interface TrackerOptions {
  lessonId: string | number;
  courseId: string | number;
  userId?: string | number;
  onIdlePrompt?: () => void;
}

export const useLearningSessionTracker = ({
  lessonId,
  courseId,
  userId,
}: TrackerOptions) => {
  const [activeSeconds, setActiveSeconds] = useState(0);
  const [isIdle, setIsIdle] = useState(false);
  const [showIdlePrompt, setShowIdlePrompt] = useState(false);

  const sessionIdRef = useRef<string | null>(null);
  const heartbeatTimerRef = useRef<any>(null);
  const lastInteractionRef = useRef<number>(Date.now());
  const idleCheckIntervalRef = useRef<any>(null);

  // 1. Initialize session and start heartbeats
  useEffect(() => {
    if (!lessonId || !userId) return;

    let isMounted = true;

    const startSession = async () => {
      try {
        const res = await httpClient.post("/v1/learning-sessions/start", {
          lessonId,
          courseId,
          userId,
        });
        if (res.data?.data?.id && isMounted) {
          sessionIdRef.current = String(res.data.data.id);
        }
      } catch (e) {
        // Fallback local session ID
        sessionIdRef.current = `sess-${Date.now()}`;
      }
    };

    startSession();

    // 2. Heartbeat interval every 30 seconds if visible & not idle
    heartbeatTimerRef.current = setInterval(() => {
      if (document.hidden || isIdle) return;

      // Send heartbeat API call
      if (sessionIdRef.current) {
        httpClient
          .post(`/v1/learning-sessions/${sessionIdRef.current}/heartbeat`, {
            activeSeconds: 30,
          })
          .catch((err) => console.log("Heartbeat note:", err));
      }

      setActiveSeconds((prev) => prev + 30);
    }, 30000);

    return () => {
      isMounted = false;
      if (heartbeatTimerRef.current) clearInterval(heartbeatTimerRef.current);
    };
  }, [lessonId, courseId, userId, isIdle]);

  // 3. Page Visibility API: Stop heartbeats immediately when hidden
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Tab hidden: pause heartbeat execution
      } else {
        // Tab visible: reset last interaction timestamp
        lastInteractionRef.current = Date.now();
        setIsIdle(false);
        setShowIdlePrompt(false);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  // 4. Interaction Watcher (mousemove, keydown, scroll)
  useEffect(() => {
    const handleUserActivity = () => {
      lastInteractionRef.current = Date.now();
      if (isIdle || showIdlePrompt) {
        setIsIdle(false);
        setShowIdlePrompt(false);
      }
    };

    window.addEventListener("mousemove", handleUserActivity);
    window.addEventListener("keydown", handleUserActivity);
    window.addEventListener("scroll", handleUserActivity);

    // Check idle status every 10 seconds
    idleCheckIntervalRef.current = setInterval(() => {
      const now = Date.now();
      const elapsedMinutes = (now - lastInteractionRef.current) / (1000 * 60);

      // Prompt at 10 minutes
      if (elapsedMinutes >= 10 && elapsedMinutes < 12) {
        setShowIdlePrompt(true);
      }

      // Idle cutoff at 12 minutes
      if (elapsedMinutes >= 12) {
        setIsIdle(true);
        setShowIdlePrompt(false);
      }
    }, 10000);

    return () => {
      window.removeEventListener("mousemove", handleUserActivity);
      window.removeEventListener("keydown", handleUserActivity);
      window.removeEventListener("scroll", handleUserActivity);
      if (idleCheckIntervalRef.current) clearInterval(idleCheckIntervalRef.current);
    };
  }, [isIdle, showIdlePrompt]);

  // 5. Unload Handler using navigator.sendBeacon
  useEffect(() => {
    const handleUnload = () => {
      if (sessionIdRef.current) {
        const payload = JSON.stringify({
          sessionId: sessionIdRef.current,
          activeSeconds,
          reason: "PAGE_HIDE",
        });
        const blob = new Blob([payload], { type: "application/json" });
        navigator.sendBeacon("/api/v1/learning-sessions/close", blob);
      }
    };

    window.addEventListener("pagehide", handleUnload);
    window.addEventListener("beforeunload", handleUnload);
    return () => {
      window.removeEventListener("pagehide", handleUnload);
      window.removeEventListener("beforeunload", handleUnload);
    };
  }, [activeSeconds]);

  return {
    activeSeconds,
    isIdle,
    showIdlePrompt,
    resetIdle: () => {
      lastInteractionRef.current = Date.now();
      setIsIdle(false);
      setShowIdlePrompt(false);
    },
  };
};
