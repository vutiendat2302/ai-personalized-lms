export interface SSEReaderOptions {
  onChunk: (chunk: string) => void;
  onComplete?: () => void;
  onError?: (error: Error) => void;
  signal?: AbortSignal;
}

/**
 * Utility parse Server-Sent Events (SSE) stream từ ReadableStream.
 */
export async function readSSE(
  response: Response,
  options: SSEReaderOptions
): Promise<void> {
  const { onChunk, onComplete, onError, signal } = options;

  if (!response.ok || !response.body) {
    const err = new Error(`HTTP Error: ${response.status} ${response.statusText}`);
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
      const lines = buffer.split("\n\n");
      buffer = lines.pop() || "";

      for (const rawEvent of lines) {
        if (!rawEvent.startsWith("data:")) continue;
        const data = rawEvent.replace(/^data:\s*/, "");

        if (data === "[DONE]") {
          onComplete?.();
          return;
        }

        const chunk = data.replace(/\\n/g, "\n");
        if (chunk) {
          onChunk(chunk);
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
