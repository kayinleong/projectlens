export interface FirestoreTimestamp {
    seconds: number;
    nanoseconds: number;
    toDate: () => Date;
}