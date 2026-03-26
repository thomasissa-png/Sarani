"use client";

import { SidebarProvider } from "@/components/admin/sidebar";

export default function AdminRootClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SidebarProvider>{children}</SidebarProvider>;
}
