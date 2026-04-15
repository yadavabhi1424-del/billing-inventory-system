import { useState, useEffect, useRef } from 'react';
import Icon from '../../components/Icon';
import { getUsers, createUser, updateUser, deleteUser, inviteUser } from '../../services/api';
import './UserManagement.css';

const ROLE_COLORS = {
  OWNER:   'um-badge--owner',
  ADMIN:   'um-badge--admin',
  MANAGER: 'um-badge--manager',
  CASHIER: 'um-badge--cashier',
};

const ROLES = [
  { value: 'ADMIN',   label: 'Admin',   desc: 'Full access, cannot touch Owner/other Admins' },
  { value: 'MANAGER', label: 'Manager', desc: 'Inventory, reports, suppliers — no billing' },
  { value: 'CASHIER', label: 'Cashier', desc: 'Billing & POS only' },
];

// ══════════════════════════════════════════════════════════
//  CREATE USER MODAL
// ══════════════════════════════════════════════════════════
function CreateUserModal({ onClose, onSave }) {
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'CASHIER', phone: '' });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [roleOpen, setRoleOpen] = useState(false);
  const roleRef = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (roleRef.current && !roleRef.current.contains(e.target)) setRoleOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const set = (f, v) => {
    setForm(p => ({ ...p, [f]: v }));
    setErrors(p => ({ ...p, [f]: '' }));
  };

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Name is required';
    if (!form.email.trim()) e.email = 'Email is required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Invalid email';
    if (!form.password) e.password = 'Password is required';
    if (form.password.length < 6) e.password = 'Min 6 characters';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setError('');
    try {
      setSaving(true);
      await onSave(form);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="um-backdrop" onClick={onClose}>
      <div className="um-modal" onClick={e => e.stopPropagation()}>
        <div className="um-modal__header">
          <h3>Add Team Member</h3>
          <button className="um-modal__close" onClick={onClose}>
            <Icon name="x" size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="um-modal__body">
          {[
            { label: 'Full Name *', field: 'name', type: 'text', placeholder: 'Rajesh Kumar' },
            { label: 'Email *', field: 'email', type: 'email', placeholder: 'rajesh@gmail.com' },
            { label: 'Password *', field: 'password', type: 'password', placeholder: 'Min 6 characters' },
            { label: 'Phone', field: 'phone', type: 'tel', placeholder: '9876543210' },
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

          <div className={`um-field um-dropdown-wrapper ${roleOpen ? 'is-open' : ''}`} ref={roleRef}>
            <label className="um-field__label">Role *</label>
            <div className="um-field__input um-select-trigger" onClick={() => setRoleOpen(o => !o)}>
              <span>{ROLES.find(r => r.value === form.role)?.label || form.role}</span>
              <Icon name="chevron-down" size={14} />
            </div>
            {roleOpen && (
              <div className="um-dropdown-menu">
                <div className="um-dropdown-list">
                  {ROLES.map(r => (
                    <div key={r.value} className="um-dropdown-item" onClick={() => { set('role', r.value); setRoleOpen(false); }}>
                      {r.label} — {r.desc}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {error && <div className="um-field__error" style={{ marginTop: 8 }}>{error}</div>}

          <div className="um-modal__footer">
            <button type="button" className="um-btn um-btn--secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="um-btn um-btn--primary" disabled={saving}>
              <Icon name="check" size={15} />
              {saving ? 'Adding...' : 'Add Member'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
//  INVITE USER MODAL
// ══════════════════════════════════════════════════════════
function InviteUserModal({ onClose }) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('CASHIER');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [roleOpen, setRoleOpen] = useState(false);
  const roleRef = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (roleRef.current && !roleRef.current.contains(e.target)) setRoleOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleInvite = async (e) => {
    e.preventDefault();
    setError('');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return setError('Please enter a valid email.');
    
    try {
      setSaving(true);
      await inviteUser({ email, role });
      setSent(true);
    } catch (err) {
      setError(err.message || 'Failed to send invitation.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="um-backdrop" onClick={onClose}>
      <div className="um-modal" onClick={e => e.stopPropagation()}>
        <div className="um-modal__header">
          <h3>Invite by Email</h3>
          <button className="um-modal__close" onClick={onClose}>
            <Icon name="x" size={18} />
          </button>
        </div>

        <div className="um-modal__body" style={{ minHeight: '350px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          {sent ? (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>Invite sent!</div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                {email} will receive a link to join your shop.
              </div>
              <button className="um-btn um-btn--primary" style={{ marginTop: 20 }} onClick={onClose}>
                Done
              </button>
            </div>
          ) : (
            <form onSubmit={handleInvite} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className="um-field">
                <label className="um-field__label">Email Address *</label>
                <input type="email" className="um-field__input"
                  placeholder="staff@email.com"
                  value={email} onChange={e => setEmail(e.target.value)} />
              </div>
              <div className={`um-field um-dropdown-wrapper ${roleOpen ? 'is-open' : ''}`} ref={roleRef}>
                <label className="um-field__label">Role *</label>
                <div className="um-field__input um-select-trigger" onClick={() => setRoleOpen(o => !o)}>
                  <span>{ROLES.find(r => r.value === role)?.label || role}</span>
                  <Icon name="chevron-down" size={14} />
                </div>
                {roleOpen && (
                  <div className="um-dropdown-menu">
                    <div className="um-dropdown-list">
                      {ROLES.map(r => (
                        <div key={r.value} className="um-dropdown-item" onClick={() => { setRole(r.value); setRoleOpen(false); }}>
                          {r.label} — {r.desc}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              {error && <div className="um-field__error">{error}</div>}
              <div className="um-modal__footer" style={{ marginTop: 'auto', paddingTop: '24px' }}>
                <button type="button" className="um-btn um-btn--secondary" onClick={onClose} disabled={saving}>Cancel</button>
                <button type="submit" className="um-btn um-btn--primary" disabled={saving}>
                  {saving ? 'Sending...' : 'Send Invite'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
//  MAIN EXPORT
// ══════════════════════════════════════════════════════════
export default function UserManagement({ user: currentUser }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [showCreate, setShowCreate] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [roleOpen, setRoleOpen] = useState(false);
  const roleRef = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (roleRef.current && !roleRef.current.contains(e.target)) setRoleOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => { fetchUsers(); }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await getUsers({ limit: 100 });
      if (res.success) setUsers(res.data);
    } catch (err) {
      console.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (form) => {
    await createUser(form);
    setShowCreate(false);
    fetchUsers();
  };

  const handleToggleActive = async (u) => {
    if (!confirm(`${u.isActive ? 'Deactivate' : 'Activate'} ${u.name}?`)) return;
    await updateUser(u.user_id, { isActive: !u.isActive });
    fetchUsers();
  };

  const handleDelete = async (u) => {
    if (!confirm(`Permanently delete ${u.name}? This cannot be undone.`)) return;
    try {
      await deleteUser(u.user_id);
      fetchUsers();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const filtered = users.filter(u => {
    const matchSearch = u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === 'all' || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  return (
    <div className="um-page">
      <div className="um-page__header">
        <h1>Team Members</h1>
        <p>Manage staff accounts and access levels</p>
      </div>

      {/* Toolbar */}
      <div className="um-toolbar">
        <div className="um-search">
          <Icon name="search" size={15} />
          <input className="um-search__input" placeholder="Search members..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className={`um-dropdown-wrapper ${roleOpen ? 'is-open' : ''}`} ref={roleRef} style={{ width: '160px' }}>
          <div className="um-select um-select-trigger" onClick={() => setRoleOpen(o => !o)}>
            <span>{roleFilter === 'all' ? 'All Roles' : ROLES.find(r => r.value === roleFilter)?.label || roleFilter}</span>
            <Icon name="chevron-down" size={14} />
          </div>
          {roleOpen && (
            <div className="um-dropdown-menu">
              <div className="um-dropdown-list">
                <div className="um-dropdown-item" onClick={() => { setRoleFilter('all'); setRoleOpen(false); }}>All Roles</div>
                {ROLES.map(r => (
                  <div key={r.value} className="um-dropdown-item" onClick={() => { setRoleFilter(r.value); setRoleOpen(false); }}>
                    {r.label}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <button className="um-btn um-btn--secondary um-btn--ml"
          onClick={() => setShowInvite(true)}>
          Invite by Email
        </button>
        <button className="um-btn um-btn--primary"
          onClick={() => setShowCreate(true)}>
          <Icon name="customers" size={15} /> Add Member
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
                {['Member', 'Email', 'Phone', 'Role', 'Status', 'Joined', 'Actions'].map(h => (
                  <th key={h} className="um-th">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan="7" className="um-empty-row">No members found</td></tr>
              ) : filtered.map(u => (
                <tr key={u.user_id} className="um-tr">
                  <td className="um-td">
                    <div className="um-user-cell">
                      <div className="um-avatar" style={{ opacity: u.isActive ? 1 : 0.5 }}>
                        {u.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="um-user-name">{u.name}</span>
                    </div>
                  </td>
                  <td className="um-td um-td--muted">{u.email}</td>
                  <td className="um-td um-td--muted">{u.phone || '—'}</td>
                  <td className="um-td">
                    <span className={`um-badge ${ROLE_COLORS[u.role] || ''}`}>{u.role}</span>
                  </td>
                  <td className="um-td">
                    {u.status === 'PENDING' ? (
                      <span className="um-badge" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}>Pending Verify</span>
                    ) : (
                      <span className={`um-badge ${u.isActive ? 'um-badge--active' : 'um-badge--inactive'}`}>
                        {u.isActive ? 'Active' : 'Inactive'}
                      </span>
                    )}
                  </td>
                  <td className="um-td um-td--muted">
                    {new Date(u.createdAt).toLocaleDateString('en-IN')}
                  </td>
                  <td className="um-td">
                  {u.user_id !== currentUser?.user_id && (() => {
                    const targetRole = u.role?.toUpperCase();
                    const currentRole = currentUser?.role?.toUpperCase();
                    // Nobody can act on Owner
                    if (targetRole === 'OWNER') {
                      return <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>—</span>;
                    }
                    // Admin cannot act on other Admins
                    if (currentRole === 'ADMIN' && targetRole === 'ADMIN') {
                      return <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>—</span>;
                    }
                    return (
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          className={`um-icon-btn ${u.isActive ? 'um-icon-btn--danger' : 'um-icon-btn--success'}`}
                          onClick={() => handleToggleActive(u)}
                          title={u.isActive ? 'Deactivate' : 'Activate'}>
                          <Icon name={u.isActive ? 'x' : 'check'} size={13} />
                        </button>
                        <button
                          className="um-icon-btn um-icon-btn--danger"
                          onClick={() => handleDelete(u)}
                          title="Delete permanently">
                          <Icon name="x" size={13} />
                        </button>
                      </div>
                    );
                  })()}
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
      {showInvite && (
        <InviteUserModal onClose={() => setShowInvite(false)} />
      )}
    </div>
  );
}