import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getProfile, getReports, getCurrentUser } from '../services/api';
import { FileText, MessageSquare, ScanLine, MapPin, Lightbulb, Activity, ChevronRight } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

const Dashboard = () => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [userRes, profRes, repRes] = await Promise.all([
          getCurrentUser().catch(() => null),
          getProfile().catch(() => null),
          getReports().catch(() => ({ data: [] })),
        ]);
        if (userRes) setUser(userRes.data);
        if (profRes) setProfile(profRes.data);
        setReports(repRes.data || []);
      } catch (_) {
        toast.error('Could not load dashboard data');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const displayName = user?.full_name
    ? user.full_name.split(' ')[0]
    : user?.email?.split('@')[0] || 'there';

  const QUICK_ACTIONS = [
    { label: 'Analyze Report', sub: 'Upload & explain', path: '/analyze', icon: <ScanLine size={20} />, color: '#2563EB', bg: 'rgba(37,99,235,.12)' },
    { label: 'Chat AI', sub: 'Ask a health question', path: '/chat', icon: <MessageSquare size={20} />, color: '#10B981', bg: 'rgba(16,185,129,.12)' },
    { label: 'Find Doctors', sub: 'Nearby clinics & hospitals', path: '/map', icon: <MapPin size={20} />, color: '#8b5cf6', bg: 'rgba(139,92,246,.12)' },
    { label: 'Health Tips', sub: 'Daily wellness tips', path: '/tips', icon: <Lightbulb size={20} />, color: '#F59E0B', bg: 'rgba(245,158,11,.12)' },
    { label: 'Lifestyle', sub: 'Diet & workout plans', path: '/lifestyle', icon: <Activity size={20} />, color: '#06b6d4', bg: 'rgba(6,182,212,.12)' },
    { label: 'My Reports', sub: 'View all reports', path: '/reports', icon: <FileText size={20} />, color: '#EF4444', bg: 'rgba(239,68,68,.12)' },
  ];

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', flexDirection: 'column', gap: 12 }}>
      <div className="typing-dots"><span /><span /><span /></div>
      <p>Loading your dashboard…</p>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      <Toaster position="top-right" toastOptions={{ className: 'toast-dark' }} />

      {/* Welcome */}
      <div className="page-header" style={{ marginBottom: 0 }}>
        <h1>Good day, {displayName} 👋</h1>
        <p>Your Healthora AI is ready to assist you.</p>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <div className="card stat-card">
          <div className="stat-icon" style={{ background: 'rgba(37,99,235,.12)', color: '#2563EB' }}><FileText size={22} /></div>
          <div>
            <span className="stat-label">Reports Analyzed</span>
            <span className="stat-value">{reports.length}</span>
          </div>
        </div>
        <div className="card stat-card">
          <div className="stat-icon" style={{ background: 'rgba(16,185,129,.12)', color: '#10B981' }}><MessageSquare size={22} /></div>
          <div>
            <span className="stat-label">Active Language</span>
            <span className="stat-value">EN / తె</span>
          </div>
        </div>
        <div className="card stat-card">
          <div className="stat-icon" style={{ background: 'rgba(245,158,11,.12)', color: '#F59E0B' }}><Activity size={22} /></div>
          <div>
            <span className="stat-label">Activity Level</span>
            <span className="stat-value">{profile?.activity_level || 'Not set'}</span>
          </div>
        </div>
        <div className="card stat-card">
          <div className="stat-icon" style={{ background: 'rgba(139,92,246,.12)', color: '#8b5cf6' }}><Lightbulb size={22} /></div>
          <div>
            <span className="stat-label">Health Score</span>
            <span className="stat-value">Coming soon</span>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        {/* Recent Reports */}
        <div className="card">
          <div className="section-header">
            <h3>Recent Reports</h3>
            <Link to="/reports" style={{ fontSize: '0.8rem', color: '#2563EB', display: 'flex', alignItems: 'center', gap: 4 }}>
              View all <ChevronRight size={14} />
            </Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {reports.slice(0, 4).map(r => (
              <div key={r.id} className="report-item">
                <div style={{ color: '#2563EB' }}><FileText size={18} /></div>
                <div style={{ flex: 1 }}>
                  <span className="report-name">{r.filename}</span>
                  <span className="report-date">{new Date(r.created_at).toLocaleDateString()}</span>
                </div>
                <span className="badge badge-green">Analyzed</span>
              </div>
            ))}
            {reports.length === 0 && (
              <div style={{ textAlign: 'center', padding: '28px 0', color: '#6B7280', fontSize: '0.875rem' }}>
                <FileText size={28} style={{ marginBottom: 8, opacity: .4 }} /><br />
                No reports uploaded yet
              </div>
            )}
          </div>
        </div>

        {/* Medical Context */}
        <div className="card">
          <div className="section-header">
            <h3>Medical Profile</h3>
            <Link to="/profile" style={{ fontSize: '0.8rem', color: '#2563EB', display: 'flex', alignItems: 'center', gap: 4 }}>
              Edit <ChevronRight size={14} />
            </Link>
          </div>
          {profile ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {profile.age && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}><span style={{ color: '#9CA3AF' }}>Age/Gender</span><span>{profile.age}y · {profile.gender}</span></div>}
              {profile.weight_kg && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}><span style={{ color: '#9CA3AF' }}>Body Metrics</span><span>{profile.weight_kg}kg / {profile.height_cm}cm</span></div>}
              {profile.blood_type && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}><span style={{ color: '#9CA3AF' }}>Blood Type</span><span className="badge badge-red">{profile.blood_type}</span></div>}
              {profile.known_conditions && <div style={{ fontSize: '0.875rem' }}><div style={{ color: '#9CA3AF', marginBottom: 6 }}>Conditions</div><div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>{profile.known_conditions.split(',').map(c => (<span key={c} className="badge badge-amber">{c.trim()}</span>))}</div></div>}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '28px 0', color: '#6B7280', fontSize: '0.875rem' }}>
              <Link to="/profile" className="btn btn-ghost btn-sm">Set up your health profile</Link>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h3 style={{ marginBottom: 16 }}>Quick Actions</h3>
        <div className="quick-actions">
          {QUICK_ACTIONS.map(a => (
            <Link key={a.path} to={a.path} className="quick-action-card">
              <div className="qa-icon" style={{ background: a.bg, color: a.color }}>{a.icon}</div>
              <div>
                <div className="qa-label">{a.label}</div>
                <div className="qa-sub">{a.sub}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          div[style*="grid-template-columns:'1fr 1fr'"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
};

export default Dashboard;
