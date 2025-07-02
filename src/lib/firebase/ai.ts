import { gemini25FlashPreview0417, googleAI } from "@genkit-ai/googleai";
import { genkit } from "genkit/beta";

export const ai = genkit({
  plugins: [googleAI()],
  model: gemini25FlashPreview0417,
});
