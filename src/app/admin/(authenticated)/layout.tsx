"use client";

import { Sidebar, SidebarProvider } from "@/components/admin/sidebar";
import { AdminHeader } from "@/components/admin/admin-header";

export default function AuthenticatedAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen bg-neutral-200">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <AdminHeader />
          <div className="flex-1 p-6">
            {children}
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
}
