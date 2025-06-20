"use server";

import { z } from "zod";
import { ai } from "../firebase/ai";

const ChatSchema = z.object({
  existingMessages: z.array(
    z.object({
      id: z.number(),
      text: z.string(),
      sender: z.enum(["user", "system"]),
      timestamp: z.string(),
    })
  ),
  newMessage: z.object({
    id: z.number(),
    text: z.string(),
    sender: z.enum(["user", "system"]),
    timestamp: z.string(),
  }),
  attachedFiles: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        url: z.string(),
        type: z.string().optional(),
      })
    )
    .optional(),
});

export const chatFlow = ai.defineFlow(
  {
    name: "chatFlow",
    inputSchema: ChatSchema,
    outputSchema: z.string(),
  },
  async (chats) => {
    const chat = ai.chat({
      system: `You are ProjectLens AI, an intelligent assistant specializing in document analysis and career guidance. 

Key Instructions:
- ALWAYS analyze attached files IMMEDIATELY and provide insights in your response
- Do NOT ask users to wait for analysis - provide the analysis results directly
- When files are attached, examine their content and incorporate findings into your answer
- Provide specific, actionable recommendations based on file content
- Reference specific details from uploaded documents when relevant

Your capabilities include:
1. **Immediate Document Analysis**: Analyze PDFs, documents, images, and other files instantly
2. **Career Assistance**: Resume optimization, interview preparation, job search strategies
3. **Content Insights**: Extract key information, summarize content, identify patterns
4. **Professional Guidance**: Actionable advice for career development

When responding:
- Start with immediate analysis results if files are present
- Provide specific insights and recommendations
- Reference file content directly in your analysis
- Maintain a professional yet approachable tone
- Give actionable next steps`,
    });

    // Prepare the conversation context
    let conversationContext = "";
    if (chats.existingMessages.length > 0) {
      conversationContext = `Previous conversation:\n${chats.existingMessages
        .map(
          (msg) =>
            `${msg.sender === "user" ? "User" : "Assistant"}: ${msg.text}`
        )
        .join("\n")}\n\n`;
    }

    // Prepare file analysis context
    let fileAnalysisContext = "";
    if (chats.attachedFiles && chats.attachedFiles.length > 0) {
      fileAnalysisContext = `\n\nATTACHED FILES FOR IMMEDIATE ANALYSIS:\n`;
      chats.attachedFiles.forEach((file) => {
        fileAnalysisContext += `- ${file.name} (${
          file.type || "unknown type"
        }): ${file.url}\n`;
      });
      fileAnalysisContext += `\nPlease analyze these files immediately and incorporate the findings into your response. Do not ask the user to wait for analysis.`;
    }

    const fullPrompt = `${conversationContext}Current user message: ${chats.newMessage.text}${fileAnalysisContext}`;

    const { text } = await chat.send(fullPrompt);

    return text;
  }
);

// Replace the existing generateChatName function
export async function generateChatName(
  firstMessage: string,
  attachedFiles: Array<{ name: string; type: string }> = []
): Promise<string> {
  try {
    const fileContext =
      attachedFiles.length > 0
        ? `\nFiles attached: ${attachedFiles.map((f) => f.name).join(", ")}`
        : "";

    const prompt = `Generate a concise, descriptive title (max 50 characters) for a chat conversation that starts with this message: "${firstMessage}"${fileContext}

Rules:
- Keep it under 50 characters
- Make it descriptive but concise
- Don't use quotes around the title
- Focus on the main topic or intent
- If files are attached, consider them in the title

Examples:
- "How to deploy React app" → "React App Deployment"
- "Analyze this sales data CSV" → "Sales Data Analysis"
- "Debug Python authentication" → "Python Auth Debugging"

Return only the title, nothing else.`;

    const chat = ai.chat({
      system: "You are a helpful assistant that generates concise, descriptive titles for chat conversations. Return only the title without any additional text or formatting.",
    });

    const { text } = await chat.send(prompt);

    // Clean up the response and ensure it's not too long
    const generatedName = text.trim().replace(/['"]/g, "").substring(0, 50);
    
    if (!generatedName) {
      throw new Error("No name generated");
    }

    return generatedName;
  } catch (error) {
    console.error("Error generating chat name:", error);
    // Fallback to a truncated version of the first message
    return (
      firstMessage.substring(0, 40) + (firstMessage.length > 40 ? "..." : "")
    );
  }
}
