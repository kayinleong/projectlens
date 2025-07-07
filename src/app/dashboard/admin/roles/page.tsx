"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { UserCheck, Plus, Edit2, Trash2, Shield, Save, X } from "lucide-react";
import { Role, RolePermission } from "@/lib/domains/role.domain";
import {
  createRole,
  getAllRoles,
  updateRole,
  deleteRole,
} from "@/lib/actions/role.action";

// Available permissions
const AVAILABLE_PERMISSIONS = [
  {
    id: RolePermission.READ,
    label: "Read",
    description: "View content and data",
  },
  {
    id: RolePermission.WRITE,
    label: "Write",
    description: "Create and modify content",
  },
  {
    id: RolePermission.ADMIN,
    label: "Admin",
    description: "Full administrative access",
  },
];

interface RoleFormData {
  name: string;
  permissions: RolePermission[];
}

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [formData, setFormData] = useState<RoleFormData>({
    name: "",
    permissions: [],
  });
  const [submitting, setSubmitting] = useState(false);

  // Load roles on component mount
  useEffect(() => {
    loadRoles();
  }, []);

  const loadRoles = async () => {
    setLoading(true);
    try {
      const result = await getAllRoles();
      if (result.success && result.data) {
        setRoles(result.data);
      }
    } catch (error) {
      console.error("Error loading roles:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRole = async () => {
    if (!formData.name.trim()) return;

    setSubmitting(true);
    try {
      const result = await createRole({
        name: formData.name.trim(),
        permissions: formData.permissions,
      });

      if (result.success && result.id) {
        const newRole: Role = {
          id: result.id,
          name: formData.name.trim(),
          permissions: formData.permissions,
        };
        setRoles((prev) => [...prev, newRole]);
        setCreateDialogOpen(false);
        resetForm();
      }
    } catch (error) {
      console.error("Error creating role:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditRole = async () => {
    if (!selectedRole?.id || !formData.name.trim()) return;

    setSubmitting(true);
    try {
      const result = await updateRole(selectedRole.id, {
        name: formData.name.trim(),
        permissions: formData.permissions,
      });

      if (result.success) {
        setRoles((prev) =>
          prev.map((role) =>
            role.id === selectedRole.id
              ? {
                  ...role,
                  name: formData.name.trim(),
                  permissions: formData.permissions,
                }
              : role
          )
        );
        setEditDialogOpen(false);
        resetForm();
        setSelectedRole(null);
      }
    } catch (error) {
      console.error("Error updating role:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteRole = async (roleId: string) => {
    try {
      const result = await deleteRole(roleId);
      if (result.success) {
        setRoles((prev) => prev.filter((role) => role.id !== roleId));
      }
    } catch (error) {
      console.error("Error deleting role:", error);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      permissions: [],
    });
  };

  const openCreateDialog = () => {
    resetForm();
    setCreateDialogOpen(true);
  };

  const openEditDialog = (role: Role) => {
    setSelectedRole(role);
    setFormData({
      name: role.name,
      permissions: role.permissions,
    });
    setEditDialogOpen(true);
  };

  const handlePermissionChange = (
    permissionId: RolePermission,
    checked: boolean
  ) => {
    setFormData((prev) => ({
      ...prev,
      permissions: checked
        ? [...prev.permissions, permissionId]
        : prev.permissions.filter((p) => p !== permissionId),
    }));
  };

  const RoleDialog = ({
    isEdit = false,
    open,
    onOpenChange,
    onSubmit,
  }: {
    isEdit?: boolean;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: () => void;
  }) => (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <UserCheck className="w-5 h-5" />
            <span>{isEdit ? "Edit Role" : "Create New Role"}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Role Name */}
          <div className="space-y-2">
            <Label htmlFor="roleName">Role Name</Label>
            <Input
              id="roleName"
              value={formData.name}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, name: e.target.value }))
              }
              placeholder="Enter role name"
              disabled={submitting}
              className="border-gray-200 focus:border-blue-400 focus:ring-blue-400"
            />
          </div>

          {/* Permissions */}
          <div className="space-y-3">
            <Label>Permissions</Label>
            <ScrollArea className="h-48 border border-gray-200 rounded-lg p-3 bg-gray-50">
              <div className="space-y-3">
                {AVAILABLE_PERMISSIONS.map((permission) => (
                  <div
                    key={permission.id}
                    className="flex items-start space-x-3"
                  >
                    <Checkbox
                      id={permission.id}
                      checked={formData.permissions.includes(permission.id)}
                      onCheckedChange={(checked) =>
                        handlePermissionChange(
                          permission.id,
                          checked as boolean
                        )
                      }
                      disabled={submitting}
                    />
                    <div className="flex-1 min-w-0">
                      <Label
                        htmlFor={permission.id}
                        className="text-sm font-medium cursor-pointer"
                      >
                        {permission.label}
                      </Label>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {permission.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-2 pt-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
              className="border-gray-300"
            >
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button
              onClick={onSubmit}
              disabled={!formData.name.trim() || submitting}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {submitting ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              {isEdit ? "Update Role" : "Create Role"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
            <UserCheck className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Role Management
            </h1>
            <p className="text-gray-600">Manage roles and permissions</p>
          </div>
        </div>
        <Button
          onClick={openCreateDialog}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Role
        </Button>
      </div>

      {/* Roles List */}
      <Card className="bg-white shadow-sm border border-gray-200">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Shield className="w-5 h-5" />
            <span>System Roles ({roles.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-gray-500">
              Loading roles...
            </div>
          ) : roles.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <UserCheck className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium">No roles created yet</p>
              <p className="text-sm">Create your first role to get started</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Role Name</TableHead>
                    <TableHead>Permissions</TableHead>
                    <TableHead className="w-32">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {roles.map((role) => (
                    <TableRow key={role.id} className="hover:bg-gray-50">
                      <TableCell>
                        <div className="font-medium">{role.name}</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {role.permissions.length === 0 ? (
                            <span className="text-gray-500 text-sm">
                              No permissions
                            </span>
                          ) : (
                            role.permissions.map((permission) => {
                              const permissionData = AVAILABLE_PERMISSIONS.find(
                                (p) => p.id === permission
                              );
                              return (
                                <span
                                  key={permission}
                                  className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800"
                                >
                                  {permissionData?.label || permission}
                                </span>
                              );
                            })
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(role)}
                            className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          >
                            <Edit2 className="w-3 h-3" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Role</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete the role "
                                  {role.name}"? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() =>
                                    role.id && handleDeleteRole(role.id)
                                  }
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Role Dialog */}
      <RoleDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSubmit={handleCreateRole}
      />

      {/* Edit Role Dialog */}
      <RoleDialog
        isEdit
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSubmit={handleEditRole}
      />
    </div>
  );
}
