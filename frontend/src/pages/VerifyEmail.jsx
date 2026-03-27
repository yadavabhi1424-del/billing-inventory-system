import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { verifyMemberEmail } from '../services/api';
import './Auth.css';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  const [status, setStatus] = useState('verifying'); // 'verifying', 'success', 'error'
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Invalid or missing verification link.');
      return;
    }

    verifyMemberEmail({ token })
      .then(res => {
        if (res.success) {
          setStatus('success');
          setMessage(res.message || 'Email verified successfully. You can now log in.');
        } else {
          setStatus('error');
          setMessage(res.message || 'Verification failed.');
        }
      })
      .catch(err => {
        setStatus('error');
        setMessage(err.message || 'Verification failed.');
      });
  }, [token]);

  return (
    <div className="auth-page">
      <div className="auth-form-panel" style={{ margin: 'auto' }}>
        <div className="auth-form-card" style={{ textAlign: 'center' }}>
          <h2 className="auth-form__title" style={{ marginBottom: 16 }}>Email Verification</h2>
          
          {status === 'verifying' && (
            <div>
              <div className="auth-submit__spinner" style={{ borderColor: '#6366f1', borderTopColor: 'transparent', width: 32, height: 32, marginBottom: 16 }}></div>
              <p className="auth-form__subtitle">Verifying your email please wait...</p>
            </div>
          )}

          {status === 'success' && (
            <div>
              <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
              <p className="auth-form__subtitle" style={{ color: '#4ade80', marginBottom: 24 }}>{message}</p>
              <button className="auth-submit" onClick={() => navigate('/login')}>
                Go to Login
              </button>
            </div>
          )}

          {status === 'error' && (
            <div>
              <div style={{ fontSize: 48, marginBottom: 16 }}>❌</div>
              <p className="auth-form__subtitle" style={{ color: '#f87171', marginBottom: 24 }}>{message}</p>
              <button className="auth-submit" onClick={() => navigate('/login')} style={{ background: 'transparent', border: '1px solid #475569' }}>
                Return to Login
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
