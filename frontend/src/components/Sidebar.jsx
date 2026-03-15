import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, FileText, MessageSquare, ScanLine,
  MapPin, Lightbulb, Activity, UserCircle, LogOut, Bell, X, Shield
} from 'lucide-react';
import { useT } from '../context/LanguageContext';



const Sidebar = ({ open, onClose }) => {
  const t = useT();
  const navigate = useNavigate();

  const NAV = [
    { label: t('nav_home'), path: '/dashboard', icon: <LayoutDashboard size={18} /> },
    { label: t('nav_reports'), path: '/reports', icon: <FileText size={18} /> },
    { label: t('nav_analyze'), path: '/analyze', icon: <ScanLine size={18} /> },
    { label: t('nav_chat'), path: '/chat', icon: <MessageSquare size={18} /> },
    { label: t('nav_map'), path: '/map', icon: <MapPin size={18} /> },
    { label: t('nav_tips'), path: '/tips', icon: <Lightbulb size={18} /> },
    { label: t('nav_reminders'), path: '/reminders', icon: <Bell size={18} /> },
    { label: 'Insurance', path: '/insurance', icon: <Shield size={18} /> },
    { label: t('nav_lifestyle'), path: '/lifestyle', icon: <Activity size={18} /> },
    { label: t('nav_profile'), path: '/profile', icon: <UserCircle size={18} /> },
  ];

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    navigate('/login');
    window.location.reload();
  };

  return (
    <aside className={`sidebar${open ? ' open' : ''}`}>
      {/* Logo row with close button on mobile */}
      <div className="sidebar-logo">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="logo-icon">H</div>
          <span className="logo-text">Healthora</span>
        </div>
        {/* Close button — mobile only */}
        <button
          onClick={onClose}
          style={{
            background: 'none', border: 'none',
            color: '#9CA3AF', cursor: 'pointer',
            padding: 4, borderRadius: 6,
            display: 'none'
          }}
          className="sidebar-close-btn"
          aria-label="Close sidebar"
        >
          <X size={18} />
        </button>
      </div>

      <nav className="sidebar-nav">
        {NAV.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `nav-item${isActive ? ' active' : ''}`
            }
            onClick={onClose}
          >
            {item.icon}
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <button className="nav-item" onClick={handleLogout}>
          <LogOut size={18} />
          <span>{t('nav_logout')}</span>
        </button>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .sidebar-close-btn {
            display: flex !important;
            align-items: center;
            justify-content: center;
          }
        }
      `}</style>
    </aside>
  );
};

export default Sidebar;
