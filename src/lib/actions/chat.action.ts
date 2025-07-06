/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import admin from "@/lib/firebase/server";
import { Chat, FirebaseChat } from "@/lib/domains/chat.domain";
import { Message, MessageType } from "@/lib/domains/message.domain";
import { chatFlow } from "./ai-chat.action";
import { generateChatName } from "./ai-chat.action";
import { addMemory } from "@/lib/mem0/server";
import { cookies } from "next/headers";
import { createMessageEmbedding } from "./embedding.action";

const db = admin.firestore();
const collection = db.collection("Chat");

// Helper function to get current user ID from session
async function getCurrentUserId(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("userId");

    if (!sessionCookie?.value) {
      return null;
    }

    return sessionCookie.value;
  } catch (error) {
    console.error("Error getting current user ID:", error);
    return null;
  }
}

// Create
export async function createChat(
  data: Omit<Chat, "id" | "user_id">
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    console.log("Creating chat with data:");
    const userId = await getCurrentUserId();
    console.log("Creating chat for user ID:", userId);
    if (!userId) {
      return { success: false, error: "User not authenticated" };
    }

    const timestamp = admin.firestore.FieldValue.serverTimestamp();
    const docRef = await collection.add({
      ...data,
      user_id: userId,
      name: data.name || "New Chat", // Default name for new chats
      created_at: timestamp,
      updated_at: timestamp,
    });

    return { success: true, id: docRef.id };
  } catch (error) {
    console.error("Error creating chat:", error);
    return { success: false, error: "Failed to create chat" };
  }
}

// Read - Get by ID (only if user owns it)
export async function getChat(
  id: string
): Promise<{ success: boolean; data?: Chat; error?: string }> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return { success: false, error: "User not authenticated" };
    }

    const doc = await collection.doc(id).get();

    if (!doc.exists) {
      return { success: false, error: "Chat not found" };
    }

    const data = doc.data() as FirebaseChat;

    // Check if user owns this chat
    if (data.user_id !== userId) {
      return { success: false, error: "Access denied" };
    }

    const result: Chat = {
      id: doc.id,
      name: data.name || `Chat ${doc.id}`,
      file_ids: data.file_ids,
      message_ids: data.message_ids,
      user_id: data.user_id,
    };

    return { success: true, data: result };
  } catch (error) {
    console.error("Error getting chat:", error);
    return { success: false, error: "Failed to get chat" };
  }
}

// Read - Get all (only user's chats)
export async function getAllChats(): Promise<{
  success: boolean;
  data?: Chat[];
  error?: string;
}> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return { success: false, error: "User not authenticated" };
    }

    const snapshot = await collection.where("user_id", "==", userId).get();
    const data: Chat[] = [];

    snapshot.forEach((doc) => {
      const docData = doc.data() as FirebaseChat;
      data.push({
        id: doc.id,
        name: docData.name || `Chat ${doc.id}`,
        file_ids: docData.file_ids,
        message_ids: docData.message_ids,
        user_id: docData.user_id,
      });
    });

    return { success: true, data };
  } catch (error) {
    console.error("Error getting all chats:", error);
    return { success: false, error: "Failed to get chats" };
  }
}

// Update (only if user owns it)
export async function updateChat(
  id: string,
  data: Partial<Omit<Chat, "id" | "user_id">>
): Promise<{ success: boolean; error?: string }> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return { success: false, error: "User not authenticated" };
    }

    // Check if user owns this chat
    const chatDoc = await collection.doc(id).get();
    if (!chatDoc.exists) {
      return { success: false, error: "Chat not found" };
    }

    const chatData = chatDoc.data() as FirebaseChat;
    if (chatData.user_id !== userId) {
      return { success: false, error: "Access denied" };
    }

    const timestamp = admin.firestore.FieldValue.serverTimestamp();
    await collection.doc(id).update({
      ...data,
      updated_at: timestamp,
    });

    return { success: true };
  } catch (error) {
    console.error("Error updating chat:", error);
    return { success: false, error: "Failed to update chat" };
  }
}

// Delete (only if user owns it)
export async function deleteChat(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return { success: false, error: "User not authenticated" };
    }

    // Check if user owns this chat
    const chatDoc = await collection.doc(id).get();
    if (!chatDoc.exists) {
      return { success: false, error: "Chat not found" };
    }

    const chatData = chatDoc.data() as FirebaseChat;
    if (chatData.user_id !== userId) {
      return { success: false, error: "Access denied" };
    }

    await collection.doc(id).delete();
    return { success: true };
  } catch (error) {
    console.error("Error deleting chat:", error);
    return { success: false, error: "Failed to delete chat" };
  }
}

// Add message to chat (only if user owns it)
export async function addMessageToChat(
  chatId: string,
  message: Omit<Message, "id">
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return { success: false, error: "User not authenticated" };
    }

    // Check if user owns this chat
    const chatDoc = await collection.doc(chatId).get();
    if (!chatDoc.exists) {
      return { success: false, error: "Chat not found" };
    }

    const chatData = chatDoc.data() as FirebaseChat;
    if (chatData.user_id !== userId) {
      return { success: false, error: "Access denied" };
    }

    const messageCollection = db.collection("Message");
    const timestamp = admin.firestore.FieldValue.serverTimestamp();

    // First, create the message in Firestore
    const messageDocRef = await messageCollection.add({
      ...message,
      created_at: timestamp,
      updated_at: timestamp,
    });

    // Then, add the message ID to the chat
    await collection.doc(chatId).update({
      message_ids: admin.firestore.FieldValue.arrayUnion(messageDocRef.id),
      updated_at: timestamp,
    });

    return { success: true, messageId: messageDocRef.id };
  } catch (error) {
    console.error("Error adding message to chat:", error);
    return { success: false, error: "Failed to add message to chat" };
  }
}

// Remove message from chat
export async function removeMessageFromChat(
  chatId: string,
  messageId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const messageCollection = db.collection("Message");
    const timestamp = admin.firestore.FieldValue.serverTimestamp();

    // First, delete the message from Firestore
    await messageCollection.doc(messageId).delete();

    // Then, remove the message ID from the chat
    await collection.doc(chatId).update({
      message_ids: admin.firestore.FieldValue.arrayRemove(messageId),
      updated_at: timestamp,
    });

    return { success: true };
  } catch (error) {
    console.error("Error removing message from chat:", error);
    return { success: false, error: "Failed to remove message from chat" };
  }
}

// Add file to chat (only if user owns it)
export async function addFileToChat(
  chatId: string,
  fileId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return { success: false, error: "User not authenticated" };
    }

    // Check if user owns this chat
    const chatDoc = await collection.doc(chatId).get();
    if (!chatDoc.exists) {
      return { success: false, error: "Chat not found" };
    }

    const chatData = chatDoc.data() as FirebaseChat;
    if (chatData.user_id !== userId) {
      return { success: false, error: "Access denied" };
    }

    const timestamp = admin.firestore.FieldValue.serverTimestamp();
    await collection.doc(chatId).update({
      file_ids: admin.firestore.FieldValue.arrayUnion(fileId),
      updated_at: timestamp,
    });

    return { success: true };
  } catch (error) {
    console.error("Error adding file to chat:", error);
    return { success: false, error: "Failed to add file to chat" };
  }
}

// Remove file from chat (only if user owns it)
export async function removeFileFromChat(
  chatId: string,
  fileId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return { success: false, error: "User not authenticated" };
    }

    // Check if user owns this chat
    const chatDoc = await collection.doc(chatId).get();
    if (!chatDoc.exists) {
      return { success: false, error: "Chat not found" };
    }

    const chatData = chatDoc.data() as FirebaseChat;
    if (chatData.user_id !== userId) {
      return { success: false, error: "Access denied" };
    }

    const timestamp = admin.firestore.FieldValue.serverTimestamp();
    await collection.doc(chatId).update({
      file_ids: admin.firestore.FieldValue.arrayRemove(fileId),
      updated_at: timestamp,
    });

    return { success: true };
  } catch (error) {
    console.error("Error removing file from chat:", error);
    return { success: false, error: "Failed to remove file from chat" };
  }
}

// Get messages for a chat by message IDs
export async function getMessagesByIds(
  messageIds: string[]
): Promise<{ success: boolean; data?: Message[]; error?: string }> {
  try {
    if (messageIds.length === 0) {
      return { success: true, data: [] };
    }

    const messageCollection = db.collection("Message");
    const messages: Message[] = [];

    // Fetch messages in batches (Firestore 'in' query limit is 10)
    const batchSize = 10;
    for (let i = 0; i < messageIds.length; i += batchSize) {
      const batch = messageIds.slice(i, i + batchSize);
      const snapshot = await messageCollection
        .where(admin.firestore.FieldPath.documentId(), "in", batch)
        .get();

      snapshot.forEach((doc) => {
        const data = doc.data() as any;
        messages.push({
          id: doc.id,
          message: data.message,
          type: data.type,
        });
      });
    }

    // Sort messages by their order in the messageIds array
    const sortedMessages = messageIds
      .map((id) => messages.find((msg) => msg.id === id))
      .filter((msg) => msg !== undefined) as Message[];

    return { success: true, data: sortedMessages };
  } catch (error) {
    console.error("Error getting messages by IDs:", error);
    return { success: false, error: "Failed to get messages" };
  }
}

// Add message to chat with AI response (including file context and memory)
export async function addMessageToChatWithAI(
  chatId: string,
  userMessage: Omit<Message, "id">
): Promise<{
  success: boolean;
  userMessageId?: string;
  aiMessageId?: string;
  error?: string;
}> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return { success: false, error: "User not authenticated" };
    }

    const messageCollection = db.collection("Message");
    const fileCollection = db.collection("File");
    const timestamp = admin.firestore.FieldValue.serverTimestamp();

    // Get existing chat and verify ownership
    const chat = await getChat(chatId);
    if (!chat.success || !chat.data) {
      return { success: false, error: "Chat not found or access denied" };
    }

    const existingMessages = await getMessagesByIds(chat.data.message_ids);
    if (!existingMessages.success) {
      return { success: false, error: "Failed to get existing messages" };
    }

    // Check if this is the first message and auto-name the chat
    const isFirstMessage = chat.data.message_ids.length === 0;
    const shouldAutoName =
      isFirstMessage && (chat.data.name === "New Chat" || !chat.data.name);

    // Get attached files information with extracted text for analysis
    const attachedFilesInfo = [];
    if (chat.data.file_ids.length > 0) {
      for (const fileId of chat.data.file_ids) {
        try {
          const fileDoc = await fileCollection.doc(fileId).get();
          if (fileDoc.exists) {
            const fileData = fileDoc.data();
            const fileName = fileData?.path
              ? getFilenameFromPath(fileData.path)
              : `file-${fileId}`;
            attachedFilesInfo.push({
              id: fileId,
              name: fileName,
              url: fileData?.path || "",
              type: getFileExtension(fileName),
              extracted_text: fileData?.extracted_text || "", // Add extracted text
            });
          }
        } catch (error) {
          console.error(`Error fetching file ${fileId}:`, error);
        }
      }
    }

    // Create user message
    const userMessageDocRef = await messageCollection.add({
      ...userMessage,
      created_at: timestamp,
      updated_at: timestamp,
    });

    // Generate embedding for user message
    try {
      await createMessageEmbedding(
        userMessageDocRef.id,
        userMessage.message,
        chatId
      );
    } catch (embeddingError) {
      console.warn(
        "Failed to create embedding for user message:",
        embeddingError
      );
      // Don't fail the entire operation if embedding creation fails
    }

    // Prepare data for AI with file information including extracted text and userId
    const aiInput = {
      existingMessages: (existingMessages.data || []).map((msg, index) => ({
        id: index,
        text: msg.message,
        sender:
          msg.type === MessageType.USER
            ? ("user" as const)
            : ("system" as const),
        timestamp: new Date().toISOString(),
      })),
      newMessage: {
        id: existingMessages.data?.length || 0,
        text: userMessage.message,
        sender: "user" as const,
        timestamp: new Date().toISOString(),
      },
      attachedFiles: attachedFilesInfo,
      userId: userId, // Add userId to AI input
    };

    // Get AI response with immediate file analysis and memory integration
    const aiResponse = await chatFlow(aiInput);

    // Create AI message
    const aiMessage: Omit<Message, "id"> = {
      message: aiResponse,
      type: MessageType.BOT,
    };

    const aiMessageDocRef = await messageCollection.add({
      ...aiMessage,
      created_at: timestamp,
      updated_at: timestamp,
    });

    // Generate embedding for AI message
    try {
      await createMessageEmbedding(aiMessageDocRef.id, aiResponse, chatId);
    } catch (embeddingError) {
      console.warn(
        "Failed to create embedding for AI message:",
        embeddingError
      );
      // Don't fail the entire operation if embedding creation fails
    }

    // Save to Mem0 memory after successful message creation
    try {
      const memoryMessages = [
        { role: "user" as const, content: userMessage.message },
        { role: "assistant" as const, content: aiResponse },
      ];

      const memoryResult = await addMemory(memoryMessages, userId);
      if (!memoryResult.success) {
        console.warn("Failed to save to memory:", memoryResult.error);
        // Don't fail the entire operation if memory save fails
      }
    } catch (memoryError) {
      console.warn("Error saving to memory:", memoryError);
      // Continue with the operation even if memory fails
    }

    // Generate chat name if this is the first message
    let chatName = null;
    if (shouldAutoName) {
      try {
        chatName = await generateChatName(
          userMessage.message,
          attachedFilesInfo
        );
      } catch (error) {
        console.error("Error generating chat name:", error);
        chatName =
          userMessage.message.substring(0, 50) +
          (userMessage.message.length > 50 ? "..." : "");
      }
    }

    // Update chat with messages and potentially new name
    const updateData: any = {
      message_ids: admin.firestore.FieldValue.arrayUnion(
        userMessageDocRef.id,
        aiMessageDocRef.id
      ),
      updated_at: timestamp,
    };

    if (chatName) {
      updateData.name = chatName;
    }

    await collection.doc(chatId).update(updateData);

    return {
      success: true,
      userMessageId: userMessageDocRef.id,
      aiMessageId: aiMessageDocRef.id,
    };
  } catch (error) {
    console.error("Error adding message to chat with AI:", error);
    return { success: false, error: "Failed to add message to chat with AI" };
  }
}

// Helper function to extract filename from path
function getFilenameFromPath(path: string): string {
  if (!path) return "Unknown file";
  const urlParts = path.split("/");
  const filename = urlParts[urlParts.length - 1];
  return filename.replace(/^\d+-/, "") || "Unknown file";
}

// Helper function to get file extension
function getFileExtension(filename: string): string {
  return filename.split(".").pop()?.toLowerCase() || "";
}

// Add new function for renaming chat (only if user owns it)
export async function renameChatById(
  chatId: string,
  newName: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return { success: false, error: "User not authenticated" };
    }

    // Check if user owns this chat
    const chatDoc = await collection.doc(chatId).get();
    if (!chatDoc.exists) {
      return { success: false, error: "Chat not found" };
    }

    const chatData = chatDoc.data() as FirebaseChat;
    if (chatData.user_id !== userId) {
      return { success: false, error: "Access denied" };
    }

    const timestamp = admin.firestore.FieldValue.serverTimestamp();
    await collection.doc(chatId).update({
      name: newName.trim() || "Untitled Chat",
      updated_at: timestamp,
    });

    return { success: true };
  } catch (error) {
    console.error("Error renaming chat:", error);
    return { success: false, error: "Failed to rename chat" };
  }
}
