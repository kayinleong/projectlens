"use server";

import admin from "@/lib/firebase/server";
import { FileDomain, FirebaseFile } from "@/lib/domains/file.domain";
import { getStorage } from "firebase-admin/storage";
import { Buffer } from "buffer";

const db = admin.firestore();
const collection = db.collection("File");

// Helper function to upload file to Firebase Storage
async function uploadFileToStorage(
  fileBuffer: Buffer,
  fileName: string,
  fileType: string = "application/octet-stream"
): Promise<{ url: string; success: boolean; error?: string }> {
  try {
    const storage = getStorage();
    const bucket = storage.bucket(
      process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
    );

    const timestamp = Date.now();
    const safeFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
    const filePath = `uploads/${timestamp}-${safeFileName}`;

    const file = bucket.file(filePath);

    const options = {
      metadata: {
        contentType: fileType,
        metadata: {
          uploadedAt: timestamp.toString(),
        },
      },
    };

    return new Promise((resolve, reject) => {
      const blobStream = file.createWriteStream(options);

      blobStream.on("error", (error) => {
        console.error("Error uploading file to Firebase Storage:", error);
        reject(error);
      });

      blobStream.on("finish", async () => {
        try {
          await file.makePublic();
          const publicUrl = `https://storage.googleapis.com/${bucket.name}/${filePath}`;
          resolve({ url: publicUrl, success: true });
        } catch (error) {
          console.error("Error making file public:", error);
          reject(error);
        }
      });

      blobStream.end(fileBuffer);
    });
  } catch (error) {
    console.error("Error uploading file:", error);
    return {
      url: "",
      success: false,
      error: error instanceof Error ? error.message : "Failed to upload file",
    };
  }
}

// Create - Upload file and store metadata
export async function createFile(
  formData: FormData
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const file = formData.get("file") as File;
    if (!file) {
      return { success: false, error: "No file provided" };
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { url, success, error } = await uploadFileToStorage(
      buffer,
      file.name,
      file.type
    );

    if (!success || !url) {
      return { success: false, error: error || "Failed to upload file" };
    }

    const timestamp = admin.firestore.FieldValue.serverTimestamp();
    const docRef = await collection.add({
      path: url,
      created_at: timestamp,
      updated_at: timestamp,
    });

    return { success: true, id: docRef.id };
  } catch (error) {
    console.error("Error creating file:", error);
    return { success: false, error: "Failed to create file" };
  }
}

// Read - Get by ID
export async function getFile(
  id: string
): Promise<{ success: boolean; data?: FileDomain; error?: string }> {
  try {
    const doc = await collection.doc(id).get();

    if (!doc.exists) {
      return { success: false, error: "File not found" };
    }

    const data = doc.data() as FirebaseFile;
    const result: FileDomain = {
      id: doc.id,
      path: data.path,
    };

    return { success: true, data: result };
  } catch (error) {
    console.error("Error getting file:", error);
    return { success: false, error: "Failed to get file" };
  }
}

// Read - Get all
export async function getAllFiles(): Promise<{
  success: boolean;
  data?: FileDomain[];
  error?: string;
}> {
  try {
    const snapshot = await collection.get();
    const data: FileDomain[] = [];

    snapshot.forEach((doc) => {
      const docData = doc.data() as FirebaseFile;
      data.push({
        id: doc.id,
        path: docData.path,
      });
    });

    return { success: true, data };
  } catch (error) {
    console.error("Error getting all files:", error);
    return { success: false, error: "Failed to get files" };
  }
}

// Read - Get by path
export async function getFileByPath(
  path: string
): Promise<{ success: boolean; data?: FileDomain; error?: string }> {
  try {
    const snapshot = await collection.where("path", "==", path).limit(1).get();

    if (snapshot.empty) {
      return { success: false, error: "File not found" };
    }

    const doc = snapshot.docs[0];
    const docData = doc.data() as FirebaseFile;
    const result: FileDomain = {
      id: doc.id,
      path: docData.path,
    };

    return { success: true, data: result };
  } catch (error) {
    console.error("Error getting file by path:", error);
    return { success: false, error: "Failed to get file" };
  }
}

// Update
export async function updateFile(
  id: string,
  data: Partial<Omit<FileDomain, "id">>
): Promise<{ success: boolean; error?: string }> {
  try {
    const timestamp = admin.firestore.FieldValue.serverTimestamp();
    await collection.doc(id).update({
      ...data,
      updated_at: timestamp,
    });

    return { success: true };
  } catch (error) {
    console.error("Error updating file:", error);
    return { success: false, error: "Failed to update file" };
  }
}

// Delete
export async function deleteFile(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await collection.doc(id).delete();
    return { success: true };
  } catch (error) {
    console.error("Error deleting file:", error);
    return { success: false, error: "Failed to delete file" };
  }
}
