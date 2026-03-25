"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ClientForm } from "@/components/admin/client-form";
import type { ClientFormData } from "@/lib/validations/client";
import type { Client } from "@/lib/db/schema";

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const fetchClient = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/clients/${id}`);
      if (res.ok) {
        setClient(await res.json());
      } else {
        setError("Client not found");
      }
    } catch {
      setError("Failed to load client");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchClient();
  }, [fetchClient]);

  async function handleSubmit(data: ClientFormData) {
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch(`/api/admin/clients/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        setSuccess("Client updated successfully");
        fetchClient();
        setTimeout(() => setSuccess(""), 3000);
      } else {
        const err = await res.json();
        setError(err.error || "Failed to update client");
      }
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Are you sure you want to delete this client? This cannot be undone.")) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/clients/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        router.push("/admin/clients");
      } else {
        setError("Failed to delete client");
      }
    } catch {
      setError("Something went wrong. Try again.");
    }
  }

  if (loading) {
    return (
      <div className="py-12 text-center text-neutral-400 text-sm">
        Loading client...
      </div>
    );
  }

  if (!client) {
    return (
      <div className="py-12 text-center">
        <p className="text-neutral-400 text-sm">{error || "Client not found"}</p>
        <Link
          href="/admin/clients"
          className="text-sm text-brand-cerulean hover:underline mt-2 inline-block"
        >
          Back to clients
        </Link>
      </div>
    );
  }

  const defaultValues: Partial<ClientFormData> = {
    name: client.name,
    industry: client.industry as ClientFormData["industry"],
    status: client.status as ClientFormData["status"],
    primaryLanguage: client.primaryLanguage as ClientFormData["primaryLanguage"],
    secondaryLanguages: ((client.secondaryLanguages ?? []) as ClientFormData["secondaryLanguages"]),
    primaryContactName: client.primaryContactName ?? "",
    primaryContactEmail: client.primaryContactEmail ?? "",
    clickupProjectId: client.clickupProjectId ?? "",
    primaryColor: client.primaryColor ?? "",
    secondaryColors: client.secondaryColors ?? "",
    fontName: client.fontName ?? "",
    brandTone: client.brandTone ?? "",
    brandGuidelinesNotes: client.brandGuidelinesNotes ?? "",
    translationMemory: client.translationMemory ?? "",
    prohibitedTerms: client.prohibitedTerms ?? "",
    legalEntityName: client.legalEntityName ?? "",
    legalCountry: client.legalCountry ?? "",
    vatNumber: client.vatNumber ?? "",
    signedFrameworkAgreement: client.signedFrameworkAgreement ?? false,
    preferredContractTemplate: (client.preferredContractTemplate as ClientFormData["preferredContractTemplate"]) ?? "",
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <Link
            href="/admin/clients"
            className="text-sm text-neutral-500 hover:text-brand-black transition-colors"
          >
            &larr; Back to clients
          </Link>
          <h1 className="text-2xl font-bold text-brand-black mt-2">
            {client.name}
          </h1>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-sm text-neutral-500 capitalize">
              {client.industry}
            </span>
            <span className="text-neutral-300">|</span>
            <Link
              href={`/admin/clients/${id}/outputs`}
              className="text-sm text-brand-cerulean hover:underline"
            >
              View outputs
            </Link>
          </div>
        </div>
        <button
          onClick={handleDelete}
          className="text-sm text-error hover:text-error/80 transition-colors"
        >
          Delete client
        </button>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-error-light text-error text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="p-3 rounded-lg bg-success-light text-success text-sm">
          {success}
        </div>
      )}

      <ClientForm
        key={client.id}
        defaultValues={defaultValues}
        onSubmit={handleSubmit}
        submitLabel="Save Changes"
        loading={saving}
      />
    </div>
  );
}
