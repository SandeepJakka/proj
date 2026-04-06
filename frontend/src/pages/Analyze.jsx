import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import toast, { Toaster } from 'react-hot-toast';
import { useLanguage } from '../context/LanguageContext';
import { analyzeGuestReport, analyzeReport } from '../services/api';
import { Upload, FileText, AlertTriangle, CheckCircle, X } from 'lucide-react';

const isLoggedIn = () => !!localStorage.getItem('access_token');

const statusColor = (s) => {
    if (!s) return {};
    const sl = s.toLowerCase();
    if (sl === 'normal') return { color: '#10B981', background: 'rgba(16,185,129,.12)', border: '1px solid rgba(16,185,129,.25)' };
    if (sl === 'high' || sl === 'low') return { color: '#EF4444', background: 'rgba(239,68,68,.12)', border: '1px solid rgba(239,68,68,.25)' };
    return { color: '#F59E0B', background: 'rgba(245,158,11,.12)', border: '1px solid rgba(245,158,11,.25)' };
};

const Analyze = () => {
    const { language, toggleLanguage } = useLanguage();
    const [file, setFile] = useState(null);
    const [dragging, setDragging] = useState(false);
    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState('');
    const [result, setResult] = useState(null);
    const fileRef = useRef();

    const onDrop = (e) => {
        e.preventDefault();
        setDragging(false);
        const f = e.dataTransfer.files[0];
        if (f) setFile(f);
    };

    const handleAnalyze = async () => {
        if (!file) return;
        setLoading(true);
        setResult(null);

        const steps = ['Analyzing your report…', 'Extracting medical data…', 'Generating explanation…'];
        let si = 0;
        setProgress(steps[0]);
        const timer = setInterval(() => {
            si = (si + 1) % steps.length;
            setProgress(steps[si]);
        }, 2500);

        try {
            const fn = isLoggedIn() ? analyzeReport : analyzeGuestReport;
            const res = await fn(file, language);
            setResult(res.data);
            toast.success('Analysis complete!');
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Analysis failed. Please try again.');
        } finally {
            clearInterval(timer);
            setLoading(false);
            setProgress('');
        }
    };

    const docTypeBadge = (t) => {
        if (!t) return 'badge-blue';
        const tl = t.toLowerCase();
        if (tl.includes('lab') || tl.includes('blood')) return 'badge-blue';
        if (tl.includes('prescri') || tl.includes('medicine')) return 'badge-green';
        if (tl.includes('mri') || tl.includes('xray') || tl.includes('radiol') || tl.includes('scan')) return 'badge-amber';
        return 'badge-purple';
    };

    return (
        <div style={{ minHeight: '100vh', background: '#0F1117', padding: '0' }}>
            <Toaster position="top-right" toastOptions={{ className: 'toast-dark' }} />

            {/* Navbar */}
            <nav className="navbar">
                <div className="navbar-left">
                    <div className="logo-icon">H</div>
                    <span className="logo-text" style={{ fontSize: '1.2rem', fontWeight: 800 }}>Vaidya Assist</span>
                </div>
                <div className="navbar-right">
                    <div className="lang-toggle">
                        <button className={language === 'english' ? 'active' : ''} onClick={() => language !== 'english' && toggleLanguage()}>EN</button>
                        <button className={language === 'telugu' ? 'active' : ''} onClick={() => language !== 'telugu' && toggleLanguage()}>తె</button>
                    </div>
                    {!isLoggedIn() && <Link to="/login" className="btn btn-ghost btn-sm">Sign In</Link>}
                </div>
            </nav>

            <div className="page-enter" style={{ maxWidth: 760, margin: '0 auto', padding: '40px 24px' }}>
                <div className="page-header">
                    <h1>Analyze Your Medical Report</h1>
                    <p>Upload your report and get a simple explanation in seconds</p>
                </div>

                {/* Upload Zone */}
                <div
                    className="card"
                    style={{
                        marginBottom: 24,
                        border: dragging ? '2px dashed #2563EB' : '2px dashed #2A2D3A',
                        cursor: 'pointer', textAlign: 'center', padding: '40px',
                        transition: 'all .3s cubic-bezier(0.4, 0, 0.2, 1)',
                        background: dragging ? 'rgba(37,99,235,.05)' : '#1A1D27',
                        transform: dragging ? 'scale(1.02)' : 'scale(1)',
                    }}
                    onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={onDrop}
                    onClick={() => !file && fileRef.current?.click()}
                >
                    <input
                        ref={fileRef}
                        type="file"
                        accept=".jpg,.jpeg,.png,.pdf"
                        style={{ display: 'none' }}
                        onChange={e => setFile(e.target.files[0] || null)}
                    />

                    {file ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
                            <FileText size={36} color="#2563EB" />
                            <div style={{ textAlign: 'left' }}>
                                <div style={{ fontWeight: 600 }}>{file.name}</div>
                                <div style={{ fontSize: '0.8rem', color: '#9CA3AF' }}>{(file.size / 1024).toFixed(1)} KB</div>
                            </div>
                            <button
                                className="btn btn-ghost btn-sm"
                                onClick={e => { e.stopPropagation(); setFile(null); setResult(null); }}
                            >
                                <X size={14} /> Remove
                            </button>
                        </div>
                    ) : (
                        <>
                            <Upload size={40} color="#6B7280" style={{ marginBottom: 12 }} />
                            <p style={{ color: '#F8F9FA', fontWeight: 600, marginBottom: 6 }}>
                                Drag & drop your file here or click to browse
                            </p>
                            <p style={{ color: '#6B7280', fontSize: '0.85rem' }}>
                                Accepted: JPG, PNG, PDF • Max 10MB
                            </p>
                        </>
                    )}
                </div>

                {/* Language + Analyze */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
                    <div className="lang-toggle">
                        <button className={language === 'english' ? 'active' : ''} onClick={() => language !== 'english' && toggleLanguage()}>English</button>
                        <button className={language === 'telugu' ? 'active' : ''} onClick={() => language !== 'telugu' && toggleLanguage()}>తెలుగు</button>
                    </div>
                    <button
                        className="btn btn-primary"
                        style={{ flex: 1, justifyContent: 'center' }}
                        disabled={!file || loading}
                        onClick={handleAnalyze}
                    >
                        {loading ? progress || 'Analyzing…' : 'Analyze Report'}
                    </button>
                </div>

                {/* Loading */}
                {loading && (
                    <div className="card animate-in" style={{ textAlign: 'center', padding: 40 }}>
                        <div className="skeleton-card" style={{ marginBottom: 20 }}>
                            <div className="skeleton skeleton-title" style={{ width: '60%', margin: '0 auto 12px' }} />
                            <div className="skeleton skeleton-text" style={{ width: '80%', margin: '0 auto' }} />
                        </div>
                        <p style={{ color: '#9CA3AF' }}>{progress}</p>
                    </div>
                )}

                {/* Results */}
                {result && !loading && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        {/* Doc type */}
                        <div className="card stagger-item">
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <FileText size={20} color="#2563EB" />
                                    <span style={{ fontWeight: 700 }}>{result.document_type || 'Medical Document'}</span>
                                </div>
                                <span className={`badge ${docTypeBadge(result.document_type)}`}>
                                    {result.document_type}
                                </span>
                            </div>
                        </div>

                        {/* Critical alerts */}
                        {result.critical_alerts?.length > 0 && (
                            <div className="stagger-item" style={{ background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.25)', borderRadius: 12, padding: '16px 20px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, color: '#EF4444', fontWeight: 700 }}>
                                    <AlertTriangle size={18} /> Critical Alerts
                                </div>
                                {result.critical_alerts.map((a, i) => (
                                    <div key={i} style={{ fontSize: '0.875rem', color: '#FCA5A5', marginBottom: 4 }}>• {a}</div>
                                ))}
                            </div>
                        )}

                        {/* Explanation */}
                        {result.explanation && (
                            <div className="card stagger-item">
                                <h3 style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <CheckCircle size={18} color="#10B981" /> Full Explanation
                                </h3>
                                <div className="markdown-body">
                                    <ReactMarkdown>{result.explanation}</ReactMarkdown>
                                </div>
                            </div>
                        )}

                        {/* Parameters table */}
                        {result.gemini_extraction?.structured_data?.parameters?.length > 0 && (
                            <div className="card stagger-item" style={{ overflowX: 'auto' }}>
                                <h3 style={{ marginBottom: 16 }}>Test Results</h3>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                                    <thead>
                                        <tr style={{ borderBottom: '1px solid #2A2D3A' }}>
                                            {['Test Name', 'Value', 'Reference Range', 'Status'].map(h => (
                                                <th key={h} style={{ padding: '10px 12px', textAlign: 'left', color: '#9CA3AF', fontWeight: 600 }}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {result.gemini_extraction.structured_data.parameters.map((p, i) => (
                                            <tr key={i} style={{ borderBottom: '1px solid #2A2D3A' }}>
                                                <td style={{ padding: '10px 12px', fontWeight: 500 }}>{p.name || p.test_name || '—'}</td>
                                                <td style={{ padding: '10px 12px' }}>{p.value} {p.unit}</td>
                                                <td style={{ padding: '10px 12px', color: '#9CA3AF' }}>{p.reference_range || '—'}</td>
                                                <td style={{ padding: '10px 12px' }}>
                                                    <span style={{
                                                        padding: '3px 10px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 600,
                                                        ...statusColor(p.status)
                                                    }}>{p.status || '—'}</span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* Disclaimer */}
                        <div style={{ fontSize: '0.75rem', color: '#6B7280', textAlign: 'center', padding: '8px 0' }}>
                            {result.disclaimer || '⚕️ This is for informational purposes only. Always consult a qualified doctor.'}
                        </div>

                        {/* Auth nudge */}
                        {!isLoggedIn() && (
                            <div style={{ background: 'rgba(37,99,235,.08)', border: '1px solid rgba(37,99,235,.2)', borderRadius: 12, padding: '20px', textAlign: 'center' }}>
                                <p style={{ color: '#F8F9FA', marginBottom: 10, fontWeight: 600 }}>
                                    Sign up to track your reports over time
                                </p>
                                <Link to="/register" className="btn btn-primary btn-sm">Create free account →</Link>
                            </div>
                        )}
                        {isLoggedIn() && (
                            <div style={{ textAlign: 'center', color: '#10B981', fontSize: '0.875rem' }}>
                                <CheckCircle size={14} style={{ display: 'inline', marginRight: 4 }} />
                                Saved to your records ✓
                            </div>
                        )}
                    </div>
                )}
            </div>

            <style>{`
        .markdown-body h2 { font-size:.95rem; margin:10px 0 4px; color:#F8F9FA; }
        .markdown-body h3 { font-size:.875rem; margin:8px 0 4px; color:#f0f0f0; }
        .markdown-body p  { margin-bottom:8px; color:#E5E7EB; font-size:.875rem; }
        .markdown-body ul { padding-left:18px; margin-bottom:8px; }
        .markdown-body li { margin-bottom:3px; color:#E5E7EB; font-size:.875rem; }
        .markdown-body strong { color:#60a5fa; }
        .markdown-body hr { border:none; border-top:1px solid #2A2D3A; margin:10px 0; }
      `}</style>
        </div>
    );
};

export default Analyze;
