import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getProfile, getReports, getCurrentUser, getReminders, getCurrentPlans } from '../services/api';
import { FileText, MessageSquare, ScanLine, MapPin, Lightbulb, Activity, ChevronRight, Bell, Calendar, Pill, TrendingUp, Clock } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
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

  useEffect(() => {
    const load = async () => {
      try {
        const [userRes, profRes, repRes, remRes, planRes] = await Promise.all([
          getCurrentUser().catch(() => null),
          getProfile().catch(() => null),
          getReports().catch(() => ({ data: [] })),
          getReminders().catch(() => ({ data: { reminders: [] } })),
          getCurrentPlans().catch(() => ({ data: {} })),
        ]);
        if (userRes) setUser(userRes.data);
        if (profRes) setProfile(profRes.data);
        setReports(repRes.data || []);
        setReminders(remRes.data?.reminders || []);
        setPlans(planRes.data || {});
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
      <div className="page-header" style={{ marginBottom: 0 }}>
        <h1 style={{ fontSize: 'clamp(1.2rem, 4vw, 2rem)' }}>
          {t('dash_greeting')}, {displayName} 👋
        </h1>
        <p>{t('dash_subtitle')}</p>
      </div>

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
    </div>
  );
};

export default Dashboard;
