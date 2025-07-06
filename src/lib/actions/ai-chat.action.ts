"use server";

import { z } from "zod";
import { ai } from "../firebase/ai";
import { searchMemory } from "@/lib/mem0/server";
import { performSimilaritySearch } from "./embedding.action";
import { performFileSimilaritySearch } from "./file.action";

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
        extracted_text: z.string().optional(),
      })
    )
    .optional(),
  userId: z.string(), // Add userId to schema
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
- AUTOMATICALLY analyze the most relevant files based on user queries using intelligent similarity search
- Focus on files that are most relevant to the current question or context
- Provide comprehensive insights based on the most pertinent document content
- Cross-reference information across relevant documents when applicable
- Identify patterns, trends, and correlations in the most relevant files
- Use previous conversation memory to provide personalized and contextual responses
- Use similar past conversations and messages to provide better context
- Reference relevant memories and similar conversations when they provide helpful context

Your capabilities include:
1. Intelligent Document Selection: Automatically identify and analyze the most relevant files for each query
2. Contextual File Analysis: Process files based on their relevance to the current conversation
3. Cross-Document Insights: Compare and contrast information across relevant files
4. Pattern Recognition: Identify trends and patterns in relevant documents
5. Memory Integration: Remember user preferences, past conversations, and relevant context
6. Similarity Search: Find and reference similar past conversations and messages
7. Personalized Responses: Use stored memories and similar conversations to provide tailored assistance

When analyzing files:
- Focus on the most relevant files identified through similarity search
- Explain why certain files are most relevant to the query
- Reference specific files when mentioning particular details
- Highlight correlations or insights from the most pertinent documents
- Process the most relevant extracted text content automatically

When using memories and similar conversations:
- Reference relevant past information naturally in responses
- Use memories to provide consistent recommendations
- Remember user preferences and past decisions
- Build upon previous conversations and insights
- Use similar past conversations to provide better context and suggestions`,
    });

    // Retrieve relevant memories based on the new message
    let memoryContext = "";
    try {
      const memoryResult = await searchMemory(
        chats.newMessage.text,
        chats.userId
      );
      if (
        memoryResult.success &&
        memoryResult.data &&
        memoryResult.data.length > 0
      ) {
        memoryContext = `\n\nRELEVANT MEMORIES FROM PAST CONVERSATIONS:\n`;
        memoryResult.data.forEach((memory: any, index: number) => {
          memoryContext += `\nMemory ${index + 1}: ${
            memory.text || memory.content || JSON.stringify(memory)
          }\n`;
        });
      }
    } catch (error) {
      console.warn("Error retrieving memories:", error);
    }

    // Perform similarity search for related conversations
    let similarityContext = "";
    try {
      const similarityResult = await performSimilaritySearch(
        chats.newMessage.text,
        5, // Get top 5 similar messages
        0.6 // Minimum similarity threshold
      );

      if (
        similarityResult.success &&
        similarityResult.data &&
        similarityResult.data.length > 0
      ) {
        similarityContext = `\n\nSIMILAR PAST CONVERSATIONS (for context):\n`;
        similarityResult.data.forEach((result, index) => {
          similarityContext += `\nSimilar Message ${index + 1} (${(
            result.similarity_score * 100
          ).toFixed(1)}% similar):\n`;
          similarityContext += `"${result.message_embedding.message_text}"\n`;
        });
        similarityContext += `\nUse these similar conversations to provide more relevant and consistent responses. Reference patterns or insights from similar discussions when relevant.\n`;
      }
    } catch (error) {
      console.warn("Error performing similarity search:", error);
    }

    // Perform file similarity search to find most relevant files
    let fileSimilarityContext = "";
    try {
      const fileSimilarityResult = await performFileSimilaritySearch(
        chats.newMessage.text,
        5, // Get top 5 most relevant files
        0.6 // Minimum similarity threshold
      );

      if (
        fileSimilarityResult.success &&
        fileSimilarityResult.data &&
        fileSimilarityResult.data.length > 0
      ) {
        fileSimilarityContext = `\n\nMOST RELEVANT FILES (based on similarity search):\n`;
        fileSimilarityResult.data.forEach((result, index) => {
          const filename = getFilenameFromPath(result.file.path);
          fileSimilarityContext += `\n==== RELEVANT DOCUMENT ${
            index + 1
          }: ${filename} (${(result.similarity_score * 100).toFixed(
            1
          )}% relevant) ====\n`;
          fileSimilarityContext += `Content:\n${result.file.extracted_text}\n`;
          fileSimilarityContext += `==== END OF RELEVANT DOCUMENT ${
            index + 1
          } ====\n\n`;
        });
        fileSimilarityContext += `\nANALYSIS INSTRUCTIONS:
- Focus on analyzing the most relevant files shown above
- These files were selected based on their relevance to the user's query
- Explain insights from the most pertinent documents
- Reference specific files when providing information
- Cross-reference information across relevant documents when applicable`;
      }
    } catch (error) {
      console.warn("Error performing file similarity search:", error);
    }

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

    // Prepare file analysis context - use similarity search results if available, otherwise fall back to attached files
    let fileAnalysisContext = "";
    if (fileSimilarityContext) {
      fileAnalysisContext = fileSimilarityContext;
    } else if (chats.attachedFiles && chats.attachedFiles.length > 0) {
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

    const fullPrompt = `${conversationContext}Current user message: ${chats.newMessage.text}${fileAnalysisContext}${similarityContext}${memoryContext}`;

    const { text } = await chat.send(fullPrompt);

    return text;
  }
);

// Helper function to extract filename from path
function getFilenameFromPath(path: string): string {
  if (!path) return "Unknown file";
  try {
    const urlParts = path.split("/");
    let filename = urlParts[urlParts.length - 1];
    if (filename.includes("?")) {
      filename = filename.split("?")[0];
    }
    filename = filename.replace(/^\d+-/, "");
    filename = decodeURIComponent(filename);
    return filename || "Unknown file";
  } catch (error) {
    console.error("Error extracting filename from path:", error);
    return "Unknown file";
  }
}

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
