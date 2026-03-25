"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ClientForm } from "@/components/admin/client-form";
import type { ClientFormData } from "@/lib/validations/client";
import type { Client } from "@/lib/db/schema";

// ─── Types ──────────────────────────────────────────────────────────────────

type ClientOutput = {
  id: string;
  agentType: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
};

// ─── Constants ──────────────────────────────────────────────────────────────

const AGENT_TYPE_LABELS: Record<string, string> = {
  pm: "Project Manager",
  translator: "Translator",
  "email-drafter": "Email Drafter",
  "video-script": "Video Script",
  creative: "Creative",
  designer: "Designer",
  legal: "Legal",
  social: "Social",
  seo: "SEO",
  copywriter: "Copywriter",
  proposal: "Proposal",
  presentation: "Presentation",
  proofreader: "Proofreader",
};

const AGENT_TYPE_COLORS: Record<string, string> = {
  pm: "bg-purple-100 text-purple-700",
  translator: "bg-blue-100 text-blue-700",
  "email-drafter": "bg-amber-100 text-amber-700",
  "video-script": "bg-pink-100 text-pink-700",
  creative: "bg-orange-100 text-orange-700",
  designer: "bg-indigo-100 text-indigo-700",
  legal: "bg-slate-100 text-slate-700",
  social: "bg-cyan-100 text-cyan-700",
  seo: "bg-green-100 text-green-700",
  copywriter: "bg-rose-100 text-rose-700",
  proposal: "bg-teal-100 text-teal-700",
  proofreader: "bg-lime-100 text-lime-700",
};

// ─── Page Component ─────────────────────────────────────────────────────────

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Outputs state
  const [outputs, setOutputs] = useState<ClientOutput[]>([]);
  const [outputsLoading, setOutputsLoading] = useState(true);
  const [agentFilter, setAgentFilter] = useState<string>("");

  // Active tab
  const [activeTab, setActiveTab] = useState<"outputs" | "settings">(
    "outputs"
  );

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

  const fetchOutputs = useCallback(async () => {
    setOutputsLoading(true);
    try {
      const params = new URLSearchParams();
      if (agentFilter) params.set("agentType", agentFilter);
      params.set("limit", "50");

      const res = await fetch(
        `/api/admin/clients/${id}/outputs?${params.toString()}`
      );
      if (res.ok) {
        setOutputs(await res.json());
      }
    } catch {
      // Silently fail — outputs are non-critical
    } finally {
      setOutputsLoading(false);
    }
  }, [id, agentFilter]);

  useEffect(() => {
    fetchClient();
  }, [fetchClient]);

  useEffect(() => {
    fetchOutputs();
  }, [fetchOutputs]);

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
    if (
      !confirm(
        "Are you sure you want to delete this client? This cannot be undone."
      )
    ) {
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
        <p className="text-neutral-400 text-sm">
          {error || "Client not found"}
        </p>
        <Link
          href="/admin/clients"
          className="text-sm text-brand-cerulean hover:underline mt-2 inline-block"
        >
          Back to clients
        </Link>
      </div>
    );
  }

  // Extract unique agent types from outputs for filter
  const availableAgentTypes = Array.from(
    new Set(outputs.map((o) => o.agentType))
  ).sort();

  const defaultValues: Partial<ClientFormData> = {
    name: client.name,
    industry: client.industry as ClientFormData["industry"],
    status: client.status as ClientFormData["status"],
    primaryLanguage:
      client.primaryLanguage as ClientFormData["primaryLanguage"],
    secondaryLanguages:
      (client.secondaryLanguages ?? []) as ClientFormData["secondaryLanguages"],
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
    preferredContractTemplate:
      (client.preferredContractTemplate as ClientFormData["preferredContractTemplate"]) ??
      "",
  };

  return (
    <div className="max-w-4xl space-y-6">
      {/* Header */}
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
          <span className="text-sm text-neutral-500 capitalize">
            {client.industry}
          </span>
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

      {/* Tabs */}
      <div className="flex gap-1 border-b border-neutral-200">
        <button
          onClick={() => setActiveTab("outputs")}
          className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
            activeTab === "outputs"
              ? "border-brand-black text-brand-black"
              : "border-transparent text-neutral-500 hover:text-brand-black"
          }`}
        >
          Activity ({outputs.length})
        </button>
        <button
          onClick={() => setActiveTab("settings")}
          className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
            activeTab === "settings"
              ? "border-brand-black text-brand-black"
              : "border-transparent text-neutral-500 hover:text-brand-black"
          }`}
        >
          Settings
        </button>
      </div>

      {/* Tab content */}
      {activeTab === "outputs" && (
        <ClientOutputsSection
          outputs={outputs}
          loading={outputsLoading}
          agentFilter={agentFilter}
          onAgentFilterChange={setAgentFilter}
          availableAgentTypes={availableAgentTypes}
        />
      )}

      {activeTab === "settings" && (
        <ClientForm
          key={client.id}
          defaultValues={defaultValues}
          onSubmit={handleSubmit}
          submitLabel="Save Changes"
          loading={saving}
        />
      )}
    </div>
  );
}

// ─── Client Outputs Section ─────────────────────────────────────────────────

function ClientOutputsSection({
  outputs,
  loading,
  agentFilter,
  onAgentFilterChange,
  availableAgentTypes,
}: {
  outputs: ClientOutput[];
  loading: boolean;
  agentFilter: string;
  onAgentFilterChange: (filter: string) => void;
  availableAgentTypes: string[];
}) {
  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => onAgentFilterChange("")}
          className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
            !agentFilter
              ? "bg-brand-black text-white"
              : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
          }`}
        >
          All
        </button>
        {availableAgentTypes.map((type) => (
          <button
            key={type}
            onClick={() =>
              onAgentFilterChange(agentFilter === type ? "" : type)
            }
            className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
              agentFilter === type
                ? "bg-brand-black text-white"
                : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
            }`}
          >
            {AGENT_TYPE_LABELS[type] ?? type}
          </button>
        ))}
      </div>

      {/* Outputs list */}
      <div className="bg-white rounded-xl border border-neutral-300">
        {loading ? (
          <div className="py-12 text-center text-neutral-400 text-sm">
            Loading outputs...
          </div>
        ) : outputs.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-neutral-400 text-sm">
              {agentFilter
                ? `No ${AGENT_TYPE_LABELS[agentFilter] ?? agentFilter} outputs yet.`
                : "No outputs yet for this client."}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-neutral-200">
            {outputs.map((output) => (
              <OutputRow key={output.id} output={output} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Output Row ─────────────────────────────────────────────────────────────

function OutputRow({ output }: { output: ClientOutput }) {
  const date = new Date(output.createdAt);
  const colorClass =
    AGENT_TYPE_COLORS[output.agentType] ?? "bg-neutral-100 text-neutral-600";

  return (
    <div className="flex items-center justify-between px-5 py-3.5">
      <div className="flex items-center gap-3">
        <span
          className={`text-xs font-semibold px-2.5 py-1 rounded-full ${colorClass}`}
        >
          {AGENT_TYPE_LABELS[output.agentType] ?? output.agentType}
        </span>
        <span className="text-xs text-neutral-400">
          {date.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
          {" at "}
          {date.toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
        {output.createdBy && (
          <span className="text-xs text-neutral-400">
            by {output.createdBy}
          </span>
        )}
      </div>
      <StatusBadge status={output.status} />
    </div>
  );
}

// ─── Status Badge ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    done: "bg-success-light text-success",
    processing: "bg-info-light text-info",
    pending: "bg-warning-light text-warning",
    error: "bg-error-light text-error",
  };

  return (
    <span
      className={`text-xs font-medium px-2 py-1 rounded-full ${styles[status] ?? "bg-neutral-200 text-neutral-600"}`}
    >
      {status}
    </span>
  );
}
