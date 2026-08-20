export function createInferenceClient(config: { 
  apiKey?: string; 
  baseUrl?: string;
  defaultModel?: string; 
  maxTokens?: number; 
  lowComputeModel?: string; 
  openaiApiKey?: string; 
  anthropicApiKey?: string; 
  ollamaBaseUrl?: string; 
  getModelProvider?: (modelId: string) => string | undefined 
}) {
  // Déterminer l'URL et la clé selon le provider
  const baseUrl = config.baseUrl || 
    (config.ollamaBaseUrl ? config.ollamaBaseUrl + "/v1" : "https://api.deepseek.com/v1");
  
  const apiKey = config.apiKey || config.openaiApiKey || "";
  
  return {
    async generate(messages: any[], options?: any) {
      const response = await fetch(baseUrl + "/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(apiKey ? { "Authorization": "Bearer " + apiKey } : {}),
        },
        body: JSON.stringify({
          model: config.defaultModel || "deepseek-chat",
          messages,
          ...options,
        }),
      });
      const data = await response.json();
      const choice = data.choices?.[0];
      const content = choice?.message?.content || "";
      const toolCalls = choice?.message?.tool_calls || undefined;
      
      return {
        id: data.id || "inference-" + Date.now(),
        message: { role: "assistant" as const, content, tool_calls: toolCalls },
        content,
        toolCalls: toolCalls?.map((tc: any) => ({
          id: tc.id,
          type: "function",
          function: {
            name: tc.function.name,
            arguments: tc.function.arguments,
          },
        })),
        model: data.model || config.defaultModel || "default",
        finishReason: choice?.finish_reason || "stop",
        usage: {
          promptTokens: data.usage?.prompt_tokens || 0,
          completionTokens: data.usage?.completion_tokens || 0,
          totalTokens: (data.usage?.prompt_tokens || 0) + (data.usage?.completion_tokens || 0),
        },
      };
    },
    async chat(messages: any[], options?: any) {
      return this.generate(messages, options);
    },
    setLowComputeMode(enabled: boolean): void {},
    getDefaultModel(): string { return config.defaultModel || "deepseek-chat"; },
  };
}

export function createDeepSeekClient(config: { apiKey: string }) {
  return createInferenceClient({ apiKey: config.apiKey, baseUrl: "https://api.deepseek.com/v1" });
}

export function createOpenAIClient(config: { apiKey: string }) {
  return createInferenceClient({ apiKey: config.apiKey, baseUrl: "https://api.openai.com/v1" });
}

export function createOllamaClient(config: { baseUrl?: string; model?: string }) {
  return createInferenceClient({ 
    baseUrl: config.baseUrl || "http://localhost:11434/v1",
    defaultModel: config.model || "llama3"
  });
}
