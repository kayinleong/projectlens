"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
} from "lucide-react";
import { logoutUser } from "@/lib/firebase/client";
import { Chat } from "@/lib/domains/chat.domain";
import { FileDomain } from "@/lib/domains/file.domain";
import {
  createChat,
  getAllChats,
  deleteChat,
  addMessageToChat,
  getMessagesByIds,
} from "@/lib/actions/chat.action";
import { createFile, getAllFiles } from "@/lib/actions/file.action";
import { Message, MessageType } from "@/lib/domains/message.domain";

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
  const router = useRouter();

  // Load data on component mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [chatsResult, filesResult] = await Promise.all([
        getAllChats(),
        getAllFiles(),
      ]);

      if (chatsResult.success && chatsResult.data) {
        setChats(chatsResult.data);
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

  const handleLogout = async () => {
    try {
      await logoutUser();
      router.push("/auth/login");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const handleNewChat = async () => {
    try {
      const result = await createChat({
        file_ids: [],
        message_ids: [],
      });

      if (result.success && result.id) {
        const newChat: Chat = {
          id: result.id,
          file_ids: [],
          message_ids: [],
        };
        setChats((prev) => [newChat, ...prev]);
        setSelectedChatId(result.id);
      }
    } catch (error) {
      console.error("Error creating chat:", error);
    }
    setSidebarOpen(false);
  };

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
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
          path: "", // Will be populated from server
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

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !selectedChatId || sendingMessage) return;

    const userMessage: Message = {
      id: `temp-${Date.now()}`, // Temporary ID for immediate display
      message: messageInput.trim(),
      type: MessageType.USER,
    };

    // Immediately add the user message to the UI
    setMessages((prev) => [...prev, userMessage]);
    const currentMessage = messageInput.trim();
    setMessageInput("");
    setSendingMessage(true);

    try {
      const messageData: Omit<Message, "id"> = {
        message: currentMessage,
        type: MessageType.USER,
      };

      const result = await addMessageToChat(selectedChatId, messageData);

      if (result.success && result.messageId) {
        // Update the temporary message with the real ID
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === userMessage.id ? { ...msg, id: result.messageId! } : msg
          )
        );

        // Update the chat data to reflect the new message count
        setChats((prev) =>
          prev.map((chat) =>
            chat.id === selectedChatId
              ? {
                  ...chat,
                  message_ids: [...chat.message_ids, result.messageId!],
                }
              : chat
          )
        );
      } else {
        // Remove the temporary message if sending failed
        setMessages((prev) => prev.filter((msg) => msg.id !== userMessage.id));
        setMessageInput(currentMessage); // Restore the message input
        console.error("Failed to send message:", result.error);
      }
    } catch (error) {
      // Remove the temporary message if sending failed
      setMessages((prev) => prev.filter((msg) => msg.id !== userMessage.id));
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
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const selectedChat = selectedChatId
    ? chats.find((chat) => chat.id === selectedChatId)
    : null;

  // Helper function to extract filename from path
  const getFilenameFromPath = (path: string): string => {
    if (!path) return "Unknown file";

    // Extract filename from URL path
    const urlParts = path.split("/");
    const filename = urlParts[urlParts.length - 1];

    // Remove timestamp prefix if present (e.g., "1234567890-filename.txt" -> "filename.txt")
    const cleanFilename = filename.replace(/^\d+-/, "");

    return cleanFilename || "Unknown file";
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
          {/* Upload Area */}
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
        </div>
      </div>

      {/* Chat History */}
      <ScrollArea className="flex-1 p-3">
        {loading ? (
          <div className="text-center text-gray-500 py-4">Loading chats...</div>
        ) : (
          <div className="space-y-2">
            {chats.map((chat) => (
              <Card
                key={chat.id}
                className={`cursor-pointer transition-all duration-200 hover:shadow-md border-0 ${
                  selectedChatId === chat.id
                    ? "bg-gradient-to-r from-blue-100 to-purple-100 ring-2 ring-blue-400/50 shadow-lg"
                    : "bg-white/70 hover:bg-white/90"
                }`}
                onClick={() => chat.id && handleChatSelect(chat.id)}
              >
                <CardContent className="p-3">
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center flex-shrink-0">
                      <MessageSquare className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        Chat {chat.id}
                      </p>
                      <p className="text-xs text-gray-600 truncate mt-1">
                        {chat.message_ids.length} messages
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {chat.file_ids.length} files
                      </p>
                    </div>
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

  return (
    <div className="flex h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-indigo-50">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block w-80">
        <SidebarContent />
      </div>

      {/* Mobile Sidebar */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="p-0 w-80">
          <SidebarContent />
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {selectedChat ? (
          <>
            {/* Chat Header */}
            <div className="bg-white/80 backdrop-blur-sm border-b border-blue-200/50 p-4 shadow-sm">
              <div className="flex items-center space-x-3">
                <Button
                  variant="ghost"
                  size="sm"
                  className="lg:hidden text-blue-600"
                  onClick={() => setSidebarOpen(true)}
                >
                  <Menu className="w-5 h-5" />
                </Button>
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
                  <MessageSquare className="w-4 h-4 text-white" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900 truncate">
                  Chat {selectedChat.id}
                </h2>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-6 max-w-4xl mx-auto">
                {loadingMessages ? (
                  <div className="text-center text-gray-500 py-8">
                    Loading messages...
                  </div>
                ) : messages.length === 0 ? (
                  <div className="text-center text-gray-500 py-8">
                    No messages yet. Start the conversation!
                  </div>
                ) : (
                  messages.map((message) => (
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
                          <div className="w-4 h-4 rounded-full bg-white"></div>
                        )}
                      </div>
                      <div
                        className={`flex-1 max-w-[85%] sm:max-w-2xl ${
                          message.type === MessageType.USER ? "text-right" : ""
                        }`}
                      >
                        <div
                          className={`inline-block p-4 rounded-2xl shadow-sm ${
                            message.type === MessageType.USER
                              ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white"
                              : "bg-white/90 backdrop-blur-sm border border-blue-200/50 text-gray-800"
                          }`}
                        >
                          <p className="text-sm leading-relaxed whitespace-pre-wrap">
                            {message.message}
                          </p>
                        </div>
                        <p className="text-xs text-gray-500 mt-2 px-2">
                          {message.type === MessageType.USER
                            ? "You"
                            : "Assistant"}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>

            {/* Message Input */}
            <div className="bg-white/80 backdrop-blur-sm border-t border-blue-200/50 p-4">
              <div className="max-w-4xl mx-auto">
                <div className="flex items-end space-x-3">
                  <div className="flex-1">
                    <Textarea
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Type your message here..."
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
                  <span>Press Enter to send, Shift+Enter for new line</span>
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
                className="lg:hidden mb-4 text-blue-600"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="w-5 h-5 mr-2" />
                Open Menu
              </Button>
              <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                <Sparkles className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
                Welcome to ProjectLens
              </h2>
              <p className="text-gray-600 mb-8 leading-relaxed">
                Start a new conversation or select an existing chat from the
                sidebar to continue where you left off.
              </p>
              <Button
                onClick={handleNewChat}
                size="lg"
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium shadow-lg hover:shadow-xl transition-all duration-200"
                disabled={loading}
              >
                <Plus className="w-5 h-5 mr-2" />
                Start New Chat
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* File Explorer Modal */}
      <FileExplorerModal />
    </div>
  );
}
