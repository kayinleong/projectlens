import { FirestoreTimestamp } from "./base.domain";

export interface Chat {
  id?: string;
  name?: string;
  file_ids: string[];
  message_ids: string[];
  user_id: string; // Required field
}

export interface FirebaseChat extends Omit<Chat, "created_at" | "updated_at"> {
  created_at?: FirestoreTimestamp;
  updated_at?: FirestoreTimestamp;
}
