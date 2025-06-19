/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Search,
  Edit,
  Trash2,
  Users,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  UserX,
  Mail,
  Clock,
  Plus,
} from "lucide-react";
import {
  getAllUsers,
  updateUserAuth,
  deleteUserWithAuth,
  createUserWithAuth,
} from "@/lib/actions/user.action";
import { getAllRoles } from "@/lib/actions/role.action";
import {
  createUserMetadata,
  getUserMetadataByUserId,
  updateUserMetadata,
  deleteUserMetadata,
} from "@/lib/actions/usermetadata.action";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface User {
  uid: string;
  email: string;
  displayName: string;
  disabled: boolean;
  emailVerified: boolean;
  creationTime: string;
  lastSignInTime: string;
  role?: string; // Role name for display
  roleId?: string; // Role ID for operations
}

interface Role {
  id: string;
  name: string;
  permissions: string[];
}

export default function AdminDashboardPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [creating, setCreating] = useState(false);
  const [roles, setRoles] = useState<Role[]>([]);

  const usersPerPage = 10;

  // Form state for editing
  const [editForm, setEditForm] = useState({
    email: "",
    displayName: "",
    password: "",
    roleId: "",
  });

  // Form state for creating new user
  const [createForm, setCreateForm] = useState({
    email: "",
    displayName: "",
    password: "",
    confirmPassword: "",
    roleId: "",
  });

  useEffect(() => {
    initializeData();
  }, []);

  useEffect(() => {
    const filtered = users.filter(
      (user) =>
        user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.uid.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredUsers(filtered);
    setCurrentPage(1);
  }, [searchTerm, users]);

  const initializeData = async () => {
    setLoading(true);
    try {
      // First fetch roles
      const rolesResult = await getAllRoles();
      let rolesData: Role[] = [];
      if (rolesResult.success && rolesResult.data) {
        rolesData = rolesResult.data as unknown as Role[];
        setRoles(rolesData);
      }

      // Then fetch users with roles
      await fetchUsersWithRoles(rolesData);
    } catch (error) {
      console.error("Failed to initialize data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRoles = async () => {
    try {
      const result = await getAllRoles();
      if (result.success && result.data) {
        const rolesData = result.data as unknown as Role[];
        setRoles(rolesData);
        return rolesData;
      }
      return [];
    } catch (error) {
      console.error("Failed to fetch roles:", error);
      return [];
    }
  };

  const fetchUsersWithRoles = async (rolesData?: Role[]) => {
    try {
      // Use provided roles or fetch fresh ones
      const currentRoles = rolesData || roles;

      const result = await getAllUsers(100);
      if (result.success) {
        const usersWithRoles = await Promise.all(
          (result.users as unknown as User[]).map(async (user) => {
            try {
              const userMetadata = await getUserMetadataByUserId(user.uid);
              if (
                userMetadata.success &&
                userMetadata.data &&
                userMetadata.data.length > 0
              ) {
                const roleId = userMetadata.data[0].role_id;
                const role = currentRoles.find((r) => r.id === roleId);
                return {
                  ...user,
                  roleId,
                  role: role?.name || "Unknown Role",
                };
              }
              return { ...user, role: "No Role", roleId: "" };
            } catch (error) {
              console.error("Error fetching user role:", error);
              return { ...user, role: "No Role", roleId: "" };
            }
          })
        );
        setUsers(usersWithRoles);
        setFilteredUsers(usersWithRoles);
      }
    } catch (error) {
      console.error("Failed to fetch users:", error);
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      // Ensure we have the latest roles before fetching users
      const rolesData = await fetchRoles();
      await fetchUsersWithRoles(rolesData);
    } catch (error) {
      console.error("Failed to fetch users:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setEditForm({
      email: user.email || "",
      displayName: user.displayName || "",
      password: "",
      roleId: user.roleId || "",
    });
    setEditModalOpen(true);
  };

  const handleUpdateUser = async () => {
    if (!selectedUser) return;

    setUpdating(true);
    try {
      const updates: any = {};
      if (editForm.email !== selectedUser.email) updates.email = editForm.email;
      if (editForm.displayName !== selectedUser.displayName)
        updates.displayName = editForm.displayName;
      if (editForm.password) updates.password = editForm.password;

      // Update user auth if there are changes
      if (Object.keys(updates).length > 0) {
        const result = await updateUserAuth(selectedUser.uid, updates);
        if (!result.success) {
          throw new Error(result.error);
        }
      }

      // Update user role if changed
      if (editForm.roleId !== selectedUser.roleId) {
        const existingMetadata = await getUserMetadataByUserId(
          selectedUser.uid
        );

        if (
          existingMetadata.success &&
          existingMetadata.data &&
          existingMetadata.data.length > 0
        ) {
          // Update existing role
          if (editForm.roleId && editForm.roleId !== "no-role") {
            await updateUserMetadata(existingMetadata.data[0].id!, {
              role_id: editForm.roleId,
            });
          } else {
            // Remove role if no role selected
            await deleteUserMetadata(existingMetadata.data[0].id!);
          }
        } else if (editForm.roleId && editForm.roleId !== "no-role") {
          // Create new role assignment
          await createUserMetadata({
            user_id: selectedUser.uid,
            role_id: editForm.roleId,
          });
        }
      }

      await fetchUsers();
      setEditModalOpen(false);
    } catch (error) {
      console.error("Failed to update user:", error);
      alert("Failed to update user");
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;

    setDeleting(true);
    try {
      const result = await deleteUserWithAuth(selectedUser.uid);
      if (result.success) {
        await fetchUsers();
        setDeleteModalOpen(false);
        setSelectedUser(null);
      }
    } catch (error) {
      console.error("Failed to delete user:", error);
    } finally {
      setDeleting(false);
    }
  };

  const handleCreateUser = async () => {
    if (!createForm.email || !createForm.password) {
      alert("Email and password are required");
      return;
    }

    if (createForm.password !== createForm.confirmPassword) {
      alert("Passwords do not match");
      return;
    }

    if (createForm.password.length < 6) {
      alert("Password must be at least 6 characters long");
      return;
    }

    setCreating(true);
    try {
      const result = await createUserWithAuth(
        createForm.email,
        createForm.password
      );
      if (result.success && result.uid) {
        // Update the user with display name if provided
        if (createForm.displayName) {
          await updateUserAuth(result.uid, {
            displayName: createForm.displayName,
          });
        }

        // Assign role if selected
        if (createForm.roleId && createForm.roleId !== "no-role") {
          await createUserMetadata({
            user_id: result.uid,
            role_id: createForm.roleId,
          });
        }

        await fetchUsers();
        setCreateModalOpen(false);
        setCreateForm({
          email: "",
          displayName: "",
          password: "",
          confirmPassword: "",
          roleId: "",
        });
      } else {
        alert(result.error || "Failed to create user");
      }
    } catch (error) {
      console.error("Failed to create user:", error);
      alert("Failed to create user");
    } finally {
      setCreating(false);
    }
  };

  const openDeleteModal = (user: User) => {
    setSelectedUser(user);
    setDeleteModalOpen(true);
  };

  // Pagination
  const totalPages = Math.ceil(filteredUsers.length / usersPerPage);
  const startIndex = (currentPage - 1) * usersPerPage;
  const endIndex = startIndex + usersPerPage;
  const currentUsers = filteredUsers.slice(startIndex, endIndex);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
                User Management
              </h1>
              <p className="text-gray-600">
                Manage user accounts and permissions
              </p>
            </div>
            <Button
              onClick={() => setCreateModalOpen(true)}
              className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create User
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-white/80 backdrop-blur-sm border-blue-200/50">
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    {users.length}
                  </p>
                  <p className="text-sm text-gray-600">Total Users</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border-green-200/50">
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-green-600 rounded-lg flex items-center justify-center">
                  <UserCheck className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    {users.filter((u) => !u.disabled).length}
                  </p>
                  <p className="text-sm text-gray-600">Active Users</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border-amber-200/50">
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gradient-to-r from-amber-500 to-amber-600 rounded-lg flex items-center justify-center">
                  <Mail className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    {users.filter((u) => u.emailVerified).length}
                  </p>
                  <p className="text-sm text-gray-600">Verified Emails</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border-red-200/50">
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gradient-to-r from-red-500 to-red-600 rounded-lg flex items-center justify-center">
                  <UserX className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    {users.filter((u) => u.disabled).length}
                  </p>
                  <p className="text-sm text-gray-600">Disabled Users</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <Card className="mb-6 bg-white/80 backdrop-blur-sm border-blue-200/50">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search users by email, name, or UID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 border-blue-200/50 focus:ring-blue-500"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => setCreateModalOpen(true)}
                  className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create User
                </Button>
                <Button
                  onClick={fetchUsers}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                >
                  Refresh
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card className="bg-white/80 backdrop-blur-sm border-blue-200/50">
          <CardHeader>
            <CardTitle className="text-xl text-gray-900">
              User Management
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">
                          User
                        </th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">
                          Role
                        </th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">
                          Status
                        </th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">
                          Created
                        </th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">
                          Last Sign In
                        </th>
                        <th className="text-right py-3 px-4 font-semibold text-gray-700">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentUsers.map((user) => (
                        <tr
                          key={user.uid}
                          className="border-b border-gray-100 hover:bg-blue-50/50"
                        >
                          <td className="py-4 px-4">
                            <div className="flex items-center space-x-3">
                              <Avatar className="w-10 h-10">
                                <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-500 text-white">
                                  {user.email?.charAt(0).toUpperCase() || "U"}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium text-gray-900">
                                  {user.displayName || "No Name"}
                                </p>
                                <p className="text-sm text-gray-600">
                                  {user.email}
                                </p>
                                <p className="text-xs text-gray-500 font-mono">
                                  {user.uid}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <Badge
                              variant="outline"
                              className="bg-purple-100 text-purple-800 border-purple-300"
                            >
                              {user.role || "No Role"}
                            </Badge>
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex flex-col space-y-1">
                              <Badge
                                variant={
                                  user.disabled ? "destructive" : "default"
                                }
                                className={
                                  user.disabled
                                    ? "bg-red-100 text-red-800"
                                    : "bg-green-100 text-green-800"
                                }
                              >
                                {user.disabled ? "Disabled" : "Active"}
                              </Badge>
                              <Badge
                                variant={
                                  user.emailVerified ? "default" : "secondary"
                                }
                                className={
                                  user.emailVerified
                                    ? "bg-blue-100 text-blue-800"
                                    : "bg-gray-100 text-gray-800"
                                }
                              >
                                {user.emailVerified ? "Verified" : "Unverified"}
                              </Badge>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex items-center space-x-1 text-sm text-gray-600">
                              <Clock className="w-4 h-4" />
                              <span>{formatDate(user.creationTime)}</span>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex items-center space-x-1 text-sm text-gray-600">
                              <Clock className="w-4 h-4" />
                              <span>
                                {user.lastSignInTime
                                  ? formatDate(user.lastSignInTime)
                                  : "Never"}
                              </span>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex justify-end space-x-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEditUser(user)}
                                className="border-blue-300 text-blue-700 hover:bg-blue-50"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openDeleteModal(user)}
                                className="border-red-300 text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
                    <p className="text-sm text-gray-600">
                      Showing {startIndex + 1} to{" "}
                      {Math.min(endIndex, filteredUsers.length)} of{" "}
                      {filteredUsers.length} users
                    </p>
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setCurrentPage(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="border-blue-300 text-blue-700 hover:bg-blue-50"
                      >
                        <ChevronLeft className="w-4 h-4" />
                        Previous
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setCurrentPage(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="border-blue-300 text-blue-700 hover:bg-blue-50"
                      >
                        Next
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Create User Modal */}
        <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Create New User</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="create-email">Email *</Label>
                <Input
                  id="create-email"
                  type="email"
                  value={createForm.email}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, email: e.target.value })
                  }
                  placeholder="user@example.com"
                  className="border-blue-200/50 focus:ring-blue-500"
                />
              </div>
              <div>
                <Label htmlFor="create-displayName">Display Name</Label>
                <Input
                  id="create-displayName"
                  value={createForm.displayName}
                  onChange={(e) =>
                    setCreateForm({
                      ...createForm,
                      displayName: e.target.value,
                    })
                  }
                  placeholder="John Doe"
                  className="border-blue-200/50 focus:ring-blue-500"
                />
              </div>
              <div>
                <Label htmlFor="create-role">Role</Label>
                <Select
                  value={createForm.roleId || "no-role"}
                  onValueChange={(value) =>
                    setCreateForm({
                      ...createForm,
                      roleId: value === "no-role" ? "" : value,
                    })
                  }
                >
                  <SelectTrigger className="border-blue-200/50 focus:ring-blue-500">
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="no-role">No Role</SelectItem>
                    {roles.map((role) => (
                      <SelectItem key={role.id} value={role.id}>
                        {role.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="create-password">Password *</Label>
                <Input
                  id="create-password"
                  type="password"
                  value={createForm.password}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, password: e.target.value })
                  }
                  placeholder="Minimum 6 characters"
                  className="border-blue-200/50 focus:ring-blue-500"
                />
              </div>
              <div>
                <Label htmlFor="create-confirmPassword">
                  Confirm Password *
                </Label>
                <Input
                  id="create-confirmPassword"
                  type="password"
                  value={createForm.confirmPassword}
                  onChange={(e) =>
                    setCreateForm({
                      ...createForm,
                      confirmPassword: e.target.value,
                    })
                  }
                  placeholder="Confirm password"
                  className="border-blue-200/50 focus:ring-blue-500"
                />
              </div>
              <p className="text-xs text-gray-500">
                * Required fields. Password must be at least 6 characters long.
              </p>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setCreateModalOpen(false);
                  setCreateForm({
                    email: "",
                    displayName: "",
                    password: "",
                    confirmPassword: "",
                    roleId: "",
                  });
                }}
                disabled={creating}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateUser}
                disabled={creating}
                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
              >
                {creating ? "Creating..." : "Create User"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit User Modal */}
        <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Edit User</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  value={editForm.email}
                  onChange={(e) =>
                    setEditForm({ ...editForm, email: e.target.value })
                  }
                  className="border-blue-200/50 focus:ring-blue-500"
                />
              </div>
              <div>
                <Label htmlFor="displayName">Display Name</Label>
                <Input
                  id="displayName"
                  value={editForm.displayName}
                  onChange={(e) =>
                    setEditForm({ ...editForm, displayName: e.target.value })
                  }
                  className="border-blue-200/50 focus:ring-blue-500"
                />
              </div>
              <div>
                <Label htmlFor="edit-role">Role</Label>
                <Select
                  value={editForm.roleId || "no-role"}
                  onValueChange={(value) =>
                    setEditForm({
                      ...editForm,
                      roleId: value === "no-role" ? "" : value,
                    })
                  }
                >
                  <SelectTrigger className="border-blue-200/50 focus:ring-blue-500">
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="no-role">No Role</SelectItem>
                    {roles.map((role) => (
                      <SelectItem key={role.id} value={role.id}>
                        {role.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="password">New Password (optional)</Label>
                <Input
                  id="password"
                  type="password"
                  value={editForm.password}
                  onChange={(e) =>
                    setEditForm({ ...editForm, password: e.target.value })
                  }
                  placeholder="Leave blank to keep current password"
                  className="border-blue-200/50 focus:ring-blue-500"
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
                onClick={handleUpdateUser}
                disabled={updating}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                {updating ? "Updating..." : "Update User"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Modal */}
        <AlertDialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete User</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this user account? This action
                cannot be undone.
                <br />
                <br />
                <strong>User:</strong> {selectedUser?.email}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteUser}
                disabled={deleting}
                className="bg-red-600 hover:bg-red-700"
              >
                {deleting ? "Deleting..." : "Delete User"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
