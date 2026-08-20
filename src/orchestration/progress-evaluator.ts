export interface ProgressEvaluation {
  progress: number;
  objectiveSatisfied: boolean;
  evidence: string;
  confidence: number;
}

export function evaluateProgress(observation: string, missionDescription: string): ProgressEvaluation {
  const missionLower = missionDescription.toLowerCase();
  const obsLower = observation.toLowerCase();

  // Détecter si la mission demande un comptage
  const wantsCount = missionLower.includes("compte") || missionLower.includes("count") || missionLower.includes("nombre");
  
  // Extraire un nombre de l'observation
  const numberMatch = obsLower.match(/\d+/);
  const foundNumber = numberMatch ? parseInt(numberMatch[0]) : null;

  if (wantsCount && foundNumber !== null) {
    return {
      progress: 100,
      objectiveSatisfied: true,
      evidence: "Count found: " + foundNumber,
      confidence: 0.95,
    };
  }

  if (obsLower.includes("success") || obsLower.includes("exit_code: 0")) {
    return {
      progress: 80,
      objectiveSatisfied: true,
      evidence: "Tool succeeded",
      confidence: 0.8,
    };
  }

  return {
    progress: 30,
    objectiveSatisfied: false,
    evidence: "Insufficient evidence",
    confidence: 0.3,
  };
}
