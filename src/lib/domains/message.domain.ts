import { FirestoreTimestamp } from "./base.domain";

export interface Message {
  id?: string;
  message: string;
  type: MessageType;
}

export enum MessageType {
  BOT,
  USER,
}

export interface FirebaseMessage
  extends Omit<Message, "created_at" | "updated_at"> {
  created_at?: FirestoreTimestamp;
  updated_at?: FirestoreTimestamp;
}
