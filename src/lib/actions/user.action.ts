"use server";

import admin from "@/lib/firebase/server";

const auth = admin.auth();

// Authentication functions
export async function createUserWithAuth(email: string, password: string) {
  try {
    const userRecord = await auth.createUser({
      email,
      password,
    });

    return { success: true, uid: userRecord.uid };
  } catch (error) {
    console.error("Error creating user with auth:", error);
    return { success: false, error: "Failed to create user account" };
  }
}

export async function getUserByAuth(uid: string) {
  try {
    const userRecord = await auth.getUser(uid);

    return {
      success: true,
      user: {
        uid: userRecord.uid,
        email: userRecord.email,
        displayName: userRecord.displayName,
      },
    };
  } catch (error) {
    console.error("Error getting user by auth:", error);
    return { success: false, error: "Failed to get user" };
  }
}

export async function deleteUserWithAuth(uid: string) {
  try {
    await auth.deleteUser(uid);
    return { success: true };
  } catch (error) {
    console.error("Error deleting user with auth:", error);
    return { success: false, error: "Failed to delete user account" };
  }
}

export async function updateUserAuth(
  uid: string,
  updates: {
    email?: string;
    displayName?: string;
    password?: string;
  }
) {
  try {
    await auth.updateUser(uid, updates);
    return { success: true };
  } catch (error) {
    console.error("Error updating user auth:", error);
    return { success: false, error: "Failed to update user" };
  }
}

export async function getAllUsers(maxResults?: number, nextPageToken?: string) {
  try {
    const listUsersResult = await auth.listUsers(maxResults, nextPageToken);

    const users = listUsersResult.users.map((userRecord) => ({
      uid: userRecord.uid,
      email: userRecord.email,
      displayName: userRecord.displayName,
      disabled: userRecord.disabled,
      emailVerified: userRecord.emailVerified,
      creationTime: userRecord.metadata.creationTime,
      lastSignInTime: userRecord.metadata.lastSignInTime,
    }));

    return {
      success: true,
      users,
      pageToken: listUsersResult.pageToken,
    };
  } catch (error) {
    console.error("Error listing users:", error);
    return { success: false, error: "Failed to get users" };
  }
}
