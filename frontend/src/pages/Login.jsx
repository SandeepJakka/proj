import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Lock, Mail, Activity, Loader } from 'lucide-react';

const Login = () => {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isRegister) {
        const res = await api.post('/auth/register', { email, password });
        localStorage.setItem('token', res.data.access_token);
      } else {
        const formData = new FormData();
        formData.append('username', email);
        formData.append('password', password);
        const res = await api.post('/auth/login', formData);
        localStorage.setItem('token', res.data.access_token);
      }
      navigate('/');
      window.location.reload(); // Refresh to update axios headers
    } catch (err) {
      let errorMsg = 'Authentication failed';
      if (err.response?.data?.detail) {
        if (typeof err.response.data.detail === 'string') {
          errorMsg = err.response.data.detail;
        } else if (Array.isArray(err.response.data.detail)) {
          errorMsg = err.response.data.detail[0]?.msg || JSON.stringify(err.response.data.detail);
        }
      }
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card glass-panel animate-fade-in">
        <div className="login-header">
          <div className="logo-icon">H</div>
          <h1>Healthora Intelligence</h1>
          <p>{isRegister ? 'Create your medical identity' : 'Access your health dashboard'}</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="input-field">
            <Mail size={18} />
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="input-field">
            <Lock size={18} />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && <div className="error-msg">{error}</div>}

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? <Loader className="spin" size={18} /> : (isRegister ? 'Register' : 'Login')}
          </button>
        </form>

        <div className="login-footer">
          <button onClick={() => setIsRegister(!isRegister)} className="btn-text">
            {isRegister ? 'Already have an account? Login' : "Don't have an account? Register"}
          </button>
        </div>
      </div>

      <style jsx>{`
        .login-page {
          height: 100vh;
          width: 100vw;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--bg-color);
          position: fixed;
          top: 0;
          left: 0;
          z-index: 2000;
        }

        .login-card {
          width: 100%;
          max-width: 400px;
          padding: 40px;
          display: flex;
          flex-direction: column;
          gap: 30px;
        }

        .login-header {
          text-align: center;
        }

        .logo-icon {
          width: 48px;
          height: 48px;
          background: var(--accent-primary);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          color: white;
          font-size: 24px;
          margin: 0 auto 20px;
        }

        .login-header h1 {
          font-size: 24px;
          margin-bottom: 8px;
        }

        .login-form {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .input-field {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px 18px;
          background: var(--surface-lighter);
          border: 1px solid var(--border-color);
          border-radius: 14px;
          color: var(--text-secondary);
        }

        .input-field input {
          background: transparent;
          border: none;
          color: white;
          width: 100%;
          outline: none;
        }

        .error-msg {
          color: var(--accent-secondary);
          font-size: 14px;
          text-align: center;
        }

        .login-footer {
          text-align: center;
        }

        .btn-text {
          color: var(--accent-primary);
          background: transparent;
          font-size: 14px;
        }

        .spin {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default Login;
