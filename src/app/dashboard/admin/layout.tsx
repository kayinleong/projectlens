"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Image from "next/image";
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
  UserCheck,
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
    href: "/dashboard/admin/roles",
    label: "Role Management",
    icon: UserCheck,
    description: "Manage roles and permissions",
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

  // Sidebar Component - matches dashboard styling exactly
  const SidebarContent = () => (
    <div className="h-full bg-white border-r border-gray-200 flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-gray-200 flex-shrink-0">
        <div className="flex items-center mb-6">
          <div className="w-8 h-8 mr-3 relative">
            <Image
              src="/ProjectLens.png"
              alt="ProjectLens Logo"
              width={32}
              height={32}
              className="object-contain"
              priority
            />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">ProjectLens</h1>
            <p className="text-sm text-gray-500">Admin Panel</p>
          </div>
        </div>

        <div className="space-y-2">
          <Button
            onClick={handleBackToDashboard}
            className="w-full bg-blue-600 text-white hover:bg-blue-700 font-medium justify-start h-12 px-4"
          >
            <ChevronLeft className="w-5 h-5 mr-3" />
            Back to Dashboard
          </Button>
        </div>
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
                className={`m-2 cursor-pointer transition-all duration-200 hover:shadow-sm border-0 ${
                  isActive
                    ? "bg-blue-50 ring-1 ring-blue-200"
                    : "bg-gray-50 hover:bg-gray-100"
                }`}
                onClick={() => handleNavigation(item.href)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start space-x-3">
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        isActive ? "bg-blue-600" : "bg-gray-400"
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
      <div className="p-4 border-t border-gray-200 space-y-2 flex-shrink-0">
        <Button
          variant="ghost"
          onClick={handleLogout}
          className="w-full justify-start text-gray-700 hover:bg-gray-50 font-medium h-12 px-4"
        >
          <LogOut className="w-5 h-5 mr-3" />
          <span className="text-sm">Logout</span>
        </Button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-50">
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
        <div className="lg:hidden bg-white border-b border-gray-200 p-4 shadow-sm">
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="sm"
              className="text-blue-600 hover:bg-blue-50"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </Button>
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
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
