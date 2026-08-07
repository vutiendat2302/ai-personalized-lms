import React, { useEffect, useRef } from "react";

interface MathRendererProps {
  math: string;
  displayMode?: boolean;
  className?: string;
}

export const MathRenderer: React.FC<MathRendererProps> = ({
  math,
  displayMode = true,
  className = "",
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Clean brackets if present
    let rawMath = (math || "").trim();
    if (rawMath.startsWith("\\[") && rawMath.endsWith("\\]")) {
      rawMath = rawMath.substring(2, rawMath.length - 2).trim();
    } else if (rawMath.startsWith("\\(") && rawMath.endsWith("\\)")) {
      rawMath = rawMath.substring(2, rawMath.length - 2).trim();
    } else if (rawMath.startsWith("$") && rawMath.endsWith("$")) {
      rawMath = rawMath.substring(1, rawMath.length - 1).trim();
    }

    const render = () => {
      if ((window as any).katex && containerRef.current) {
        try {
          (window as any).katex.render(rawMath, containerRef.current, {
            displayMode,
            throwOnError: false,
          });
        } catch (err) {
          if (containerRef.current) {
            containerRef.current.innerText = rawMath;
          }
        }
      } else if (containerRef.current) {
        containerRef.current.innerText = rawMath;
      }
    };

    render();
    // Retry render if script loaded asynchronously
    const timer = setTimeout(render, 300);
    return () => clearTimeout(timer);
  }, [math, displayMode]);

  return <div ref={containerRef} className={`math-rendered-block inline-block ${className}`} />;
};
