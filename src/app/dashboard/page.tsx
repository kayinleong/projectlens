/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  MessageSquare,
  Plus,
  Trash2,
  LogOut,
  Sparkles,
  Menu,
  Upload,
  File,
  Send,
  FolderOpen,
  Download,
  Eye,
  X,
  Paperclip,
  Edit2,
  Check,
} from "lucide-react";
import {
  logoutUser,
  clearAuthCookies,
  getCurrentUser,
} from "@/lib/firebase/client";
import { Chat } from "@/lib/domains/chat.domain";
import { FileDomain } from "@/lib/domains/file.domain";
import {
  createChat,
  getAllChats,
  deleteChat,
  addMessageToChatWithAI,
  getMessagesByIds,
  renameChatById,
  getChat,
} from "@/lib/actions/chat.action";
import { createFile, getAllFiles } from "@/lib/actions/file.action";
import { Message, MessageType } from "@/lib/domains/message.domain";
import { addFileToChat } from "@/lib/actions/chat.action";
import { getUserMetadataByUserId } from "@/lib/actions/usermetadata.action";
import { getRole } from "@/lib/actions/role.action";
import { RolePermission } from "@/lib/domains/role.domain";

// Create permission utility functions directly in the file to avoid import issues
const hasPermission = (
  userPermissions: RolePermission[],
  requiredPermission: RolePermission
): boolean => {
  return userPermissions.includes(requiredPermission);
};

const hasWritePermission = (userPermissions: RolePermission[]): boolean => {
  return (
    hasPermission(userPermissions, RolePermission.WRITE) ||
    hasPermission(userPermissions, RolePermission.ADMIN)
  );
};

const hasAdminPermission = (userPermissions: RolePermission[]): boolean => {
  return hasPermission(userPermissions, RolePermission.ADMIN);
};

export default function DashboardPage() {
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [files, setFiles] = useState<FileDomain[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [messageInput, setMessageInput] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [fileExplorerOpen, setFileExplorerOpen] = useState(false);
  const [shortcutModalOpen, setShortcutModalOpen] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<FileDomain[]>([]);
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editingChatName, setEditingChatName] = useState("");
  const [userPermissions, setUserPermissions] = useState<RolePermission[]>([]);
  const [loadingPermissions, setLoadingPermissions] = useState(true);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [authInitialized, setAuthInitialized] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Load data on component mount
  useEffect(() => {
    const initializeData = async () => {
      // Wait for auth to be initialized first
      await initializeAuth();
      await Promise.all([loadData(), loadUserPermissions()]);
    };
    initializeData();
  }, []);

  const initializeAuth = async () => {
    try {
      // Wait a bit for Firebase auth to initialize
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Try to get the current user multiple times if needed
      let currentUser = null;
      let attempts = 0;
      const maxAttempts = 5;

      while (!currentUser && attempts < maxAttempts) {
        currentUser = await getCurrentUser();
        if (!currentUser) {
          await new Promise((resolve) => setTimeout(resolve, 500));
          attempts++;
        }
      }

      if (!currentUser) {
        console.log(
          "No authenticated user found after multiple attempts, redirecting to login"
        );
        router.push("/auth/login");
        return;
      }

      setAuthInitialized(true);
    } catch (error) {
      console.error("Error initializing auth:", error);
      router.push("/auth/login");
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [chatsResult, filesResult] = await Promise.all([
        getAllChats(),
        getAllFiles(),
      ]);

      if (chatsResult.success && chatsResult.data) {
        setChats(chatsResult.data);
      } else if (chatsResult.error === "User not authenticated") {
        router.push("/auth/login");
        return;
      }

      if (filesResult.success && filesResult.data) {
        setFiles(filesResult.data);
      }
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadUserPermissions = async () => {
    setLoadingPermissions(true);
    setPermissionError(null);

    try {
      // Don't proceed if auth is not initialized
      if (!authInitialized) {
        setLoadingPermissions(false);
        return;
      }

      const currentUser = await getCurrentUser();
      if (!currentUser) {
        router.push("/auth/login");
        return;
      }

      // Get user metadata to find their role
      const userMetadataResult = await getUserMetadataByUserId(currentUser.uid);

      if (
        userMetadataResult.success &&
        userMetadataResult.data &&
        userMetadataResult.data.length > 0
      ) {
        // Get the first role (assuming one role per user for now)
        const roleId = userMetadataResult.data[0].role_id;
        console.log("Role ID:", roleId);

        const roleResult = await getRole(roleId);
        console.log("Role result:", roleResult);

        if (roleResult.success && roleResult.data) {
          console.log("User permissions:", roleResult.data.permissions);
          setUserPermissions(roleResult.data.permissions);
        } else {
          console.log("Failed to get role data:", roleResult.error);
          setUserPermissions([]);
          setPermissionError(roleResult.error || "Failed to load role");
        }
      } else {
        console.log("No user metadata found or empty data");
        setUserPermissions([]);
        setPermissionError("No role assigned to user");
      }
    } catch (error) {
      console.error("Error loading user permissions:", error);
      setUserPermissions([]);
      setPermissionError("Failed to load user permissions");
    } finally {
      setLoadingPermissions(false);
    }
  };

  // Re-run permission loading when auth is initialized
  useEffect(() => {
    if (authInitialized) {
      loadUserPermissions();
    }
  }, [authInitialized]);

  const handleLogout = async () => {
    try {
      await logoutUser();
      clearAuthCookies(); // Clear auth cookies
      router.push("/auth/login");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const handleNewChat = async () => {
    try {
      // Get all available file IDs to attach by default
      const allFileIds = files
        .map((file) => file.id)
        .filter(Boolean) as string[];

      const result = await createChat({
        name: "New Chat",
        file_ids: allFileIds, // Attach all available files by default
        message_ids: [],
      });

      if (result.success && result.id) {
        const currentUser = await getCurrentUser();
        if (!currentUser) {
          router.push("/auth/login");
          return;
        }

        const newChat: Chat = {
          id: result.id,
          name: "New Chat",
          file_ids: allFileIds, // Include all file IDs in the local state
          message_ids: [],
          user_id: currentUser.uid,
        };
        setChats((prev) => [newChat, ...prev]);
        setSelectedChatId(result.id);
      } else {
        console.error("Error creating chat:", result.error);
        if (result.error === "User not authenticated") {
          router.push("/auth/login");
        }
      }
    } catch (error) {
      console.error("Error creating chat:", error);
    }
    setSidebarOpen(false);
  };

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    // Check if permissions are still loading
    if (loadingPermissions) {
      console.log("Permissions still loading, please wait");
      return;
    }

    // Check if user has write permission
    if (!hasWritePermission(userPermissions)) {
      console.error("User does not have permission to upload files");
      alert(
        "You don't have permission to upload files. Contact your administrator for write access."
      );
      return;
    }

    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const result = await createFile(formData);
      if (result.success && result.id) {
        const newFile: FileDomain = {
          id: result.id,
          path: "",
          extracted_text: "",
        };
        setFiles((prev) => [...prev, newFile]);
        await loadData(); // Reload to get updated file data
      }
    } catch (error) {
      console.error("Error uploading file:", error);
    } finally {
      setUploading(false);
      // Reset input
      event.target.value = "";
    }
  };

  const handleClearAllChats = async () => {
    try {
      await Promise.all(
        chats.map((chat) => (chat.id ? deleteChat(chat.id) : Promise.resolve()))
      );
      setChats([]);
      setSelectedChatId(null);
    } catch (error) {
      console.error("Error clearing chats:", error);
    }
  };

  const handleChatSelect = (chatId: string) => {
    setSelectedChatId(chatId);
    setSidebarOpen(false);
  };

  const handleDeleteChat = async (chatId: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation(); // Prevent chat selection when clicking delete
    }

    try {
      const result = await deleteChat(chatId);
      if (result.success) {
        // Remove chat from local state
        setChats((prev) => prev.filter((chat) => chat.id !== chatId));

        // If deleted chat was selected, clear selection
        if (selectedChatId === chatId) {
          setSelectedChatId(null);
          setMessages([]);
          setAttachedFiles([]);
        }
      } else {
        console.error("Failed to delete chat:", result.error);
      }
    } catch (error) {
      console.error("Error deleting chat:", error);
    }
  };

  // Add function to handle chat renaming
  const handleStartRenaming = (chat: Chat, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    setEditingChatId(chat.id!);
    setEditingChatName(chat.name || "");
  };

  const handleSaveRename = async (chatId: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }

    try {
      const result = await renameChatById(chatId, editingChatName);
      if (result.success) {
        setChats((prev) =>
          prev.map((chat) =>
            chat.id === chatId
              ? { ...chat, name: editingChatName.trim() || "Untitled Chat" }
              : chat
          )
        );
      }
    } catch (error) {
      console.error("Error renaming chat:", error);
    }

    setEditingChatId(null);
    setEditingChatName("");
  };

  const handleCancelRename = (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    setEditingChatId(null);
    setEditingChatName("");
  };

  // Update handleSendMessage to only refresh for auto-naming (first message)
  const handleSendMessage = async () => {
    if (!messageInput.trim() || !selectedChatId || sendingMessage) return;

    const userMessage: Message = {
      id: `temp-user-${Date.now()}`, // Temporary ID for immediate display
      message: messageInput.trim(),
      type: MessageType.USER,
    };

    const aiMessage: Message = {
      id: `temp-ai-${Date.now()}`, // Temporary ID for AI response
      message:
        attachedFiles.length > 0
          ? "Analyzing files and generating response..."
          : "Thinking...",
      type: MessageType.BOT,
    };

    // Immediately add the user message and placeholder AI message to the UI
    setMessages((prev) => [...prev, userMessage, aiMessage]);
    const currentMessage = messageInput.trim();
    setMessageInput("");
    setSendingMessage(true);

    // Check if this is the first message for auto-naming
    const selectedChat = chats.find((chat) => chat.id === selectedChatId);
    const isFirstMessage = selectedChat?.message_ids.length === 0;

    try {
      const messageData: Omit<Message, "id"> = {
        message: currentMessage,
        type: MessageType.USER,
      };

      const result = await addMessageToChatWithAI(selectedChatId, messageData);

      if (result.success && result.userMessageId && result.aiMessageId) {
        // Update messages with real IDs and get AI response from server
        const updatedChat = chats.find((chat) => chat.id === selectedChatId);
        if (updatedChat) {
          const messagesResult = await getMessagesByIds([result.aiMessageId]);

          if (
            messagesResult.success &&
            messagesResult.data &&
            messagesResult.data.length > 0
          ) {
            const aiResponseMessage = messagesResult.data[0];

            // Update the messages array with real IDs and AI response
            setMessages((prev) =>
              prev.map((msg) => {
                if (msg.id === userMessage.id) {
                  return { ...msg, id: result.userMessageId! };
                }
                if (msg.id === aiMessage.id) {
                  return {
                    id: result.aiMessageId!,
                    message: aiResponseMessage.message,
                    type: MessageType.BOT,
                  };
                }
                return msg;
              })
            );
          }
        }

        // Update the chat data
        setChats((prev) =>
          prev.map((chat) =>
            chat.id === selectedChatId
              ? {
                  ...chat,
                  message_ids: [
                    ...chat.message_ids,
                    result.userMessageId!,
                    result.aiMessageId!,
                  ],
                }
              : chat
          )
        );

        // Only refresh chat data if this was the first message (for auto-naming)
        if (isFirstMessage) {
          // Refresh just the selected chat to get the auto-generated name
          const chatResult = await getChat(selectedChatId);
          if (chatResult.success && chatResult.data) {
            setChats((prev) =>
              prev.map((chat) =>
                chat.id === selectedChatId
                  ? { ...chatResult.data!, message_ids: chat.message_ids }
                  : chat
              )
            );
          }
        }
      } else {
        // Remove both temporary messages if sending failed
        setMessages((prev) =>
          prev.filter(
            (msg) => msg.id !== userMessage.id && msg.id !== aiMessage.id
          )
        );
        setMessageInput(currentMessage); // Restore the message input
        console.error("Failed to send message:", result.error);
      }
    } catch (error) {
      // Remove both temporary messages if sending failed
      setMessages((prev) =>
        prev.filter(
          (msg) => msg.id !== userMessage.id && msg.id !== aiMessage.id
        )
      );
      setMessageInput(currentMessage); // Restore the message input
      console.error("Error sending message:", error);
    } finally {
      setSendingMessage(false);
    }
  };

  const loadMessages = async (chatId: string) => {
    setLoadingMessages(true);
    try {
      // First get the chat to get the message IDs
      const selectedChat = chats.find((chat) => chat.id === chatId);
      if (!selectedChat || selectedChat.message_ids.length === 0) {
        setMessages([]);
        setLoadingMessages(false);
        return;
      }

      // Then get the messages using the message IDs
      const result = await getMessagesByIds(selectedChat.message_ids);
      if (result.success && result.data) {
        setMessages(result.data);
      } else {
        setMessages([]);
      }
    } catch (error) {
      console.error("Error loading messages:", error);
      setMessages([]);
    } finally {
      setLoadingMessages(false);
    }
  };

  // Load messages for selected chat
  useEffect(() => {
    if (selectedChatId) {
      loadMessages(selectedChatId);
    } else {
      setMessages([]);
    }
  }, [selectedChatId]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "/" && !e.shiftKey && messageInput === "") {
      e.preventDefault();
      setShortcutModalOpen(true);
      return;
    }

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Handle adding file to conversation
  const handleAddFileToConversation = async (file: FileDomain) => {
    if (!selectedChatId || !file.id) return;

    try {
      // Add file to chat in Firebase
      const result = await addFileToChat(selectedChatId, file.id);
      if (result.success) {
        // Add to local attached files
        setAttachedFiles((prev) => [...prev, file]);

        // Update chat state
        setChats((prev) =>
          prev.map((chat) =>
            chat.id === selectedChatId
              ? { ...chat, file_ids: [...chat.file_ids, file.id!] }
              : chat
          )
        );

        setShortcutModalOpen(false);
      }
    } catch (error) {
      console.error("Error adding file to conversation:", error);
    }
  };

  // Handle removing attached file
  const handleRemoveAttachedFile = (fileId: string) => {
    setAttachedFiles((prev) => prev.filter((file) => file.id !== fileId));
  };

  // Load attached files when chat is selected
  useEffect(() => {
    if (selectedChatId) {
      const selectedChat = chats.find((chat) => chat.id === selectedChatId);
      if (selectedChat && selectedChat.file_ids.length > 0) {
        // Filter files that are attached to this chat
        const chatFiles = files.filter((file) =>
          selectedChat.file_ids.includes(file.id!)
        );
        setAttachedFiles(chatFiles);
      } else {
        setAttachedFiles([]);
      }
    }
  }, [selectedChatId, chats, files]);

  // Shortcut Modal Component
  const ShortcutModal = () => (
    <Dialog open={shortcutModalOpen} onOpenChange={setShortcutModalOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Paperclip className="w-5 h-5" />
            <span>Quick Actions</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-2">
          <div className="text-sm text-gray-600 mb-4">
            Add files to enhance your conversation with AI
          </div>

          {files.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FolderOpen className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">No files available</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShortcutModalOpen(false);
                  setFileExplorerOpen(true);
                }}
                className="mt-2"
              >
                Upload Files
              </Button>
            </div>
          ) : (
            <div className="max-h-64 overflow-y-auto space-y-1">
              {files.map((file) => {
                const filename = getFilenameFromPath(file.path);
                const isAttached = attachedFiles.some((f) => f.id === file.id);

                return (
                  <div
                    key={file.id}
                    className={`flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors ${
                      isAttached
                        ? "bg-blue-50 border border-blue-200"
                        : "border border-transparent"
                    }`}
                    onClick={() =>
                      !isAttached && handleAddFileToConversation(file)
                    }
                  >
                    <div className="flex items-center space-x-2 flex-1 min-w-0">
                      {getFileTypeIcon(filename)}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {filename}
                        </p>
                        <p className="text-xs text-gray-500">
                          {getFileExtension(filename).toUpperCase() || "FILE"}
                        </p>
                      </div>
                    </div>
                    {isAttached && (
                      <div className="text-xs text-blue-600 font-medium">
                        Added
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );

  // File Explorer Modal Component
  const FileExplorerModal = () => (
    <Dialog open={fileExplorerOpen} onOpenChange={setFileExplorerOpen}>
      <DialogContent className="max-w-[95vw] sm:max-w-[85vw] lg:max-w-4xl max-h-[90vh] sm:max-h-[85vh] lg:max-h-[80vh] p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-2">
            <div className="flex items-center space-x-2">
              <FolderOpen className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="text-sm sm:text-base">File Explorer</span>
            </div>
            <span className="text-xs sm:text-sm font-normal text-gray-500">
              ({files.length} {files.length === 1 ? "file" : "files"})
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col space-y-3 sm:space-y-4">
          {/* Upload Area - show loading state or permission-based content */}
          {loadingPermissions ? (
            <div className="border-2 border-dashed border-gray-200 rounded-lg p-4 sm:p-6 text-center bg-gray-50">
              <div className="space-y-2">
                <Upload className="w-6 h-6 sm:w-8 sm:h-8 mx-auto text-gray-300" />
                <p className="text-xs sm:text-sm text-gray-500">
                  Loading permissions...
                </p>
              </div>
            </div>
          ) : hasWritePermission(userPermissions) ? (
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 sm:p-6 text-center hover:border-blue-400 transition-colors">
              <div className="relative">
                <Input
                  type="file"
                  onChange={handleFileUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  disabled={uploading}
                />
                <div className="space-y-2">
                  <Upload className="w-6 h-6 sm:w-8 sm:h-8 mx-auto text-gray-400" />
                  <p className="text-xs sm:text-sm text-gray-600">
                    {uploading
                      ? "Uploading..."
                      : "Click to upload or drag and drop"}
                  </p>
                  <p className="text-xs text-gray-400 hidden sm:block">
                    Supports all file types
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="border-2 border-dashed border-gray-200 rounded-lg p-4 sm:p-6 text-center bg-gray-50">
              <div className="space-y-2">
                <Upload className="w-6 h-6 sm:w-8 sm:h-8 mx-auto text-gray-300" />
                <p className="text-xs sm:text-sm text-gray-500">
                  You don&apos;t have permission to upload files
                </p>
                <p className="text-xs text-gray-400">
                  Contact your administrator for write access
                </p>
                {permissionError && (
                  <p className="text-xs text-red-500 mt-2">
                    Error: {permissionError}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* File List */}
          <div className="flex-1 overflow-hidden">
            {files.length === 0 ? (
              <div className="text-center py-8 sm:py-12 text-gray-500">
                <FolderOpen className="w-8 h-8 sm:w-12 sm:h-12 mx-auto mb-3 sm:mb-4 text-gray-300" />
                <p className="text-sm sm:text-base">No files uploaded yet</p>
                <p className="text-xs sm:text-sm">
                  Upload your first file to get started
                </p>
              </div>
            ) : (
              <ScrollArea className="h-[300px] sm:h-[350px] lg:h-[400px]">
                {/* Mobile Card View */}
                <div className="block sm:hidden space-y-2 pr-2">
                  {files.map((file) => {
                    const filename = getFilenameFromPath(file.path);
                    return (
                      <div
                        key={file.id}
                        className="bg-gray-50 rounded-lg p-3 space-y-2 max-w-full"
                        style={{ width: "calc(100vw - 4rem)" }}
                      >
                        <div className="flex items-start space-x-2 w-full">
                          <div className="flex-shrink-0 pt-0.5">
                            {getFileTypeIcon(filename)}
                          </div>
                          <div className="flex-1 min-w-0 space-y-2">
                            <div>
                              <p className="font-medium text-sm break-words hyphens-auto">
                                {filename}
                              </p>
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-200 text-gray-700 mt-1">
                                {getFileExtension(filename).toUpperCase() ||
                                  "FILE"}
                              </span>
                            </div>
                            <p className="text-xs text-gray-500 break-all leading-relaxed">
                              {file.path}
                            </p>
                            <div className="flex flex-col space-y-1 w-full">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleFileDownload(file)}
                                className="h-8 w-full text-xs justify-start"
                              >
                                <Download className="w-3 h-3 mr-2 flex-shrink-0" />
                                <span>Download</span>
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => window.open(file.path, "_blank")}
                                className="h-8 w-full text-xs justify-start"
                              >
                                <Eye className="w-3 h-3 mr-2 flex-shrink-0" />
                                <span>View</span>
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Desktop Table View */}
                <div className="hidden sm:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12"></TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead className="w-20 lg:w-24">Type</TableHead>
                        <TableHead className="w-24 lg:w-32">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {files.map((file) => {
                        const filename = getFilenameFromPath(file.path);
                        return (
                          <TableRow key={file.id} className="hover:bg-gray-50">
                            <TableCell>{getFileTypeIcon(filename)}</TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                <p className="font-medium text-sm">
                                  {filename}
                                </p>
                                <p className="text-xs text-gray-500 truncate max-w-xs lg:max-w-sm">
                                  {file.path}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-800">
                                {getFileExtension(filename).toUpperCase() ||
                                  "FILE"}
                              </span>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-1 lg:space-x-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleFileDownload(file)}
                                  className="h-8 w-8 p-0"
                                >
                                  <Download className="w-3 h-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    window.open(file.path, "_blank")
                                  }
                                  className="h-8 w-8 p-0"
                                >
                                  <Eye className="w-3 h-3" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </ScrollArea>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );

  // Sidebar Component
  const SidebarContent = () => (
    <div className="h-full bg-gradient-to-br from-blue-50 to-purple-50 border-r border-blue-200/50 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-blue-200/50 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-white">ProjectLens</h1>
        </div>
        <div className="space-y-2">
          <Button
            onClick={handleNewChat}
            className="w-full bg-white text-blue-600 hover:bg-blue-50 font-medium"
            disabled={loading}
          >
            <Plus className="w-4 h-4 mr-2" />
            New Chat
          </Button>
          <Button
            variant="outline"
            onClick={() => setFileExplorerOpen(true)}
            className="w-full bg-white/90 text-purple-600 border-purple-300 hover:bg-purple-50 font-medium"
          >
            <FolderOpen className="w-4 h-4 mr-2" />
            File Explorer ({files.length})
          </Button>
          {/* Admin Button - only show if user has admin permission and permissions are loaded */}
          {!loadingPermissions && hasAdminPermission(userPermissions) && (
            <Button
              variant="outline"
              onClick={() => router.push("/dashboard/admin")}
              className="w-full bg-white/90 text-orange-600 border-orange-300 hover:bg-orange-50 font-medium"
            >
              <Edit2 className="w-4 h-4 mr-2" />
              Admin Panel
            </Button>
          )}
          {/* Show permission loading state */}
          {loadingPermissions && (
            <div className="w-full text-center py-2 text-white/70 text-xs">
              Loading permissions...
            </div>
          )}
          {/* Show permission error */}
          {!loadingPermissions && permissionError && (
            <div className="w-full text-center py-2 text-red-200 text-xs">
              Permission error: {permissionError}
            </div>
          )}
        </div>
      </div>

      {/* Chat History */}
      <ScrollArea className="flex-1 p-3">
        {loading ? (
          <div className="text-center text-gray-500 py-4">Loading chats...</div>
        ) : (
          <div className="space-y-3">
            {chats.map((chat) => (
              <Card
                key={chat.id}
                className={`m-1 cursor-pointer transition-all duration-200 hover:shadow-md border-0 ${
                  selectedChatId === chat.id
                    ? "bg-gradient-to-r from-blue-100 to-purple-100 ring-2 ring-blue-400/50 shadow-lg"
                    : "bg-white/70 hover:bg-white/90"
                }`}
                onClick={() =>
                  chat.id && !editingChatId && handleChatSelect(chat.id)
                }
              >
                <CardContent className="p-3">
                  <div className="flex items-start justify-between space-x-3">
                    <div className="flex items-start space-x-3 flex-1 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center flex-shrink-0">
                        <MessageSquare className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        {editingChatId === chat.id ? (
                          <div
                            className="space-y-2"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Input
                              value={editingChatName}
                              onChange={(e) =>
                                setEditingChatName(e.target.value)
                              }
                              onKeyPress={(e) => {
                                if (e.key === "Enter") {
                                  handleSaveRename(chat.id!);
                                } else if (e.key === "Escape") {
                                  handleCancelRename();
                                }
                              }}
                              className="text-sm font-medium h-6 px-1"
                              autoFocus
                            />
                            <div className="flex items-center space-x-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => handleSaveRename(chat.id!, e)}
                                className="h-6 w-6 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                              >
                                <Check className="w-3 h-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleCancelRename}
                                className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600 hover:bg-gray-50"
                              >
                                <X className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {chat.name || `Chat ${chat.id}`}
                            </p>
                            <p className="text-xs text-gray-600 truncate mt-1">
                              {chat.message_ids.length} messages
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              {chat.file_ids.length} files
                            </p>
                          </>
                        )}
                      </div>
                    </div>
                    {editingChatId !== chat.id && (
                      <div className="flex items-center space-x-1 flex-shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => handleStartRenaming(chat, e)}
                          className="h-8 w-8 p-0 text-gray-400 hover:text-blue-500 hover:bg-blue-50"
                        >
                          <Edit2 className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) =>
                            chat.id && handleDeleteChat(chat.id, e)
                          }
                          className="h-8 w-8 p-0 text-gray-400 hover:text-red-500 hover:bg-red-50"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
            {chats.length === 0 && !loading && (
              <div className="text-center text-gray-500 py-4">
                No chats yet. Create your first chat!
              </div>
            )}
          </div>
        )}
      </ScrollArea>

      {/* Footer Actions */}
      <div className="p-4 border-t border-blue-200/50 space-y-2 bg-gradient-to-r from-blue-50 to-purple-50">
        <Button
          variant="outline"
          onClick={handleClearAllChats}
          className="w-full border-blue-300 text-blue-700 hover:bg-blue-50"
          disabled={chats.length === 0 || loading}
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Clear All Chats
        </Button>
        <Button
          variant="ghost"
          onClick={handleLogout}
          className="w-full text-purple-700 hover:bg-purple-50"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Logout
        </Button>
      </div>
    </div>
  );

  const selectedChat = selectedChatId
    ? chats.find((chat) => chat.id === selectedChatId)
    : null;

  // Helper function to extract filename from path - enhanced version
  const getFilenameFromPath = (path: string): string => {
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
  };

  // Helper function to get file extension
  const getFileExtension = (filename: string): string => {
    return filename.split(".").pop()?.toLowerCase() || "";
  };

  // Helper function to get file type icon
  const getFileTypeIcon = (filename: string) => {
    const ext = getFileExtension(filename);
    const fileIconClass = "w-4 h-4";

    switch (ext) {
      case "pdf":
        return <File className={`${fileIconClass} text-red-500`} />;
      case "doc":
      case "docx":
        return <File className={`${fileIconClass} text-blue-500`} />;
      case "txt":
        return <File className={`${fileIconClass} text-gray-500`} />;
      case "jpg":
      case "jpeg":
      case "png":
      case "gif":
        return <File className={`${fileIconClass} text-green-500`} />;
      default:
        return <File className={`${fileIconClass} text-gray-400`} />;
    }
  };

  // Helper function to handle file download
  const handleFileDownload = (file: FileDomain) => {
    if (file.path) {
      window.open(file.path, "_blank");
    }
  };

  // Auto-scroll to bottom when new messages are added
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Show loading screen while auth is initializing
  if (!authInitialized) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl">
            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
          </div>
          <h2 className="text-xl font-semibold text-slate-900 mb-2">
            Initializing...
          </h2>
          <p className="text-slate-600">
            Please wait while we load your dashboard
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50">
      {/* Subtle background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-32 w-96 h-96 bg-gradient-to-br from-purple-200/20 to-blue-200/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-32 w-96 h-96 bg-gradient-to-tr from-blue-200/20 to-indigo-200/20 rounded-full blur-3xl"></div>
      </div>

      {/* Desktop Sidebar */}
      <div className="hidden lg:block w-96 relative z-10">
        <SidebarContent />
      </div>

      {/* Mobile Sidebar */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="p-0 w-96">
          <SidebarContent />
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 relative z-10">
        {selectedChat ? (
          <>
            {/* Chat Header */}
            <div className="bg-white/80 backdrop-blur-md shadow-sm border-b border-slate-200/60 p-4">
              <div className="flex items-center space-x-3">
                <Button
                  variant="ghost"
                  size="sm"
                  className="lg:hidden text-blue-600 hover:bg-blue-50"
                  onClick={() => setSidebarOpen(true)}
                >
                  <Menu className="w-5 h-5" />
                </Button>
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center shadow-lg">
                  <MessageSquare className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-900 truncate">
                    {selectedChat.name ?? "New Chat"}
                  </h2>
                  <p className="text-xs text-slate-500">
                    {selectedChat.message_ids.length} messages •{" "}
                    {selectedChat.file_ids.length} files
                  </p>
                </div>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4 overflow-hidden">
              <div className="space-y-6 max-w-4xl mx-auto pb-4 min-h-0">
                {loadingMessages ? (
                  <div className="text-center text-gray-500 py-8">
                    Loading messages...
                  </div>
                ) : messages.length === 0 ? (
                  <div className="text-center text-gray-500 py-8">
                    No messages yet. Start the conversation!
                  </div>
                ) : (
                  <>
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex items-start space-x-3 ${
                          message.type === MessageType.USER
                            ? "flex-row-reverse space-x-reverse"
                            : ""
                        }`}
                      >
                        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center flex-shrink-0">
                          {message.type === MessageType.USER ? (
                            <div className="w-4 h-4 rounded-full bg-white"></div>
                          ) : (
                            <Sparkles className="w-4 h-4 text-white" />
                          )}
                        </div>
                        <div
                          className={`flex-1 max-w-[85%] sm:max-w-2xl min-w-0 ${
                            message.type === MessageType.USER
                              ? "text-right"
                              : ""
                          }`}
                        >
                          <div
                            className={`inline-block p-4 rounded-2xl shadow-sm overflow-hidden ${
                              message.type === MessageType.USER
                                ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white"
                                : "bg-white/90 backdrop-blur-sm border border-blue-200/50 text-gray-800"
                            }`}
                          >
                            <div className="overflow-auto max-h-96">
                              {message.type === MessageType.USER ? (
                                <p className="text-sm leading-relaxed whitespace-pre-wrap break-words word-wrap overflow-wrap-anywhere">
                                  {message.message}
                                </p>
                              ) : (
                                <div className="text-sm leading-relaxed prose prose-sm max-w-none prose-headings:text-gray-800 prose-p:text-gray-800 prose-strong:text-gray-900 prose-code:text-gray-800 prose-code:bg-gray-100 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-pre:bg-gray-100 prose-pre:text-gray-800 prose-blockquote:text-gray-700 prose-blockquote:border-l-blue-500 prose-ul:text-gray-800 prose-ol:text-gray-800 prose-li:text-gray-800">
                                  <ReactMarkdown
                                    remarkPlugins={[remarkGfm]}
                                    components={{
                                      code: ({
                                        inline,
                                        children,
                                        ...props
                                      }: any) => {
                                        return inline ? (
                                          <code
                                            className="bg-gray-100 text-gray-800 px-1 py-0.5 rounded text-xs font-mono"
                                            {...props}
                                          >
                                            {children}
                                          </code>
                                        ) : (
                                          <pre className="bg-gray-100 text-gray-800 p-3 rounded-lg overflow-x-auto">
                                            <code
                                              className="text-xs font-mono"
                                              {...props}
                                            >
                                              {children}
                                            </code>
                                          </pre>
                                        );
                                      },
                                      h1: ({ children }) => (
                                        <h1 className="text-lg font-bold text-gray-900 mb-2">
                                          {children}
                                        </h1>
                                      ),
                                      h2: ({ children }) => (
                                        <h2 className="text-base font-bold text-gray-900 mb-2">
                                          {children}
                                        </h2>
                                      ),
                                      h3: ({ children }) => (
                                        <h3 className="text-sm font-bold text-gray-900 mb-1">
                                          {children}
                                        </h3>
                                      ),
                                      ul: ({ children }) => (
                                        <ul className="list-disc list-inside space-y-1 text-gray-800">
                                          {children}
                                        </ul>
                                      ),
                                      ol: ({ children }) => (
                                        <ol className="list-decimal list-inside space-y-1 text-gray-800">
                                          {children}
                                        </ol>
                                      ),
                                      li: ({ children }) => (
                                        <li className="text-gray-800">
                                          {children}
                                        </li>
                                      ),
                                      blockquote: ({ children }) => (
                                        <blockquote className="border-l-4 border-blue-500 pl-4 italic text-gray-700">
                                          {children}
                                        </blockquote>
                                      ),
                                      strong: ({ children }) => (
                                        <strong className="font-semibold text-gray-900">
                                          {children}
                                        </strong>
                                      ),
                                      em: ({ children }) => (
                                        <em className="italic text-gray-800">
                                          {children}
                                        </em>
                                      ),
                                      a: ({ href, children }) => (
                                        <a
                                          href={href}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-blue-600 hover:text-blue-800 underline"
                                        >
                                          {children}
                                        </a>
                                      ),
                                      table: ({ children }) => (
                                        <div className="overflow-x-auto">
                                          <table className="min-w-full border border-gray-300">
                                            {children}
                                          </table>
                                        </div>
                                      ),
                                      th: ({ children }) => (
                                        <th className="border border-gray-300 px-2 py-1 bg-gray-100 font-semibold text-xs">
                                          {children}
                                        </th>
                                      ),
                                      td: ({ children }) => (
                                        <td className="border border-gray-300 px-2 py-1 text-xs">
                                          {children}
                                        </td>
                                      ),
                                    }}
                                  >
                                    {message.message}
                                  </ReactMarkdown>
                                </div>
                              )}
                            </div>
                          </div>
                          <p className="text-xs text-gray-500 mt-2 px-2">
                            {message.type === MessageType.USER
                              ? "You"
                              : "AI Assistant"}
                          </p>
                        </div>
                      </div>
                    ))}
                    {/* Invisible element to scroll to */}
                    <div ref={messagesEndRef} />
                  </>
                )}
              </div>
            </ScrollArea>

            {/* Message Input */}
            <div className="bg-white/80 backdrop-blur-sm border-t border-blue-200/50 p-4">
              <div className="max-w-4xl mx-auto">
                {/* Attached Files Display - Show individual file chips */}
                {attachedFiles.length > 0 && (
                  <div className="mb-3 flex flex-wrap gap-2">
                    {attachedFiles.map((file) => {
                      const filename = getFilenameFromPath(file.path);
                      return (
                        <div
                          key={file.id}
                          className="flex items-center space-x-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-1.5 text-sm"
                        >
                          {getFileTypeIcon(filename)}
                          <span className="truncate max-w-32">{filename}</span>
                          <button
                            onClick={() => handleRemoveAttachedFile(file.id!)}
                            className="text-blue-600 hover:text-blue-800 flex-shrink-0"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="flex items-end space-x-3">
                  <div className="flex-1">
                    <Textarea
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder={`Type your message here... ${
                        attachedFiles.length === 0
                          ? "(Press '/' for quick actions)"
                          : ""
                      }`}
                      className="min-h-[60px] max-h-32 resize-none border-blue-200 focus:border-blue-400 focus:ring-blue-400"
                      disabled={sendingMessage}
                    />
                  </div>
                  <Button
                    onClick={handleSendMessage}
                    disabled={!messageInput.trim() || sendingMessage}
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-3 h-auto"
                  >
                    {sendingMessage ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </Button>
                </div>
                <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                  <span>
                    Press Enter to send, Shift+Enter for new line
                    {attachedFiles.length === 0 && ", '/' for quick actions"}
                  </span>
                  <span>{messageInput.length}/1000</span>
                </div>
              </div>
            </div>
          </>
        ) : (
          /* Welcome Screen */
          <div className="flex-1 flex items-center justify-center p-4">
            <div className="text-center max-w-md mx-auto">
              <Button
                variant="ghost"
                size="sm"
                className="lg:hidden mb-4 text-blue-600 hover:bg-blue-50"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="w-5 h-5 mr-2" />
                Open Menu
              </Button>
              <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl">
                <Sparkles className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
                Welcome to ProjectLens
              </h2>
              <p className="text-slate-600 mb-8 leading-relaxed">
                Start a new conversation or select an existing chat from the
                sidebar to continue where you left off.
              </p>
              <Button
                onClick={handleNewChat}
                size="lg"
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
                disabled={loading}
              >
                <Plus className="w-4 h-4 mr-2" />
                New Chat
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* File Explorer Modal */}
      <FileExplorerModal />

      {/* Shortcut Modal */}
      <ShortcutModal />
    </div>
  );
}
