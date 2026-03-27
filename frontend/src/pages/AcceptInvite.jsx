import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getInviteDetails, acceptInvite } from '../services/api';
import './Auth.css';

export default function AcceptInvite({ onLoginRedirect }) {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [invite, setInvite] = useState(null);

  const [form, setForm] = useState({ name: '', phone: '', password: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('Invalid or missing invitation link.');
      setLoading(false);
      return;
    }
    getInviteDetails(token)
      .then(res => {
        setInvite(res.data);
      })
      .catch(err => {
        setError(err.message || 'Failed to load invitation. It may have expired.');
      })
      .finally(() => setLoading(false));
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.password) return setError('Name and password are required.');
    if (form.password.length < 6) return setError('Password must be at least 6 characters.');
    
    try {
      setSaving(true);
      setError('');
      await acceptInvite({
        token,
        name: form.name,
        phone: form.phone,
        password: form.password
      });
      if (onLoginRedirect) onLoginRedirect();
    } catch (err) {
      setError(err.message || 'Failed to create account.');
      setSaving(false);
    }
  };

  if (loading) return <div className="auth-page"><div className="auth-form-panel" style={{ margin: 'auto' }}><div className="auth-submit__spinner" style={{ borderColor: '#6366f1', borderTopColor: 'transparent', width: 32, height: 32 }}></div></div></div>;

  return (
    <div className="auth-page">
      <div className="auth-form-panel" style={{ margin: 'auto' }}>
        <div className="auth-form-card">
          <div className="auth-form__header" style={{ textAlign: 'center' }}>
            <h2 className="auth-form__title">Accept Invitation</h2>
            <p className="auth-form__subtitle">
              {error ? 'Invalid Link' : `Join as ${invite?.role}`}
            </p>
          </div>

          {error ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>❌</div>
              <p className="auth-form__subtitle" style={{ color: '#f87171', marginBottom: 24 }}>{error}</p>
              <button className="auth-submit" onClick={() => window.location.href = '/login'} style={{ background: 'transparent', border: '1px solid #475569' }}>
                Return to Login
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="auth-field">
                <label className="auth-field__label">Email</label>
                <div className="auth-field__input-wrap">
                  <input type="email" className="auth-field__input" value={invite.email} disabled style={{ opacity: 0.7, cursor: 'not-allowed' }} />
                </div>
              </div>

              <div className="auth-field">
                <label className="auth-field__label">Full Name *</label>
                <div className="auth-field__input-wrap">
                  <input type="text" className="auth-field__input" placeholder="Rajesh Kumar"
                    value={form.name} onChange={e => setForm({...form, name: e.target.value})} required autoFocus />
                </div>
              </div>

              <div className="auth-field">
                <label className="auth-field__label">Phone Number</label>
                <div className="auth-field__input-wrap">
                  <input type="tel" className="auth-field__input" placeholder="9876543210"
                    value={form.phone} onChange={e => setForm({...form, phone: e.target.value.replace(/\\D/g, '').slice(0, 10)})} />
                </div>
              </div>

              <div className="auth-field" style={{ marginBottom: 24 }}>
                <label className="auth-field__label">Password *</label>
                <div className="auth-field__input-wrap">
                  <input type="password" className="auth-field__input" placeholder="Min 6 characters"
                    value={form.password} onChange={e => setForm({...form, password: e.target.value})} required />
                </div>
              </div>

              <button type="submit" className="auth-submit" disabled={saving}>
                {saving ? (
                  <><span className="auth-submit__spinner" /> Joining...</>
                ) : 'Create Account'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
