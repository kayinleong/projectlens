"use server";
import MemoryClient from "mem0ai";

const apiKey = process.env.NEXT_PRIVATE_MEM0_TOKEN!;
const client = new MemoryClient({ apiKey: apiKey });

// Add memory from messages
export async function addMemory(
  messages: Array<{ role: "user" | "assistant"; content: string }>,
  userId: string
): Promise<{ success: boolean; error?: string; data?: any }> {
  try {
    const result = await client.add(messages, { user_id: userId });
    return { success: true, data: result };
  } catch (error) {
    console.error("Error adding memory:", error);
    return { success: false, error: "Failed to add memory" };
  }
}

// Search/retrieve memory
export async function searchMemory(
  query: string,
  userId: string
): Promise<{ success: boolean; error?: string; data?: any }> {
  try {
    const results = await client.search(query, { user_id: userId });
    return { success: true, data: results };
  } catch (error) {
    console.error("Error searching memory:", error);
    return { success: false, error: "Failed to search memory" };
  }
}
