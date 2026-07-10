import React, { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import api from "../../utils/api";
import ConfirmDialog from "../../components/ConfirmDialog";
import { Modal, Spinner, EmptyState, ErrorBanner, RoleBadge } from "../../components/ui";

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  if (currentUser && currentUser.role !== "admin") return <Navigate to="/workspaces" replace />;

  const [users, setUsers]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");
  const [search, setSearch]   = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating]     = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "user" });
  const [editingUser, setEditingUser]   = useState(null);
  const [editForm, setEditForm]         = useState({ name: "", email: "", role: "user", password: "" });
  const [saving, setSaving]             = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  const filteredUsers = search.trim()
    ? users.filter(u => {
        const q = search.toLowerCase();
        return (u.name || "").toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.role.toLowerCase().includes(q);
      })
    : users;

  useEffect(() => { fetchUsers(); }, []);

  async function fetchUsers() {
    try {
      const { data } = await api.get("/admin/users");
      setUsers(data.users);
    } catch { setError("Failed to load users"); }
    finally { setLoading(false); }
  }

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function createUser(e) {
    e.preventDefault();
    setCreating(true);
    try {
      const { data } = await api.post("/admin/users", form);
      setUsers(u => [...u, data.user]);
      setShowCreate(false);
      setForm({ name: "", email: "", password: "", role: "user" });
    } catch (err) { setError(err.response?.data?.error || "Failed to create user"); }
    finally { setCreating(false); }
  }

  async function handleConfirmAction() {
    if (!confirmAction) return;
    setConfirmLoading(true);
    try {
      if (confirmAction.type === "suspend") {
        const { data } = await api.put(`/admin/users/${confirmAction.id}`, { suspended: !confirmAction.suspended });
        setUsers(u => u.map(usr => usr.id === confirmAction.id ? data.user : usr));
      } else if (confirmAction.type === "delete") {
        await api.delete(`/admin/users/${confirmAction.id}`);
        setUsers(u => u.filter(usr => usr.id !== confirmAction.id));
      }
      setConfirmAction(null);
    } catch { setError("Failed to update user"); }
    finally { setConfirmLoading(false); }
  }

  function openEdit(u) {
    setEditingUser(u);
    setEditForm({ name: u.name || "", email: u.email || "", role: u.role, password: "" });
  }

  async function saveEdit(e) {
    e.preventDefault();
    setSaving(true);
    const isSuperAdmin = currentUser.id === 0;
    const isSelf       = editingUser.id === currentUser.id;
    try {
      const payload = { name: editForm.name };
      if (isSuperAdmin || !isSelf) payload.role = editForm.role;
      if (editForm.password) payload.password = editForm.password;
      if ((isSuperAdmin || !isSelf) && editForm.email !== editingUser.email) payload.email = editForm.email;
      const { data } = await api.put(`/admin/users/${editingUser.id}`, payload);
      setUsers(u => u.map(usr => usr.id === editingUser.id ? { ...usr, ...data.user } : usr));
      setEditingUser(null);
    } catch (err) { setError(err.response?.data?.error || "Failed to save"); }
    finally { setSaving(false); }
  }

  return (
    <div>
      {error && <ErrorBanner message={error} onClose={() => setError("")} />}
      <div className="card">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between gap-4">
          <div>
            <h2 className="font-bold text-gray-900">Users</h2>
            <p className="text-gray-500 text-sm mt-0.5">{filteredUsers.length}{search.trim() ? ` of ${users.length}` : ""} total</p>
          </div>
          <div className="flex items-center gap-2 flex-1 max-w-xs">
            <div className="relative flex-1">
              <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 111 11a6 6 0 0116 0z" /></svg>
              <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search users…" className="input pl-8 py-1.5 text-sm w-full" />
            </div>
          </div>
          <button onClick={() => setShowCreate(true)} className="btn-primary px-4 py-2 text-sm whitespace-nowrap">+ Add User</button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Spinner /></div>
        ) : users.length === 0 ? (
          <EmptyState message="No users found." action={() => setShowCreate(true)} actionLabel="Add the first user →" />
        ) : (
          <table className="w-full">
            <thead className="sticky top-0 z-10 bg-white">
              <tr className="border-b border-gray-100">
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">User</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Role</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Joined</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredUsers.map(u => (
                <tr key={u.id} className="group hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-indigo/10 flex items-center justify-center text-xs font-bold text-indigo">
                        {u.name?.[0]?.toUpperCase() || u.email[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{u.name} {u.id === currentUser.id && <span className="text-xs text-gray-400">(you)</span>}</p>
                        <p className="text-xs text-gray-500">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4"><RoleBadge role={u.role} /></td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${u.suspended ? "bg-red-100 text-red-600" : "bg-green-100 text-green-600"}`}>
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${u.suspended ? "bg-red-500" : "bg-green-500"}`} />
                      {u.suspended ? "Suspended" : "Active"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">{new Date(u.createdAt).toLocaleDateString()}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => openEdit(u)} className="text-xs text-indigo hover:text-indigo/80 font-medium transition-colors">Edit</button>
                      {u.id !== currentUser.id && (
                        <>
                          <span className="text-gray-300">|</span>
                          <button onClick={() => setConfirmAction({ type: "suspend", id: u.id, suspended: u.suspended, name: u.name })} className="text-xs text-gray-500 hover:text-gray-700 font-medium transition-colors">
                            {u.suspended ? "Unsuspend" : "Suspend"}
                          </button>
                          <span className="text-gray-300">|</span>
                          <button onClick={() => setConfirmAction({ type: "delete", id: u.id, name: u.name })} className="text-xs text-red-500 hover:text-red-700 font-medium transition-colors">Delete</button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showCreate && (
        <Modal title="Add User" onClose={() => setShowCreate(false)}>
          <form onSubmit={createUser} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
              <input className="input" value={form.name} onChange={e => set("name", e.target.value)} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <input className="input" type="email" value={form.email} onChange={e => set("email", e.target.value)} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
              <input className="input" type="password" value={form.password} onChange={e => set("password", e.target.value)} minLength={8} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
              <select className="input" value={form.role} onChange={e => set("role", e.target.value)}>
                <option value="user">User — chat only in assigned workspaces</option>
                <option value="manager">Manager — manage workspaces &amp; chat history</option>
                {currentUser.id === 0 && <option value="admin">Admin — full access including instance settings</option>}
              </select>
            </div>
            <div className="flex gap-3 pt-1">
              <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary flex-1 py-2">Cancel</button>
              <button type="submit" className="btn-primary flex-1 py-2" disabled={creating}>{creating ? "Creating…" : "Create User"}</button>
            </div>
          </form>
        </Modal>
      )}

      {editingUser && (() => {
        const isSuperAdmin = currentUser.id === 0;
        const isSelf = editingUser.id === currentUser.id;
        const canEditEmailRole = isSuperAdmin || !isSelf;
        return (
          <Modal title={`Edit — ${editingUser.name || editingUser.email}`} onClose={() => setEditingUser(null)}>
            <form onSubmit={saveEdit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                <input className="input" value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                <input className="input" type="email" value={editForm.email}
                  onChange={e => canEditEmailRole && setEditForm(f => ({ ...f, email: e.target.value }))}
                  readOnly={!canEditEmailRole}
                  style={!canEditEmailRole ? { background: "#f8fafc", color: "#94a3b8", cursor: "not-allowed" } : {}}
                  required />
                {!canEditEmailRole && <p className="text-xs text-gray-400 mt-1">You cannot change your own email.</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
                {canEditEmailRole ? (
                  <select className="input" value={editForm.role} onChange={e => setEditForm(f => ({ ...f, role: e.target.value }))}>
                    <option value="user">User — chat only in assigned workspaces</option>
                    <option value="manager">Manager — manage workspaces &amp; chat history</option>
                    <option value="admin">Admin — full access including instance settings</option>
                  </select>
                ) : (
                  <p className="text-xs text-gray-400 italic py-1">You cannot change your own role.</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">New Password</label>
                <input className="input" type="password" value={editForm.password}
                  onChange={e => setEditForm(f => ({ ...f, password: e.target.value }))}
                  placeholder="Leave blank to keep current password"
                  minLength={editForm.password ? 8 : undefined}
                  autoComplete="new-password" />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setEditingUser(null)} className="btn-secondary flex-1 py-2">Cancel</button>
                <button type="submit" className="btn-primary flex-1 py-2" disabled={saving}>{saving ? "Saving…" : "Save Changes"}</button>
              </div>
            </form>
          </Modal>
        );
      })()}

      {confirmAction?.type === "delete" && (
        <ConfirmDialog title="Delete User" message="Permanently delete user" detail={confirmAction.name}
          confirmLabel="Delete" variant="danger" loading={confirmLoading}
          onConfirm={handleConfirmAction} onCancel={() => !confirmLoading && setConfirmAction(null)} />
      )}
      {confirmAction?.type === "suspend" && (
        <ConfirmDialog
          title={confirmAction.suspended ? "Unsuspend User" : "Suspend User"}
          message={confirmAction.suspended ? "Restore access for" : "Suspend access for"}
          detail={confirmAction.name}
          confirmLabel={confirmAction.suspended ? "Unsuspend" : "Suspend"}
          variant="warning" loading={confirmLoading}
          onConfirm={handleConfirmAction} onCancel={() => !confirmLoading && setConfirmAction(null)} />
      )}
    </div>
  );
}
