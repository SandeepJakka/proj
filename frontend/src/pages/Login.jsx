import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';
import { loginUser } from '../services/api';
import { Eye, EyeOff } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) { toast.error('Fill in all fields'); return; }
    setLoading(true);
    try {
      const res = await loginUser(email, password);
      localStorage.setItem('access_token', res.data.access_token);
      localStorage.setItem('refresh_token', res.data.refresh_token);
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0F1117', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <Toaster position="top-center" toastOptions={{ className: 'toast-dark' }} />

      <div style={{ width: '100%', maxWidth: 400 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ width: 52, height: 52, background: '#2563EB', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', fontSize: 26, fontWeight: 800, color: '#fff' }}>H</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>Vaidya Assist</div>
        </div>

        <div className="card" style={{ padding: 32 }}>
          <h2 style={{ marginBottom: 6, textAlign: 'center' }}>Welcome back</h2>
          <p style={{ textAlign: 'center', marginBottom: 28, fontSize: '0.875rem' }}>Sign in to your account</p>

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="form-group">
              <label className="form-label">Email address</label>
              <input className="form-input" type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <div style={{ position: 'relative' }}>
                <input className="form-input" type={showPw ? 'text' : 'password'} autoComplete="current-password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required style={{ paddingRight: 44 }} />
                <button type="button" onClick={() => setShowPw(v => !v)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer' }}>
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <Link to="/forgot-password" style={{ fontSize: '0.8rem', color: '#2563EB' }}>Forgot password?</Link>
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '12px' }} disabled={loading}>
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          <div className="divider" style={{ margin: '20px 0' }}>or</div>

          <Link to="/chat" className="btn btn-ghost" style={{ width: '100%', justifyContent: 'center', padding: '12px', display: 'flex' }}>
            Continue as Guest
          </Link>

          <p style={{ textAlign: 'center', marginTop: 24, fontSize: '0.85rem', color: '#9CA3AF' }}>
            Don't have an account?{' '}
            <Link to="/register" style={{ color: '#2563EB', fontWeight: 600 }}>Sign up</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
