"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import type { Client } from "@/lib/db/schema";

const STATUS_FILTERS = ["all", "active", "inactive", "prospect"] as const;

export default function ClientsListPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const fetchClients = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (search) params.set("search", search);

      const res = await fetch(`/api/admin/clients?${params}`);
      if (res.ok) {
        const data = await res.json();
        setClients(data);
      }
    } catch (err) {
      console.error("Failed to fetch clients:", err);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    const timer = setTimeout(fetchClients, 300);
    return () => clearTimeout(timer);
  }, [fetchClients]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-brand-black">Clients</h1>
          <p className="text-neutral-500 text-sm mt-1">
            Manage your client records
          </p>
        </div>
        <Link
          href="/admin/clients/new"
          className="px-4 py-2 bg-brand-black text-white text-sm font-semibold rounded-lg hover:bg-neutral-800 transition-colors"
        >
          + New Client
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          placeholder="Search clients..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 px-4 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm text-brand-black placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-cerulean focus:border-transparent"
        />
        <div className="flex gap-1 bg-white border border-neutral-300 rounded-lg p-1">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md capitalize transition-colors ${
                statusFilter === s
                  ? "bg-brand-black text-white"
                  : "text-neutral-500 hover:text-brand-black"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-neutral-300 overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-neutral-400 text-sm">
            Loading...
          </div>
        ) : clients.length === 0 ? (
          <div className="py-12 text-center text-neutral-400 text-sm">
            No clients found.{" "}
            <Link
              href="/admin/clients/new"
              className="text-brand-cerulean hover:underline"
            >
              Create your first client
            </Link>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-neutral-200 text-left">
                <th className="px-5 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-5 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                  Industry
                </th>
                <th className="px-5 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-5 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                  Language
                </th>
                <th className="px-5 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                  Contact
                </th>
              </tr>
            </thead>
            <tbody>
              {clients.map((client) => (
                <tr
                  key={client.id}
                  className="border-b border-neutral-100 hover:bg-neutral-200/50 transition-colors"
                >
                  <td className="px-5 py-3.5">
                    <Link
                      href={`/admin/clients/${client.id}`}
                      className="text-sm font-medium text-brand-black hover:text-brand-cerulean transition-colors"
                    >
                      {client.name}
                    </Link>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-neutral-600 capitalize">
                    {client.industry}
                  </td>
                  <td className="px-5 py-3.5">
                    <StatusBadge status={client.status} />
                  </td>
                  <td className="px-5 py-3.5 text-sm text-neutral-600">
                    {client.primaryLanguage}
                  </td>
                  <td className="px-5 py-3.5 text-sm text-neutral-500">
                    {client.primaryContactEmail || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active: "bg-success-light text-success",
    inactive: "bg-neutral-200 text-neutral-600",
    prospect: "bg-info-light text-info",
  };

  return (
    <span
      className={`text-xs font-medium px-2 py-1 rounded-full ${styles[status] ?? "bg-neutral-200 text-neutral-600"}`}
    >
      {status}
    </span>
  );
}
