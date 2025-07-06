import {
  gemini25FlashPreview0417,
  googleAI,
  textEmbedding004,
} from "@genkit-ai/googleai";
import { genkit } from "genkit/beta";

export const ai = genkit({
  plugins: [googleAI()],
  model: gemini25FlashPreview0417,
});

// Helper function to generate embeddings
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    // Use the ai instance to generate embeddings
    const result = await ai.embed({
      embedder: textEmbedding004,
      content: text,
    });

    // Extract the embedding array from the result
    if (result && Array.isArray(result) && result.length > 0) {
      const firstResult = result[0];
      if (firstResult && firstResult.embedding) {
        return firstResult.embedding;
      }
    }

    throw new Error("No embedding generated");
  } catch (error) {
    console.error("Error generating embedding:", error);
    throw new Error("Failed to generate embedding");
  }
}
