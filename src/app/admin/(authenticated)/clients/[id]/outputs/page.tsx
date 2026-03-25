"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import type { AgentOutput } from "@/lib/db/schema";

export default function ClientOutputsPage() {
  const { id } = useParams<{ id: string }>();
  const [outputs, setOutputs] = useState<AgentOutput[]>([]);
  const [clientName, setClientName] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [outputsRes, clientRes] = await Promise.all([
        fetch(`/api/admin/clients/${id}/outputs`),
        fetch(`/api/admin/clients/${id}`),
      ]);

      if (outputsRes.ok) setOutputs(await outputsRes.json());
      if (clientRes.ok) {
        const client = await clientRes.json();
        setClientName(client.name);
      }
    } catch (err) {
      console.error("Failed to fetch:", err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/admin/clients/${id}`}
          className="text-sm text-neutral-500 hover:text-brand-black transition-colors"
        >
          &larr; Back to {clientName || "client"}
        </Link>
        <h1 className="text-2xl font-bold text-brand-black mt-2">
          Agent Outputs
        </h1>
        <p className="text-neutral-500 text-sm mt-1">
          History of all agent-generated outputs for{" "}
          <span className="font-medium text-brand-black">
            {clientName || "this client"}
          </span>
        </p>
      </div>

      <div className="bg-white rounded-xl border border-neutral-300 overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-neutral-400 text-sm">
            Loading...
          </div>
        ) : outputs.length === 0 ? (
          <div className="py-12 text-center text-neutral-400 text-sm">
            No outputs generated yet for this client.
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-neutral-200 text-left">
                <th className="px-5 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                  Agent
                </th>
                <th className="px-5 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-5 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-5 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                  Preview
                </th>
              </tr>
            </thead>
            <tbody>
              {outputs.map((output) => (
                <tr
                  key={output.id}
                  className="border-b border-neutral-100 hover:bg-neutral-200/50 transition-colors"
                >
                  <td className="px-5 py-3.5 text-sm font-medium text-brand-black capitalize">
                    {output.agentType}
                  </td>
                  <td className="px-5 py-3.5">
                    <StatusBadge status={output.status} />
                  </td>
                  <td className="px-5 py-3.5 text-sm text-neutral-500">
                    {formatDate(output.createdAt)}
                  </td>
                  <td className="px-5 py-3.5 text-sm text-neutral-600 max-w-xs truncate">
                    {output.outputContent
                      ? output.outputContent.slice(0, 100) + "..."
                      : "—"}
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

function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
