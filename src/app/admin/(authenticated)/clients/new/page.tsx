"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ClientForm } from "@/components/admin/client-form";
import type { ClientFormData } from "@/lib/validations/client";

export default function NewClientPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(data: ClientFormData) {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/admin/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        const { id } = await res.json();
        router.push(`/admin/clients/${id}`);
      } else {
        const err = await res.json();
        setError(err.error || "Failed to create client");
      }
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <Link
          href="/admin/clients"
          className="text-sm text-neutral-500 hover:text-brand-black transition-colors"
        >
          &larr; Back to clients
        </Link>
        <h1 className="text-2xl font-bold text-brand-black mt-2">
          New Client
        </h1>
        <p className="text-neutral-500 text-sm mt-1">
          Fill in the identity section to create a client record. Brand,
          translation, and legal sections are optional.
        </p>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-error-light text-error text-sm">
          {error}
        </div>
      )}

      <ClientForm
        onSubmit={handleSubmit}
        submitLabel="Create Client"
        loading={loading}
      />
    </div>
  );
}
