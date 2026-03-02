import React, { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { getReports, uploadReport, explainReport, getTrends, deleteReport } from '../services/api';
import { Upload, FileText, CheckCircle, Search, AlertCircle, Loader, TrendingUp, Trash2, Image } from 'lucide-react';
import confetti from 'canvas-confetti';
import toast from 'react-hot-toast';

const STATUS_STYLE = (s) => {
  const st = (s || '').toUpperCase();
  const isRed = ['HIGH', 'ABNORMAL', 'POSITIVE', 'SEEN', 'DETECTED'].includes(st);
  const isAmber = st === 'LOW';
  const isGreen = ['NORMAL', 'NEGATIVE', 'NOT SEEN', 'NOT DETECTED'].includes(st);
  return {
    padding: '2px 10px', borderRadius: 20, fontSize: '0.72rem', fontWeight: 700,
    background: isRed ? 'rgba(239,68,68,.15)' : isAmber ? 'rgba(245,158,11,.15)' : isGreen ? 'rgba(16,185,129,.15)' : 'rgba(107,114,128,.15)',
    color: isRed ? '#EF4444' : isAmber ? '#F59E0B' : isGreen ? '#10B981' : '#9CA3AF',
  };
};

const Reports = () => {
  const [reports, setReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('list');
  const [trends, setTrends] = useState(null);
  const [loadingTrends, setLoadingTrends] = useState(false);

  useEffect(() => { fetchReports(); }, []);

  const fetchReports = async () => {
    try {
      const res = await getReports();
      setReports(res.data || []);
    } catch (err) {
      console.error("Failed to fetch reports", err);
    }
  };

  const handleDelete = async (reportId, e) => {
    e.stopPropagation();
    if (!window.confirm('Delete this report?')) return;
    // Optimistic update
    setReports(prev => prev.filter(r => r.id !== reportId));
    if (selectedReport?.id === reportId) { setSelectedReport(null); setAnalysis(null); }
    try {
      await deleteReport(reportId);
      toast.success('Report deleted');
    } catch (err) {
      toast.error('Failed to delete report');
      fetchReports(); // Re-fetch on failure
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      await uploadReport(formData);
      await fetchReports();
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      toast.success('Report uploaded and analyzed!');
    } catch (err) {
      toast.error("Upload failed. " + (err.response?.data?.detail || "Please try again."));
    } finally {
      setUploading(false);
    }
  };

  const handleExplain = async (reportId) => {
    setLoading(true);
    setAnalysis(null);
    try {
      const res = await explainReport(reportId);
      setAnalysis(res.data);
    } catch (err) {
      toast.error("Explanation failed");
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    setViewMode('trends');
    setLoadingTrends(true);
    try {
      const res = await getTrends();
      setTrends(res.data);
    } catch (err) {
      toast.error("Failed to fetch trends");
    } finally {
      setLoadingTrends(false);
    }
  };

  const formatDate = (d) => {
    if (!d) return '';
    const dt = new Date(d);
    return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const filteredReports = reports.filter(r =>
    r.filename?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const isImage = (ft) => ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes((ft || '').toLowerCase());

  // Extract parameters from analysis response
  const params = analysis?.structured_data?.parameters
    || analysis?.gemini_extraction?.structured_data?.parameters
    || [];
  const critAlerts = analysis?.gemini_extraction?.critical_alerts
    || analysis?.critical_alerts
    || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div className="page-header" style={{ marginBottom: 0 }}>
          <h1>Medical Reports</h1>
          <p>Your uploaded medical documents</p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button
            className={`btn btn-ghost ${viewMode === 'trends' ? 'btn-primary' : ''}`}
            onClick={fetchAnalytics}
          >
            <TrendingUp size={16} /> Longitudinal Analysis
          </button>
          <label className="btn btn-primary" style={{ cursor: 'pointer' }}>
            <Upload size={16} /> {uploading ? 'Analyzing…' : 'Upload New Report'}
            <input type="file" hidden onChange={handleFileUpload} disabled={uploading} accept=".pdf,.jpg,.jpeg,.png" />
          </label>
        </div>
      </div>

      {/* Two-column layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 20, minHeight: 'calc(100vh - 220px)' }}>
        {/* LEFT — Report List */}
        <div className="card" style={{ padding: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '16px 16px 0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700 }}>Archived Reports</h3>
              {viewMode === 'trends' && (
                <button className="btn btn-ghost btn-sm" onClick={() => setViewMode('list')} style={{ fontSize: '0.75rem' }}>
                  ← Back
                </button>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#21253A', padding: '8px 12px', borderRadius: 8, marginBottom: 12 }}>
              <Search size={14} style={{ color: '#9CA3AF', flexShrink: 0 }} />
              <input
                type="text"
                placeholder="Search files…"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                style={{ background: 'transparent', border: 'none', color: '#F8F9FA', width: '100%', outline: 'none', fontSize: '0.8rem' }}
              />
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '0 8px 8px' }}>
            {filteredReports.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px 16px', color: '#6B7280' }}>
                <FileText size={28} style={{ opacity: 0.4, marginBottom: 8 }} />
                <p style={{ fontSize: '0.8rem' }}>No reports uploaded yet</p>
              </div>
            )}
            {filteredReports.map(r => (
              <div
                key={r.id}
                onClick={() => { setSelectedReport(r); setAnalysis(null); setViewMode('list'); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                  borderRadius: 8, cursor: 'pointer', marginBottom: 2, position: 'relative',
                  borderLeft: selectedReport?.id === r.id ? '3px solid #2563EB' : '3px solid transparent',
                  background: selectedReport?.id === r.id ? 'rgba(37,99,235,.08)' : 'transparent',
                  transition: 'all .15s ease',
                }}
                onMouseEnter={e => { if (selectedReport?.id !== r.id) e.currentTarget.style.background = 'rgba(255,255,255,.03)'; }}
                onMouseLeave={e => { if (selectedReport?.id !== r.id) e.currentTarget.style.background = 'transparent'; }}
              >
                <div style={{ color: isImage(r.file_type) ? '#F59E0B' : '#2563EB', flexShrink: 0 }}>
                  {isImage(r.file_type) ? <Image size={16} /> : <FileText size={16} />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {r.filename?.length > 25 ? r.filename.slice(0, 25) + '…' : r.filename}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#9CA3AF' }}>{formatDate(r.created_at)}</div>
                </div>
                <button
                  onClick={(e) => handleDelete(r.id, e)}
                  className="delete-report-btn-inline"
                  style={{
                    opacity: 0, background: 'rgba(239,68,68,.1)', border: 'none', color: '#EF4444',
                    padding: '4px 6px', borderRadius: 6, cursor: 'pointer', transition: 'opacity .15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.opacity = 1}
                  title="Delete report"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT — Report Detail / Trends */}
        <div className="card" style={{ padding: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {viewMode === 'trends' ? (
            <div style={{ padding: 28, overflowY: 'auto', flex: 1 }}>
              <h2 style={{ marginBottom: 4 }}>Health Progress & Trends</h2>
              <p style={{ fontSize: '0.85rem', marginBottom: 20 }}>Comparing {reports.length} reports</p>
              {loadingTrends ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 200, gap: 12, color: '#9CA3AF' }}>
                  <Loader className="spin" size={32} /> <p>Analyzing clinical history…</p>
                </div>
              ) : trends ? (
                <div className="markdown-content">
                  <ReactMarkdown>{trends.overall_summary || JSON.stringify(trends, null, 2)}</ReactMarkdown>
                </div>
              ) : (
                <div style={{ textAlign: 'center', color: '#6B7280', padding: 40 }}>
                  <AlertCircle size={36} style={{ marginBottom: 8 }} />
                  <p>Could not load trend data. Upload at least 2 reports.</p>
                </div>
              )}
            </div>
          ) : selectedReport ? (
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
              {/* Report header */}
              <div style={{ padding: '20px 24px', borderBottom: '1px solid #2A2D3A', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <h2 style={{ fontSize: '1.1rem', marginBottom: 4 }}>{selectedReport.filename}</h2>
                  <span className="badge badge-blue" style={{ textTransform: 'uppercase', fontSize: '0.7rem' }}>
                    {selectedReport.file_type || 'document'}
                  </span>
                </div>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => handleExplain(selectedReport.id)}
                  disabled={loading}
                >
                  {loading ? <><Loader className="spin" size={14} /> Analyzing…</> : 'Generate Medical Explanation'}
                </button>
              </div>

              {/* Content */}
              <div style={{ flex: 1, overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
                {/* Analysis results */}
                {analysis && (
                  <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    {/* Doc type badge */}
                    {analysis.document_type && (
                      <div>
                        <span className="badge badge-purple">{analysis.document_type}</span>
                      </div>
                    )}

                    {/* Lab Parameters Table */}
                    {params.length > 0 && (
                      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                        <div style={{ padding: '14px 18px', borderBottom: '1px solid #2A2D3A', fontWeight: 600, fontSize: '0.9rem' }}>
                          Lab Values ({params.length} parameters)
                        </div>
                        <div style={{ overflowX: 'auto' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                            <thead>
                              <tr style={{ borderBottom: '1px solid #2A2D3A' }}>
                                {['Test', 'Result', 'Reference Range', 'Status'].map(h => (
                                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', color: '#9CA3AF', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {params.map((p, i) => (
                                <tr key={i} style={{ borderBottom: '1px solid rgba(42,45,58,.5)' }}>
                                  <td style={{ padding: '10px 14px', fontWeight: 500 }}>{p.name || p.test_name || '—'}</td>
                                  <td style={{ padding: '10px 14px' }}>{p.value}{p.unit ? ` ${p.unit}` : ''}</td>
                                  <td style={{ padding: '10px 14px', color: '#9CA3AF' }}>{p.reference_range || p.normal_range || '—'}</td>
                                  <td style={{ padding: '10px 14px' }}><span style={STATUS_STYLE(p.status)}>{p.status || '—'}</span></td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* AI Clinical Assessment */}
                    <div style={{ background: '#1A1D27', border: '1px solid rgba(16,185,129,.2)', borderRadius: 12, padding: 20 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                        <CheckCircle color="#10B981" size={20} />
                        <h3 style={{ fontSize: '0.95rem' }}>AI Clinical Assessment</h3>
                        {analysis.confidence && (
                          <span style={{ marginLeft: 'auto', padding: '2px 10px', borderRadius: 20, fontSize: '0.7rem', fontWeight: 700, background: 'rgba(16,185,129,.12)', color: '#10B981', textTransform: 'uppercase' }}>
                            {analysis.confidence}
                          </span>
                        )}
                      </div>
                      <div className="markdown-content">
                        <ReactMarkdown>{analysis.explanation || ''}</ReactMarkdown>
                      </div>
                    </div>

                    {/* Critical Alerts */}
                    {critAlerts.length > 0 && (
                      <div style={{ background: 'rgba(239,68,68,.06)', border: '1px solid rgba(239,68,68,.25)', borderRadius: 12, padding: 16 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, color: '#EF4444', fontWeight: 600, fontSize: '0.9rem' }}>
                          <AlertCircle size={18} /> Critical Alerts
                        </div>
                        <ul style={{ paddingLeft: 20, color: '#F87171', fontSize: '0.85rem' }}>
                          {critAlerts.map((a, i) => <li key={i} style={{ marginBottom: 4 }}>{typeof a === 'string' ? a : a.message || JSON.stringify(a)}</li>)}
                        </ul>
                      </div>
                    )}

                    {/* Disclaimer */}
                    <div style={{ fontSize: '0.72rem', color: '#6B7280', borderTop: '1px solid #2A2D3A', paddingTop: 12 }}>
                      ⚕️ This analysis is AI-generated for informational purposes only. Always consult a qualified healthcare professional for diagnosis and treatment.
                    </div>
                  </div>
                )}

                {/* Summary if no analysis generated yet */}
                {!analysis && selectedReport.summary_text && (
                  <div className="animate-in">
                    <h3 style={{ marginBottom: 10, fontSize: '0.95rem' }}>Auto-Generated Summary</h3>
                    <div className="markdown-content">
                      <ReactMarkdown>{selectedReport.summary_text}</ReactMarkdown>
                    </div>
                  </div>
                )}

                {/* Empty state */}
                {!analysis && !loading && !selectedReport.summary_text && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, color: '#6B7280', gap: 12 }}>
                    <AlertCircle size={40} style={{ opacity: 0.3 }} />
                    <p style={{ fontSize: '0.875rem' }}>Click <strong>"Generate Medical Explanation"</strong> to start AI reasoning.</p>
                  </div>
                )}

                {/* Loading */}
                {loading && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: 10, color: '#9CA3AF' }}>
                    <Loader className="spin" size={32} /> <p>Generating medical analysis…</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, color: '#6B7280', gap: 16 }}>
              <FileText size={48} style={{ opacity: 0.2 }} />
              <p>Select a report to view details</p>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        div:hover > .delete-report-btn-inline { opacity: 1 !important; }
        @media (max-width: 768px) {
          div[style*="grid-template-columns: 300px"] { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
};

export default Reports;
