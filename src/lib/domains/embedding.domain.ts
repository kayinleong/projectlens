import { FirestoreTimestamp } from "./base.domain";

export interface MessageEmbedding {
  id?: string;
  message_id: string;
  user_id: string;
  message_text: string;
  embedding: number[];
  chat_id?: string;
  created_at?: Date;
  updated_at?: Date;
}

export interface FirebaseMessageEmbedding
  extends Omit<MessageEmbedding, "created_at" | "updated_at"> {
  created_at?: FirestoreTimestamp;
  updated_at?: FirestoreTimestamp;
}

export interface SimilaritySearchResult {
  message_embedding: MessageEmbedding;
  similarity_score: number;
}
