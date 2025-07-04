/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import admin from "@/lib/firebase/server";
import { FileDomain, FirebaseFile } from "@/lib/domains/file.domain";
import { getStorage } from "firebase-admin/storage";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { PPTXLoader } from "@langchain/community/document_loaders/fs/pptx";
import * as XLSX from "xlsx";
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

// Helper function to extract text from PDF
async function extractTextFromPDF(fileBuffer: Buffer): Promise<string> {
  try {
    const loader = new PDFLoader(new Blob([new Uint8Array(fileBuffer)]));
    const docs = await loader.load();
    const extractedText = docs.map((doc: any) => doc.pageContent).join("\n");

    return extractedText || "";
  } catch (error) {
    console.error("Error extracting PDF text:", error);
    return "";
  }
}

// Helper function to extract text from Excel files
async function extractTextFromExcel(fileBuffer: Buffer): Promise<string> {
  try {
    const workbook = XLSX.read(fileBuffer, { type: "buffer" });
    let extractedText = "";

    workbook.SheetNames.forEach((sheetName) => {
      const sheet = workbook.Sheets[sheetName];
      const sheetData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

      // Add sheet name as header
      extractedText += `Sheet: ${sheetName}\n`;

      // Convert sheet data to text
      sheetData.forEach((row: any[]) => {
        if (row.length > 0) {
          extractedText += row.join("\t") + "\n";
        }
      });

      extractedText += "\n";
    });

    return extractedText;
  } catch (error) {
    console.error("Error extracting Excel text:", error);
    return "";
  }
}

// Helper function to extract text from PowerPoint files
async function extractTextFromPPTX(fileBuffer: Buffer): Promise<string> {
  try {
    const loader = new PPTXLoader(new Blob([new Uint8Array(fileBuffer)]));
    const docs = await loader.load();
    const extractedText = docs.map((doc: any) => doc.pageContent).join("\n");

    return extractedText || "";
  } catch (error) {
    console.error("Error extracting PPTX text:", error);
    return "";
  }
}

// Helper function to extract filename from path - enhanced version
function getFilenameFromPath(path: string): string {
  if (!path) return "Unknown file";

  try {
    // Handle URLs - extract the last segment after the last slash
    const urlParts = path.split("/");
    let filename = urlParts[urlParts.length - 1];

    // Remove URL parameters if present (e.g., ?token=abc)
    if (filename.includes("?")) {
      filename = filename.split("?")[0];
    }

    // Remove timestamp prefix if present (e.g., "1234567890-filename.txt" -> "filename.txt")
    filename = filename.replace(/^\d+-/, "");

    // Decode URL encoding (e.g., %20 -> space)
    filename = decodeURIComponent(filename);

    return filename || "Unknown file";
  } catch (error) {
    console.error("Error extracting filename from path:", error);
    return "Unknown file";
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

    // Extract text based on file type
    let extractedText = "";

    if (file.type === "application/pdf") {
      extractedText = await extractTextFromPDF(buffer);
    } else if (
      file.type ===
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
      file.type === "application/vnd.ms-excel" ||
      file.name.endsWith(".xlsx") ||
      file.name.endsWith(".xls")
    ) {
      extractedText = await extractTextFromExcel(buffer);
    } else if (
      file.type ===
        "application/vnd.openxmlformats-officedocument.presentationml.presentation" ||
      file.type === "application/vnd.ms-powerpoint" ||
      file.name.endsWith(".pptx") ||
      file.name.endsWith(".ppt")
    ) {
      extractedText = await extractTextFromPPTX(buffer);
    }

    const timestamp = admin.firestore.FieldValue.serverTimestamp();
    const docRef = await collection.add({
      path: url,
      extracted_text: extractedText,
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
      extracted_text: data.extracted_text || "",
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
        extracted_text: docData.extracted_text || "",
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
      extracted_text: docData.extracted_text || "",
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
