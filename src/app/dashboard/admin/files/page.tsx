"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Search,
  Upload,
  Eye,
  Edit,
  Trash2,
  File,
  Image,
  Video,
  FileText,
  Download,
  RefreshCw,
} from "lucide-react";
import {
  createFile,
  getAllFiles,
  updateFile,
  deleteFile,
} from "@/lib/actions/file.action";
import { FileDomain } from "@/lib/domains/file.domain";

interface FileWithMetadata extends FileDomain {
  fileName: string;
  fileSize: number;
  fileType: string;
  uploadedAt: string;
}

export default function FilesPage() {
  const [files, setFiles] = useState<FileWithMetadata[]>([]);
  const [filteredFiles, setFilteredFiles] = useState<FileWithMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFile, setSelectedFile] = useState<FileWithMetadata | null>(
    null
  );

  // Modal states
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  // Loading states
  const [uploading, setUploading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Form states
  const [uploadForm, setUploadForm] = useState({
    file: null as File | null,
    fileName: "",
  });

  const [editForm, setEditForm] = useState({
    path: "",
  });

  useEffect(() => {
    fetchFiles();
  }, []);

  useEffect(() => {
    const filtered = files.filter(
      (file) =>
        file.fileName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        file.path.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredFiles(filtered);
  }, [searchTerm, files]);

  const fetchFiles = async () => {
    setLoading(true);
    try {
      const result = await getAllFiles();
      if (result.success && result.data) {
        // Transform files to include metadata
        const filesWithMetadata = result.data.map((file) => {
          const fileName = extractFileNameFromPath(file.path);
          return {
            ...file,
            fileName,
            fileSize: 0, // This would need to be stored separately or retrieved from storage
            fileType: getFileTypeFromPath(file.path),
            uploadedAt: new Date().toISOString(), // This would come from created_at if available
          } as FileWithMetadata;
        });
        setFiles(filesWithMetadata);
        setFilteredFiles(filesWithMetadata);
      }
    } catch (error) {
      console.error("Failed to fetch files:", error);
    } finally {
      setLoading(false);
    }
  };

  const extractFileNameFromPath = (path: string): string => {
    const parts = path.split("/");
    const fileName = parts[parts.length - 1];
    // Remove timestamp prefix if present
    return fileName.replace(/^\d+-/, "").replace(/_/g, " ");
  };

  const getFileTypeFromPath = (path: string): string => {
    const extension = path.split(".").pop()?.toLowerCase() || "";
    if (["csv"].includes(extension)) {
      return "csv";
    }
    if (["doc", "docx"].includes(extension)) {
      return "word";
    }
    if (["ppt", "pptx"].includes(extension)) {
      return "pptx";
    }
    if (["pdf"].includes(extension)) {
      return "pdf";
    }
    return "other";
  };

  const getFileIcon = (fileType: string) => {
    switch (fileType) {
      case "csv":
        return <FileText className="w-5 h-5" />;
      case "word":
        return <FileText className="w-5 h-5" />;
      case "pptx":
        return <FileText className="w-5 h-5" />;
      case "pdf":
        return <File className="w-5 h-5" />;
      default:
        return <File className="w-5 h-5" />;
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setUploadForm({
        file,
        fileName: file.name,
      });
    }
  };

  const handleUploadFile = async () => {
    if (!uploadForm.file) {
      alert("Please select a file to upload");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", uploadForm.file);

      const result = await createFile(formData);
      if (result.success) {
        await fetchFiles();
        setUploadModalOpen(false);
        setUploadForm({ file: null, fileName: "" });
      } else {
        alert(result.error || "Failed to upload file");
      }
    } catch (error) {
      console.error("Failed to upload file:", error);
      alert("Failed to upload file");
    } finally {
      setUploading(false);
    }
  };

  const handleViewFile = (file: FileWithMetadata) => {
    setSelectedFile(file);
    setViewModalOpen(true);
  };

  const handleEditFile = (file: FileWithMetadata) => {
    setSelectedFile(file);
    setEditForm({
      path: file.path,
    });
    setEditModalOpen(true);
  };

  const handleUpdateFile = async () => {
    if (!selectedFile) return;

    setUpdating(true);
    try {
      const result = await updateFile(selectedFile.id!, {
        path: editForm.path,
      });

      if (result.success) {
        await fetchFiles();
        setEditModalOpen(false);
      } else {
        alert(result.error || "Failed to update file");
      }
    } catch (error) {
      console.error("Failed to update file:", error);
      alert("Failed to update file");
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteFile = async () => {
    if (!selectedFile) return;

    setDeleting(true);
    try {
      const result = await deleteFile(selectedFile.id!);
      if (result.success) {
        await fetchFiles();
        setDeleteModalOpen(false);
        setSelectedFile(null);
      } else {
        alert(result.error || "Failed to delete file");
      }
    } catch (error) {
      console.error("Failed to delete file:", error);
      alert("Failed to delete file");
    } finally {
      setDeleting(false);
    }
  };

  const handleDownloadFile = (file: FileWithMetadata) => {
    window.open(file.path, "_blank");
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "Unknown size";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const isImageFile = (path: string): boolean => {
    const extension = path.split(".").pop()?.toLowerCase() || "";
    return ["jpg", "jpeg", "png", "gif", "webp"].includes(extension);
  };

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
                File Management
              </h1>
              <p className="text-gray-600">
                Upload, manage, and organize your files
              </p>
            </div>
            <Button
              onClick={() => setUploadModalOpen(true)}
              className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
            >
              <Upload className="w-4 h-4 mr-2" />
              Upload File
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-white shadow-sm border border-gray-200">
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-red-600 rounded-lg flex items-center justify-center">
                  <File className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    {files.filter((f) => f.fileType === "pdf").length}
                  </p>
                  <p className="text-sm text-gray-600">PDF Files</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm border border-gray-200">
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-orange-600 rounded-lg flex items-center justify-center">
                  <FileText className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    {files.filter((f) => f.fileType === "pptx").length}
                  </p>
                  <p className="text-sm text-gray-600">PowerPoint Files</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm border border-gray-200">
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center">
                  <FileText className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    {files.filter((f) => f.fileType === "csv").length}
                  </p>
                  <p className="text-sm text-gray-600">CSV Files</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm border border-gray-200">
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
                  <FileText className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    {files.filter((f) => f.fileType === "word").length}
                  </p>
                  <p className="text-sm text-gray-600">Word Documents</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Actions */}
        <Card className="mb-6 bg-white shadow-sm border border-gray-200">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search files by name or path..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 border-gray-200 focus:border-blue-400 focus:ring-blue-400"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => setUploadModalOpen(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Upload File
                </Button>
                <Button
                  onClick={fetchFiles}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Files Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {loading ? (
            Array.from({ length: 8 }).map((_, i) => (
              <Card
                key={i}
                className="bg-white/80 backdrop-blur-sm border-blue-200/50"
              >
                <CardContent className="p-4">
                  <div className="animate-pulse">
                    <div className="w-full h-32 bg-gray-200 rounded mb-4"></div>
                    <div className="h-4 bg-gray-200 rounded mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded"></div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : filteredFiles.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <File className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No files found
              </h3>
              <p className="text-gray-600 mb-4">
                {searchTerm
                  ? "Try adjusting your search terms"
                  : "Upload your first file to get started"}
              </p>
              <Button
                onClick={() => setUploadModalOpen(true)}
                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload File
              </Button>
            </div>
          ) : (
            filteredFiles.map((file) => (
              <Card
                key={file.id}
                className="bg-white/80 backdrop-blur-sm border-blue-200/50 hover:shadow-lg transition-shadow"
              >
                <CardContent className="p-4">
                  {/* File Preview */}
                  <div className="w-full h-32 bg-gray-100 rounded-lg flex items-center justify-center mb-3 overflow-hidden">
                    {isImageFile(file.path) ? (
                      <img
                        src={file.path}
                        alt={file.fileName}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                          e.currentTarget.nextElementSibling?.classList.remove(
                            "hidden"
                          );
                        }}
                      />
                    ) : null}
                    <div
                      className={`flex items-center justify-center text-gray-400 ${
                        isImageFile(file.path) ? "hidden" : ""
                      }`}
                    >
                      {getFileIcon(file.fileType)}
                    </div>
                  </div>

                  {/* File Info */}
                  <div className="space-y-2">
                    <h3
                      className="font-medium text-gray-900 truncate"
                      title={file.fileName}
                    >
                      {file.fileName}
                    </h3>
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline" className="text-xs">
                        {file.fileType.toUpperCase()}
                      </Badge>
                      <span className="text-xs text-gray-500">
                        {formatFileSize(file.fileSize)}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">
                      {formatDate(file.uploadedAt)}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex space-x-1 mt-4">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleViewFile(file)}
                      className="flex-1 border-blue-300 text-blue-700 hover:bg-blue-50"
                    >
                      <Eye className="w-3 h-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDownloadFile(file)}
                      className="flex-1 border-purple-300 text-purple-700 hover:bg-purple-50"
                    >
                      <Download className="w-3 h-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEditFile(file)}
                      className="flex-1 border-amber-300 text-amber-700 hover:bg-amber-50"
                    >
                      <Edit className="w-3 h-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedFile(file);
                        setDeleteModalOpen(true);
                      }}
                      className="flex-1 border-red-300 text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Upload Modal */}
        <Dialog open={uploadModalOpen} onOpenChange={setUploadModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Upload File</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="file-upload">Select File</Label>
                <Input
                  id="file-upload"
                  type="file"
                  onChange={handleFileSelect}
                  className="border-gray-200 focus:border-blue-400 focus:ring-blue-400"
                />
              </div>
              {uploadForm.file && (
                <div className="p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    {getFileIcon(getFileTypeFromPath(uploadForm.file.name))}
                    <div>
                      <p className="font-medium text-gray-900">
                        {uploadForm.file.name}
                      </p>
                      <p className="text-sm text-gray-600">
                        {formatFileSize(uploadForm.file.size)}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setUploadModalOpen(false);
                  setUploadForm({ file: null, fileName: "" });
                }}
                disabled={uploading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleUploadFile}
                disabled={uploading || !uploadForm.file}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {uploading ? "Uploading..." : "Upload File"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* View Modal */}
        <Dialog open={viewModalOpen} onOpenChange={setViewModalOpen}>
          <DialogContent className="sm:max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>View File: {selectedFile?.fileName}</DialogTitle>
            </DialogHeader>
            {selectedFile && (
              <div className="space-y-4">
                {/* File Preview */}
                <div className="w-full bg-gray-100 rounded-lg p-4 flex items-center justify-center">
                  {isImageFile(selectedFile.path) ? (
                    <img
                      src={selectedFile.path}
                      alt={selectedFile.fileName}
                      className="max-w-full max-h-96 object-contain"
                    />
                  ) : (
                    <div className="text-center">
                      <div className="w-16 h-16 mx-auto mb-4 text-gray-400">
                        {getFileIcon(selectedFile.fileType)}
                      </div>
                      <p className="text-gray-600">
                        Preview not available for this file type
                      </p>
                    </div>
                  )}
                </div>

                {/* File Details */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-700">
                      File Name
                    </Label>
                    <p className="text-sm text-gray-900 break-all">
                      {selectedFile.fileName}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700">
                      File Type
                    </Label>
                    <Badge variant="outline">{selectedFile.fileType}</Badge>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700">
                      File Size
                    </Label>
                    <p className="text-sm text-gray-900">
                      {formatFileSize(selectedFile.fileSize)}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700">
                      Uploaded
                    </Label>
                    <p className="text-sm text-gray-900">
                      {formatDate(selectedFile.uploadedAt)}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <Label className="text-sm font-medium text-gray-700">
                      File URL
                    </Label>
                    <p className="text-sm text-gray-900 break-all">
                      {selectedFile.path}
                    </p>
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => selectedFile && handleDownloadFile(selectedFile)}
              >
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
              <Button onClick={() => setViewModalOpen(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Modal */}
        <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Edit File</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-path">File URL</Label>
                <Textarea
                  id="edit-path"
                  value={editForm.path}
                  onChange={(e) =>
                    setEditForm({ ...editForm, path: e.target.value })
                  }
                  className="border-gray-200 focus:border-blue-400 focus:ring-blue-400"
                  placeholder="Full URL to the file"
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setEditModalOpen(false)}
                disabled={updating}
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpdateFile}
                disabled={updating}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {updating ? "Updating..." : "Update File"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Modal */}
        <AlertDialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete File</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this file? This action cannot be
                undone.
                <br />
                <br />
                <strong>File:</strong> {selectedFile?.fileName}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteFile}
                disabled={deleting}
                className="bg-red-600 hover:bg-red-700"
              >
                {deleting ? "Deleting..." : "Delete File"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
