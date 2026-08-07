import type { AiChatRequestPayload } from "@/types/ai";
import { readSSE, type SSEReaderOptions } from "@/utils/sse";

const CHAT_STREAM_ENDPOINT = "/api/v1/admin/ai/chat/stream";

export async function streamChat(
  payload: AiChatRequestPayload,
  options: Omit<SSEReaderOptions, "signal"> & { signal?: AbortSignal }
): Promise<void> {
  const response = await fetch(CHAT_STREAM_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(payload),
    signal: options.signal,
  });

  return readSSE(response, options);
}
