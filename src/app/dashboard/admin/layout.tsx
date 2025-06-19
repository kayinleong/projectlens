"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import {
  Shield,
  Users,
  Menu,
  ChevronLeft,
  LogOut,
  FileText,
} from "lucide-react";
import { logoutUser } from "@/lib/firebase/client";

interface AdminNavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

const adminNavItems: AdminNavItem[] = [
  {
    href: "/dashboard/admin",
    label: "User Management",
    icon: Users,
    description: "Manage user accounts and permissions",
  },
  {
    href: "/dashboard/admin/files",
    label: "File Management",
    icon: FileText,
    description: "Upload and manage files",
  },
];

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = async () => {
    try {
      await logoutUser();
      router.push("/auth/login");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const handleBackToDashboard = () => {
    router.push("/dashboard");
  };

  const handleNavigation = (href: string) => {
    router.push(href);
    setSidebarOpen(false);
  };

  const isActiveRoute = (href: string) => {
    if (href === "/dashboard/admin") {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  // Sidebar Component
  const SidebarContent = () => (
    <div className="h-full bg-gradient-to-br from-blue-50 to-purple-50 border-r border-blue-200/50 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-blue-200/50 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-white">Admin Panel</h1>
            <p className="text-blue-100 text-sm">System Management</p>
          </div>
        </div>
        <Button
          onClick={handleBackToDashboard}
          variant="ghost"
          className="w-full text-white hover:bg-white/10 justify-start"
        >
          <ChevronLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 p-3">
        <div className="space-y-2">
          {adminNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = isActiveRoute(item.href);

            return (
              <Card
                key={item.href}
                className={`m-2 cursor-pointer transition-all duration-200 hover:shadow-md border-0 ${
                  isActive
                    ? "bg-gradient-to-r from-blue-100 to-purple-100 ring-2 ring-blue-400/50 shadow-lg"
                    : "bg-white/70 hover:bg-white/90"
                }`}
                onClick={() => handleNavigation(item.href)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start space-x-3">
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        isActive
                          ? "bg-gradient-to-r from-blue-500 to-purple-500"
                          : "bg-gradient-to-r from-gray-400 to-gray-500"
                      }`}
                    >
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-sm font-medium truncate ${
                          isActive ? "text-blue-900" : "text-gray-900"
                        }`}
                      >
                        {item.label}
                      </p>
                      <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                        {item.description}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="p-4 border-t border-blue-200/50 bg-gradient-to-r from-blue-50 to-purple-50">
        <Button
          variant="ghost"
          onClick={handleLogout}
          className="w-full text-purple-700 hover:bg-purple-50 justify-start"
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
        {/* Mobile Header */}
        <div className="lg:hidden bg-white/80 backdrop-blur-sm border-b border-blue-200/50 p-4 shadow-sm">
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="sm"
              className="text-blue-600"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </Button>
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Admin Panel</h2>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto">{children}</div>
      </div>
    </div>
  );
}
