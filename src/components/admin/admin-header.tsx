"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function AdminHeader() {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await fetch("/api/admin/auth", { method: "DELETE" });
      router.push("/admin/login");
    } catch {
      setLoggingOut(false);
    }
  }

  return (
    <header className="h-14 border-b border-neutral-300 bg-white flex items-center justify-between px-6 shrink-0">
      <div />
      <button
        onClick={handleLogout}
        disabled={loggingOut}
        className="text-sm text-neutral-500 hover:text-brand-black transition-colors disabled:opacity-50"
      >
        {loggingOut ? "Signing out..." : "Sign out"}
      </button>
    </header>
  );
}
