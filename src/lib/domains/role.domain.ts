import { FirestoreTimestamp } from "./base.domain";

export interface Role {
  id?: string;
  name: string;
  permissions: RolePermission[];
}

export enum RolePermission {
  READ = "read",
  WRITE = "write",
  ADMIN = "admin",
}

export interface FirebaseRole extends Omit<Role, "created_at" | "updated_at"> {
  created_at?: FirestoreTimestamp;
  updated_at?: FirestoreTimestamp;
}
