import { FirestoreTimestamp } from "./base.domain";

export interface FileDomain {
  id?: string;
  path: string;
}

export interface FirebaseFile
  extends Omit<FileDomain, "created_at" | "updated_at"> {
  created_at?: FirestoreTimestamp;
  updated_at?: FirestoreTimestamp;
}
