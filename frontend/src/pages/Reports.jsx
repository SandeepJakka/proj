import React, { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { getReports, uploadReport, explainReport, getTrends, deleteReport, compareReports, getReportsByType } from '../services/api';
import { Upload, FileText, CheckCircle, Search, AlertCircle, Loader, TrendingUp, Trash2, Image, GitCompare, ArrowRight } from 'lucide-react';
import confetti from 'canvas-confetti';
import toast from 'react-hot-toast';

// ── ReportSelector sub-component ────────────────────────
const ReportSelector = ({ label, selected, onSelect, reports, otherSelected }) => (
  <div style={{ flex: 1 }}>
    <label style={{ color: '#9CA3AF', fontSize: '0.78rem', fontWeight: 600, display: 'block', marginBottom: 8 }}>
      {label}
    </label>
    <div style={{ border: '1px solid #2A2D3A', borderRadius: 10, overflow: 'hidden', maxHeight: 220, overflowY: 'auto' }}>
      {reports.map(r => {
        const isOther = otherSelected?.id === r.id;
        const isSelected = selected?.id === r.id;
        return (
          <div
            key={r.id}
            onClick={() => !isOther && onSelect(r)}
            style={{
              padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10,
              cursor: isOther ? 'not-allowed' : 'pointer',
              background: isSelected ? 'rgba(37,99,235,0.15)' : isOther ? 'rgba(107,114,128,0.05)' : 'transparent',
              borderBottom: '1px solid #2A2D3A',
              opacity: isOther ? 0.4 : 1,
              transition: 'background 0.15s',
            }}
          >
            <FileText size={14} color={isSelected ? '#60A5FA' : '#6B7280'} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: '0.8rem', fontWeight: 600,
                color: isSelected ? '#60A5FA' : '#F8F9FA',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                {r.filename}
              </div>
              <div style={{ fontSize: '0.7rem', color: '#6B7280' }}>
                {new Date(r.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </div>
            </div>
            {isSelected && (
              <div style={{
                width: 18, height: 18, borderRadius: '50%', background: '#2563EB',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <span style={{ color: '#fff', fontSize: '0.65rem', fontWeight: 700 }}>✓</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  </div>
);

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
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerReport, setViewerReport] = useState(null);
  const [fileUrl, setFileUrl] = useState(null);
  const [fileLoading, setFileLoading] = useState(false);
  const [fileType, setFileType] = useState(null);

  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Compare state
  const [compareOpen, setCompareOpen] = useState(false);
  const [compareReport1, setCompareReport1] = useState(null);
  const [compareReport2, setCompareReport2] = useState(null);
  const [compareResult, setCompareResult] = useState(null);
  const [comparing, setComparing] = useState(false);
  const [compareLanguage, setCompareLanguage] = useState('english');
  const [secondOpinionOpen, setSecondOpinionOpen] = useState(false)
  const [secondOpinionResult, setSecondOpinionResult] = useState(null)
  const [secondOpinionLoading, setSecondOpinionLoading] = useState(false)
  const [decodeOpen, setDecodeOpen] = useState(false)
  const [decodeResult, setDecodeResult] = useState(null)
  const [decodeLoading, setDecodeLoading] = useState(false)
  const [aiLanguage, setAiLanguage] = useState('english')

  useEffect(() => { fetchReports(); }, []);

  const closeViewer = () => {
    setViewerOpen(false);
    if (fileUrl) {
      URL.revokeObjectURL(fileUrl);
      setFileUrl(null);
    }
    setViewerReport(null);
  };

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

  const handleCompare = async () => {
    if (!compareReport1 || !compareReport2) {
      toast.error('Please select two reports to compare');
      return;
    }
    if (compareReport1.id === compareReport2.id) {
      toast.error('Please select two different reports');
      return;
    }
    setComparing(true);
    setCompareResult(null);
    try {
      const res = await compareReports(compareReport1.id, compareReport2.id, compareLanguage);
      setCompareResult(res.data);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Comparison failed. Please try again.');
    } finally {
      setComparing(false);
    }
  };

  const handleSecondOpinion = async () => {
    if (!selectedReport) return
    setSecondOpinionLoading(true)
    setSecondOpinionResult(null)
    try {
      const token = localStorage.getItem('access_token')
      const res = await fetch(
        `http://localhost:8000/api/reports/${selectedReport.id}/second-opinion?language=${aiLanguage}`,
        {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        }
      )
      const data = await res.json()
      if (data.success) {
        setSecondOpinionResult(data.data)
      } else {
        toast.error(data.error || 'Failed to get second opinion')
      }
    } catch {
      toast.error('Connection error. Please try again.')
    } finally {
      setSecondOpinionLoading(false)
    }
  }

  const handleDecode = async () => {
    if (!selectedReport) return
    setDecodeLoading(true)
    setDecodeResult(null)
    try {
      const token = localStorage.getItem('access_token')
      const res = await fetch(
        `http://localhost:8000/api/reports/${selectedReport.id}/decode-discharge?language=${aiLanguage}`,
        {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        }
      )
      const data = await res.json()
      if (data.success) {
        setDecodeResult(data.data)
      } else {
        toast.error(data.error || 'Failed to decode summary')
      }
    } catch {
      toast.error('Connection error. Please try again.')
    } finally {
      setDecodeLoading(false)
    }
  }

  const openCompareModal = () => {
    setCompareOpen(true);
    setCompareReport1(null);
    setCompareReport2(null);
    setCompareResult(null);
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
    <div className="page-enter" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div className="page-header" style={{ marginBottom: 0 }}>
          <h1>Medical Reports</h1>
          <p>Your uploaded medical documents</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', width: isMobile ? '100%' : 'auto' }}>
          <button
            className="btn btn-ghost"
            onClick={openCompareModal}
            disabled={reports.length < 2}
            title={reports.length < 2 ? 'Upload at least 2 reports to compare' : ''}
            style={{ fontSize: 'clamp(0.72rem, 2.5vw, 0.85rem)', padding: 'clamp(6px, 2vw, 10px) clamp(10px, 3vw, 16px)' }}
          >
            <GitCompare size={16} /> Compare Reports
          </button>
          <button
            className={`btn btn-ghost ${viewMode === 'trends' ? 'btn-primary' : ''}`}
            onClick={fetchAnalytics}
            style={{ fontSize: 'clamp(0.72rem, 2.5vw, 0.85rem)', padding: 'clamp(6px, 2vw, 10px) clamp(10px, 3vw, 16px)' }}
          >
            <TrendingUp size={16} /> Longitudinal Analysis
          </button>
          <label className="btn btn-primary" style={{ cursor: 'pointer', fontSize: 'clamp(0.72rem, 2.5vw, 0.85rem)', padding: 'clamp(6px, 2vw, 10px) clamp(10px, 3vw, 16px)' }}>
            <Upload size={16} /> {uploading ? 'Analyzing…' : 'Upload New Report'}
            <input type="file" hidden onChange={handleFileUpload} disabled={uploading} accept=".pdf,.jpg,.jpeg,.png" />
          </label>
        </div>
      </div>

      {/* Two-column layout */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : '300px 1fr',
        gap: isMobile ? 16 : 20,
        minHeight: isMobile ? 'auto' : 'calc(100vh - 220px)'
      }}>
        {/* LEFT — Report List */}
        <div className="card" style={{
          padding: 0, display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
          maxHeight: isMobile ? 320 : 'none'
        }}>
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
              <div className="empty-state" style={{ padding: '32px 16px' }}>
                <div className="empty-state-icon">📂</div>
                <h3>No reports yet</h3>
                <p>Upload your first medical report to get an AI-powered explanation.</p>
              </div>
            )}
            {filteredReports.map(r => (
              <div
                key={r.id}
                onClick={() => { setSelectedReport(r); setAnalysis(null); setViewMode('list'); }}
                className="stagger-item card-hover"
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
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div className="skeleton skeleton-title" style={{ width: '40%' }} />
                  <div className="skeleton skeleton-text" style={{ width: '100%' }} />
                  <div className="skeleton skeleton-text" style={{ width: '85%' }} />
                  <div className="skeleton skeleton-text" style={{ width: '70%' }} />
                  <div className="skeleton skeleton-text" style={{ width: '90%' }} />
                  <div className="skeleton skeleton-text" style={{ width: '60%' }} />
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
              <div style={{
                padding: isMobile ? '14px 16px' : '20px 24px',
                borderBottom: '1px solid #2A2D3A',
                display: 'flex', justifyContent: 'space-between',
                alignItems: isMobile ? 'flex-start' : 'center',
                flexWrap: 'wrap', gap: 10
              }}>
                <div>
                  <h2 style={{ fontSize: '1.1rem', marginBottom: 4 }}>{selectedReport.filename}</h2>
                  <span className="badge badge-blue" style={{ textTransform: 'uppercase', fontSize: '0.7rem' }}>
                    {selectedReport.file_type || 'document'}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button
                    onClick={async () => {
                      setViewerReport(selectedReport);
                      setViewerOpen(true);
                      setFileUrl(null);
                      setFileLoading(true);
                      setFileType(selectedReport.file_type);

                      try {
                        // Fetch the file as a blob with auth token
                        const token = localStorage.getItem('access_token');
                        const res = await fetch(
                          `http://localhost:8000/api/reports/${selectedReport.id}/file`,
                          {
                            headers: { 'Authorization': `Bearer ${token}` }
                          }
                        );

                        if (!res.ok) throw new Error('File not available');

                        const blob = await res.blob();
                        const url = URL.createObjectURL(blob);
                        setFileUrl(url);
                      } catch (err) {
                        toast.error('Could not load file. It may have been uploaded before this feature.');
                        setFileUrl(null);
                      } finally {
                        setFileLoading(false);
                      }
                    }}
                    style={{
                      background: 'rgba(37,99,235,0.1)',
                      border: '1px solid rgba(37,99,235,0.2)',
                      borderRadius: 8, padding: '6px 14px',
                      color: '#60A5FA', cursor: 'pointer',
                      fontSize: 'clamp(0.72rem, 2.5vw, 0.8rem)', fontWeight: 500,
                      display: 'flex', alignItems: 'center', gap: 6
                    }}
                  >
                    👁 View Report
                  </button>
                  <div style={{
                    display: 'flex', alignItems: 'center',
                    gap: 6, marginRight: 4
                  }}>
                    {['english', 'telugu'].map(lang => (
                      <button
                        key={lang}
                        onClick={() => setAiLanguage(lang)}
                        style={{
                          padding: '4px 10px', borderRadius: 6,
                          border: aiLanguage === lang
                            ? '1.5px solid #2563EB'
                            : '1px solid #2A2D3A',
                          background: aiLanguage === lang
                            ? 'rgba(37,99,235,0.15)' : 'transparent',
                          color: aiLanguage === lang ? '#60A5FA' : '#6B7280',
                          cursor: 'pointer', fontSize: '0.7rem',
                          fontWeight: aiLanguage === lang ? 600 : 400
                        }}
                      >
                        {lang === 'english' ? 'EN' : 'తె'}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() => {
                      setSecondOpinionOpen(true)
                      setSecondOpinionResult(null)
                      handleSecondOpinion()
                    }}
                    disabled={secondOpinionLoading || !selectedReport?.has_analysis}
                    title={!selectedReport?.has_analysis
                      ? 'Generate explanation first'
                      : 'Get AI second opinion'}
                    style={{
                      background: 'rgba(139,92,246,0.1)',
                      border: '1px solid rgba(139,92,246,0.2)',
                      borderRadius: 8, padding: '6px 14px',
                      color: secondOpinionLoading ? '#6B7280' : '#A78BFA',
                      cursor: !selectedReport?.has_analysis
                        ? 'not-allowed' : 'pointer',
                      fontSize: '0.8rem', fontWeight: 500,
                      display: 'flex', alignItems: 'center', gap: 6,
                      opacity: !selectedReport?.has_analysis ? 0.5 : 1
                    }}
                  >
                    {secondOpinionLoading
                      ? '⏳ Analyzing...'
                      : '🔍 Second Opinion'}
                  </button>

                  <button
                    onClick={() => {
                      setDecodeOpen(true)
                      setDecodeResult(null)
                      handleDecode()
                    }}
                    disabled={decodeLoading || !selectedReport?.has_analysis}
                    title={!selectedReport?.has_analysis
                      ? 'Generate explanation first'
                      : 'Decode discharge summary'}
                    style={{
                      background: 'rgba(16,185,129,0.1)',
                      border: '1px solid rgba(16,185,129,0.2)',
                      borderRadius: 8, padding: '6px 14px',
                      color: decodeLoading ? '#6B7280' : '#34D399',
                      cursor: !selectedReport?.has_analysis
                        ? 'not-allowed' : 'pointer',
                      fontSize: '0.8rem', fontWeight: 500,
                      display: 'flex', alignItems: 'center', gap: 6,
                      opacity: !selectedReport?.has_analysis ? 0.5 : 1
                    }}
                  >
                    {decodeLoading
                      ? '⏳ Decoding...'
                      : '📋 Decode Summary'}
                  </button>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => handleExplain(selectedReport.id)}
                    disabled={loading}
                    style={{ fontSize: 'clamp(0.72rem, 2.5vw, 0.8rem)' }}
                  >
                    {loading ? <><Loader className="spin" size={14} /> Analyzing…</> : 'Generate Medical Explanation'}
                  </button>
                </div>
              </div>

              {/* Content */}
              <div style={{
                flex: 1, overflowY: 'auto',
                padding: isMobile ? '14px 14px' : 24,
                display: 'flex', flexDirection: 'column', gap: 16
              }}>
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
                          <table style={{
                            width: '100%', borderCollapse: 'collapse',
                            fontSize: isMobile ? '0.72rem' : '0.82rem'
                          }}>
                            <thead>
                              <tr style={{ borderBottom: '1px solid #2A2D3A' }}>
                                {['Test', 'Result', 'Reference Range', 'Status'].map(h => (
                                  <th key={h} style={{ padding: isMobile ? '8px 10px' : '10px 14px', textAlign: 'left', color: '#9CA3AF', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {params.map((p, i) => (
                                <tr key={i} style={{ borderBottom: '1px solid rgba(42,45,58,.5)' }}>
                                  <td style={{ padding: isMobile ? '8px 10px' : '10px 14px', fontWeight: 500 }}>{p.name || p.test_name || '—'}</td>
                                  <td style={{ padding: isMobile ? '8px 10px' : '10px 14px' }}>{p.value}{p.unit ? ` ${p.unit}` : ''}</td>
                                  <td style={{ padding: isMobile ? '8px 10px' : '10px 14px', color: '#9CA3AF' }}>{p.reference_range || p.normal_range || '—'}</td>
                                  <td style={{ padding: isMobile ? '8px 10px' : '10px 14px' }}><span style={STATUS_STYLE(p.status)}>{p.status || '—'}</span></td>
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
            <div className="empty-state" style={{ flex: 1 }}>
              <div className="empty-state-icon">👈</div>
              <h3>Select a report</h3>
              <p>Choose a report from the list to view its details and AI analysis.</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Second Opinion Modal ────────────────────────────────── */}
      {secondOpinionOpen && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 2000,
          background: 'rgba(0,0,0,0.85)',
          backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'flex-start',
          justifyContent: 'center',
          padding: '20px', overflowY: 'auto'
        }} onClick={() => !secondOpinionLoading && setSecondOpinionOpen(false)}>
          <div style={{
            background: '#1A1D27',
            border: '1px solid #2A2D3A',
            borderRadius: 16, width: '100%', maxWidth: 720,
            marginTop: 20, marginBottom: 20,
            boxShadow: '0 25px 80px rgba(0,0,0,0.6)'
          }} onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid #2A2D3A',
              display: 'flex', justifyContent: 'space-between',
              alignItems: 'center',
              background: '#0F1117',
              borderRadius: '16px 16px 0 0'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: '1.3rem' }}>🔍</span>
                <div>
                  <div style={{
                    fontWeight: 700, color: '#F8F9FA', fontSize: '1rem'
                  }}>
                    Second Opinion
                  </div>
                  <div style={{ color: '#9CA3AF', fontSize: '0.75rem' }}>
                    {selectedReport?.filename}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSecondOpinionOpen(false)}
                disabled={secondOpinionLoading}
                style={{
                  background: 'rgba(239,68,68,0.1)',
                  border: '1px solid rgba(239,68,68,0.2)',
                  borderRadius: 8, color: '#EF4444',
                  cursor: 'pointer', padding: '6px 12px',
                  fontSize: '0.8rem', fontWeight: 600
                }}
              >
                ✕ Close
              </button>
            </div>

            <div style={{ padding: 24 }}>
              {/* Loading */}
              {secondOpinionLoading && (
                <div style={{
                  textAlign: 'center', padding: 48,
                  color: '#9CA3AF'
                }}>
                  <div style={{
                    width: 44, height: 44, margin: '0 auto 16px',
                    border: '3px solid #2A2D3A',
                    borderTop: '3px solid #8B5CF6',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }} />
                  <p style={{ fontSize: '0.875rem' }}>
                    AI is reviewing your report independently...
                  </p>
                </div>
              )}

              {/* Result */}
              {secondOpinionResult && !secondOpinionLoading && (
                <div style={{
                  display: 'flex', flexDirection: 'column', gap: 14
                }}>
                  {/* Overall assessment */}
                  <div style={{
                    background: 'rgba(139,92,246,0.08)',
                    border: '1px solid rgba(139,92,246,0.2)',
                    borderRadius: 10, padding: '14px 16px'
                  }}>
                    <div style={{
                      display: 'flex', justifyContent: 'space-between',
                      alignItems: 'center', marginBottom: 8
                    }}>
                      <div style={{
                        color: '#A78BFA', fontWeight: 700,
                        fontSize: '0.75rem', textTransform: 'uppercase',
                        letterSpacing: '0.06em'
                      }}>
                        🔍 Overall Assessment
                      </div>
                      {secondOpinionResult.confidence && (
                        <span style={{
                          background: secondOpinionResult.confidence === 'high'
                            ? 'rgba(16,185,129,0.15)'
                            : secondOpinionResult.confidence === 'medium'
                              ? 'rgba(245,158,11,0.15)'
                              : 'rgba(239,68,68,0.15)',
                          color: secondOpinionResult.confidence === 'high'
                            ? '#10B981'
                            : secondOpinionResult.confidence === 'medium'
                              ? '#F59E0B' : '#EF4444',
                          fontSize: '0.68rem', fontWeight: 700,
                          padding: '2px 8px', borderRadius: 6,
                          textTransform: 'uppercase'
                        }}>
                          {secondOpinionResult.confidence} confidence
                        </span>
                      )}
                    </div>
                    <p style={{
                      color: '#D1D5DB', fontSize: '0.875rem',
                      lineHeight: 1.6, margin: 0
                    }}>
                      {secondOpinionResult.overall_assessment}
                    </p>
                  </div>

                  {/* Concerns */}
                  {secondOpinionResult.concerns?.length > 0 && (
                    <div style={{
                      background: '#1A1D27',
                      border: '1px solid #2A2D3A',
                      borderRadius: 10, padding: '14px 16px'
                    }}>
                      <div style={{
                        color: '#F59E0B', fontWeight: 700,
                        fontSize: '0.75rem', marginBottom: 10,
                        textTransform: 'uppercase', letterSpacing: '0.06em'
                      }}>
                        ⚠️ Points of Concern
                      </div>
                      {secondOpinionResult.concerns.map((c, i) => (
                        <div key={i} style={{
                          padding: '10px 12px', marginBottom: 8,
                          background: c.severity === 'high'
                            ? 'rgba(239,68,68,0.08)'
                            : c.severity === 'medium'
                              ? 'rgba(245,158,11,0.08)'
                              : 'rgba(107,114,128,0.08)',
                          borderRadius: 8,
                          borderLeft: `3px solid ${
                            c.severity === 'high' ? '#EF4444'
                            : c.severity === 'medium' ? '#F59E0B'
                            : '#6B7280'
                          }`
                        }}>
                          <div style={{
                            color: '#F8F9FA', fontWeight: 600,
                            fontSize: '0.82rem', marginBottom: 3
                          }}>
                            {c.finding}
                          </div>
                          <div style={{
                            color: '#9CA3AF', fontSize: '0.78rem'
                          }}>
                            {c.reason}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Two column */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                    gap: 12
                  }}>
                    {/* Questions */}
                    {secondOpinionResult.questions_for_doctor?.length > 0 && (
                      <div style={{
                        background: '#1A1D27',
                        border: '1px solid #2A2D3A',
                        borderRadius: 10, padding: '14px 16px'
                      }}>
                        <div style={{
                          color: '#60A5FA', fontWeight: 700,
                          fontSize: '0.75rem', marginBottom: 10,
                          textTransform: 'uppercase', letterSpacing: '0.06em'
                        }}>
                          ❓ Ask Your Doctor
                        </div>
                        {secondOpinionResult.questions_for_doctor.map((q, i) => (
                          <div key={i} style={{
                            color: '#D1D5DB', fontSize: '0.8rem',
                            marginBottom: 6, display: 'flex',
                            alignItems: 'flex-start', gap: 6
                          }}>
                            <span style={{
                              color: '#2563EB', fontWeight: 700,
                              flexShrink: 0, fontSize: '0.7rem'
                            }}>
                              {i + 1}.
                            </span>
                            {q}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Additional tests */}
                    {secondOpinionResult.additional_tests?.length > 0 && (
                      <div style={{
                        background: '#1A1D27',
                        border: '1px solid #2A2D3A',
                        borderRadius: 10, padding: '14px 16px'
                      }}>
                        <div style={{
                          color: '#10B981', fontWeight: 700,
                          fontSize: '0.75rem', marginBottom: 10,
                          textTransform: 'uppercase', letterSpacing: '0.06em'
                        }}>
                          🧪 Additional Tests
                        </div>
                        {secondOpinionResult.additional_tests.map((t, i) => (
                          <div key={i} style={{
                            color: '#D1D5DB', fontSize: '0.8rem',
                            marginBottom: 6, display: 'flex',
                            alignItems: 'flex-start', gap: 6
                          }}>
                            <span style={{ color: '#10B981', flexShrink: 0 }}>
                              ✓
                            </span>
                            {t}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Lifestyle advice */}
                    {secondOpinionResult.lifestyle_advice?.length > 0 && (
                      <div style={{
                        background: '#1A1D27',
                        border: '1px solid #2A2D3A',
                        borderRadius: 10, padding: '14px 16px'
                      }}>
                        <div style={{
                          color: '#F59E0B', fontWeight: 700,
                          fontSize: '0.75rem', marginBottom: 10,
                          textTransform: 'uppercase', letterSpacing: '0.06em'
                        }}>
                          🌿 Lifestyle Advice
                        </div>
                        {secondOpinionResult.lifestyle_advice.map((a, i) => (
                          <div key={i} style={{
                            color: '#D1D5DB', fontSize: '0.8rem',
                            marginBottom: 6, display: 'flex',
                            alignItems: 'flex-start', gap: 6
                          }}>
                            <span style={{ color: '#F59E0B', flexShrink: 0 }}>
                              •
                            </span>
                            {a}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Specialist referral */}
                    {secondOpinionResult.specialist_referral?.needed && (
                      <div style={{
                        background: 'rgba(239,68,68,0.06)',
                        border: '1px solid rgba(239,68,68,0.2)',
                        borderRadius: 10, padding: '14px 16px'
                      }}>
                        <div style={{
                          color: '#EF4444', fontWeight: 700,
                          fontSize: '0.75rem', marginBottom: 8,
                          textTransform: 'uppercase', letterSpacing: '0.06em'
                        }}>
                          👨⚕️ Specialist Referral Recommended
                        </div>
                        <div style={{
                          color: '#F8F9FA', fontWeight: 600,
                          fontSize: '0.875rem', marginBottom: 4
                        }}>
                          {secondOpinionResult.specialist_referral.specialist}
                        </div>
                        <div style={{
                          color: '#9CA3AF', fontSize: '0.78rem'
                        }}>
                          {secondOpinionResult.specialist_referral.reason}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Plain language summary */}
                  {secondOpinionResult.summary && (
                    <div style={{
                      background: 'rgba(37,99,235,0.06)',
                      border: '1px solid rgba(37,99,235,0.15)',
                      borderRadius: 10, padding: '14px 16px'
                    }}>
                      <div style={{
                        color: '#60A5FA', fontWeight: 700,
                        fontSize: '0.75rem', marginBottom: 8,
                        textTransform: 'uppercase', letterSpacing: '0.06em'
                      }}>
                        📝 Plain Language Summary
                      </div>
                      <p style={{
                        color: '#D1D5DB', fontSize: '0.875rem',
                        lineHeight: 1.6, margin: 0
                      }}>
                        {secondOpinionResult.summary}
                      </p>
                    </div>
                  )}

                  {/* Disclaimer */}
                  <div style={{
                    fontSize: '0.7rem', color: '#6B7280',
                    padding: '8px 12px',
                    background: 'rgba(107,114,128,0.05)',
                    borderRadius: 8
                  }}>
                    ⚕️ This is an AI-generated second opinion for
                    informational purposes only. It does not replace
                    professional medical advice. Always consult your
                    doctor for clinical decisions.
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Discharge Decoder Modal ────────────────────────────────── */}
      {decodeOpen && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 2000,
          background: 'rgba(0,0,0,0.85)',
          backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'flex-start',
          justifyContent: 'center',
          padding: '20px', overflowY: 'auto'
        }} onClick={() => !decodeLoading && setDecodeOpen(false)}>
          <div style={{
            background: '#1A1D27',
            border: '1px solid #2A2D3A',
            borderRadius: 16, width: '100%', maxWidth: 720,
            marginTop: 20, marginBottom: 20,
            boxShadow: '0 25px 80px rgba(0,0,0,0.6)'
          }} onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid #2A2D3A',
              display: 'flex', justifyContent: 'space-between',
              alignItems: 'center',
              background: '#0F1117',
              borderRadius: '16px 16px 0 0'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: '1.3rem' }}>📋</span>
                <div>
                  <div style={{
                    fontWeight: 700, color: '#F8F9FA', fontSize: '1rem'
                  }}>
                    Discharge Summary Decoder
                  </div>
                  <div style={{ color: '#9CA3AF', fontSize: '0.75rem' }}>
                    {selectedReport?.filename}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setDecodeOpen(false)}
                disabled={decodeLoading}
                style={{
                  background: 'rgba(239,68,68,0.1)',
                  border: '1px solid rgba(239,68,68,0.2)',
                  borderRadius: 8, color: '#EF4444',
                  cursor: 'pointer', padding: '6px 12px',
                  fontSize: '0.8rem', fontWeight: 600
                }}
              >
                ✕ Close
              </button>
            </div>

            <div style={{ padding: 24 }}>
              {/* Loading */}
              {decodeLoading && (
                <div style={{
                  textAlign: 'center', padding: 48, color: '#9CA3AF'
                }}>
                  <div style={{
                    width: 44, height: 44, margin: '0 auto 16px',
                    border: '3px solid #2A2D3A',
                    borderTop: '3px solid #10B981',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }} />
                  <p style={{ fontSize: '0.875rem' }}>
                    Translating medical language into simple terms...
                  </p>
                </div>
              )}

              {/* Result */}
              {decodeResult && !decodeLoading && (
                <div style={{
                  display: 'flex', flexDirection: 'column', gap: 14
                }}>
                  {/* Simple summary */}
                  {decodeResult.simple_summary && (
                    <div style={{
                      background: 'rgba(16,185,129,0.08)',
                      border: '1px solid rgba(16,185,129,0.2)',
                      borderRadius: 10, padding: '14px 16px'
                    }}>
                      <div style={{
                        color: '#10B981', fontWeight: 700,
                        fontSize: '0.75rem', marginBottom: 8,
                        textTransform: 'uppercase', letterSpacing: '0.06em'
                      }}>
                        📋 In Simple Words
                      </div>
                      <p style={{
                        color: '#D1D5DB', fontSize: '0.9rem',
                        lineHeight: 1.7, margin: 0
                      }}>
                        {decodeResult.simple_summary}
                      </p>
                    </div>
                  )}

                  {/* What happened + diagnosis */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                    gap: 12
                  }}>
                    {decodeResult.what_happened && (
                      <div style={{
                        background: '#1A1D27',
                        border: '1px solid #2A2D3A',
                        borderRadius: 10, padding: '14px 16px'
                      }}>
                        <div style={{
                          color: '#60A5FA', fontWeight: 700,
                          fontSize: '0.75rem', marginBottom: 8,
                          textTransform: 'uppercase', letterSpacing: '0.06em'
                        }}>
                          🏥 What Happened
                        </div>
                        <p style={{
                          color: '#D1D5DB', fontSize: '0.82rem',
                          lineHeight: 1.6, margin: 0
                        }}>
                          {decodeResult.what_happened}
                        </p>
                      </div>
                    )}
                    {decodeResult.diagnosis && (
                      <div style={{
                        background: '#1A1D27',
                        border: '1px solid #2A2D3A',
                        borderRadius: 10, padding: '14px 16px'
                      }}>
                        <div style={{
                          color: '#8B5CF6', fontWeight: 700,
                          fontSize: '0.75rem', marginBottom: 8,
                          textTransform: 'uppercase', letterSpacing: '0.06em'
                        }}>
                          🔬 Diagnosis
                        </div>
                        <p style={{
                          color: '#D1D5DB', fontSize: '0.82rem',
                          lineHeight: 1.6, margin: 0
                        }}>
                          {decodeResult.diagnosis}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Medicines */}
                  {decodeResult.medicines?.length > 0 && (
                    <div style={{
                      background: '#1A1D27',
                      border: '1px solid #2A2D3A',
                      borderRadius: 10, padding: '14px 16px'
                    }}>
                      <div style={{
                        color: '#F59E0B', fontWeight: 700,
                        fontSize: '0.75rem', marginBottom: 12,
                        textTransform: 'uppercase', letterSpacing: '0.06em'
                      }}>
                        💊 Your Medicines
                      </div>
                      {decodeResult.medicines.map((med, i) => (
                        <div key={i} style={{
                          padding: '10px 12px', marginBottom: 8,
                          background: 'rgba(245,158,11,0.06)',
                          border: '1px solid rgba(245,158,11,0.15)',
                          borderRadius: 8
                        }}>
                          <div style={{
                            display: 'flex', justifyContent: 'space-between',
                            alignItems: 'flex-start', gap: 8, flexWrap: 'wrap'
                          }}>
                            <div style={{
                              color: '#F8F9FA', fontWeight: 700,
                              fontSize: '0.875rem'
                            }}>
                              {med.name}
                            </div>
                            {med.duration && (
                              <span style={{
                                background: 'rgba(245,158,11,0.15)',
                                color: '#F59E0B', fontSize: '0.68rem',
                                padding: '2px 8px', borderRadius: 6,
                                fontWeight: 600, flexShrink: 0
                              }}>
                                {med.duration}
                              </span>
                            )}
                          </div>
                          {med.purpose && (
                            <div style={{
                              color: '#9CA3AF', fontSize: '0.78rem',
                              marginTop: 3
                            }}>
                              Why: {med.purpose}
                            </div>
                          )}
                          {med.how_to_take && (
                            <div style={{
                              color: '#D1D5DB', fontSize: '0.78rem',
                              marginTop: 3
                            }}>
                              How: {med.how_to_take}
                            </div>
                          )}
                          {med.important_note && (
                            <div style={{
                              color: '#FCA5A5', fontSize: '0.75rem',
                              marginTop: 4, fontStyle: 'italic'
                            }}>
                              ⚠️ {med.important_note}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Warning signs */}
                  {decodeResult.warning_signs?.length > 0 && (
                    <div style={{
                      background: 'rgba(239,68,68,0.08)',
                      border: '1px solid rgba(239,68,68,0.25)',
                      borderRadius: 10, padding: '14px 16px'
                    }}>
                      <div style={{
                        color: '#EF4444', fontWeight: 700,
                        fontSize: '0.75rem', marginBottom: 10,
                        textTransform: 'uppercase', letterSpacing: '0.06em'
                      }}>
                        🚨 Go to Hospital Immediately If:
                      </div>
                      {decodeResult.warning_signs.map((w, i) => (
                        <div key={i} style={{
                          color: '#FCA5A5', fontSize: '0.82rem',
                          marginBottom: 6, display: 'flex',
                          alignItems: 'flex-start', gap: 6
                        }}>
                          <span style={{ flexShrink: 0 }}>•</span>
                          {w}
                        </div>
                      ))}
                      <div style={{
                        marginTop: 10, padding: '6px 10px',
                        background: 'rgba(239,68,68,0.1)',
                        borderRadius: 6, fontSize: '0.75rem',
                        color: '#EF4444', fontWeight: 700
                      }}>
                        📞 Emergency: Call 108 immediately
                      </div>
                    </div>
                  )}

                  {/* Three column grid */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: 12
                  }}>
                    {/* Follow-up */}
                    {decodeResult.followup?.length > 0 && (
                      <div style={{
                        background: '#1A1D27',
                        border: '1px solid #2A2D3A',
                        borderRadius: 10, padding: '14px 16px'
                      }}>
                        <div style={{
                          color: '#60A5FA', fontWeight: 700,
                          fontSize: '0.75rem', marginBottom: 10,
                          textTransform: 'uppercase', letterSpacing: '0.06em'
                        }}>
                          📅 Follow-up Needed
                        </div>
                        {decodeResult.followup.map((f, i) => (
                          <div key={i} style={{
                            marginBottom: 8, paddingBottom: 8,
                            borderBottom: i < decodeResult.followup.length - 1
                              ? '1px solid #2A2D3A' : 'none'
                          }}>
                            <div style={{
                              color: '#F8F9FA', fontSize: '0.8rem',
                              fontWeight: 500
                            }}>
                              {f.what}
                            </div>
                            {f.when && (
                              <div style={{
                                color: '#F59E0B', fontSize: '0.72rem'
                              }}>
                                When: {f.when}
                              </div>
                            )}
                            {f.where && (
                              <div style={{
                                color: '#9CA3AF', fontSize: '0.72rem'
                              }}>
                                Where: {f.where}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Activity restrictions */}
                    {decodeResult.activity_restrictions?.length > 0 && (
                      <div style={{
                        background: '#1A1D27',
                        border: '1px solid #2A2D3A',
                        borderRadius: 10, padding: '14px 16px'
                      }}>
                        <div style={{
                          color: '#8B5CF6', fontWeight: 700,
                          fontSize: '0.75rem', marginBottom: 10,
                          textTransform: 'uppercase', letterSpacing: '0.06em'
                        }}>
                          🚶 Activity Restrictions
                        </div>
                        {decodeResult.activity_restrictions.map((a, i) => (
                          <div key={i} style={{
                            color: '#D1D5DB', fontSize: '0.8rem',
                            marginBottom: 6, display: 'flex',
                            alignItems: 'flex-start', gap: 6
                          }}>
                            <span style={{
                              color: '#8B5CF6', flexShrink: 0
                            }}>✗</span>
                            {a}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Diet instructions */}
                    {decodeResult.diet_instructions?.length > 0 && (
                      <div style={{
                        background: '#1A1D27',
                        border: '1px solid #2A2D3A',
                        borderRadius: 10, padding: '14px 16px'
                      }}>
                        <div style={{
                          color: '#10B981', fontWeight: 700,
                          fontSize: '0.75rem', marginBottom: 10,
                          textTransform: 'uppercase', letterSpacing: '0.06em'
                        }}>
                          🥗 Diet Instructions
                        </div>
                        {decodeResult.diet_instructions.map((d, i) => (
                          <div key={i} style={{
                            color: '#D1D5DB', fontSize: '0.8rem',
                            marginBottom: 6, display: 'flex',
                            alignItems: 'flex-start', gap: 6
                          }}>
                            <span style={{
                              color: '#10B981', flexShrink: 0
                            }}>•</span>
                            {d}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Wound care */}
                  {decodeResult.wound_care && (
                    <div style={{
                      background: 'rgba(245,158,11,0.06)',
                      border: '1px solid rgba(245,158,11,0.15)',
                      borderRadius: 10, padding: '12px 16px'
                    }}>
                      <div style={{
                        color: '#F59E0B', fontWeight: 700,
                        fontSize: '0.75rem', marginBottom: 6,
                        textTransform: 'uppercase', letterSpacing: '0.06em'
                      }}>
                        🩹 Wound / Incision Care
                      </div>
                      <p style={{
                        color: '#D1D5DB', fontSize: '0.82rem',
                        lineHeight: 1.6, margin: 0
                      }}>
                        {decodeResult.wound_care}
                      </p>
                    </div>
                  )}

                  {/* Disclaimer */}
                  <div style={{
                    fontSize: '0.7rem', color: '#6B7280',
                    padding: '8px 12px',
                    background: 'rgba(107,114,128,0.05)',
                    borderRadius: 8, lineHeight: 1.5
                  }}>
                    ⚕️ This decoded summary is AI-generated for
                    informational purposes. Always follow your doctor's
                    instructions. For emergencies call 108.
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Compare Modal ────────────────────────────────── */}
      {compareOpen && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 2000,
          background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
          padding: isMobile ? '8px' : '20px', overflowY: 'auto',
        }} onClick={() => !comparing && setCompareOpen(false)}>
          <div style={{
            background: '#1A1D27', border: '1px solid #2A2D3A',
            borderRadius: isMobile ? 12 : 16,
            width: '100%', maxWidth: 780,
            marginTop: isMobile ? 8 : 20,
            marginBottom: isMobile ? 8 : 20,
            boxShadow: '0 25px 80px rgba(0,0,0,0.6)',
          }} onClick={e => e.stopPropagation()}>

            {/* Modal Header */}
            <div style={{
              padding: isMobile ? '14px 16px' : '20px 24px',
              borderBottom: '1px solid #2A2D3A',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: '#0F1117', borderRadius: '16px 16px 0 0',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <GitCompare size={20} color="#2563EB" />
                <div>
                  <div style={{ fontWeight: 700, color: '#F8F9FA', fontSize: '1rem' }}>Compare Reports</div>
                  <div style={{ color: '#9CA3AF', fontSize: '0.75rem' }}>AI-powered comparison of two medical reports</div>
                </div>
              </div>
              <button
                onClick={() => setCompareOpen(false)}
                disabled={comparing}
                style={{
                  background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
                  borderRadius: 8, color: '#EF4444', cursor: 'pointer',
                  padding: '6px 12px', fontSize: '0.8rem', fontWeight: 600,
                }}
              >
                ✕ Close
              </button>
            </div>

            <div style={{ padding: isMobile ? '14px 14px' : 24 }}>

              {/* ── Report selectors + controls (shown when no result yet) */}
              {!compareResult && (
                <>
                  <div style={{
                    display: 'flex',
                    flexDirection: isMobile ? 'column' : 'row',
                    gap: isMobile ? 12 : 16,
                    alignItems: 'flex-start', marginBottom: 20
                  }}>
                    <ReportSelector
                      label="📄 Older Report (Report A)"
                      selected={compareReport1}
                      onSelect={setCompareReport1}
                      reports={reports}
                      otherSelected={compareReport2}
                    />
                    {!isMobile && (
                      <div style={{ display: 'flex', alignItems: 'center', paddingTop: 36, flexShrink: 0 }}>
                        <ArrowRight size={20} color="#6B7280" />
                      </div>
                    )}
                    <ReportSelector
                      label="📄 Newer Report (Report B)"
                      selected={compareReport2}
                      onSelect={setCompareReport2}
                      reports={reports}
                      otherSelected={compareReport1}
                    />
                  </div>

                  {/* Language picker */}
                  <div style={{ marginBottom: 20 }}>
                    <label style={{ color: '#9CA3AF', fontSize: '0.78rem', fontWeight: 600, display: 'block', marginBottom: 8 }}>
                      🌐 Response Language
                    </label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {['english', 'telugu', 'hindi'].map(lang => (
                        <button
                          key={lang}
                          onClick={() => setCompareLanguage(lang)}
                          style={{
                            padding: '7px 16px', borderRadius: 8,
                            border: compareLanguage === lang ? '1.5px solid #2563EB' : '1px solid #2A2D3A',
                            background: compareLanguage === lang ? 'rgba(37,99,235,0.15)' : 'transparent',
                            color: compareLanguage === lang ? '#60A5FA' : '#9CA3AF',
                            cursor: 'pointer', fontSize: '0.8rem',
                            fontWeight: compareLanguage === lang ? 600 : 400,
                            textTransform: 'capitalize',
                          }}
                        >
                          {lang === 'telugu' ? '🇮🇳 Telugu' : lang === 'hindi' ? '🇮🇳 Hindi' : '🇬🇧 English'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Selection summary */}
                  {(compareReport1 || compareReport2) && (
                    <div style={{
                      background: 'rgba(37,99,235,0.06)', border: '1px solid rgba(37,99,235,0.15)',
                      borderRadius: 10, padding: '12px 16px', marginBottom: 20,
                      display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap',
                    }}>
                      <span style={{ color: compareReport1 ? '#60A5FA' : '#6B7280', fontSize: '0.82rem', fontWeight: 600 }}>
                        {compareReport1 ? `A: ${compareReport1.filename}` : 'Select Report A'}
                      </span>
                      <ArrowRight size={14} color="#6B7280" />
                      <span style={{ color: compareReport2 ? '#60A5FA' : '#6B7280', fontSize: '0.82rem', fontWeight: 600 }}>
                        {compareReport2 ? `B: ${compareReport2.filename}` : 'Select Report B'}
                      </span>
                    </div>
                  )}

                  {/* Compare button */}
                  <button
                    onClick={handleCompare}
                    disabled={!compareReport1 || !compareReport2 || comparing}
                    style={{
                      width: '100%', padding: '13px',
                      background: compareReport1 && compareReport2 && !comparing
                        ? '#2563EB' : 'rgba(37,99,235,0.3)',
                      border: 'none', borderRadius: 10, color: '#fff',
                      cursor: compareReport1 && compareReport2 && !comparing ? 'pointer' : 'not-allowed',
                      fontWeight: 700, fontSize: '0.9rem',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                      transition: 'all 0.2s',
                    }}
                  >
                    {comparing ? (
                      <>
                        <div style={{
                          width: 18, height: 18,
                          border: '2px solid rgba(255,255,255,0.3)',
                          borderTop: '2px solid #fff',
                          borderRadius: '50%',
                          animation: 'spin 1s linear infinite',
                        }} />
                        AI is comparing reports...
                      </>
                    ) : (
                      <><GitCompare size={18} /> Compare These Reports</>
                    )}
                  </button>
                </>
              )}

              {/* ── Comparison Result */}
              {compareResult && (
                <div>
                  {/* Result header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: '1.2rem' }}>📊</span>
                      <span style={{ color: '#F8F9FA', fontWeight: 700, fontSize: '0.95rem' }}>Comparison Result</span>
                    </div>
                    <button
                      onClick={() => { setCompareResult(null); setCompareReport1(null); setCompareReport2(null); }}
                      style={{
                        background: 'rgba(107,114,128,0.1)', border: '1px solid #2A2D3A',
                        borderRadius: 8, color: '#9CA3AF', cursor: 'pointer',
                        padding: '6px 14px', fontSize: '0.8rem',
                      }}
                    >
                      ← Compare Again
                    </button>
                  </div>

                  {/* A vs B filename labels */}
                  <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
                    <div style={{
                      background: 'rgba(37,99,235,0.1)', border: '1px solid rgba(37,99,235,0.2)',
                      borderRadius: 8, padding: '6px 14px',
                      fontSize: '0.78rem', color: '#60A5FA', fontWeight: 600,
                    }}>
                      A: {compareReport1?.filename}
                    </div>
                    <ArrowRight size={16} color="#6B7280" />
                    <div style={{
                      background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)',
                      borderRadius: 8, padding: '6px 14px',
                      fontSize: '0.78rem', color: '#10B981', fontWeight: 600,
                    }}>
                      B: {compareReport2?.filename}
                    </div>
                  </div>

                  {/* Trend badge */}
                  {compareResult.trend && (
                    <div style={{
                      display: 'inline-flex', alignItems: 'center', gap: 8,
                      padding: '8px 16px', borderRadius: 10, marginBottom: 16,
                      background: compareResult.trend === 'improving'
                        ? 'rgba(16,185,129,0.1)'
                        : compareResult.trend === 'worsening'
                          ? 'rgba(239,68,68,0.1)'
                          : 'rgba(245,158,11,0.1)',
                      border: `1px solid ${compareResult.trend === 'improving' ? 'rgba(16,185,129,0.25)'
                          : compareResult.trend === 'worsening' ? 'rgba(239,68,68,0.25)'
                            : 'rgba(245,158,11,0.25)'
                        }`,
                      color: compareResult.trend === 'improving' ? '#10B981'
                        : compareResult.trend === 'worsening' ? '#EF4444'
                          : '#F59E0B',
                      fontWeight: 700, fontSize: '0.85rem',
                    }}>
                      {compareResult.trend === 'improving' ? '📈 Improving'
                        : compareResult.trend === 'worsening' ? '📉 Worsening'
                          : '➡️ Stable'}
                    </div>
                  )}

                  {/* Full comparison markdown */}
                  <div style={{
                    background: '#0F1117', border: '1px solid #2A2D3A',
                    borderRadius: 12, padding: 20, maxHeight: 420, overflowY: 'auto',
                  }}>
                    <div className="markdown-content">
                      <ReactMarkdown>
                        {compareResult.comparison
                          || compareResult.summary
                          || compareResult.analysis
                          || JSON.stringify(compareResult, null, 2)}
                      </ReactMarkdown>
                    </div>
                  </div>

                  {/* Key changes list (optional — depends on backend response) */}
                  {compareResult.key_changes && compareResult.key_changes.length > 0 && (
                    <div style={{ marginTop: 16 }}>
                      <div style={{ color: '#9CA3AF', fontSize: '0.78rem', fontWeight: 600, marginBottom: 10 }}>KEY CHANGES</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {compareResult.key_changes.map((change, i) => (
                          <div key={i} style={{
                            display: 'flex', alignItems: 'flex-start', gap: 10,
                            padding: '10px 14px',
                            background: 'rgba(255,255,255,0.03)',
                            borderRadius: 8, border: '1px solid #2A2D3A',
                          }}>
                            <span style={{
                              flexShrink: 0,
                              color: typeof change === 'object' && change.direction === 'up' ? '#EF4444'
                                : typeof change === 'object' && change.direction === 'down' ? '#10B981'
                                  : '#9CA3AF',
                            }}>
                              {typeof change === 'object' && change.direction === 'up' ? '↑'
                                : typeof change === 'object' && change.direction === 'down' ? '↓'
                                  : '•'}
                            </span>
                            <span style={{ color: '#D1D5DB', fontSize: '0.83rem', lineHeight: 1.5 }}>
                              {typeof change === 'string'
                                ? change
                                : change.description || change.text || JSON.stringify(change)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Disclaimer */}
                  <div style={{
                    marginTop: 16, padding: '10px 14px',
                    background: 'rgba(107,114,128,0.05)',
                    borderRadius: 8, fontSize: '0.72rem', color: '#6B7280', lineHeight: 1.5,
                  }}>
                    ⚕️ This comparison is AI-generated for informational purposes only. Consult your doctor for clinical decisions.
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {viewerOpen && viewerReport && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 3000,
          background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'flex-start',
          justifyContent: 'center', padding: isMobile ? '8px' : '20px',
          overflowY: 'auto'
        }} onClick={closeViewer}>
          <div style={{
            background: '#1A1D27',
            border: '1px solid #2A2D3A',
            borderRadius: isMobile ? 10 : 16,
            width: '100%', maxWidth: 900,
            marginTop: isMobile ? 0 : 20,
            marginBottom: isMobile ? 0 : 20,
            overflow: 'hidden',
            boxShadow: '0 25px 80px rgba(0,0,0,0.6)'
          }} onClick={e => e.stopPropagation()}>

            {/* Viewer Header */}
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid #2A2D3A',
              display: 'flex', alignItems: 'center',
              justifyContent: 'space-between',
              background: '#0F1117', position: 'sticky', top: 0, zIndex: 1
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: '1.2rem' }}>
                  {viewerReport.file_type === 'pdf' ? '📄' : '🖼'}
                </span>
                <div>
                  <div style={{ fontWeight: 700, color: '#F8F9FA', fontSize: '0.9rem' }}>
                    {viewerReport.filename}
                  </div>
                  <div style={{ color: '#9CA3AF', fontSize: '0.75rem' }}>
                    Uploaded {new Date(viewerReport.created_at).toLocaleDateString('en-IN', {
                      day: 'numeric', month: 'long', year: 'numeric'
                    })}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <a
                  href={fileUrl}
                  download={viewerReport?.filename}
                  style={{
                    background: 'rgba(37,99,235,0.1)',
                    border: '1px solid rgba(37,99,235,0.2)',
                    borderRadius: 8, color: '#60A5FA',
                    padding: isMobile ? '5px 8px' : '6px 12px',
                    fontSize: isMobile ? '0.72rem' : '0.8rem',
                    textDecoration: 'none', display: 'inline-flex',
                    alignItems: 'center', gap: 6,
                    pointerEvents: fileUrl ? 'auto' : 'none',
                    opacity: fileUrl ? 1 : 0.4
                  }}
                >
                  ⬇ Download
                </a>
                <button
                  onClick={closeViewer}
                  style={{
                    background: 'rgba(239,68,68,0.1)',
                    border: '1px solid rgba(239,68,68,0.2)',
                    borderRadius: 8, color: '#EF4444',
                    cursor: 'pointer',
                    padding: isMobile ? '5px 8px' : '6px 12px',
                    fontSize: isMobile ? '0.72rem' : '0.8rem',
                    fontWeight: 600
                  }}
                >
                  ✕ Close
                </button>
              </div>
            </div>

            {/* File Viewer Content */}
            <div style={{ padding: 0 }}>

              {fileLoading && (
                <div style={{
                  display: 'flex', alignItems: 'center',
                  justifyContent: 'center', height: 400,
                  flexDirection: 'column', gap: 12
                }}>
                  <div style={{
                    width: 40, height: 40, border: '3px solid #2A2D3A',
                    borderTop: '3px solid #2563EB', borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }} />
                  <span style={{ color: '#9CA3AF', fontSize: '0.85rem' }}>
                    Loading file...
                  </span>
                </div>
              )}

              {!fileLoading && fileUrl && (
                <>
                  {/* PDF Viewer */}
                  {(fileType === 'pdf' ||
                    viewerReport?.filename?.toLowerCase().endsWith('.pdf')) && (
                      <embed
                        src={fileUrl}
                        type="application/pdf"
                        style={{
                          width: '100%',
                          height: isMobile ? '70vh' : '80vh',
                          minHeight: isMobile ? 400 : 600,
                          border: 'none',
                          display: 'block'
                        }}
                      />
                    )}

                  {/* Image Viewer */}
                  {(fileType === 'image' ||
                    fileType === 'jpg' ||
                    fileType === 'jpeg' ||
                    fileType === 'png' ||
                    ['jpg', 'jpeg', 'png'].includes(
                      viewerReport?.filename?.split('.').pop()?.toLowerCase()
                    )) && (
                      <div style={{
                        padding: 20, display: 'flex',
                        justifyContent: 'center', alignItems: 'flex-start',
                        background: '#0F1117', minHeight: 400,
                        overflowY: 'auto'
                      }}>
                        <img
                          src={fileUrl}
                          alt={viewerReport?.filename}
                          style={{
                            maxWidth: '100%',
                            height: 'auto',
                            borderRadius: 8,
                            boxShadow: '0 4px 20px rgba(0,0,0,0.4)'
                          }}
                        />
                      </div>
                    )}
                </>
              )}

              {!fileLoading && !fileUrl && (
                <div style={{
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center',
                  height: 300, gap: 12
                }}>
                  <span style={{ fontSize: '2rem' }}>📄</span>
                  <p style={{
                    color: '#9CA3AF', textAlign: 'center',
                    fontSize: '0.875rem', maxWidth: 300
                  }}>
                    File not available for viewing.
                    This report was uploaded before file storage was enabled.
                  </p>
                  <p style={{ color: '#6B7280', fontSize: '0.75rem' }}>
                    Re-upload the report to enable file viewing.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        div:hover > .delete-report-btn-inline { opacity: 1 !important; }
        @media (max-width: 768px) {
          .delete-report-btn-inline {
            opacity: 1 !important;
          }
          .report-filename {
            font-size: 0.75rem !important;
          }
        }
        @media (max-width: 480px) {
          .badge {
            font-size: 0.65rem !important;
          }
          .markdown-content {
            font-size: 0.82rem !important;
          }
        }
      `}</style>
    </div>
  );
};

export default Reports;
