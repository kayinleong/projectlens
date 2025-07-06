import { FirestoreTimestamp } from "./base.domain";

export interface FileDomain {
  id?: string;
  path: string;
  extracted_text: string;
  embeddings?: number[];
}

export interface FirebaseFile
  extends Omit<FileDomain, "created_at" | "updated_at"> {
  extracted_text: string;
  embeddings?: number[]; // Add embeddings field
  created_at?: FirestoreTimestamp;
  updated_at?: FirestoreTimestamp;
}
