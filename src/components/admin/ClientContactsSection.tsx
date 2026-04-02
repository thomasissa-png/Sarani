"use client";

import { useEffect, useState, useCallback } from "react";
import type { ClientContact } from "@/lib/db/schema";

// ─── Types ──────────────────────────────────────────────────────────────────

type ContactFormData = {
  name: string;
  email: string;
  division: string;
  role: string;
};

const EMPTY_FORM: ContactFormData = { name: "", email: "", division: "", role: "" };

// ─── Source Badge ───────────────────────────────────────────────────────────

function SourceBadge({ source }: { source: string }) {
  if (source === "manual") {
    return (
      <span className="inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700">
        Manual
      </span>
    );
  }
  return (
    <span className="inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700">
      Auto-detected
    </span>
  );
}

// ─── Contact Row ────────────────────────────────────────────────────────────

function ContactRow({
  contact,
  clientId,
  onUpdated,
}: {
  contact: ClientContact;
  clientId: string;
  onUpdated: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<ContactFormData>({
    name: contact.name,
    email: contact.email ?? "",
    division: contact.division ?? "",
    role: contact.role ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      const res = await fetch(
        `/api/admin/clients/${clientId}/contacts/${contact.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        }
      );
      if (res.ok) {
        setEditing(false);
        onUpdated();
      } else {
        const err = await res.json();
        setError(err.error || "Failed to update");
      }
    } catch {
      setError("Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete contact "${contact.name}"?`)) return;
    try {
      const res = await fetch(
        `/api/admin/clients/${clientId}/contacts/${contact.id}`,
        { method: "DELETE" }
      );
      if (res.ok) {
        onUpdated();
      }
    } catch {
      // silent
    }
  }

  if (editing) {
    return (
      <div className="px-5 py-4 space-y-3 bg-neutral-50">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-neutral-500 mb-1">
              Name
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-2.5 py-1.5 text-sm border border-neutral-300 rounded-md focus:outline-none focus:ring-1 focus:ring-brand-black"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-500 mb-1">
              Email
            </label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full px-2.5 py-1.5 text-sm border border-neutral-300 rounded-md focus:outline-none focus:ring-1 focus:ring-brand-black"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-500 mb-1">
              Division
            </label>
            <input
              type="text"
              value={form.division}
              onChange={(e) => setForm({ ...form, division: e.target.value })}
              placeholder="e.g. Sony France, Sony Pro"
              className="w-full px-2.5 py-1.5 text-sm border border-neutral-300 rounded-md focus:outline-none focus:ring-1 focus:ring-brand-black"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-500 mb-1">
              Role
            </label>
            <input
              type="text"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              placeholder="e.g. Marketing Director"
              className="w-full px-2.5 py-1.5 text-sm border border-neutral-300 rounded-md focus:outline-none focus:ring-1 focus:ring-brand-black"
            />
          </div>
        </div>
        {error && <p className="text-xs text-error">{error}</p>}
        <div className="flex items-center gap-2">
          <button
            onClick={handleSave}
            disabled={saving || !form.name.trim()}
            className="px-3 py-1.5 text-xs font-medium rounded-md bg-brand-black text-white hover:bg-brand-black/90 transition-colors disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save"}
          </button>
          <button
            onClick={() => {
              setEditing(false);
              setForm({
                name: contact.name,
                email: contact.email ?? "",
                division: contact.division ?? "",
                role: contact.role ?? "",
              });
              setError("");
            }}
            className="px-3 py-1.5 text-xs font-medium rounded-md bg-neutral-200 text-neutral-700 hover:bg-neutral-300 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between px-5 py-3.5 group">
      <div className="flex items-center gap-3 min-w-0">
        {/* Avatar circle */}
        <div className="w-8 h-8 rounded-full bg-neutral-200 flex items-center justify-center text-xs font-semibold text-neutral-600 shrink-0">
          {contact.name
            .split(" ")
            .map((w) => w[0])
            .join("")
            .slice(0, 2)
            .toUpperCase()}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-brand-black truncate">
              {contact.name}
            </span>
            <SourceBadge source={contact.source} />
          </div>
          <div className="flex items-center gap-2 text-xs text-neutral-500">
            {contact.email && <span className="truncate">{contact.email}</span>}
            {contact.email && (contact.division || contact.role) && (
              <span>&middot;</span>
            )}
            {contact.role && <span>{contact.role}</span>}
            {contact.role && contact.division && <span>&middot;</span>}
            {contact.division && (
              <span className="text-neutral-400">{contact.division}</span>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => setEditing(true)}
          className="p-1.5 text-neutral-400 hover:text-brand-black transition-colors rounded-md hover:bg-neutral-100"
          title="Edit contact"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
            <path d="m15 5 4 4" />
          </svg>
        </button>
        <button
          onClick={handleDelete}
          className="p-1.5 text-neutral-400 hover:text-error transition-colors rounded-md hover:bg-neutral-100"
          title="Delete contact"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 6h18" />
            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// ─── Add Contact Form ───────────────────────────────────────────────────────

function AddContactForm({
  clientId,
  onAdded,
  onCancel,
}: {
  clientId: string;
  onAdded: () => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<ContactFormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;

    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/clients/${clientId}/contacts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setForm(EMPTY_FORM);
        onAdded();
      } else {
        const err = await res.json();
        setError(err.error || "Failed to add contact");
      }
    } catch {
      setError("Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="px-5 py-4 space-y-3 bg-neutral-50 border-b border-neutral-200">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-neutral-500 mb-1">
            Name <span className="text-error">*</span>
          </label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="John Doe"
            className="w-full px-2.5 py-1.5 text-sm border border-neutral-300 rounded-md focus:outline-none focus:ring-1 focus:ring-brand-black"
            autoFocus
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-neutral-500 mb-1">
            Email
          </label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="john@company.com"
            className="w-full px-2.5 py-1.5 text-sm border border-neutral-300 rounded-md focus:outline-none focus:ring-1 focus:ring-brand-black"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-neutral-500 mb-1">
            Division
          </label>
          <input
            type="text"
            value={form.division}
            onChange={(e) => setForm({ ...form, division: e.target.value })}
            placeholder="e.g. Sony France"
            className="w-full px-2.5 py-1.5 text-sm border border-neutral-300 rounded-md focus:outline-none focus:ring-1 focus:ring-brand-black"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-neutral-500 mb-1">
            Role
          </label>
          <input
            type="text"
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
            placeholder="e.g. Marketing Director"
            className="w-full px-2.5 py-1.5 text-sm border border-neutral-300 rounded-md focus:outline-none focus:ring-1 focus:ring-brand-black"
          />
        </div>
      </div>
      {error && <p className="text-xs text-error">{error}</p>}
      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={saving || !form.name.trim()}
          className="px-3 py-1.5 text-xs font-medium rounded-md bg-brand-black text-white hover:bg-brand-black/90 transition-colors disabled:opacity-50"
        >
          {saving ? "Adding..." : "Add Contact"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1.5 text-xs font-medium rounded-md bg-neutral-200 text-neutral-700 hover:bg-neutral-300 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

// ─── Main Section ───────────────────────────────────────────────────────────

export function ClientContactsSection({ clientId }: { clientId: string }) {
  const [contacts, setContacts] = useState<ClientContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);

  const fetchContacts = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/clients/${clientId}/contacts`);
      if (res.ok) {
        setContacts(await res.json());
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  function handleRefresh() {
    fetchContacts();
    setShowAddForm(false);
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-neutral-500">
          {contacts.length} contact{contacts.length !== 1 ? "s" : ""} found
        </p>
        {!showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-brand-black text-white hover:bg-brand-black/90 transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 5v14" />
              <path d="M5 12h14" />
            </svg>
            Add Contact
          </button>
        )}
      </div>

      {/* Contact list */}
      <div className="bg-white rounded-xl border border-neutral-300">
        {showAddForm && (
          <AddContactForm
            clientId={clientId}
            onAdded={handleRefresh}
            onCancel={() => setShowAddForm(false)}
          />
        )}

        {loading ? (
          <div className="py-12 text-center text-neutral-400 text-sm">
            Loading contacts...
          </div>
        ) : contacts.length === 0 && !showAddForm ? (
          <div className="py-12 text-center">
            <p className="text-neutral-400 text-sm">
              No contacts yet for this client.
            </p>
            <p className="text-neutral-400 text-xs mt-1">
              Contacts are auto-detected from emails or can be added manually.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-neutral-200">
            {contacts.map((contact) => (
              <ContactRow
                key={contact.id}
                contact={contact}
                clientId={clientId}
                onUpdated={fetchContacts}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
