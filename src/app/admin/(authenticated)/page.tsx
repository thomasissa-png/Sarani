import { db } from "@/lib/db";
import { clients, agentOutputs } from "@/lib/db/schema";
import { sql, eq, desc } from "drizzle-orm";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const totalClients = await db
    .select({ count: sql<number>`count(*)` })
    .from(clients)
    .then((r) => Number(r[0]?.count ?? 0));

  const activeClients = await db
    .select({ count: sql<number>`count(*)` })
    .from(clients)
    .where(eq(clients.status, "active"))
    .then((r) => Number(r[0]?.count ?? 0));

  const totalOutputs = await db
    .select({ count: sql<number>`count(*)` })
    .from(agentOutputs)
    .then((r) => Number(r[0]?.count ?? 0));

  const recentOutputs = await db
    .select({
      id: agentOutputs.id,
      agentType: agentOutputs.agentType,
      status: agentOutputs.status,
      createdAt: agentOutputs.createdAt,
      clientName: clients.name,
    })
    .from(agentOutputs)
    .leftJoin(clients, eq(agentOutputs.clientId, clients.id))
    .orderBy(desc(agentOutputs.createdAt))
    .limit(5);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-brand-black">Dashboard</h1>
        <p className="text-neutral-500 text-sm mt-1">
          Overview of your clients and agent activity
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Total Clients" value={totalClients} />
        <StatCard label="Active Clients" value={activeClients} />
        <StatCard label="Agent Outputs" value={totalOutputs} />
      </div>

      <div className="bg-white rounded-xl border border-neutral-300 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-brand-black">
            Recent Agent Outputs
          </h2>
          <Link
            href="/admin/clients"
            className="text-sm text-brand-cerulean hover:underline"
          >
            View all clients
          </Link>
        </div>

        {recentOutputs.length === 0 ? (
          <p className="text-neutral-400 text-sm py-8 text-center">
            No agent outputs yet. Create a client and run an agent to get
            started.
          </p>
        ) : (
          <div className="space-y-3">
            {recentOutputs.map((output) => (
              <div
                key={output.id}
                className="flex items-center justify-between py-2 border-b border-neutral-200 last:border-0"
              >
                <div>
                  <span className="text-sm font-medium text-brand-black">
                    {output.clientName ?? "Unknown"}
                  </span>
                  <span className="text-neutral-400 mx-2">&middot;</span>
                  <span className="text-sm text-neutral-500 capitalize">
                    {output.agentType}
                  </span>
                </div>
                <StatusBadge status={output.status} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white rounded-xl border border-neutral-300 p-5">
      <p className="text-sm text-neutral-500">{label}</p>
      <p className="text-3xl font-bold text-brand-black mt-1">{value}</p>
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
