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
        extracted_text: z.string().optional(), // Add extracted_text field
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
      system: `You are ProjectLens AI, an intelligent assistant specializing in document analysis for project tracking and reporting.

Key Instructions:
- AUTOMATICALLY analyze ALL attached files and their extracted text content
- Provide comprehensive insights based on ALL available document content
- Cross-reference information across multiple documents when relevant
- Identify patterns, trends, and correlations across all attached files
- Do NOT ask users to specify which files to analyze - analyze ALL by default
- Always process ALL available file content without requiring user selection

Your capabilities include:
1. Comprehensive Document Analysis: Automatically process ALL PDFs, PPTs, spreadsheets, and Word files
2. Cross-Document Insights: Compare and contrast information across multiple files
3. Pattern Recognition: Identify trends and patterns across all available documents
4. Contextual Understanding: Use all available document context to provide better responses

When files are attached, ALWAYS:
- Analyze ALL files immediately without being asked
- Provide insights that incorporate information from ALL available documents
- Reference specific files when mentioning particular details
- Highlight correlations or discrepancies across different documents
- Process ALL extracted text content automatically`,
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

    // Prepare comprehensive file analysis context with ALL extracted text
    let fileAnalysisContext = "";
    if (chats.attachedFiles && chats.attachedFiles.length > 0) {
      fileAnalysisContext = `\n\nALL ATTACHED FILES - AUTOMATIC COMPREHENSIVE ANALYSIS:\n`;

      const filesWithContent = chats.attachedFiles.filter(
        (file) => file.extracted_text && file.extracted_text.trim()
      );

      const filesWithoutContent = chats.attachedFiles.filter(
        (file) => !file.extracted_text || !file.extracted_text.trim()
      );

      if (filesWithContent.length > 0) {
        fileAnalysisContext += `\nDOCUMENTS WITH EXTRACTED CONTENT (${filesWithContent.length} files):\n`;
        filesWithContent.forEach((file, index) => {
          fileAnalysisContext += `\n==== DOCUMENT ${index + 1}: ${
            file.name
          } ====\n`;
          fileAnalysisContext += `File Type: ${file.type || "unknown"}\n`;
          fileAnalysisContext += `Content:\n${file.extracted_text}\n`;
          fileAnalysisContext += `==== END OF DOCUMENT ${index + 1} ====\n\n`;
        });
      }

      if (filesWithoutContent.length > 0) {
        fileAnalysisContext += `\nFILES WITHOUT TEXT CONTENT (${filesWithoutContent.length} files):\n`;
        filesWithoutContent.forEach((file, index) => {
          fileAnalysisContext += `${index + 1}. ${file.name} (${
            file.type || "unknown type"
          }) - No extractable text\n`;
        });
        fileAnalysisContext += `\n`;
      }

      fileAnalysisContext += `ANALYSIS INSTRUCTIONS:
- Automatically analyze ALL the document content above
- Provide comprehensive insights based on ALL available documents
- Cross-reference information across all documents
- Identify patterns, trends, and correlations
- Reference specific documents when citing information
- Do NOT ask which files to analyze - analyze ALL automatically`;
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
      system:
        "You are a helpful assistant that generates concise, descriptive titles for chat conversations. Return only the title without any additional text or formatting.",
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
