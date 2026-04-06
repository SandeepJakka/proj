import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { getCurrentUser, logoutUser } from '../services/api';
import { useLanguage, useT } from '../context/LanguageContext';
import Sidebar from './Sidebar';
import {
  Menu, UserCircle, LogOut,
  LayoutDashboard, MessageSquare, FileText,
  Bell, Activity, ScanLine
} from 'lucide-react';

const isLoggedIn = () => !!localStorage.getItem('access_token');

// Bottom nav items — 5 most important pages


const Layout = ({ children, showSidebar = true }) => {
  const t = useT();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const BOTTOM_NAV = [
    { path: '/dashboard', icon: <LayoutDashboard size={20} />, label: t('nav_home') },
    { path: '/chat', icon: <MessageSquare size={20} />, label: t('nav_chat') },
    { path: '/analyze', icon: <ScanLine size={20} />, label: t('nav_analyze') },
    { path: '/reminders', icon: <Bell size={20} />, label: t('nav_reminders') },
    { path: '/lifestyle', icon: <Activity size={20} />, label: t('nav_lifestyle') },
  ];
  const [user, setUser] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { language, toggleLanguage } = useLanguage();
  const loggedIn = isLoggedIn();

  useEffect(() => {
    if (loggedIn) {
      getCurrentUser()
        .then(r => setUser(r.data))
        .catch(() => {});
    }
  }, []);

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handle = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  const handleLogout = async () => {
    try { await logoutUser(); } catch (_) {}
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    navigate('/login');
    window.location.reload();
  };

  const initials = user
    ? (user.full_name || user.email || 'U')
        .split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  const shouldShowSidebar = showSidebar && loggedIn;

  return (
    <div className="app-layout">
      {/* Sidebar */}
      {shouldShowSidebar && (
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      )}

      {/* Mobile overlay behind sidebar */}
      {shouldShowSidebar && sidebarOpen && (
        <div
          className="sidebar-overlay open"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <main
        className="main-content"
        style={shouldShowSidebar ? {} : { marginLeft: 0 }}
      >
        {/* Top bar */}
        <header className="top-bar">
          <div className="top-bar-left">
            {shouldShowSidebar && (
              <button
                className="btn btn-ghost btn-sm hamburger-btn"
                onClick={() => setSidebarOpen(v => !v)}
                aria-label="Open menu"
              >
                <Menu size={18} />
              </button>
            )}

            {!shouldShowSidebar && (
              <Link
                to="/"
                style={{
                  display: 'flex', alignItems: 'center',
                  gap: 8, textDecoration: 'none'
                }}
              >
                <div style={{
                  width: 30, height: 30, background: '#2563EB',
                  borderRadius: 8, display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  fontWeight: 800, color: '#fff', fontSize: 14
                }}>H</div>
                <span style={{
                  fontWeight: 700, fontSize: '1rem', color: '#F8F9FA'
                }}>
                  Vaidya Assist
                </span>
              </Link>
            )}

            <div className="ai-status">
              <span className="status-dot" />
              {t('ai_online')}
            </div>
          </div>

          <div className="top-bar-right">
            {/* Language toggle */}
            <div className="lang-toggle">
              <button
                className={language === 'english' ? 'active' : ''}
                onClick={() => language !== 'english' && toggleLanguage()}
              >EN</button>
              <button
                className={language === 'telugu' ? 'active' : ''}
                onClick={() => language !== 'telugu' && toggleLanguage()}
              >తె</button>
            </div>

            {/* Avatar / auth buttons */}
            {loggedIn ? (
              <div style={{ position: 'relative' }} ref={dropdownRef}>
                <button
                  className="avatar-btn"
                  onClick={() => setDropdownOpen(v => !v)}
                  title={user?.full_name || user?.email}
                >
                  {initials}
                </button>
                {dropdownOpen && (
                  <div className="avatar-dropdown">
                    {user && (
                      <div style={{
                        padding: '8px 12px',
                        borderBottom: '1px solid var(--border)',
                        marginBottom: 4
                      }}>
                        <div style={{
                          fontWeight: 600, fontSize: '0.875rem'
                        }}>
                          {user.full_name || 'User'}
                        </div>
                        <div style={{
                          fontSize: '0.75rem', color: 'var(--text2)'
                        }}>
                          {user.email}
                        </div>
                      </div>
                    )}
                    <Link to="/profile">
                      <UserCircle size={15} />Profile
                    </Link>
                    <button onClick={handleLogout}>
                      <LogOut size={15} />Logout
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 8 }}>
                <Link to="/login" className="btn btn-ghost btn-sm">
                  Sign In
                </Link>
                <Link to="/register" className="btn btn-primary btn-sm">
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </header>

        {/* Page content */}
        <div className="content-inner animate-in">
          {children}
        </div>

        {/* Bottom Navigation — mobile only, logged in only */}
        {shouldShowSidebar && (
          <nav className="bottom-nav">
            {BOTTOM_NAV.map(item => (
              <Link
                key={item.path}
                to={item.path}
                className={`bottom-nav-item ${
                  location.pathname === item.path ? 'active' : ''
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>
        )}
      </main>

      <style>{`
        .hamburger-btn { display: none; }
        .sidebar-overlay {
          display: none;
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,.6);
          z-index: 150;
          backdrop-filter: blur(2px);
        }
        .sidebar-overlay.open { display: block; }

        @media (max-width: 768px) {
          .hamburger-btn { display: flex !important; }
          .main-content { margin-left: 0 !important; }
        }
      `}</style>
    </div>
  );
};

export default Layout;
