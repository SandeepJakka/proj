import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, FileText, MessageSquare, ScanLine,
  MapPin, Lightbulb, Activity, UserCircle, LogOut
} from 'lucide-react';

const NAV = [
  { label: 'Dashboard', path: '/dashboard', icon: <LayoutDashboard size={18} /> },
  { label: 'Reports', path: '/reports', icon: <FileText size={18} /> },
  { label: 'Analyze', path: '/analyze', icon: <ScanLine size={18} /> },
  { label: 'Chat AI', path: '/chat', icon: <MessageSquare size={18} /> },
  { label: 'Find Doctors', path: '/map', icon: <MapPin size={18} /> },
  { label: 'Health Tips', path: '/tips', icon: <Lightbulb size={18} /> },
  { label: 'Lifestyle', path: '/lifestyle', icon: <Activity size={18} /> },
  { label: 'Profile', path: '/profile', icon: <UserCircle size={18} /> },
];

const Sidebar = ({ open, onClose }) => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    navigate('/login');
    window.location.reload();
  };

  return (
    <aside className={`sidebar${open ? ' open' : ''}`}>
      <div className="sidebar-logo">
        <div className="logo-icon">H</div>
        <span className="logo-text">Healthora</span>
      </div>

      <nav className="sidebar-nav">
        {NAV.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
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
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
