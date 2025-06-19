"use server";

import admin from "@/lib/firebase/server";
import { Role, FirebaseRole } from "@/lib/domains/usermetadata.domain";

const db = admin.firestore();
const collection = db.collection("UserMetadata");

export async function createUserMetadata(
  data: Omit<Role, "id">
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
    console.error("Error creating user metadata:", error);
    return { success: false, error: "Failed to create user metadata" };
  }
}

export async function getUserMetadata(
  id: string
): Promise<{ success: boolean; data?: Role; error?: string }> {
  try {
    const doc = await collection.doc(id).get();

    if (!doc.exists) {
      return { success: false, error: "User metadata not found" };
    }

    const data = doc.data() as FirebaseRole;
    const result: Role = {
      id: doc.id,
      role_id: data.role_id,
      user_id: data.user_id,
    };

    return { success: true, data: result };
  } catch (error) {
    console.error("Error getting user metadata:", error);
    return { success: false, error: "Failed to get user metadata" };
  }
}

export async function getAllUserMetadata(): Promise<{
  success: boolean;
  data?: Role[];
  error?: string;
}> {
  try {
    const snapshot = await collection.get();
    const data: Role[] = [];

    snapshot.forEach((doc) => {
      const docData = doc.data() as FirebaseRole;
      data.push({
        id: doc.id,
        role_id: docData.role_id,
        user_id: docData.user_id,
      });
    });

    return { success: true, data };
  } catch (error) {
    console.error("Error getting all user metadata:", error);
    return { success: false, error: "Failed to get user metadata" };
  }
}

export async function getUserMetadataByUserId(
  userId: string
): Promise<{ success: boolean; data?: Role[]; error?: string }> {
  try {
    const snapshot = await collection.where("user_id", "==", userId).get();
    const data: Role[] = [];

    snapshot.forEach((doc) => {
      const docData = doc.data() as FirebaseRole;
      data.push({
        id: doc.id,
        role_id: docData.role_id,
        user_id: docData.user_id,
      });
    });

    return { success: true, data };
  } catch (error) {
    console.error("Error getting user metadata by user ID:", error);
    return { success: false, error: "Failed to get user metadata" };
  }
}

export async function updateUserMetadata(
  id: string,
  data: Partial<Omit<Role, "id">>
): Promise<{ success: boolean; error?: string }> {
  try {
    const timestamp = admin.firestore.FieldValue.serverTimestamp();
    await collection.doc(id).update({
      ...data,
      updated_at: timestamp,
    });

    return { success: true };
  } catch (error) {
    console.error("Error updating user metadata:", error);
    return { success: false, error: "Failed to update user metadata" };
  }
}

export async function deleteUserMetadata(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await collection.doc(id).delete();
    return { success: true };
  } catch (error) {
    console.error("Error deleting user metadata:", error);
    return { success: false, error: "Failed to delete user metadata" };
  }
}
