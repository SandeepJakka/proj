import React, { useEffect, useState } from 'react';
import { getProfile, getReports } from '../services/api';
import { Activity, Thermometer, User, FileText, ChevronRight } from 'lucide-react';

const Dashboard = () => {
    const [profile, setProfile] = useState(null);
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [profRes, repRes] = await Promise.all([getProfile(), getReports()]);
                setProfile(profRes.data);
                setReports(repRes.data);
            } catch (err) {
                console.error("Error fetching dashboard data:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    if (loading) return <div className="loading">Loading intelligence core...</div>;

    return (
        <div className="dashboard">
            <header className="page-header">
                <h1>Welcome back, Healthora User</h1>
                <p>Your health metrics are synchronized and analyzed by MediPhi-v2.</p>
            </header>

            <div className="stats-grid">
                <div className="stat-card glass-panel">
                    <div className="stat-icon" style={{ background: 'rgba(58, 134, 255, 0.1)', color: 'var(--accent-primary)' }}>
                        <Activity size={24} />
                    </div>
                    <div className="stat-info">
                        <span className="stat-label">Activity Level</span>
                        <span className="stat-value">{profile?.activity_level || 'Not set'}</span>
                    </div>
                </div>

                <div className="stat-card glass-panel">
                    <div className="stat-icon" style={{ background: 'rgba(247, 37, 133, 0.1)', color: 'var(--accent-secondary)' }}>
                        <User size={24} />
                    </div>
                    <div className="stat-info">
                        <span className="stat-label">Body Metrics</span>
                        <span className="stat-value">{profile?.weight_kg ? `${profile.weight_kg}kg / ${profile.height_cm}cm` : 'Update profile'}</span>
                    </div>
                </div>

                <div className="stat-card glass-panel">
                    <div className="stat-icon" style={{ background: 'rgba(0, 255, 136, 0.1)', color: '#00ff88' }}>
                        <FileText size={24} />
                    </div>
                    <div className="stat-info">
                        <span className="stat-label">Medical Reports</span>
                        <span className="stat-value">{reports.length} Analyzed</span>
                    </div>
                </div>
            </div>

            <div className="main-grid">
                <section className="recent-reports card">
                    <div className="section-header">
                        <h2>Recent Reports</h2>
                        <button className="btn-text">View all <ChevronRight size={16} /></button>
                    </div>
                    <div className="reports-list">
                        {reports.slice(0, 3).map((report) => (
                            <div key={report.id} className="report-item">
                                <div className="file-icon">
                                    <FileText size={20} />
                                </div>
                                <div className="report-info">
                                    <span className="report-name">{report.filename}</span>
                                    <span className="report-date">{new Date(report.created_at).toLocaleDateString()}</span>
                                </div>
                                <div className="report-status">
                                    <span className="badge badge-success">Analyzed</span>
                                </div>
                            </div>
                        ))}
                        {reports.length === 0 && <p className="empty-msg">No medical reports uploaded yet.</p>}
                    </div>
                </section>

                <section className="health-conditions card">
                    <div className="section-header">
                        <h2>Medical Context</h2>
                    </div>
                    <div className="context-content">
                        <div className="context-group">
                            <label>Known Conditions</label>
                            <div className="tag-cloud">
                                {profile?.known_conditions ? profile.known_conditions.split(',').map(c => (
                                    <span key={c} className="tag">{c.trim()}</span>
                                )) : <span className="text-dim">No conditions reported</span>}
                            </div>
                        </div>
                        <div className="context-group">
                            <label>Allergies</label>
                            <div className="tag-cloud">
                                {profile?.allergies ? profile.allergies.split(',').map(a => (
                                    <span key={a} className="tag tag-warning">{a.trim()}</span>
                                )) : <span className="text-dim">No allergies reported</span>}
                            </div>
                        </div>
                    </div>
                </section>
            </div>

            <style jsx>{`
        .dashboard {
          display: flex;
          flex-direction: column;
          gap: 32px;
        }

        .page-header h1 {
          font-size: 32px;
          margin-bottom: 8px;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 24px;
        }

        .stat-card {
          padding: 24px;
          display: flex;
          align-items: center;
          gap: 20px;
        }

        .stat-icon {
          width: 56px;
          height: 56px;
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .stat-label {
          display: block;
          font-size: 14px;
          color: var(--text-secondary);
          margin-bottom: 4px;
        }

        .stat-value {
          font-size: 20px;
          font-weight: 700;
        }

        .main-grid {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 24px;
        }

        .section-header {
          display: flex;
          items-center: center;
          justify-content: space-between;
          margin-bottom: 24px;
        }

        .btn-text {
          background: transparent;
          color: var(--accent-primary);
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 14px;
        }

        .reports-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .report-item {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 16px;
          background: var(--surface-lighter);
          border-radius: 16px;
          border: 1px solid var(--border-color);
        }

        .file-icon {
          color: var(--accent-primary);
        }

        .report-info {
          flex: 1;
        }

        .report-name {
          display: block;
          font-weight: 600;
          margin-bottom: 2px;
        }

        .report-date {
          font-size: 12px;
          color: var(--text-secondary);
        }

        .badge {
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
        }

        .badge-success {
          background: rgba(0, 255, 136, 0.1);
          color: #00ff88;
        }

        .tag-cloud {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 10px;
        }

        .tag {
          padding: 6px 14px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 10px;
          font-size: 13px;
          color: var(--text-primary);
          border: 1px solid var(--border-color);
        }

        .tag-warning {
          border-color: rgba(247, 37, 133, 0.4);
          color: var(--accent-secondary);
        }

        .context-group {
          margin-bottom: 24px;
        }

        .context-group label {
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: var(--text-secondary);
        }

        .empty-msg {
          text-align: center;
          padding: 40px;
          color: var(--text-secondary);
        }

        .loading {
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100%;
          font-size: 18px;
          color: var(--text-secondary);
        }
      `}</style>
        </div>
    );
};

export default Dashboard;
