"use server";

import admin from "@/lib/firebase/server";
import { Role, FirebaseRole } from "@/lib/domains/role.domain";

const db = admin.firestore();
const collection = db.collection("Role");

// Create
export async function createRole(
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
    console.error("Error creating role:", error);
    return { success: false, error: "Failed to create role" };
  }
}

// Read - Get by ID
export async function getRole(
  id: string
): Promise<{ success: boolean; data?: Role; error?: string }> {
  try {
    const doc = await collection.doc(id).get();

    if (!doc.exists) {
      return { success: false, error: "Role not found" };
    }

    const data = doc.data() as FirebaseRole;
    const result: Role = {
      id: doc.id,
      name: data.name,
      permissions: data.permissions,
    };

    return { success: true, data: result };
  } catch (error) {
    console.error("Error getting role:", error);
    return { success: false, error: "Failed to get role" };
  }
}

// Read - Get all
export async function getAllRoles(): Promise<{
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
        name: docData.name,
        permissions: docData.permissions,
      });
    });

    return { success: true, data };
  } catch (error) {
    console.error("Error getting all roles:", error);
    return { success: false, error: "Failed to get roles" };
  }
}

// Read - Get by name
export async function getRoleByName(
  name: string
): Promise<{ success: boolean; data?: Role; error?: string }> {
  try {
    const snapshot = await collection.where("name", "==", name).limit(1).get();

    if (snapshot.empty) {
      return { success: false, error: "Role not found" };
    }

    const doc = snapshot.docs[0];
    const docData = doc.data() as FirebaseRole;
    const result: Role = {
      id: doc.id,
      name: docData.name,
      permissions: docData.permissions,
    };

    return { success: true, data: result };
  } catch (error) {
    console.error("Error getting role by name:", error);
    return { success: false, error: "Failed to get role" };
  }
}

// Update
export async function updateRole(
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
    console.error("Error updating role:", error);
    return { success: false, error: "Failed to update role" };
  }
}

// Delete
export async function deleteRole(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await collection.doc(id).delete();
    return { success: true };
  } catch (error) {
    console.error("Error deleting role:", error);
    return { success: false, error: "Failed to delete role" };
  }
}
