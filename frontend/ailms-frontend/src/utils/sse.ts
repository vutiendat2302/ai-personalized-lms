export interface SSEReaderOptions {
  onChunk: (chunk: string) => void;
  onComplete?: () => void;
  onError?: (error: Error) => void;
  onMetadata?: (metadata: { route?: string; grounding?: string; sources?: any[] }) => void;
  signal?: AbortSignal;
}

/**
 * Utility parse Server-Sent Events (SSE) stream từ ReadableStream.
 */
export async function readSSE(
  response: Response,
  options: SSEReaderOptions
): Promise<void> {
  const { onChunk, onComplete, onError, onMetadata, signal } = options;

  if (!response.ok || !response.body) {
    let detail = "";
    try {
      detail = (await response.clone().text()).trim().slice(0, 240);
    } catch {
      // Ignore unreadable error body and keep the HTTP status.
    }
    const err = new Error(detail || `HTTP Error: ${response.status} ${response.statusText}`);
    onError?.(err);
    throw err;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      if (signal?.aborted) {
        await reader.cancel();
        onComplete?.();
        return;
      }

      const { done, value } = await reader.read();
      if (done) {
        onComplete?.();
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const blocks = buffer.split("\n\n");
      buffer = blocks.pop() || "";

      for (const block of blocks) {
        const trimmed = block.trim();
        if (!trimmed) continue;

        if (trimmed.startsWith("event: metadata")) {
          const match = trimmed.match(/data:\s*(.+)$/m);
          if (match) {
            try {
              const meta = JSON.parse(match[1]);
              onMetadata?.(meta);
            } catch {
              // Ignore metadata parse error
            }
          }
          continue;
        }

        const lines = trimmed.split("\n");
        for (const line of lines) {
          if (!line.startsWith("data:")) continue;
          const data = line.replace(/^data:\s*/, "");

          if (data === "[DONE]") {
            onComplete?.();
            return;
          }

          const chunk = data.replace(/\\n/g, "\n");
          if (chunk) {
            // Backend proxy có thể chuyển event metadata của AI Service thành data chunk.
            // Giữ metadata cho UI nhưng không render JSON kỹ thuật vào câu trả lời.
            try {
              const metadata = JSON.parse(chunk) as {
                route?: string;
                grounding?: string;
                sources?: any[];
              };
              if (metadata && typeof metadata === "object"
                && ("route" in metadata || "grounding" in metadata || "sources" in metadata)
                && !("answer" in metadata)) {
                onMetadata?.(metadata);
                continue;
              }
            } catch {
              // Đây là text trả lời bình thường, tiếp tục render.
            }
            onChunk(chunk);
          }
        }
      }
    }
  } catch (err: any) {
    if (err.name === "AbortError" || signal?.aborted) {
      onComplete?.();
      return;
    }
    onError?.(err);
    throw err;
  }
}
