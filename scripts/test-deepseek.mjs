import { createInferenceClient } from "./dist/local/deepseek.js";

const apiKey = process.env.DEEPSEEK_API_KEY;
const inference = createInferenceClient({ apiKey });

const result = await inference.chat([
  { role: "user", content: "Bonjour, qui es-tu ?" }
]);

console.log("Résultat:", JSON.stringify(result, null, 2));
