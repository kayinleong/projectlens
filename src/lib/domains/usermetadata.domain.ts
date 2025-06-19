import { FirestoreTimestamp } from "./base.domain";

export interface Role {
    id?: string;
    role_id: string;
    user_id: string;
}

export interface FirebaseRole extends Omit<Role, 'created_at' | 'updated_at'> {
    created_at?: FirestoreTimestamp;
    updated_at?: FirestoreTimestamp;
}