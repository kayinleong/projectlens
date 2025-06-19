/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import admin from "@/lib/firebase/server";
import { Chat, FirebaseChat } from "@/lib/domains/chat.domain";
import { Message } from "@/lib/domains/message.domain";

const db = admin.firestore();
const collection = db.collection("Chat");

// Create
export async function createChat(
  data: Omit<Chat, "id">
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const timestamp = admin.firestore.FieldValue.serverTimestamp();
    const docRef = await collection.add({
      ...data,
      created_at: timestamp,
      updated_at: timestamp,
    });

    return { success: true, id: docRef.id };
  } catch (error) {
    console.error("Error creating chat:", error);
    return { success: false, error: "Failed to create chat" };
  }
}

// Read - Get by ID
export async function getChat(
  id: string
): Promise<{ success: boolean; data?: Chat; error?: string }> {
  try {
    const doc = await collection.doc(id).get();

    if (!doc.exists) {
      return { success: false, error: "Chat not found" };
    }

    const data = doc.data() as FirebaseChat;
    const result: Chat = {
      id: doc.id,
      file_ids: data.file_ids,
      message_ids: data.message_ids,
    };

    return { success: true, data: result };
  } catch (error) {
    console.error("Error getting chat:", error);
    return { success: false, error: "Failed to get chat" };
  }
}

// Read - Get all
export async function getAllChats(): Promise<{
  success: boolean;
  data?: Chat[];
  error?: string;
}> {
  try {
    const snapshot = await collection.get();
    const data: Chat[] = [];

    snapshot.forEach((doc) => {
      const docData = doc.data() as FirebaseChat;
      data.push({
        id: doc.id,
        file_ids: docData.file_ids,
        message_ids: docData.message_ids,
      });
    });

    return { success: true, data };
  } catch (error) {
    console.error("Error getting all chats:", error);
    return { success: false, error: "Failed to get chats" };
  }
}

// Update
export async function updateChat(
  id: string,
  data: Partial<Omit<Chat, "id">>
): Promise<{ success: boolean; error?: string }> {
  try {
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

// Delete
export async function deleteChat(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await collection.doc(id).delete();
    return { success: true };
  } catch (error) {
    console.error("Error deleting chat:", error);
    return { success: false, error: "Failed to delete chat" };
  }
}

// Add message to chat
export async function addMessageToChat(
  chatId: string,
  message: Omit<Message, "id">
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
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

// Add file to chat
export async function addFileToChat(
  chatId: string,
  fileId: string
): Promise<{ success: boolean; error?: string }> {
  try {
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

// Remove file from chat
export async function removeFileFromChat(
  chatId: string,
  fileId: string
): Promise<{ success: boolean; error?: string }> {
  try {
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
