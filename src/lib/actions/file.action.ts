/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import admin from "@/lib/firebase/server";
import { FileDomain, FirebaseFile } from "@/lib/domains/file.domain";
import { getStorage } from "firebase-admin/storage";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { PPTXLoader } from "@langchain/community/document_loaders/fs/pptx";
import { DocxLoader } from "@langchain/community/document_loaders/fs/docx";
import { CSVLoader } from "@langchain/community/document_loaders/fs/csv";
import * as XLSX from "xlsx";
import { Buffer } from "buffer";
import { GoogleGenAI } from "@google/genai";
import { generateEmbedding } from "@/lib/firebase/ai";

const ai = new GoogleGenAI({});
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
      const sheetData = XLSX.utils.sheet_to_json(sheet, {
        header: 1,
      }) as any[][];

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
    const blob = new Blob([new Uint8Array(fileBuffer)], {
      type: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    });
    const loader = new PPTXLoader(blob);
    const docs = await loader.load();
    const extractedText = docs.map((doc: any) => doc.pageContent).join("\n");

    return extractedText || "";
  } catch (error) {
    console.error("Error extracting PPTX text:", error);
    return "";
  }
}

// Helper function to extract text from DOCX files
async function extractTextFromDOCX(fileBuffer: Buffer): Promise<string> {
  try {
    const blob = new Blob([new Uint8Array(fileBuffer)], {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });
    const loader = new DocxLoader(blob);
    const docs = await loader.load();
    const extractedText = docs.map((doc: any) => doc.pageContent).join("\n");

    return extractedText || "";
  } catch (error) {
    console.error("Error extracting DOCX text:", error);
    return "";
  }
}

// Helper function to extract text from CSV files
async function extractTextFromCSV(fileBuffer: Buffer): Promise<string> {
  try {
    const csvText = fileBuffer.toString("utf-8");
    const blob = new Blob([csvText], { type: "text/csv" });
    const loader = new CSVLoader(blob);
    const docs = await loader.load();
    const extractedText = docs.map((doc: any) => doc.pageContent).join("\n");

    return extractedText || "";
  } catch (error) {
    console.error("Error extracting CSV text:", error);
    // Fallback: treat as plain text
    try {
      return fileBuffer.toString("utf-8");
    } catch (fallbackError) {
      console.error("CSV fallback extraction failed:", fallbackError);
      return "";
    }
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

// Create - Upload file and store metadata with embeddings
export async function createFile(
  formData: FormData
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const file = formData.get("file") as File;
    if (!file) {
      return { success: false, error: "No file provided" };
    }

    console.log(
      "Processing file:",
      file.name,
      "Type:",
      file.type,
      "Size:",
      file.size
    );

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

    console.log("File uploaded to storage:", url);

    // Extract text based on file type
    let extractedText = "";

    console.log("Attempting text extraction for file type:", file.type);
    
    // PDF files
    if (file.type === "application/pdf") {
      console.log("Extracting text from PDF...");
      extractedText = await extractTextFromPDF(buffer);
    } 
    // Excel files (.xlsx, .xls)
    else if (
      file.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
      file.type === "application/vnd.ms-excel" ||
      file.name.endsWith(".xlsx") ||
      file.name.endsWith(".xls")
    ) {
      console.log("Extracting text from Excel...");
      extractedText = await extractTextFromExcel(buffer);
    } 
    // PowerPoint files (.pptx, .ppt)
    else if (
      file.type === "application/vnd.openxmlformats-officedocument.presentationml.presentation" ||
      file.type === "application/vnd.ms-powerpoint" ||
      file.name.endsWith(".pptx") ||
      file.name.endsWith(".ppt")
    ) {
      console.log("Extracting text from PowerPoint...");
      extractedText = await extractTextFromPPTX(buffer);
    } 
    // Word documents (.docx, .doc)
    else if (
      file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      file.type === "application/msword" ||
      file.name.endsWith(".docx") ||
      file.name.endsWith(".doc")
    ) {
      console.log("Extracting text from Word document...");
      extractedText = await extractTextFromDOCX(buffer);
    } 
    // CSV files
    else if (
      file.type === "text/csv" ||
      file.type === "application/csv" ||
      file.name.endsWith(".csv")
    ) {
      console.log("Extracting text from CSV...");
      extractedText = await extractTextFromCSV(buffer);
    } 
    // Plain text files
    else if (file.type === "text/plain" || file.name.endsWith(".txt")) {
      console.log("Extracting text from plain text file...");
      extractedText = buffer.toString("utf-8");
    } 
    // JSON files
    else if (file.type === "application/json" || file.name.endsWith(".json")) {
      console.log("Extracting text from JSON file...");
      try {
        const jsonContent = buffer.toString("utf-8");
        const parsedJson = JSON.parse(jsonContent);
        extractedText = JSON.stringify(parsedJson, null, 2);
      } catch (jsonError) {
        console.error("Error parsing JSON:", jsonError);
        extractedText = buffer.toString("utf-8");
      }
    } 
    // XML files
    else if (file.type === "application/xml" || file.type === "text/xml" || file.name.endsWith(".xml")) {
      console.log("Extracting text from XML file...");
      extractedText = buffer.toString("utf-8");
    } 
    // Markdown files
    else if (file.type === "text/markdown" || file.name.endsWith(".md") || file.name.endsWith(".markdown")) {
      console.log("Extracting text from Markdown file...");
      extractedText = buffer.toString("utf-8");
    } 
    // Other text-based files (try to extract as text)
    else if (file.type.startsWith("text/")) {
      console.log("Extracting text from generic text file...");
      extractedText = buffer.toString("utf-8");
    } 
    else {
      console.log("Unsupported file type for text extraction:", file.type);
      console.log("File name:", file.name);
      
      // Last resort: try to extract as text if file is small enough
      if (buffer.length < 1024 * 1024) { // Less than 1MB
        try {
          const textContent = buffer.toString("utf-8");
          // Check if it looks like readable text
          if (textContent.length > 0 && !/[\x00-\x08\x0E-\x1F\x7F]/.test(textContent.substring(0, 100))) {
            console.log("Attempting to extract as plain text...");
            extractedText = textContent;
          }
        } catch (textError) {
          console.log("Could not extract as plain text:", textError);
        }
      }
    }

    console.log("Extracted text length:", extractedText.length);
    if (extractedText.length > 0) {
      console.log("Extracted text preview:", extractedText.substring(0, 200));
    }

    // Generate embeddings for the extracted text if available
    let embeddings: number[] | null = null;
    if (extractedText && extractedText.trim()) {
      try {
        console.log("Generating embeddings for extracted text...");
        embeddings = await generateEmbedding(extractedText.trim());
        console.log(
          "Generated embeddings for file:",
          file.name,
          "Embedding length:",
          embeddings.length
        );
      } catch (embeddingError) {
        console.warn("Failed to generate embeddings for file:", embeddingError);
        console.warn("Embedding error details:", embeddingError);
        // Continue without embeddings rather than failing the upload
      }
    } else {
      console.log("No text extracted - skipping embedding generation");
    }

    const timestamp = admin.firestore.FieldValue.serverTimestamp();
    const docRef = await collection.add({
      path: url,
      extracted_text: extractedText,
      embeddings: embeddings, // This will be null if no embeddings were generated
      created_at: timestamp,
      updated_at: timestamp,
    });

    console.log("File document created with ID:", docRef.id);
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
      embeddings: data.embeddings || undefined, // Include embeddings in response
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
        embeddings: docData.embeddings || undefined, // Include embeddings in response
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

// New function: Perform similarity search on files
export async function performFileSimilaritySearch(
  queryText: string,
  limit: number = 5,
  similarityThreshold: number = 0.7
): Promise<{
  success: boolean;
  data?: Array<{
    file: FileDomain;
    similarity_score: number;
  }>;
  error?: string;
}> {
  try {
    console.log("Performing file similarity search for:", queryText);

    // Generate embedding for the query text
    const queryEmbedding = await generateEmbedding(queryText);
    console.log("Query embedding generated, length:", queryEmbedding.length);

    // Get all files that have embeddings (not null)
    const snapshot = await collection.where("embeddings", "!=", null).get();
    console.log("Found", snapshot.size, "files with embeddings");

    if (snapshot.empty) {
      console.log("No files with embeddings found");
      return { success: true, data: [] };
    }

    const similarities: Array<{
      file: FileDomain;
      similarity_score: number;
    }> = [];

    snapshot.forEach((doc) => {
      const fileData = doc.data() as FirebaseFile;

      if (fileData.embeddings && Array.isArray(fileData.embeddings)) {
        // Calculate cosine similarity
        const similarity = calculateCosineSimilarity(
          queryEmbedding,
          fileData.embeddings
        );

        console.log(`File ${doc.id} similarity:`, similarity);

        if (similarity >= similarityThreshold) {
          similarities.push({
            file: {
              id: doc.id,
              path: fileData.path,
              extracted_text: fileData.extracted_text || "",
              embeddings: fileData.embeddings,
            },
            similarity_score: similarity,
          });
        }
      } else {
        console.log(
          `File ${doc.id} has invalid embeddings:`,
          fileData.embeddings
        );
      }
    });

    // Sort by similarity score (highest first) and limit results
    similarities.sort((a, b) => b.similarity_score - a.similarity_score);
    const topResults = similarities.slice(0, limit);

    console.log(`Returning ${topResults.length} similar files`);
    return { success: true, data: topResults };
  } catch (error) {
    console.error("Error performing file similarity search:", error);
    return {
      success: false,
      error: "Failed to perform file similarity search",
    };
  }
}

// Helper function to calculate cosine similarity
function calculateCosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) {
    return 0;
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}
