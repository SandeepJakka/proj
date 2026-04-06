import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getProfile, getReports, getCurrentUser, getReminders, getCurrentPlans } from '../services/api';
import { FileText, MessageSquare, ScanLine, MapPin, Lightbulb, Activity, ChevronRight, Bell, Calendar, Pill, TrendingUp, Clock, Users, UserPlus, X, Edit2, Eye, Download } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import ReactMarkdown from 'react-markdown';
import { useT } from '../context/LanguageContext';

const Dashboard = () => {
  const t = useT();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reminders, setReminders] = useState([]);
  const [plans, setPlans] = useState({});
  const [timelineFilter, setTimelineFilter] = useState('all');
  const [timelineExpanded, setTimelineExpanded] = useState(false);
  const [insightsExpanded, setInsightsExpanded] = useState(false);

  // Family Vault state
  const [familyMembers, setFamilyMembers] = useState([]);
  const [familyOpen, setFamilyOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [memberFormOpen, setMemberFormOpen] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [memberForm, setMemberForm] = useState({
    name: '', relation: '', age: '',
    gender: '', blood_type: '', known_conditions: '',
    allergies: '', weight_kg: '', height_cm: '', notes: ''
  });
  const [savingMember, setSavingMember] = useState(false);
  const [uploadingReport, setUploadingReport] = useState(false);
  const memberReportRef = React.useRef(null);
  const [viewingReport, setViewingReport] = useState(null); // { report, member }

  // News state
  const [healthNews, setHealthNews] = useState([])
  const [newsLoading, setNewsLoading] = useState(false)
  const [newsOpen, setNewsOpen] = useState(false)
  const [selectedArticle, setSelectedArticle] = useState(null) // article reader modal

  useEffect(() => {
    const load = async () => {
      try {
        const [userRes, profRes, repRes, remRes, planRes, famRes] = await Promise.all([
          getCurrentUser().catch(() => null),
          getProfile().catch(() => null),
          getReports().catch(() => ({ data: [] })),
          getReminders().catch(() => ({ data: { reminders: [] } })),
          getCurrentPlans().catch(() => ({ data: {} })),
          fetch('http://localhost:8000/api/family/members', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }
          }).then(r => r.json()).catch(() => [])
        ]);
        if (userRes) setUser(userRes.data);
        if (profRes) setProfile(profRes.data);
        setReports(repRes.data || []);
        setReminders(remRes.data?.reminders || []);
        setPlans(planRes.data || {});
        setFamilyMembers(Array.isArray(famRes) ? famRes : []);
      } catch (_) {
        toast.error('Could not load dashboard data');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (newsOpen && healthNews.length === 0) {
      fetchHealthNews()
    }
  }, [newsOpen])

  const displayName = user?.full_name
    ? user.full_name.split(' ')[0]
    : user?.email?.split('@')[0] || 'there';

  const buildTimeline = () => {
    const events = [];

    // Reports → timeline events
    reports.forEach(r => {
      events.push({
        id: `report-${r.id}`,
        type: 'report',
        title: r.filename,
        subtitle: r.has_analysis 
          ? t('dash_rep_analyzed') 
          : t('dash_rep_uploaded'),
        date: new Date(r.created_at),
        icon: '📄',
        color: '#2563EB',
        bg: 'rgba(37,99,235,0.1)',
        badge: r.report_type 
          ? r.report_type.replace(/_/g, ' ') 
          : t('dash_med_rep'),
        badgeColor: '#2563EB',
        link: '/reports'
      });
    });

    // Reminders → timeline events
    reminders.forEach(r => {
      events.push({
        id: `reminder-${r.id}`,
        type: 'reminder',
        title: r.medicine_name,
        subtitle: `${r.dosage || ''} · ${
          r.reminder_times?.join(', ') || ''
        } · ${r.instructions || ''}`.replace(/^·\s*|·\s*$/g, '').trim(),
        date: new Date(),
        icon: '💊',
        color: '#10B981',
        bg: 'rgba(16,185,129,0.1)',
        badge: r.is_active ? t('dash_active') : t('dash_paused'),
        badgeColor: r.is_active ? '#10B981' : '#6B7280',
        link: '/reminders'
      });
    });

    // Plans → timeline events
    if (plans.nutrition) {
      events.push({
        id: 'plan-nutrition',
        type: 'plan',
        title: t('dash_nutri_plan'),
        subtitle: t('dash_nutri_sub'),
        date: new Date(plans.nutrition.created_at),
        icon: '🥗',
        color: '#F59E0B',
        bg: 'rgba(245,158,11,0.1)',
        badge: t('life_nutrition_title'),
        badgeColor: '#F59E0B',
        link: '/lifestyle'
      });
    }

    if (plans.fitness) {
      events.push({
        id: 'plan-fitness',
        type: 'plan',
        title: t('dash_fitness_plan'),
        subtitle: t('dash_fitness_sub'),
        date: new Date(plans.fitness.created_at),
        icon: '💪',
        color: '#8B5CF6',
        bg: 'rgba(139,92,246,0.1)',
        badge: t('life_fitness_title'),
        badgeColor: '#8B5CF6',
        link: '/lifestyle'
      });
    }

    // Sort by date descending (newest first)
    events.sort((a, b) => b.date - a.date);

    return events;
  };

  const allEvents = buildTimeline();

  const filteredEvents = timelineFilter === 'all'
    ? allEvents
    : allEvents.filter(e => e.type === timelineFilter);

  const visibleEvents = timelineExpanded
    ? filteredEvents
    : filteredEvents.slice(0, 5);

  const formatTimelineDate = (date) => {
    const now = new Date();
    const diff = Math.floor((now - date) / (1000 * 60 * 60 * 24));
    if (diff === 0) return t('dash_today');
    if (diff === 1) return t('dash_yesterday');
    if (diff < 7) return `${diff} ${t('dash_days_ago')}`;
    if (diff < 30) return `${Math.floor(diff / 7)} ${t('dash_weeks_ago')}`;
    return date.toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric'
    });
  };

  // ── Family Vault helpers ──────────────────────────────────
  const RELATIONS = ['Father','Mother','Spouse','Son','Daughter','Brother','Sister','Grandfather','Grandmother','Other'];
  const BLOOD_TYPES = ['A+','A-','B+','B-','AB+','AB-','O+','O-'];
  const getInitials = (name) => name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  const fetchFamilyMembers = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/family/members', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }
      });
      const data = await res.json();
      setFamilyMembers(Array.isArray(data) ? data : []);
    } catch {}
  };

  const fetchHealthNews = async () => {
    setNewsLoading(true)
    try {
      // cache: 'no-store' ensures every refresh hits the server fresh
      const res = await fetch('http://localhost:8000/api/news/health-news', { cache: 'no-store' })
      const data = await res.json()
      setHealthNews(data.news || [])
    } catch {
      setHealthNews([])
    } finally {
      setNewsLoading(false)
    }
  }

  const handleSaveMember = async () => {
    if (!memberForm.name.trim() || !memberForm.relation.trim()) {
      toast.error('Name and relation are required');
      return;
    }
    setSavingMember(true);
    try {
      const payload = {
        ...memberForm,
        age: memberForm.age ? parseInt(memberForm.age) : null,
        weight_kg: memberForm.weight_kg ? parseFloat(memberForm.weight_kg) : null,
        height_cm: memberForm.height_cm ? parseFloat(memberForm.height_cm) : null,
      };
      const url = editingMember
        ? `http://localhost:8000/api/family/members/${editingMember.id}`
        : 'http://localhost:8000/api/family/members';
      const method = editingMember ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.detail || 'Failed to save'); }
      toast.success(editingMember ? 'Member updated!' : 'Member added!');
      setMemberFormOpen(false);
      setEditingMember(null);
      setMemberForm({ name:'',relation:'',age:'',gender:'',blood_type:'',known_conditions:'',allergies:'',weight_kg:'',height_cm:'',notes:'' });
      await fetchFamilyMembers();
    } catch (err) {
      toast.error(err.message || 'Failed to save member');
    } finally {
      setSavingMember(false);
    }
  };

  const handleDeleteMember = async (id, name) => {
    if (!window.confirm(`Remove ${name} from family vault?`)) return;
    try {
      await fetch(`http://localhost:8000/api/family/members/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }
      });
      toast.success('Member removed');
      if (selectedMember?.id === id) setSelectedMember(null);
      await fetchFamilyMembers();
    } catch { toast.error('Failed to remove member'); }
  };

  const handleUploadMemberReport = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !selectedMember) return;
    setUploadingReport(true);
    const toastId = toast.loading(`Uploading report for ${selectedMember.name}...`);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(
        `http://localhost:8000/api/family/members/${selectedMember.id}/reports`,
        { method: 'POST', headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }, body: formData }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Upload failed');
      toast.success('Report uploaded and analyzed!', { id: toastId });
      await fetchFamilyMembers();
    } catch (err) {
      toast.error(err.message || 'Upload failed', { id: toastId });
    } finally {
      setUploadingReport(false);
      if (memberReportRef.current) memberReportRef.current.value = '';
    }
  };

  // ── Document view / download helpers ─────────────────────────────────────
  const getReportFileUrl = (member, report, inline = false) =>
    `http://localhost:8000/api/family/members/${member.id}/reports/${report.id}/download${inline ? '?inline=true' : ''}`;

  const handleDownloadReport = async (member, report) => {
    if (!report.has_file) { toast.error('No file stored for this report'); return; }
    const toastId = toast.loading('Preparing download...');
    try {
      const res = await fetch(getReportFileUrl(member, report, false), {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }
      });
      if (!res.ok) throw new Error('File not found on server');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = report.filename;
      document.body.appendChild(a); a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      toast.success('Download started', { id: toastId });
    } catch (err) {
      toast.error(err.message || 'Download failed', { id: toastId });
    }
  };

  const handleViewReportInTab = async (member, report) => {
    if (!report.has_file) { toast.error('No file stored for this report'); return; }
    const toastId = toast.loading('Opening document...');
    try {
      const res = await fetch(getReportFileUrl(member, report, true), {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }
      });
      if (!res.ok) throw new Error('File not found on server');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      toast.success('Opened in new tab', { id: toastId });
      setTimeout(() => URL.revokeObjectURL(url), 30000);
    } catch (err) {
      toast.error(err.message || 'Could not open file', { id: toastId });
    }
  };

  const getInsightColor = (summary) => {
    if (!summary) return { color: '#6B7280', bg: 'rgba(107,114,128,0.1)', icon: '📋' };
    const s = summary.toLowerCase();
    if (s.includes('normal') || s.includes('healthy') || 
        s.includes('good') || s.includes('within range') ||
        s.includes('no abnormal') || s.includes('no issues'))
      return { color: '#10B981', bg: 'rgba(16,185,129,0.1)', icon: '✅' };
    if (s.includes('critical') || s.includes('urgent') || 
        s.includes('high risk') || s.includes('severe') ||
        s.includes('immediately'))
      return { color: '#EF4444', bg: 'rgba(239,68,68,0.1)', icon: '🚨' };
    if (s.includes('abnormal') || s.includes('elevated') || 
        s.includes('low') || s.includes('high') ||
        s.includes('borderline') || s.includes('attention'))
      return { color: '#F59E0B', bg: 'rgba(245,158,11,0.1)', icon: '⚠️' };
    return { color: '#2563EB', bg: 'rgba(37,99,235,0.1)', icon: '📊' };
  };

  const getOneLineSummary = (summary) => {
    if (!summary) return t('dash_analysis_click');
    // Take first sentence or first 120 chars
    const firstSentence = summary.split(/[.!?\n]/)[0];
    if (firstSentence && firstSentence.length > 10) {
      return firstSentence.length > 120
        ? firstSentence.slice(0, 120) + '...'
        : firstSentence;
    }
    return summary.slice(0, 120) + (summary.length > 120 ? '...' : '');
  };

  // Reports that have summaries
  const reportsWithSummary = reports.filter(r => r.summary_text);
  const visibleInsights = insightsExpanded
    ? reportsWithSummary
    : reportsWithSummary.slice(0, 3);

  const QUICK_ACTIONS = [
    { label: t('qa_analyze'), sub: t('qa_analyze_sub'), path: '/analyze', icon: <ScanLine size={20} />, color: '#2563EB', bg: 'rgba(37,99,235,.12)' },
    { label: t('qa_chat'), sub: t('qa_chat_sub'), path: '/chat', icon: <MessageSquare size={20} />, color: '#10B981', bg: 'rgba(16,185,129,.12)' },
    { label: t('qa_map'), sub: t('qa_map_sub'), path: '/map', icon: <MapPin size={20} />, color: '#8b5cf6', bg: 'rgba(139,92,246,.12)' },
    { label: t('qa_tips'), sub: t('qa_tips_sub'), path: '/tips', icon: <Lightbulb size={20} />, color: '#F59E0B', bg: 'rgba(245,158,11,.12)' },
    { label: t('qa_lifestyle'), sub: t('qa_lifestyle_sub'), path: '/lifestyle', icon: <Activity size={20} />, color: '#06b6d4', bg: 'rgba(6,182,212,.12)' },
    { label: t('qa_reports'), sub: t('qa_reports_sub'), path: '/reports', icon: <FileText size={20} />, color: '#EF4444', bg: 'rgba(239,68,68,.12)' },
  ];

  if (loading) return (
    <div className="page-enter" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Skeleton header */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div className="skeleton skeleton-title" style={{ width: '40%' }} />
        <div className="skeleton skeleton-text" style={{ width: '25%' }} />
      </div>
      {/* Skeleton stats */}
      <div className="stats-grid">
        {[1,2,3,4].map(i => (
          <div key={i} className="skeleton-card" style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
            <div className="skeleton skeleton-circle" style={{ width: 44, height: 44, flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div className="skeleton skeleton-text" style={{ width: '60%' }} />
              <div className="skeleton skeleton-title" style={{ width: '40%' }} />
            </div>
          </div>
        ))}
      </div>
      {/* Skeleton cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
        {[1,2].map(i => (
          <div key={i} className="skeleton-card">
            <div className="skeleton skeleton-title" style={{ width: '50%', marginBottom: 16 }} />
            {[1,2,3].map(j => (
              <div key={j} className="skeleton skeleton-text" style={{ width: j === 3 ? '60%' : '100%' }} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="page-enter" style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      <Toaster position="top-right" toastOptions={{ className: 'toast-dark' }} />

      {/* Welcome */}
      <div className="page-header" style={{ marginBottom: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: 'clamp(1.2rem, 4vw, 2rem)' }}>
            {t('dash_greeting')}, {displayName} 👋
          </h1>
          <p>{t('dash_subtitle')}</p>
        </div>
        <button
          onClick={() => setNewsOpen(v => !v)}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '9px 16px', borderRadius: 10,
            background: 'rgba(16,185,129,0.08)',
            border: '1px solid rgba(16,185,129,0.2)',
            color: '#10B981', cursor: 'pointer',
            fontWeight: 600, fontSize: '0.82rem',
            transition: 'all 0.2s'
          }}
        >
          📰 {newsOpen ? 'Hide News' : 'Health News'}
        </button>
      </div>

      {/* ── Article Reader Modal ───────────────────────────── */}
      {selectedArticle && (
        <div
          onClick={() => setSelectedArticle(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(0,0,0,0.75)',
            backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '20px 16px',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#1A1D27',
              border: '1px solid #2A2D3A',
              borderRadius: 16,
              width: '100%', maxWidth: 720,
              maxHeight: '90vh',
              display: 'flex', flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            {/* Modal header */}
            <div style={{
              padding: '14px 20px',
              borderBottom: '1px solid #2A2D3A',
              display: 'flex', justifyContent: 'space-between',
              alignItems: 'center', flexShrink: 0,
            }}>
              {(() => {
                const catMeta = {
                  medical:  { label: '🏥 Medical',  color: '#60A5FA', bg: 'rgba(96,165,250,0.12)' },
                  wellness: { label: '🥗 Wellness', color: '#34D399', bg: 'rgba(52,211,153,0.12)' },
                  research: { label: '🔬 Research', color: '#A78BFA', bg: 'rgba(167,139,250,0.12)' },
                }[selectedArticle.category] || { label: '📰 Health', color: '#10B981', bg: 'rgba(16,185,129,0.12)' };
                return (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ background: catMeta.bg, color: catMeta.color, fontSize: '0.65rem', padding: '3px 8px', borderRadius: 4, fontWeight: 700 }}>
                      {catMeta.label}
                    </span>
                    <span style={{ color: '#9CA3AF', fontSize: '0.75rem' }}>{selectedArticle.source}</span>
                    {selectedArticle.published && (
                      <span style={{ color: '#6B7280', fontSize: '0.72rem' }}>
                        · {new Date(selectedArticle.published).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    )}
                  </div>
                );
              })()}
              <button
                onClick={() => setSelectedArticle(null)}
                style={{ background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer', fontSize: '1.2rem', lineHeight: 1, padding: 4 }}
              >
                ✕
              </button>
            </div>

            {/* Scrollable body */}
            <div style={{ overflowY: 'auto', flex: 1, padding: '20px 24px' }}>
              {/* Hero image */}
              {selectedArticle.image && (
                <img
                  src={selectedArticle.image}
                  alt={selectedArticle.title}
                  style={{
                    width: '100%', maxHeight: 260,
                    objectFit: 'cover', borderRadius: 10,
                    marginBottom: 20,
                  }}
                  onError={e => { e.currentTarget.style.display = 'none'; }}
                />
              )}

              {/* Title */}
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#F8F9FA', lineHeight: 1.5, marginBottom: 16 }}>
                {selectedArticle.title}
              </h2>

              {/* Full content */}
              {selectedArticle.content ? (
                <div style={{ color: '#D1D5DB', fontSize: '0.88rem', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
                  {selectedArticle.content}
                </div>
              ) : (
                <p style={{ color: '#9CA3AF', fontSize: '0.85rem' }}>
                  {selectedArticle.description || 'No preview available.'}
                </p>
              )}
            </div>

            {/* Footer CTA */}
            {selectedArticle.link && (
              <div style={{
                padding: '14px 24px',
                borderTop: '1px solid #2A2D3A',
                flexShrink: 0,
                display: 'flex', justifyContent: 'flex-end', gap: 10,
              }}>
                <button
                  onClick={() => setSelectedArticle(null)}
                  style={{
                    padding: '8px 16px', borderRadius: 8,
                    background: 'transparent', border: '1px solid #2A2D3A',
                    color: '#9CA3AF', cursor: 'pointer', fontSize: '0.82rem',
                  }}
                >
                  Close
                </button>
                <a
                  href={selectedArticle.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    padding: '8px 18px', borderRadius: 8,
                    background: 'linear-gradient(135deg, #10B981, #059669)',
                    color: '#fff', fontWeight: 700,
                    fontSize: '0.82rem', textDecoration: 'none',
                    display: 'flex', alignItems: 'center', gap: 6,
                  }}
                >
                  Open Original Article ↗
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      {newsOpen && (
        <div style={{
          background: '#1A1D27',
          border: '1px solid #2A2D3A',
          borderRadius: 14, overflow: 'hidden'
        }}>
          <div style={{
            padding: '14px 20px',
            borderBottom: '1px solid #2A2D3A',
            display: 'flex', justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: '1.1rem' }}>📰</span>
              <div>
                <div style={{ fontWeight: 700, color: '#F8F9FA', fontSize: '0.9rem' }}>
                  Latest Health News
                </div>
                <div style={{ color: '#9CA3AF', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: 4 }}>
                  Powered by Tavily AI
                  <span style={{ background: 'rgba(16,185,129,0.15)', color: '#10B981', fontSize: '0.62rem', padding: '1px 5px', borderRadius: 3, fontWeight: 600 }}>LIVE</span>
                </div>
              </div>
            </div>
            <button
              onClick={fetchHealthNews}
              disabled={newsLoading}
              style={{ background: 'none', border: 'none',
                color: '#9CA3AF', cursor: 'pointer',
                fontSize: '0.78rem', display: 'flex',
                alignItems: 'center', gap: 4 }}
            >
              {newsLoading ? '⏳' : '🔄'} Refresh
            </button>
          </div>

          {newsLoading ? (
            <div style={{ padding: 32, textAlign: 'center', color: '#9CA3AF' }}>
              <div style={{ width: 32, height: 32, margin: '0 auto 12px',
                border: '2px solid #2A2D3A',
                borderTop: '2px solid #10B981',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite' }} />
              Fetching latest health news…
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
              gap: 0
            }}>
              {healthNews.map((item, i) => {
                const catMeta = {
                  medical:  { label: '🏥 Medical',  color: '#60A5FA', bg: 'rgba(96,165,250,0.12)' },
                  wellness: { label: '🥗 Wellness', color: '#34D399', bg: 'rgba(52,211,153,0.12)' },
                  research: { label: '🔬 Research', color: '#A78BFA', bg: 'rgba(167,139,250,0.12)' },
                }[item.category] || { label: '📰 Health', color: '#10B981', bg: 'rgba(16,185,129,0.12)' };

                return (
                  <div key={i} style={{
                    padding: '16px 18px',
                    borderBottom: i < healthNews.length - 1 ? '1px solid #2A2D3A' : 'none',
                    borderRight: i % 2 === 0 ? '1px solid #2A2D3A' : 'none',
                    display: 'flex', flexDirection: 'column', gap: 8,
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.025)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    {/* Category + source + date */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <span style={{
                        background: catMeta.bg, color: catMeta.color,
                        fontSize: '0.60rem', padding: '2px 7px',
                        borderRadius: 4, fontWeight: 700, flexShrink: 0
                      }}>
                        {catMeta.label}
                      </span>
                      <span style={{
                        background: 'rgba(255,255,255,0.06)', color: '#9CA3AF',
                        fontSize: '0.60rem', padding: '2px 6px',
                        borderRadius: 4, flexShrink: 0
                      }}>
                        {item.source}
                      </span>
                      {item.published && (
                        <span style={{ color: '#6B7280', fontSize: '0.60rem', marginLeft: 'auto' }}>
                          {new Date(item.published).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        </span>
                      )}
                    </div>

                    {/* Title */}
                    <p style={{
                      color: '#F8F9FA', fontWeight: 600, fontSize: '0.84rem',
                      lineHeight: 1.45, margin: 0,
                      display: '-webkit-box', WebkitLineClamp: 3,
                      WebkitBoxOrient: 'vertical', overflow: 'hidden'
                    }}>
                      {item.title}
                    </p>

                    {/* Description preview */}
                    {item.description && (
                      <p style={{
                        color: '#9CA3AF', fontSize: '0.75rem',
                        lineHeight: 1.55, margin: 0,
                        display: '-webkit-box', WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical', overflow: 'hidden'
                      }}>
                        {item.description}
                      </p>
                    )}

                    {/* Read Article button */}
                    <button
                      onClick={() => setSelectedArticle(item)}
                      style={{
                        alignSelf: 'flex-start',
                        marginTop: 2,
                        padding: '5px 12px',
                        borderRadius: 6,
                        background: 'rgba(16,185,129,0.1)',
                        border: '1px solid rgba(16,185,129,0.25)',
                        color: '#10B981',
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(16,185,129,0.2)'; e.currentTarget.style.borderColor = 'rgba(16,185,129,0.5)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(16,185,129,0.1)'; e.currentTarget.style.borderColor = 'rgba(16,185,129,0.25)'; }}
                    >
                      Read Article →
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Stats */}
      <div className="stats-grid" style={{ gap: 10 }}>
        <div className="card stat-card stagger-item card-hover">
          <div className="stat-icon" style={{ background: 'rgba(37,99,235,.12)', color: '#2563EB' }}><FileText size={22} /></div>
          <div>
            <span className="stat-label">{t('dash_reports_label')}</span>
            <span className="stat-value" style={{
              color: reports.length > 0 ? '#2563EB' : '#6B7280'
            }}>
              {reports.length}
            </span>
          </div>
        </div>
        <div className="card stat-card stagger-item card-hover">
          <div className="stat-icon" style={{ background: 'rgba(16,185,129,.12)', color: '#10B981' }}><MessageSquare size={22} /></div>
          <div>
            <span className="stat-label">{t('dash_lang_label')}</span>
            <span className="stat-value">EN / తె</span>
          </div>
        </div>
        <div className="card stat-card stagger-item card-hover">
          <div className="stat-icon" style={{ background: 'rgba(245,158,11,.12)', color: '#F59E0B' }}><Activity size={22} /></div>
          <div>
            <span className="stat-label">{t('dash_activity_label')}</span>
            <span className="stat-value">{profile?.activity_level || t('dash_not_set')}</span>
          </div>
        </div>
        <div className="card stat-card stagger-item card-hover">
          <div className="stat-icon" style={{ background: 'rgba(139,92,246,.12)', color: '#8b5cf6' }}><Lightbulb size={22} /></div>
          <div>
            <span className="stat-label">{t('dash_health_score')}</span>
            <span className="stat-value" style={{
              color: (() => {
                const withSummary = reports.filter(r => r.summary_text);
                if (withSummary.length === 0) return '#6B7280';
                const normals = withSummary.filter(r => {
                  const s = (r.summary_text || '').toLowerCase();
                  return s.includes('normal') || s.includes('healthy') || 
                         s.includes('within range');
                }).length;
                const pct = Math.round((normals / withSummary.length) * 100);
                return pct >= 70 ? '#10B981' : pct >= 40 ? '#F59E0B' : '#EF4444';
              })()
            }}>
              {(() => {
                const withSummary = reports.filter(r => r.summary_text);
                if (withSummary.length === 0) return t('dash_no_data');
                const normals = withSummary.filter(r => {
                  const s = (r.summary_text || '').toLowerCase();
                  return s.includes('normal') || s.includes('healthy') || 
                         s.includes('within range');
                }).length;
                const pct = Math.round((normals / withSummary.length) * 100);
                return pct >= 70 ? t('dash_good') : pct >= 40 ? t('dash_fair') : t('dash_review');
              })()}
            </span>
          </div>
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: 16
      }}>
        {/* Recent Insights */}
        <div className="card stagger-item" style={{ padding: 0, overflow: 'hidden' }}>
          
          {/* Card Header */}
          <div style={{
            padding: '16px 20px',
            borderBottom: '1px solid #2A2D3A',
            display: 'flex', alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 32, height: 32, borderRadius: 8,
                background: 'rgba(37,99,235,0.12)',
                display: 'flex', alignItems: 'center',
                justifyContent: 'center'
              }}>
                <TrendingUp size={16} color="#2563EB" />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700 }}>
                  {t('dash_recent_insights')}
                </h3>
                <p style={{ margin: 0, color: '#9CA3AF', fontSize: '0.72rem' }}>
                  {t('dash_ai_analysis')}
                </p>
              </div>
            </div>
            <Link
              to="/reports"
              style={{
                fontSize: '0.75rem', color: '#2563EB',
                display: 'flex', alignItems: 'center',
                gap: 4, textDecoration: 'none'
              }}
            >
              {t('dash_view_all')} <ChevronRight size={13} />
            </Link>
          </div>

          {/* Insights list */}
          <div style={{ padding: '8px 12px 12px' }}>
            {reportsWithSummary.length === 0 ? (
              <div className="empty-state" style={{ padding: '28px 16px' }}>
                <div className="empty-state-icon">🔬</div>
                <h3>{t('dash_no_insights')}</h3>
                <p>{t('dash_ai_analysis')}</p>
                <Link to="/analyze" className="btn btn-primary btn-sm" style={{ marginTop: 4 }}>
                  {t('dash_upload_analyze')} →
                </Link>
              </div>
            ) : (
              <>
                {visibleInsights.map((r, index) => {
                  const insight = getInsightColor(r.summary_text);
                  const oneLiner = getOneLineSummary(r.summary_text);
                  return (
                    <Link
                      key={r.id}
                      to="/reports"
                      style={{ textDecoration: 'none' }}
                    >
                    <div className="stagger-item" style={{
                        padding: '12px 10px',
                        borderRadius: 10, marginBottom: 6,
                        background: 'transparent',
                        border: '1px solid transparent',
                        transition: 'all 0.15s', cursor: 'pointer'
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.background = 
                          'rgba(255,255,255,0.03)';
                        e.currentTarget.style.borderColor = '#2A2D3A';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.borderColor = 'transparent';
                      }}
                      >
                        <div style={{
                          display: 'flex', gap: 10,
                          alignItems: 'flex-start'
                        }}>
                          {/* Status icon */}
                          <div style={{
                            width: 32, height: 32, borderRadius: 8,
                            background: insight.bg, flexShrink: 0,
                            display: 'flex', alignItems: 'center',
                            justifyContent: 'center', fontSize: '0.9rem'
                          }}>
                            {insight.icon}
                          </div>

                          <div style={{ flex: 1, minWidth: 0 }}>
                            {/* Filename + date */}
                            <div style={{
                              display: 'flex', justifyContent: 'space-between',
                              alignItems: 'center', marginBottom: 3, gap: 8
                            }}>
                              <span style={{
                                fontSize: '0.78rem', fontWeight: 600,
                                color: '#F8F9FA', whiteSpace: 'nowrap',
                                overflow: 'hidden', textOverflow: 'ellipsis',
                                flex: 1
                              }}>
                                {r.filename?.length > 22
                                  ? r.filename.slice(0, 22) + '…'
                                  : r.filename}
                              </span>
                              <span style={{
                                color: '#6B7280', fontSize: '0.68rem',
                                flexShrink: 0
                              }}>
                                {new Date(r.created_at).toLocaleDateString(
                                  'en-IN', { day: 'numeric', month: 'short' }
                                )}
                              </span>
                            </div>

                            {/* One-line insight */}
                            <p style={{
                              color: insight.color,
                              fontSize: '0.75rem', margin: 0,
                              lineHeight: 1.5,
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden'
                            }}>
                              {oneLiner}
                            </p>
                          </div>
                        </div>
                      </div>
                    </Link>
                  )
                })}

                {/* Show more */}
                {reportsWithSummary.length > 3 && (
                  <button
                    onClick={() => setInsightsExpanded(!insightsExpanded)}
                    style={{
                      width: '100%', padding: '8px',
                      background: 'transparent',
                      border: '1px dashed #2A2D3A',
                      borderRadius: 8, color: '#6B7280',
                      cursor: 'pointer', fontSize: '0.75rem',
                      marginTop: 4
                    }}
                  >
                    {insightsExpanded
                      ? t('dash_show_less')
                      : `↓ ${reportsWithSummary.length - 3} ${t('dash_show_more_insights')}`}
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Medical Context */}
        <div className="card stagger-item">
          <div className="section-header">
            <h3>{t('dash_medical_profile')}</h3>
            <Link to="/profile" style={{ fontSize: '0.8rem', color: '#2563EB', display: 'flex', alignItems: 'center', gap: 4 }}>
              {t('dash_edit')} <ChevronRight size={14} />
            </Link>
          </div>
          {profile ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {profile.age && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}><span style={{ color: '#9CA3AF' }}>{t('dash_age_gender')}</span><span>{profile.age}y · {profile.gender}</span></div>}
              {profile.weight_kg && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}><span style={{ color: '#9CA3AF' }}>{t('dash_body_metrics')}</span><span>{profile.weight_kg}kg / {profile.height_cm}cm</span></div>}
              {profile.blood_type && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}><span style={{ color: '#9CA3AF' }}>{t('dash_blood_type')}</span><span className="badge badge-red">{profile.blood_type}</span></div>}
              {profile.known_conditions && <div style={{ fontSize: '0.875rem' }}><div style={{ color: '#9CA3AF', marginBottom: 6 }}>{t('dash_conditions')}</div><div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>{profile.known_conditions.split(',').map(c => (<span key={c} className="badge badge-amber">{c.trim()}</span>))}</div></div>}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '28px 0', color: '#6B7280', fontSize: '0.875rem' }}>
              <Link to="/profile" className="btn btn-ghost btn-sm">{t('dash_setup_profile')}</Link>
            </div>
          )}
        </div>
      </div>

      {/* ── Family Health Vault ──────────────────────────────── */}
      <div className="card stagger-item" style={{ padding: 0, overflow: 'hidden' }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: familyOpen ? '1px solid #2A2D3A' : 'none',
          display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', cursor: 'pointer'
        }} onClick={() => setFamilyOpen(v => !v)}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 34, height: 34, borderRadius: 10,
              background: 'rgba(139,92,246,0.12)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Users size={17} color="#8B5CF6" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700 }}>Family Health Vault</h3>
              <p style={{ margin: 0, color: '#9CA3AF', fontSize: '0.72rem' }}>
                {familyMembers.length > 0
                  ? `${familyMembers.length} member${familyMembers.length > 1 ? 's' : ''} · ${familyMembers.reduce((a, m) => a + m.report_count, 0)} reports`
                  : 'Manage health records for your family'}
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {familyOpen && (
              <button
                onClick={e => {
                  e.stopPropagation();
                  setEditingMember(null);
                  setMemberForm({ name:'',relation:'',age:'',gender:'',blood_type:'',known_conditions:'',allergies:'',weight_kg:'',height_cm:'',notes:'' });
                  setMemberFormOpen(true);
                }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '6px 12px', borderRadius: 8,
                  background: 'rgba(139,92,246,0.1)',
                  border: '1px solid rgba(139,92,246,0.25)',
                  color: '#A78BFA', cursor: 'pointer',
                  fontSize: '0.75rem', fontWeight: 600
                }}
              >
                <UserPlus size={13} /> Add Member
              </button>
            )}
            <ChevronRight size={16} color="#6B7280" style={{ transform: familyOpen ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
          </div>
        </div>

        {/* Body */}
        {familyOpen && (
          <div style={{ padding: '16px 20px' }}>
            {familyMembers.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '28px 16px', color: '#6B7280' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: 10 }}>👨‍👩‍👧‍👦</div>
                <p style={{ fontSize: '0.82rem', marginBottom: 14 }}>Add family members to manage their health records in one place</p>
                <button
                  onClick={() => setMemberFormOpen(true)}
                  style={{ padding: '8px 20px', borderRadius: 9, background: '#8B5CF6', border: 'none', color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: '0.82rem' }}
                >
                  Add First Member
                </button>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 10, marginBottom: selectedMember ? 16 : 0 }}>
                {familyMembers.map(member => (
                  <div
                    key={member.id}
                    onClick={() => setSelectedMember(selectedMember?.id === member.id ? null : member)}
                    style={{
                      background: selectedMember?.id === member.id ? `${member.avatar_color}18` : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${selectedMember?.id === member.id ? member.avatar_color + '40' : '#2A2D3A'}`,
                      borderRadius: 10, padding: 12, cursor: 'pointer',
                      textAlign: 'center', transition: 'all 0.15s', position: 'relative'
                    }}
                  >
                    <div style={{
                      width: 44, height: 44, borderRadius: '50%',
                      background: member.avatar_color,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      margin: '0 auto 8px', color: '#fff', fontWeight: 700, fontSize: '1rem'
                    }}>
                      {getInitials(member.name)}
                    </div>
                    <div style={{ color: '#F8F9FA', fontWeight: 600, fontSize: '0.82rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{member.name}</div>
                    <div style={{ color: '#9CA3AF', fontSize: '0.7rem', marginTop: 2 }}>{member.relation}</div>
                    {member.age && <div style={{ color: '#6B7280', fontSize: '0.68rem' }}>{member.age}y{member.blood_type && ` · ${member.blood_type}`}</div>}
                    {member.report_count > 0 && (
                      <div style={{
                        position: 'absolute', top: 6, right: 6,
                        background: member.avatar_color, color: '#fff',
                        width: 18, height: 18, borderRadius: '50%',
                        fontSize: '0.6rem', display: 'flex', alignItems: 'center',
                        justifyContent: 'center', fontWeight: 700
                      }}>{member.report_count}</div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Selected member detail */}
            {selectedMember && (
              <div style={{ background: '#0F1117', border: `1px solid ${selectedMember.avatar_color}30`, borderRadius: 12, padding: 16, marginTop: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 40, height: 40, borderRadius: '50%', background: selectedMember.avatar_color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: '0.9rem', flexShrink: 0 }}>
                      {getInitials(selectedMember.name)}
                    </div>
                    <div>
                      <div style={{ color: '#F8F9FA', fontWeight: 700, fontSize: '0.95rem' }}>{selectedMember.name}</div>
                      <div style={{ color: '#9CA3AF', fontSize: '0.75rem' }}>
                        {selectedMember.relation}{selectedMember.age && ` · ${selectedMember.age}y`}{selectedMember.gender && ` · ${selectedMember.gender}`}
                        {selectedMember.blood_type && <span style={{ color: '#EF4444', fontWeight: 700, marginLeft: 4 }}>{selectedMember.blood_type}</span>}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      onClick={() => {
                        setEditingMember(selectedMember);
                        setMemberForm({
                          name: selectedMember.name, relation: selectedMember.relation,
                          age: selectedMember.age || '', gender: selectedMember.gender || '',
                          blood_type: selectedMember.blood_type || '',
                          known_conditions: selectedMember.known_conditions || '',
                          allergies: selectedMember.allergies || '',
                          weight_kg: selectedMember.weight_kg || '',
                          height_cm: selectedMember.height_cm || '',
                          notes: selectedMember.notes || ''
                        });
                        setMemberFormOpen(true);
                      }}
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid #2A2D3A', borderRadius: 7, color: '#9CA3AF', cursor: 'pointer', padding: '5px 8px', display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.72rem' }}
                    >
                      <Edit2 size={11} /> Edit
                    </button>
                    <button
                      onClick={() => handleDeleteMember(selectedMember.id, selectedMember.name)}
                      style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 7, color: '#EF4444', cursor: 'pointer', padding: '5px 8px', display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.72rem' }}
                    >
                      <X size={11} /> Remove
                    </button>
                  </div>
                </div>

                {/* Health info pills */}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
                  {selectedMember.known_conditions && (
                    <span style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', color: '#F59E0B', fontSize: '0.7rem', padding: '2px 8px', borderRadius: 6 }}>
                      🏥 {selectedMember.known_conditions.slice(0, 40)}{selectedMember.known_conditions.length > 40 ? '...' : ''}
                    </span>
                  )}
                  {selectedMember.allergies && (
                    <span style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#EF4444', fontSize: '0.7rem', padding: '2px 8px', borderRadius: 6 }}>
                      ⚠️ {selectedMember.allergies.slice(0, 40)}{selectedMember.allergies.length > 40 ? '...' : ''}
                    </span>
                  )}
                  {selectedMember.weight_kg && selectedMember.height_cm && (
                    <span style={{ background: 'rgba(37,99,235,0.1)', border: '1px solid rgba(37,99,235,0.15)', color: '#60A5FA', fontSize: '0.7rem', padding: '2px 8px', borderRadius: 6 }}>
                      BMI: {(selectedMember.weight_kg / ((selectedMember.height_cm / 100) ** 2)).toFixed(1)}
                    </span>
                  )}
                </div>

                {/* Reports */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <span style={{ color: '#9CA3AF', fontSize: '0.75rem', fontWeight: 600 }}>📋 Reports ({selectedMember.report_count})</span>
                    <>
                      <input ref={memberReportRef} type="file" style={{ display: 'none' }} accept=".pdf,.jpg,.jpeg,.png" onChange={handleUploadMemberReport} />
                      <button
                        onClick={() => memberReportRef.current?.click()}
                        disabled={uploadingReport}
                        style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 7, background: `${selectedMember.avatar_color}15`, border: `1px solid ${selectedMember.avatar_color}30`, color: selectedMember.avatar_color, cursor: uploadingReport ? 'not-allowed' : 'pointer', fontSize: '0.72rem', fontWeight: 600 }}
                      >
                        {uploadingReport ? '⏳' : '+ Upload Report'}
                      </button>
                    </>
                  </div>
                  {selectedMember.reports?.length === 0 ? (
                    <div style={{ color: '#6B7280', fontSize: '0.75rem', textAlign: 'center', padding: '12px 0' }}>No reports yet. Upload their first report.</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 260, overflowY: 'auto' }}>
                      {selectedMember.reports?.map(report => {
                        const hasExplanation = !!report.summary_text;
                        return (
                          <div key={report.id} style={{
                            background: 'rgba(255,255,255,0.03)',
                            border: '1px solid #2A2D3A',
                            borderRadius: 10, padding: '10px 12px',
                            cursor: 'pointer',
                            transition: 'border-color 0.15s'
                          }}
                            onMouseEnter={e => e.currentTarget.style.borderColor = selectedMember.avatar_color + '60'}
                            onMouseLeave={e => e.currentTarget.style.borderColor = '#2A2D3A'}
                          >
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                              {/* Icon */}
                              <div style={{
                                width: 32, height: 32, borderRadius: 8,
                                background: hasExplanation ? `${selectedMember.avatar_color}20` : 'rgba(107,114,128,0.1)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '0.9rem', flexShrink: 0
                              }}>📄</div>
                              {/* Info */}
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ color: '#F8F9FA', fontSize: '0.8rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {report.filename}
                                </div>
                                {report.report_type && (
                                  <span style={{ background: `${selectedMember.avatar_color}18`, color: selectedMember.avatar_color, fontSize: '0.62rem', padding: '1px 7px', borderRadius: 4, fontWeight: 600, textTransform: 'capitalize', display: 'inline-block', marginTop: 3 }}>
                                    {report.report_type.replace(/_/g, ' ')}
                                  </span>
                                )}
                                {report.summary_text && (
                                  <div style={{ color: '#9CA3AF', fontSize: '0.7rem', marginTop: 4, lineHeight: 1.45 }}>
                                    {report.summary_text.slice(0, 90)}{report.summary_text.length > 90 ? '…' : ''}
                                  </div>
                                )}
                                <div style={{ color: '#6B7280', fontSize: '0.63rem', marginTop: 3 }}>
                                  {new Date(report.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </div>
                              </div>
                              {/* Actions */}
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 }}>
                                <button
                                  onClick={() => setViewingReport({ report, member: selectedMember })}
                                  style={{
                                    padding: '4px 10px', borderRadius: 6, fontSize: '0.68rem', fontWeight: 700,
                                    background: hasExplanation ? `${selectedMember.avatar_color}18` : 'rgba(107,114,128,0.1)',
                                    border: `1px solid ${hasExplanation ? selectedMember.avatar_color + '35' : '#2A2D3A'}`,
                                    color: hasExplanation ? selectedMember.avatar_color : '#6B7280',
                                    cursor: 'pointer', whiteSpace: 'nowrap'
                                  }}
                                >
                                  {hasExplanation ? '📖 View' : '📄 Info'}
                                </button>
                                <button
                                  onClick={async () => {
                                    if (!window.confirm('Delete this report?')) return;
                                    try {
                                      await fetch(
                                        `http://localhost:8000/api/family/members/${selectedMember.id}/reports/${report.id}`,
                                        { method: 'DELETE', headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` } }
                                      );
                                      toast.success('Report deleted');
                                      await fetchFamilyMembers();
                                    } catch { toast.error('Failed to delete'); }
                                  }}
                                  style={{
                                    padding: '4px 8px', borderRadius: 6, fontSize: '0.68rem',
                                    background: 'rgba(239,68,68,0.08)',
                                    border: '1px solid rgba(239,68,68,0.2)',
                                    color: '#EF4444', cursor: 'pointer'
                                  }}
                                >🗑</button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Health Timeline ────────────────────────── */}
      <div className="card stagger-item" style={{ padding: 0, overflow: 'hidden' }}>
        
        {/* Timeline Header */}
        <div style={{
          padding: 'clamp(12px, 3vw, 18px) clamp(14px, 4vw, 24px)',
          borderBottom: '1px solid #2A2D3A',
          display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', flexWrap: 'wrap', gap: 12
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'rgba(37,99,235,0.12)',
              display: 'flex', alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Clock size={18} color="#2563EB" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>
                {t('dash_timeline')}
              </h3>
              <p style={{ 
                margin: 0, color: '#9CA3AF', 
                fontSize: '0.75rem' 
              }}>
                {allEvents.length} {t('dash_events_recorded')}
              </p>
            </div>
          </div>

          {/* Filter tabs */}
          <div style={{
            display: 'flex', gap: 6, flexWrap: 'wrap',
            overflowX: 'auto', paddingBottom: 4,
            WebkitOverflowScrolling: 'touch'
          }}>
            {[
              { key: 'all', label: t('dash_filter_all'), count: allEvents.length },
              { key: 'report', label: t('dash_filter_reports'), 
                count: allEvents.filter(e => e.type === 'report').length },
              { key: 'reminder', label: t('dash_filter_medicines'), 
                count: allEvents.filter(e => e.type === 'reminder').length },
              { key: 'plan', label: t('dash_filter_plans'), 
                count: allEvents.filter(e => e.type === 'plan').length },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => {
                  setTimelineFilter(tab.key)
                  setTimelineExpanded(false)
                }}
                style={{
                  padding: '5px 12px', borderRadius: 20,
                  border: timelineFilter === tab.key
                    ? '1.5px solid #2563EB'
                    : '1px solid #2A2D3A',
                  background: timelineFilter === tab.key
                    ? 'rgba(37,99,235,0.15)' : 'transparent',
                  color: timelineFilter === tab.key
                    ? '#60A5FA' : '#9CA3AF',
                  cursor: 'pointer', fontSize: '0.75rem',
                  fontWeight: timelineFilter === tab.key ? 600 : 400,
                  display: 'flex', alignItems: 'center', gap: 4
                }}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span style={{
                    background: timelineFilter === tab.key
                      ? '#2563EB' : '#2A2D3A',
                    color: timelineFilter === tab.key
                      ? '#fff' : '#9CA3AF',
                    borderRadius: 10, padding: '0 6px',
                    fontSize: '0.65rem', fontWeight: 700
                  }}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Timeline Body */}
        <div style={{ padding: '8px 24px 16px' }}>
          {filteredEvents.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🗓️</div>
              <h3>No health events yet</h3>
              <p>Upload your first report or add a medicine reminder to start your health timeline.</p>
            </div>
          ) : (
            <div style={{ position: 'relative' }}>
              
              {/* Vertical line */}
              <div style={{
                position: 'absolute', left: 19,
                top: 16, bottom: 16, width: 2,
                background: 'linear-gradient(to bottom, #2563EB, transparent)',
                opacity: 0.2, borderRadius: 1
              }} />

              {visibleEvents.map((event, index) => (
                <Link
                  key={event.id}
                  to={event.link}
                  style={{ textDecoration: 'none' }}
                >
                  <div className="stagger-item" style={{
                    display: 'flex', gap: 16, 
                    padding: '12px 0',
                    borderBottom: index < visibleEvents.length - 1
                      ? '1px solid rgba(42,45,58,0.5)' : 'none',
                    transition: 'all 0.15s',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = 
                      'rgba(255,255,255,0.02)'
                    e.currentTarget.style.borderRadius = '8px'
                    e.currentTarget.style.margin = '0 -8px'
                    e.currentTarget.style.padding = '12px 8px'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = 'transparent'
                    e.currentTarget.style.margin = '0'
                    e.currentTarget.style.padding = '12px 0'
                  }}
                  >
                    {/* Icon circle */}
                    <div style={{
                      width: 40, height: 40, borderRadius: '50%',
                      background: event.bg,
                      border: `2px solid ${event.color}30`,
                      display: 'flex', alignItems: 'center',
                      justifyContent: 'center', flexShrink: 0,
                      fontSize: '1rem', zIndex: 1,
                      position: 'relative'
                    }}>
                      {event.icon}
                    </div>

                    {/* Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        display: 'flex', justifyContent: 'space-between',
                        alignItems: 'flex-start', gap: 8, marginBottom: 4
                      }}>
                        <span style={{
                          fontWeight: 600, color: '#F8F9FA',
                          fontSize: '0.875rem',
                          whiteSpace: 'nowrap', overflow: 'hidden',
                          textOverflow: 'ellipsis', flex: 1
                        }}>
                          {event.title}
                        </span>
                        <span style={{
                          color: '#6B7280', fontSize: '0.72rem',
                          flexShrink: 0, whiteSpace: 'nowrap'
                        }}>
                          {formatTimelineDate(event.date)}
                        </span>
                      </div>

                      <div style={{
                        display: 'flex', alignItems: 'center',
                        gap: 8, flexWrap: 'wrap'
                      }}>
                        {event.subtitle && (
                          <span style={{
                            color: '#9CA3AF', fontSize: '0.78rem',
                            flex: 1, minWidth: 0,
                            whiteSpace: 'nowrap', overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}>
                            {event.subtitle}
                          </span>
                        )}
                        <span style={{
                          background: `${event.badgeColor}18`,
                          color: event.badgeColor,
                          fontSize: '0.68rem', padding: '2px 8px',
                          borderRadius: 6, fontWeight: 600,
                          flexShrink: 0, textTransform: 'capitalize'
                        }}>
                          {event.badge}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}

              {/* Show more / less */}
              {filteredEvents.length > 5 && (
                <div style={{ 
                  textAlign: 'center', paddingTop: 16 
                }}>
                  <button
                    onClick={() => setTimelineExpanded(!timelineExpanded)}
                    style={{
                      background: 'rgba(37,99,235,0.08)',
                      border: '1px solid rgba(37,99,235,0.2)',
                      borderRadius: 8, padding: '8px 20px',
                      color: '#60A5FA', cursor: 'pointer',
                      fontSize: '0.8rem', fontWeight: 600
                    }}
                  >
                    {timelineExpanded
                      ? t('dash_show_less')
                      : `↓ ${filteredEvents.length - 5} ${t('dash_show_more_events')}`}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h3 style={{ marginBottom: 16 }}>{t('dash_quick_actions')}</h3>
        <div className="quick-actions">
          {QUICK_ACTIONS.map(a => (
            <Link key={a.path} to={a.path} className="quick-action-card card-hover stagger-item">
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
          .stats-grid {
            grid-template-columns: 1fr 1fr !important;
            gap: 8px !important;
          }
          .stat-card {
            padding: 14px !important;
          }
          .stat-value {
            font-size: 1.2rem !important;
          }
          .quick-actions {
            grid-template-columns: 1fr 1fr !important;
            gap: 8px !important;
          }
          .quick-action-card {
            padding: 12px !important;
          }
          .section-header h3 {
            font-size: 0.9rem !important;
          }
        }
        @media (max-width: 380px) {
          .stats-grid {
            grid-template-columns: 1fr 1fr !important;
          }
          .quick-actions {
            grid-template-columns: 1fr 1fr !important;
          }
        }
      `}</style>
      {/* ── Add / Edit Member Modal ────────────────────── */}
      {memberFormOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, overflowY: 'auto' }}
          onClick={() => !savingMember && setMemberFormOpen(false)}>
          <div style={{ background: '#1A1D27', border: '1px solid #2A2D3A', borderRadius: 16, padding: 24, width: '100%', maxWidth: 480, boxShadow: '0 25px 80px rgba(0,0,0,0.6)' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ color: '#F8F9FA', fontWeight: 700, fontSize: '1rem', margin: 0 }}>
                {editingMember ? '✏️ Edit Member' : '👤 Add Family Member'}
              </h2>
              <button onClick={() => setMemberFormOpen(false)} style={{ background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ color: '#9CA3AF', fontSize: '0.78rem', fontWeight: 600, display: 'block', marginBottom: 6 }}>Full Name *</label>
                <input className="form-input" placeholder="e.g. Ravi Kumar" value={memberForm.name}
                  onChange={e => setMemberForm(p => ({ ...p, name: e.target.value }))} style={{ fontSize: '16px' }} />
              </div>
              <div>
                <label style={{ color: '#9CA3AF', fontSize: '0.78rem', fontWeight: 600, display: 'block', marginBottom: 6 }}>Relation *</label>
                <select value={memberForm.relation} onChange={e => setMemberForm(p => ({ ...p, relation: e.target.value }))}
                  style={{ width: '100%', fontSize: '16px', background: '#0F1117', border: '1px solid #2A2D3A', borderRadius: 8, padding: '10px 12px', color: '#F8F9FA' }}>
                  <option value="">Select...</option>
                  {RELATIONS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label style={{ color: '#9CA3AF', fontSize: '0.78rem', fontWeight: 600, display: 'block', marginBottom: 6 }}>Age</label>
                <input className="form-input" type="number" placeholder="e.g. 45" value={memberForm.age}
                  onChange={e => setMemberForm(p => ({ ...p, age: e.target.value }))} style={{ fontSize: '16px' }} />
              </div>
              <div>
                <label style={{ color: '#9CA3AF', fontSize: '0.78rem', fontWeight: 600, display: 'block', marginBottom: 6 }}>Gender</label>
                <select value={memberForm.gender} onChange={e => setMemberForm(p => ({ ...p, gender: e.target.value }))}
                  style={{ width: '100%', fontSize: '16px', background: '#0F1117', border: '1px solid #2A2D3A', borderRadius: 8, padding: '10px 12px', color: '#F8F9FA' }}>
                  <option value="">Select...</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label style={{ color: '#9CA3AF', fontSize: '0.78rem', fontWeight: 600, display: 'block', marginBottom: 6 }}>Blood Type</label>
                <select value={memberForm.blood_type} onChange={e => setMemberForm(p => ({ ...p, blood_type: e.target.value }))}
                  style={{ width: '100%', fontSize: '16px', background: '#0F1117', border: '1px solid #2A2D3A', borderRadius: 8, padding: '10px 12px', color: '#F8F9FA' }}>
                  <option value="">Unknown</option>
                  {BLOOD_TYPES.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              <div>
                <label style={{ color: '#9CA3AF', fontSize: '0.78rem', fontWeight: 600, display: 'block', marginBottom: 6 }}>Weight (kg)</label>
                <input className="form-input" type="number" placeholder="e.g. 70" value={memberForm.weight_kg}
                  onChange={e => setMemberForm(p => ({ ...p, weight_kg: e.target.value }))} style={{ fontSize: '16px' }} />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ color: '#9CA3AF', fontSize: '0.78rem', fontWeight: 600, display: 'block', marginBottom: 6 }}>Known Conditions</label>
                <input className="form-input" placeholder="e.g. Diabetes, Hypertension" value={memberForm.known_conditions}
                  onChange={e => setMemberForm(p => ({ ...p, known_conditions: e.target.value }))} style={{ fontSize: '16px' }} />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ color: '#9CA3AF', fontSize: '0.78rem', fontWeight: 600, display: 'block', marginBottom: 6 }}>Allergies</label>
                <input className="form-input" placeholder="e.g. Penicillin, Shellfish" value={memberForm.allergies}
                  onChange={e => setMemberForm(p => ({ ...p, allergies: e.target.value }))} style={{ fontSize: '16px' }} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button onClick={() => setMemberFormOpen(false)}
                style={{ flex: 1, padding: 11, background: 'rgba(107,114,128,0.1)', border: '1px solid #2A2D3A', borderRadius: 10, color: '#9CA3AF', cursor: 'pointer', fontWeight: 500 }}>
                Cancel
              </button>
              <button onClick={handleSaveMember} disabled={savingMember}
                style={{ flex: 2, padding: 11, background: savingMember ? 'rgba(139,92,246,0.3)' : '#8B5CF6', border: 'none', borderRadius: 10, color: '#fff', cursor: savingMember ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: '0.9rem' }}>
                {savingMember ? 'Saving...' : editingMember ? 'Update Member' : 'Add Member'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ── Report Viewer Modal ───────────────────────────── */}
      {viewingReport && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 3000, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '24px 16px', overflowY: 'auto' }}
          onClick={() => setViewingReport(null)}
        >
          <div
            style={{ background: '#1A1D27', border: '1px solid #2A2D3A', borderRadius: 18, width: '100%', maxWidth: 680, boxShadow: '0 30px 100px rgba(0,0,0,0.7)', overflow: 'hidden' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Modal header */}
            <div style={{ padding: '18px 22px', borderBottom: '1px solid #2A2D3A', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 38, height: 38, borderRadius: '50%', background: viewingReport.member.avatar_color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: '0.85rem', flexShrink: 0 }}>
                {getInitials(viewingReport.member.name)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: '#F8F9FA', fontWeight: 700, fontSize: '0.95rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {viewingReport.report.filename}
                </div>
                <div style={{ color: '#9CA3AF', fontSize: '0.73rem', marginTop: 2 }}>
                  {viewingReport.member.name} · {viewingReport.member.relation}
                  {viewingReport.report.report_type && (
                    <span style={{ marginLeft: 8, background: `${viewingReport.member.avatar_color}20`, color: viewingReport.member.avatar_color, padding: '1px 7px', borderRadius: 4, fontSize: '0.63rem', fontWeight: 600, textTransform: 'capitalize' }}>
                      {viewingReport.report.report_type.replace(/_/g, ' ')}
                    </span>
                  )}
                  <span style={{ marginLeft: 8, color: '#6B7280', fontSize: '0.68rem' }}>
                    {new Date(viewingReport.report.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexShrink: 0, flexWrap: 'wrap' }}>
                {/* View Document */}
                {viewingReport.report.has_file && (
                  <button
                    onClick={() => handleViewReportInTab(viewingReport.member, viewingReport.report)}
                    style={{ padding: '6px 11px', borderRadius: 8, background: 'rgba(37,99,235,0.1)', border: '1px solid rgba(37,99,235,0.25)', color: '#60A5FA', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}
                  >
                    <Eye size={13} /> View
                  </button>
                )}
                {/* Download */}
                {viewingReport.report.has_file && (
                  <button
                    onClick={() => handleDownloadReport(viewingReport.member, viewingReport.report)}
                    style={{ padding: '6px 11px', borderRadius: 8, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', color: '#10B981', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}
                  >
                    <Download size={13} /> Download
                  </button>
                )}
                {/* Delete */}
                <button
                  onClick={async () => {
                    if (!window.confirm('Delete this report?')) return;
                    try {
                      await fetch(
                        `http://localhost:8000/api/family/members/${viewingReport.member.id}/reports/${viewingReport.report.id}`,
                        { method: 'DELETE', headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` } }
                      );
                      toast.success('Report deleted');
                      setViewingReport(null);
                      await fetchFamilyMembers();
                    } catch { toast.error('Failed to delete'); }
                  }}
                  style={{ padding: '6px 12px', borderRadius: 8, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#EF4444', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}
                >
                  <X size={13} /> Delete
                </button>
                <button onClick={() => setViewingReport(null)} style={{ background: 'rgba(107,114,128,0.1)', border: '1px solid #2A2D3A', borderRadius: 8, color: '#9CA3AF', cursor: 'pointer', padding: '6px 10px', display: 'flex', alignItems: 'center' }}>
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Content */}
            <div style={{ padding: '20px 24px', maxHeight: '72vh', overflowY: 'auto' }}>
              {viewingReport.report.summary_text ? (
                <>
                  {/* AI analysis badge */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18, padding: '10px 14px', background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.15)', borderRadius: 10 }}>
                    <span style={{ fontSize: '1rem' }}>🤖</span>
                    <div>
                      <div style={{ color: '#10B981', fontWeight: 700, fontSize: '0.78rem' }}>AI Medical Explanation</div>
                      <div style={{ color: '#6B7280', fontSize: '0.68rem' }}>Generated automatically on upload · For guidance only</div>
                    </div>
                  </div>
                  {/* Markdown content */}
                  <div style={{
                    color: '#D1D5DB', fontSize: '0.875rem', lineHeight: 1.75
                  }}>
                    <ReactMarkdown
                      components={{
                        h1: ({children}) => <h1 style={{ color: '#F8F9FA', fontSize: '1.1rem', fontWeight: 700, marginBottom: 12, marginTop: 20, borderBottom: '1px solid #2A2D3A', paddingBottom: 8 }}>{children}</h1>,
                        h2: ({children}) => <h2 style={{ color: '#F8F9FA', fontSize: '0.95rem', fontWeight: 700, marginBottom: 10, marginTop: 18 }}>{children}</h2>,
                        h3: ({children}) => <h3 style={{ color: '#E5E7EB', fontSize: '0.875rem', fontWeight: 600, marginBottom: 8, marginTop: 14 }}>{children}</h3>,
                        p: ({children}) => <p style={{ color: '#D1D5DB', marginBottom: 12, lineHeight: 1.75 }}>{children}</p>,
                        ul: ({children}) => <ul style={{ paddingLeft: 20, marginBottom: 12 }}>{children}</ul>,
                        ol: ({children}) => <ol style={{ paddingLeft: 20, marginBottom: 12 }}>{children}</ol>,
                        li: ({children}) => <li style={{ color: '#D1D5DB', marginBottom: 6, lineHeight: 1.6 }}>{children}</li>,
                        strong: ({children}) => <strong style={{ color: '#F8F9FA', fontWeight: 700 }}>{children}</strong>,
                        em: ({children}) => <em style={{ color: '#A5B4FC', fontStyle: 'italic' }}>{children}</em>,
                        code: ({children}) => <code style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 4, padding: '1px 5px', fontSize: '0.82rem', color: '#A5B4FC', fontFamily: 'monospace' }}>{children}</code>,
                        blockquote: ({children}) => <blockquote style={{ borderLeft: '3px solid #2563EB', paddingLeft: 14, color: '#9CA3AF', margin: '12px 0', fontStyle: 'italic' }}>{children}</blockquote>
                      }}
                    >
                      {viewingReport.report.summary_text}
                    </ReactMarkdown>
                  </div>
                  {/* Disclaimer */}
                  <div style={{ marginTop: 20, padding: '10px 14px', background: 'rgba(107,114,128,0.06)', borderRadius: 8, border: '1px solid #2A2D3A', fontSize: '0.7rem', color: '#6B7280', lineHeight: 1.5 }}>
                    ⚠️ This AI explanation is for informational purposes only and does not constitute medical advice. Always consult a qualified healthcare professional for diagnosis and treatment.
                  </div>
                </>
              ) : (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: '#6B7280' }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>📄</div>
                  <h3 style={{ color: '#9CA3AF', fontWeight: 600, fontSize: '0.95rem', marginBottom: 8 }}>No AI Explanation Available</h3>
                  <p style={{ fontSize: '0.8rem', maxWidth: 300, margin: '0 auto' }}>This report was uploaded but the AI explanation could not be generated at that time.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Dashboard;
