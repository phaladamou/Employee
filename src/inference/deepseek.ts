import type { ChatMessage, InferenceClient, InferenceResponse } from "../types.js";

export function createDeepSeekInference(apiKey: string): InferenceClient {
  const baseUrl = "https://api.deepseek.com/v1";

  return {
    async chat(messages: ChatMessage[], options?: any): Promise<InferenceResponse> {
      const response = await fetch(baseUrl + "/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + apiKey,
        },
        body: JSON.stringify({
          model: options?.model || "deepseek-chat",
          messages,
          ...options,
        }),
      });

      const data = await response.json();
      const choice = data.choices?.[0];
      const content = choice?.message?.content || "";
      const toolCalls = choice?.message?.tool_calls || undefined;

      return {
        id: data.id || "deepseek-" + Date.now(),
        model: data.model || "deepseek-chat",
        message: { role: "assistant", content },
        toolCalls,
        usage: {
          promptTokens: data.usage?.prompt_tokens || 0,
          completionTokens: data.usage?.completion_tokens || 0,
          totalTokens: (data.usage?.prompt_tokens || 0) + (data.usage?.completion_tokens || 0),
        },
        finishReason: choice?.finish_reason || "stop",
      };
    },

    setLowComputeMode(enabled: boolean): void {
      // DeepSeek n'a pas de mode low compute pour l'instant
    },

    getDefaultModel(): string {
      return "deepseek-chat";
    },
  };
}
