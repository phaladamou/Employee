export function classifyInput(content: string): "conversation" | "mission" {
  const lower = content.toLowerCase();
  
  // Détection de mission
  if (
    lower.includes("mission:") ||
    lower.includes("analyse") ||
    lower.includes("analyze") ||
    lower.includes("crée") ||
    lower.includes("create") ||
    lower.includes("écris") ||
    lower.includes("write") ||
    lower.includes("inspecte") ||
    lower.includes("inspect") ||
    lower.includes("explore") ||
    lower.includes("corrige") ||
    lower.includes("fix")
  ) {
    return "mission";
  }
  
  return "conversation";
}
