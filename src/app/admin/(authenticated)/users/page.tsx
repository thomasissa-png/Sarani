"use client";

import { useEffect, useState, useCallback } from "react";

type AdminUser = {
  id: string;
  name: string;
  email: string;
  role: "admin" | "user";
  createdAt: string;
};

type NewUserForm = {
  name: string;
  email: string;
  password: string;
  role: "admin" | "user";
};

const EMPTY_FORM: NewUserForm = { name: "", email: "", password: "", role: "user" };

export default function UsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [accessDenied, setAccessDenied] = useState(false);

  // Add user form
  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState<NewUserForm>(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [formLoading, setFormLoading] = useState(false);

  // Delete confirmation
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Role editing
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [roleLoading, setRoleLoading] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/users");
      if (res.status === 403) {
        setAccessDenied(true);
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Failed to load users" }));
        setError(data.error || "Failed to load users");
        return;
      }
      const data = await res.json();
      setUsers(data);
    } catch {
      setError("Failed to load users");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  async function handleAddUser(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");

    if (!form.name.trim() || !form.email.trim() || !form.password.trim()) {
      setFormError("All fields are required");
      return;
    }

    if (form.password.length < 8) {
      setFormError("Password must be at least 8 characters");
      return;
    }

    setFormLoading(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Failed to create user" }));
        setFormError(data.error || "Failed to create user");
        return;
      }

      setForm(EMPTY_FORM);
      setShowAddForm(false);
      fetchUsers();
    } catch {
      setFormError("Failed to create user");
    } finally {
      setFormLoading(false);
    }
  }

  async function handleDeleteUser(id: string) {
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Failed to delete user" }));
        setError(data.error || "Failed to delete user");
        return;
      }
      setDeletingId(null);
      fetchUsers();
    } catch {
      setError("Failed to delete user");
    } finally {
      setDeleteLoading(false);
    }
  }

  async function handleChangeRole(id: string, newRole: "admin" | "user") {
    setRoleLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Failed to update role" }));
        setError(data.error || "Failed to update role");
        return;
      }
      setEditingRoleId(null);
      fetchUsers();
    } catch {
      setError("Failed to update role");
    } finally {
      setRoleLoading(false);
    }
  }

  if (accessDenied) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-xl border border-neutral-300 p-12 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-error/10 mb-4">
            <svg className="w-6 h-6 text-error" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-brand-black">Access Denied</h2>
          <p className="text-neutral-500 text-sm mt-1">
            You need admin privileges to manage users.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-brand-black">Users</h1>
          <p className="text-neutral-500 text-sm mt-1">
            Manage admin and user accounts
          </p>
        </div>
        <button
          onClick={() => {
            setShowAddForm(!showAddForm);
            setFormError("");
            if (showAddForm) setForm(EMPTY_FORM);
          }}
          className="px-4 py-2 bg-brand-black text-white text-sm font-semibold rounded-lg hover:bg-neutral-800 transition-colors"
        >
          {showAddForm ? "Cancel" : "+ Add User"}
        </button>
      </div>

      {/* Add user form */}
      {showAddForm && (
        <div className="bg-white rounded-xl border border-neutral-300 p-6">
          <h2 className="text-lg font-semibold text-brand-black mb-4">New User</h2>
          <form onSubmit={handleAddUser} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="new-name" className="block text-sm font-medium text-neutral-700 mb-1">
                  Name
                </label>
                <input
                  id="new-name"
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Full name"
                  required
                  className="w-full px-4 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm text-brand-black placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-cerulean focus:border-transparent"
                />
              </div>
              <div>
                <label htmlFor="new-email" className="block text-sm font-medium text-neutral-700 mb-1">
                  Email
                </label>
                <input
                  id="new-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="email@example.com"
                  required
                  className="w-full px-4 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm text-brand-black placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-cerulean focus:border-transparent"
                />
              </div>
              <div>
                <label htmlFor="new-password" className="block text-sm font-medium text-neutral-700 mb-1">
                  Password
                </label>
                <input
                  id="new-password"
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="Min. 8 characters"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  className="w-full px-4 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm text-brand-black placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-cerulean focus:border-transparent"
                />
              </div>
              <div>
                <label htmlFor="new-role" className="block text-sm font-medium text-neutral-700 mb-1">
                  Role
                </label>
                <select
                  id="new-role"
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value as "admin" | "user" })}
                  className="w-full px-4 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm text-brand-black focus:outline-none focus:ring-2 focus:ring-brand-cerulean focus:border-transparent"
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>

            {formError && (
              <p className="text-sm text-error" role="alert">{formError}</p>
            )}

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={formLoading}
                className="px-6 py-2.5 bg-brand-black text-white text-sm font-semibold rounded-lg hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {formLoading ? "Creating..." : "Create User"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div className="bg-error/10 border border-error/20 rounded-lg px-4 py-3 text-sm text-error flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError("")} className="text-error hover:text-error/80 ml-4" aria-label="Dismiss error">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      )}

      {/* Users table */}
      <div className="bg-white rounded-xl border border-neutral-300 overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-neutral-400 text-sm">
            Loading...
          </div>
        ) : users.length === 0 ? (
          <div className="py-12 text-center text-neutral-400 text-sm">
            No users found. Click &quot;+ Add User&quot; to create the first account.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-neutral-200 text-left">
                  <th className="px-5 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-5 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-5 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-5 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-5 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr
                    key={user.id}
                    className="border-b border-neutral-100 hover:bg-neutral-200/50 transition-colors"
                  >
                    <td className="px-5 py-3.5 text-sm font-medium text-brand-black">
                      {user.name}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-neutral-600">
                      {user.email}
                    </td>
                    <td className="px-5 py-3.5">
                      {editingRoleId === user.id ? (
                        <select
                          value={user.role}
                          onChange={(e) => handleChangeRole(user.id, e.target.value as "admin" | "user")}
                          onBlur={() => setEditingRoleId(null)}
                          disabled={roleLoading}
                          autoFocus
                          className="text-xs px-2 py-1 rounded-lg border border-neutral-300 bg-white focus:outline-none focus:ring-2 focus:ring-brand-cerulean focus:border-transparent"
                        >
                          <option value="user">User</option>
                          <option value="admin">Admin</option>
                        </select>
                      ) : (
                        <button
                          onClick={() => setEditingRoleId(user.id)}
                          className="cursor-pointer"
                          title="Click to change role"
                        >
                          <RoleBadge role={user.role} />
                        </button>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-neutral-500">
                      {formatDate(user.createdAt)}
                    </td>
                    <td className="px-5 py-3.5">
                      {deletingId === user.id ? (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleDeleteUser(user.id)}
                            disabled={deleteLoading}
                            className="text-xs px-3 py-1.5 bg-error text-white rounded-lg hover:bg-error/90 disabled:opacity-50 transition-colors font-medium"
                          >
                            {deleteLoading ? "..." : "Confirm"}
                          </button>
                          <button
                            onClick={() => setDeletingId(null)}
                            disabled={deleteLoading}
                            className="text-xs px-3 py-1.5 bg-neutral-200 text-neutral-600 rounded-lg hover:bg-neutral-300 disabled:opacity-50 transition-colors font-medium"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeletingId(user.id)}
                          className="text-xs text-error hover:text-error/80 font-medium transition-colors"
                        >
                          Delete
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function RoleBadge({ role }: { role: string }) {
  const styles: Record<string, string> = {
    admin: "bg-brand-cerulean/10 text-brand-cerulean-dark",
    user: "bg-neutral-200 text-neutral-600",
  };

  return (
    <span
      className={`text-xs font-medium px-2 py-1 rounded-full ${styles[role] ?? "bg-neutral-200 text-neutral-600"}`}
    >
      {role}
    </span>
  );
}

function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateString;
  }
}
