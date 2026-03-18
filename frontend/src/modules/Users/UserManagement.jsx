import { useState, useEffect } from 'react';
import Icon from '../../components/Icon';
import {
  getUsers, getPendingUsers, approveUser,
  rejectUser, createUser, updateUser,
} from '../../services/api';
import './UserManagement.css';

// ── Helpers ──────────────────────────────────────────────────
const timeAgo = (dateStr) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)    return 'Just now';
  if (mins < 60)   return `${mins}m ago`;
  if (mins < 1440) return `${Math.floor(mins / 60)}h ago`;
  return new Date(dateStr).toLocaleDateString('en-IN');
};

const ROLE_COLORS = {
  ADMIN:   'um-badge--admin',
  OWNER:   'um-badge--owner',
  CASHIER: 'um-badge--cashier',
};

// ══════════════════════════════════════════════════════════
//  CREATE USER MODAL
// ══════════════════════════════════════════════════════════
function CreateUserModal({ onClose, onSave }) {
  const [form,   setForm]   = useState({ name: '', email: '', password: '', role: 'CASHIER', phone: '' });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const set = (f, v) => {
    setForm(p => ({ ...p, [f]: v }));
    setErrors(p => ({ ...p, [f]: '' }));
  };

  const validate = () => {
    const e = {};
    if (!form.name.trim())  e.name  = 'Name is required';
    if (!form.email.trim()) e.email = 'Email is required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Invalid email';
    if (!form.password)     e.password = 'Password is required';
    if (form.password.length < 6) e.password = 'Min 6 characters';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    try { setSaving(true); await onSave(form); }
    finally { setSaving(false); }
  };

  return (
    <div className="um-backdrop" onClick={onClose}>
      <div className="um-modal" onClick={e => e.stopPropagation()}>

        <div className="um-modal__header">
          <h3>Create New User</h3>
          <button className="um-modal__close" onClick={onClose}>
            <Icon name="x" size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="um-modal__body">
          {[
            { label: 'Full Name *',  field: 'name',     type: 'text',     placeholder: 'Rajesh Kumar'     },
            { label: 'Email *',      field: 'email',    type: 'email',    placeholder: 'rajesh@gmail.com' },
            { label: 'Password *',   field: 'password', type: 'password', placeholder: 'Min 6 characters' },
            { label: 'Phone',        field: 'phone',    type: 'tel',      placeholder: '9876543210'       },
          ].map(({ label, field, type, placeholder }) => (
            <div key={field} className="um-field">
              <label className="um-field__label">{label}</label>
              <input type={type} placeholder={placeholder} value={form[field]}
                className={`um-field__input ${errors[field] ? 'um-field__input--error' : ''}`}
                onChange={e => set(field, type === 'tel'
                  ? e.target.value.replace(/\D/g, '').slice(0, 10)
                  : e.target.value)}
              />
              {errors[field] && <span className="um-field__error">{errors[field]}</span>}
            </div>
          ))}

          <div className="um-field">
            <label className="um-field__label">Role *</label>
            <select value={form.role} onChange={e => set('role', e.target.value)} className="um-field__input">
              <option value="CASHIER">Cashier</option>
              <option value="OWNER">Owner</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>

          <div className="um-modal__footer">
            <button type="button" className="um-btn um-btn--secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="um-btn um-btn--primary" disabled={saving}>
              <Icon name="check" size={15} />
              {saving ? 'Creating...' : 'Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
//  PENDING APPROVALS TAB
// ══════════════════════════════════════════════════════════
function PendingApprovals({ onRefresh }) {
  const [pending,  setPending]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [actionId, setActionId] = useState(null);

  useEffect(() => { fetchPending(); }, []);

  const fetchPending = async () => {
    try {
      setLoading(true);
      const res = await getPendingUsers();
      if (res.success) setPending(res.data);
    } catch (err) {
      console.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id, name) => {
    if (!confirm(`Approve ${name}?`)) return;
    try {
      setActionId(id);
      await approveUser(id);
      fetchPending();
      onRefresh();
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setActionId(null);
    }
  };

  const handleReject = async (id, name) => {
    if (!confirm(`Reject ${name}? This cannot be undone.`)) return;
    try {
      setActionId(id);
      await rejectUser(id);
      fetchPending();
      onRefresh();
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setActionId(null);
    }
  };

  if (loading) return (
    <div className="um-center"><div className="app-loading__spinner" /></div>
  );

  return (
    <div>
      <div className="um-section-header">
        <h2 className="um-section-title">Pending Approvals</h2>
        {pending.length > 0 && (
          <span className="um-count-badge">{pending.length}</span>
        )}
      </div>

      {pending.length === 0 ? (
        <div className="um-empty">
          <Icon name="check" size={48} />
          <p>No pending approvals</p>
          <span>All signup requests have been reviewed</span>
        </div>
      ) : (
        <div className="um-pending-list">
          {pending.map(user => (
            <div key={user.user_id} className="um-pending-card">
              <div className="um-pending-card__avatar">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="um-pending-card__info">
                <div className="um-pending-card__name-row">
                  <span className="um-pending-card__name">{user.name}</span>
                  <span className={`um-badge ${ROLE_COLORS[user.role]}`}>{user.role}</span>
                </div>
                <div className="um-pending-card__email">{user.email}</div>
                {user.phone && <div className="um-pending-card__phone">{user.phone}</div>}
                <div className="um-pending-card__time">Requested {timeAgo(user.createdAt)}</div>
              </div>
              <div className="um-pending-card__actions">
                <button
                  className="um-btn um-btn--approve"
                  onClick={() => handleApprove(user.user_id, user.name)}
                  disabled={actionId === user.user_id}
                >
                  <Icon name="check" size={14} />
                  {actionId === user.user_id ? '...' : 'Approve'}
                </button>
                <button
                  className="um-btn um-btn--reject"
                  onClick={() => handleReject(user.user_id, user.name)}
                  disabled={actionId === user.user_id}
                >
                  <Icon name="x" size={14} />
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════
//  ALL USERS TAB
// ══════════════════════════════════════════════════════════
function AllUsers() {
  const [users,      setUsers]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => { fetchUsers(); }, []);

  const fetchUsers = async () => {
    try {
      setLoading(false);
      const res = await getUsers({ limit: 100 });
      if (res.success) setUsers(res.data);
    } catch (err) {
      console.error(err.message);
    }
  };

  const handleCreate = async (form) => {
    await createUser(form);
    setShowCreate(false);
    fetchUsers();
  };

  const handleToggleActive = async (user) => {
    const action = user.isActive ? 'Deactivate' : 'Activate';
    if (!confirm(`${action} ${user.name}?`)) return;
    await updateUser(user.user_id, { isActive: !user.isActive });
    fetchUsers();
  };

  const filtered = users.filter(u => {
    const matchSearch = u.name.toLowerCase().includes(search.toLowerCase()) ||
                        u.email.toLowerCase().includes(search.toLowerCase());
    const matchRole   = roleFilter === 'all' || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  return (
    <div>
      {/* Toolbar */}
      <div className="um-toolbar">
        <div className="um-search">
          <Icon name="search" size={15} />
          <input className="um-search__input" placeholder="Search users..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="um-select" value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
          <option value="all">All Roles</option>
          <option value="ADMIN">Admin</option>
          <option value="OWNER">Owner</option>
          <option value="CASHIER">Cashier</option>
        </select>
        <button className="um-btn um-btn--primary um-btn--ml" onClick={() => setShowCreate(true)}>
          <Icon name="customers" size={15} /> Create User
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="um-center"><div className="app-loading__spinner" /></div>
      ) : (
        <div className="um-table-wrapper">
          <table className="um-table">
            <thead>
              <tr>
                {['User', 'Email', 'Phone', 'Role', 'Status', 'Joined', 'Actions'].map(h => (
                  <th key={h} className="um-th">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan="7" className="um-empty-row">No users found</td>
                </tr>
              ) : filtered.map(user => (
                <tr key={user.user_id} className="um-tr">
                  <td className="um-td">
                    <div className="um-user-cell">
                      <div className="um-avatar" style={{ opacity: user.isActive ? 1 : 0.5 }}>
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="um-user-name">{user.name}</span>
                    </div>
                  </td>
                  <td className="um-td um-td--muted">{user.email}</td>
                  <td className="um-td um-td--muted">{user.phone || '—'}</td>
                  <td className="um-td">
                    <span className={`um-badge ${ROLE_COLORS[user.role]}`}>{user.role}</span>
                  </td>
                  <td className="um-td">
                    <span className={`um-badge ${user.isActive ? 'um-badge--active' : 'um-badge--inactive'}`}>
                      {user.status === 'PENDING' ? 'Pending' : user.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="um-td um-td--muted">
                    {new Date(user.createdAt).toLocaleDateString('en-IN')}
                  </td>
                  <td className="um-td">
                    <button
                      className={`um-icon-btn ${user.isActive ? 'um-icon-btn--danger' : 'um-icon-btn--success'}`}
                      onClick={() => handleToggleActive(user)}
                      title={user.isActive ? 'Deactivate' : 'Activate'}
                    >
                      <Icon name={user.isActive ? 'x' : 'check'} size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showCreate && (
        <CreateUserModal onClose={() => setShowCreate(false)} onSave={handleCreate} />
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════
//  MAIN EXPORT
// ══════════════════════════════════════════════════════════
export default function UserManagement({ user }) {
  const [activeTab,      setActiveTab]      = useState('pending');
  const [pendingCount,   setPendingCount]   = useState(0);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => { fetchPendingCount(); }, [refreshTrigger]);

  const fetchPendingCount = async () => {
    try {
      const res = await getPendingUsers();
      if (res.success) setPendingCount(res.data.length);
    } catch {}
  };

  return (
    <div className="um-page">
      <div className="um-page__header">
        <h1>User Management</h1>
        <p>Manage staff accounts and approve signup requests</p>
      </div>

      {/* Tabs */}
      <div className="um-tabs">
        <button
          className={`um-tab ${activeTab === 'pending' ? 'um-tab--active' : ''}`}
          onClick={() => setActiveTab('pending')}
        >
          Pending Approvals
          {pendingCount > 0 && (
            <span className="um-tab-badge">{pendingCount}</span>
          )}
        </button>
        <button
          className={`um-tab ${activeTab === 'all' ? 'um-tab--active' : ''}`}
          onClick={() => setActiveTab('all')}
        >
          All Users
        </button>
      </div>

      {/* Content */}
      <div className="um-content">
        {activeTab === 'pending' && (
          <PendingApprovals onRefresh={() => setRefreshTrigger(p => p + 1)} />
        )}
        {activeTab === 'all' && <AllUsers />}
      </div>
    </div>
  );
}