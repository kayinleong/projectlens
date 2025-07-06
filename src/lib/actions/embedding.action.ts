"use server";

import admin from "@/lib/firebase/server";
import {
  MessageEmbedding,
  FirebaseMessageEmbedding,
  SimilaritySearchResult,
} from "@/lib/domains/embedding.domain";
import { generateEmbedding } from "@/lib/firebase/ai";
import { cookies } from "next/headers";

const db = admin.firestore();
const collection = db.collection("MessageEmbedding");

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

// Calculate cosine similarity between two vectors
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error("Vectors must have the same length");
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dotProduct / (normA * normB);
}

// Create embedding for a message
export async function createMessageEmbedding(
  messageId: string,
  messageText: string,
  chatId?: string
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return { success: false, error: "User not authenticated" };
    }

    // Generate embedding for the message text
    const embedding = await generateEmbedding(messageText);

    const timestamp = admin.firestore.FieldValue.serverTimestamp();
    const docRef = await collection.add({
      message_id: messageId,
      user_id: userId,
      message_text: messageText,
      embedding: embedding,
      chat_id: chatId,
      created_at: timestamp,
      updated_at: timestamp,
    });

    return { success: true, id: docRef.id };
  } catch (error) {
    console.error("Error creating message embedding:", error);
    return { success: false, error: "Failed to create message embedding" };
  }
}

// Perform similarity search
export async function performSimilaritySearch(
  queryText: string,
  limit: number = 5,
  minSimilarity: number = 0.5,
  excludeMessageId?: string
): Promise<{
  success: boolean;
  data?: SimilaritySearchResult[];
  error?: string;
}> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return { success: false, error: "User not authenticated" };
    }

    // Generate embedding for the query
    const queryEmbedding = await generateEmbedding(queryText);

    // Get all embeddings for the user
    const snapshot = await collection.where("user_id", "==", userId).get();

    const results: SimilaritySearchResult[] = [];

    snapshot.forEach((doc) => {
      const data = doc.data() as FirebaseMessageEmbedding;

      // Skip the current message if excludeMessageId is provided
      if (excludeMessageId && data.message_id === excludeMessageId) {
        return;
      }

      // Calculate similarity
      const similarity = cosineSimilarity(queryEmbedding, data.embedding);

      // Only include results above minimum similarity threshold
      if (similarity >= minSimilarity) {
        results.push({
          message_embedding: {
            id: doc.id,
            message_id: data.message_id,
            user_id: data.user_id,
            message_text: data.message_text,
            embedding: data.embedding,
            chat_id: data.chat_id,
          },
          similarity_score: similarity,
        });
      }
    });

    // Sort by similarity score (highest first) and limit results
    results.sort((a, b) => b.similarity_score - a.similarity_score);
    const limitedResults = results.slice(0, limit);

    return { success: true, data: limitedResults };
  } catch (error) {
    console.error("Error performing similarity search:", error);
    return { success: false, error: "Failed to perform similarity search" };
  }
}

// Get embedding by message ID
export async function getEmbeddingByMessageId(
  messageId: string
): Promise<{ success: boolean; data?: MessageEmbedding; error?: string }> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return { success: false, error: "User not authenticated" };
    }

    const snapshot = await collection
      .where("message_id", "==", messageId)
      .where("user_id", "==", userId)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return { success: false, error: "Embedding not found" };
    }

    const doc = snapshot.docs[0];
    const data = doc.data() as FirebaseMessageEmbedding;

    const result: MessageEmbedding = {
      id: doc.id,
      message_id: data.message_id,
      user_id: data.user_id,
      message_text: data.message_text,
      embedding: data.embedding,
      chat_id: data.chat_id,
    };

    return { success: true, data: result };
  } catch (error) {
    console.error("Error getting embedding by message ID:", error);
    return { success: false, error: "Failed to get embedding" };
  }
}

// Delete embedding by message ID
export async function deleteEmbeddingByMessageId(
  messageId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return { success: false, error: "User not authenticated" };
    }

    const snapshot = await collection
      .where("message_id", "==", messageId)
      .where("user_id", "==", userId)
      .get();

    const batch = db.batch();
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    await batch.commit();
    return { success: true };
  } catch (error) {
    console.error("Error deleting embedding:", error);
    return { success: false, error: "Failed to delete embedding" };
  }
}
