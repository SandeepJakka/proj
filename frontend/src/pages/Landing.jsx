import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import {
    MessageSquare, ScanLine, MapPin, Lightbulb,
    ChevronRight, Heart
} from 'lucide-react';

const FEATURES = [
    {
        icon: <MessageSquare size={28} />,
        title: 'AI Health Chat',
        desc: 'Ask health questions in English or Telugu. Get clear, simple answers instantly.',
        badge: 'Free • No signup needed',
        badgeClass: 'badge-green',
        path: '/chat',
        color: '#10B981',
        bg: 'rgba(16,185,129,.1)',
    },
    {
        icon: <ScanLine size={28} />,
        title: 'Analyze Your Reports',
        desc: 'Upload X-rays, blood tests, prescriptions. Get instant AI-powered explanations.',
        badge: 'Supports PDF & Images',
        badgeClass: 'badge-blue',
        path: '/analyze',
        color: '#2563EB',
        bg: 'rgba(37,99,235,.1)',
    },
    {
        icon: <MapPin size={28} />,
        title: 'Find Nearby Doctors',
        desc: 'Hospitals, clinics, pharmacies near you on an interactive map.',
        badge: 'Uses your location',
        badgeClass: 'badge-purple',
        path: '/map',
        color: '#8b5cf6',
        bg: 'rgba(139,92,246,.1)',
    },
    {
        icon: <Lightbulb size={28} />,
        title: 'Daily Health Tips',
        desc: 'Personalized tips for diet, lifestyle, and wellness — in your language.',
        badge: 'Updated daily',
        badgeClass: 'badge-amber',
        path: '/tips',
        color: '#F59E0B',
        bg: 'rgba(245,158,11,.1)',
    },
];

const Landing = () => {
    const { language, toggleLanguage } = useLanguage();
    const navigate = useNavigate();

    return (
        <div style={{ minHeight: '100vh', background: '#0F1117' }}>
            {/* Navbar */}
            <nav className="navbar">
                <div className="navbar-left">
                    <div className="logo-icon">H</div>
                    <span className="logo-text" style={{ fontSize: '1.3rem', fontWeight: 800 }}>Healthora</span>
                </div>
                <div className="navbar-right">
                    <div className="lang-toggle">
                        <button className={language === 'english' ? 'active' : ''} onClick={() => language !== 'english' && toggleLanguage()}>EN</button>
                        <button className={language === 'telugu' ? 'active' : ''} onClick={() => language !== 'telugu' && toggleLanguage()}>తె</button>
                    </div>
                    <Link to="/login" className="btn btn-ghost btn-sm">Sign In</Link>
                    <Link to="/register" className="btn btn-primary btn-sm">Get Started</Link>
                </div>
            </nav>

            {/* Hero */}
            <section style={{ textAlign: 'center', padding: '80px 24px 60px' }}>
                <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: '8px',
                    background: 'rgba(37,99,235,.1)', border: '1px solid rgba(37,99,235,.25)',
                    borderRadius: '20px', padding: '6px 16px', marginBottom: '24px',
                    fontSize: '0.8rem', color: '#2563EB', fontWeight: 600
                }}>
                    <Heart size={14} /> Your Personal AI Health Assistant
                </div>

                <h1 style={{ fontSize: 'clamp(2rem,5vw,3.5rem)', fontWeight: 800, lineHeight: 1.15, marginBottom: '20px', maxWidth: 700, margin: '0 auto 20px' }}>
                    Your Personal<br />
                    <span style={{ color: '#2563EB' }}>Health Assistant</span>
                </h1>

                <p style={{ fontSize: '1.1rem', color: '#9CA3AF', maxWidth: 540, margin: '0 auto 36px', lineHeight: 1.7 }}>
                    Understand your reports, chat with AI, find nearby doctors —
                    all in one place. Free, private, and in your language.
                </p>

                <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
                    <button className="btn btn-primary btn-lg" onClick={() => navigate('/chat')}>
                        Try for Free <ChevronRight size={18} />
                    </button>
                    <button className="btn btn-ghost btn-lg" onClick={() => navigate('/tips')}>
                        Learn More
                    </button>
                </div>
            </section>

            {/* Feature Cards */}
            <section style={{ maxWidth: 900, margin: '0 auto', padding: '0 24px 80px' }}>
                <h2 style={{ textAlign: 'center', marginBottom: '32px', color: '#F8F9FA', fontSize: '1.5rem' }}>
                    Everything you need — no account required
                </h2>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px,1fr))', gap: '16px' }}>
                    {FEATURES.map(f => (
                        <Link
                            key={f.path}
                            to={f.path}
                            style={{ textDecoration: 'none' }}
                        >
                            <div
                                className="card"
                                style={{
                                    cursor: 'pointer',
                                    transition: 'all .2s',
                                    borderColor: 'transparent',
                                    display: 'flex', flexDirection: 'column', gap: '14px',
                                }}
                                onMouseEnter={e => {
                                    e.currentTarget.style.borderColor = f.color;
                                    e.currentTarget.style.transform = 'translateY(-4px)';
                                    e.currentTarget.style.boxShadow = `0 8px 24px ${f.bg}`;
                                }}
                                onMouseLeave={e => {
                                    e.currentTarget.style.borderColor = 'transparent';
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = 'var(--shadow-card)';
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                                    <div style={{ width: 52, height: 52, borderRadius: 12, background: f.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: f.color, flexShrink: 0 }}>
                                        {f.icon}
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: 700, marginBottom: 6, color: '#F8F9FA', fontSize: '1rem' }}>{f.title}</div>
                                        <p style={{ fontSize: '0.875rem', lineHeight: 1.6, color: '#9CA3AF' }}>{f.desc}</p>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <span className={`badge ${f.badgeClass}`}>{f.badge}</span>
                                    <ChevronRight size={16} color="#6B7280" />
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>

                {/* Nudge Banner */}
                <div style={{
                    marginTop: 40, background: 'rgba(37,99,235,.08)',
                    border: '1px solid rgba(37,99,235,.2)', borderRadius: 12,
                    padding: '24px 32px', textAlign: 'center'
                }}>
                    <p style={{ color: '#F8F9FA', marginBottom: 12, fontSize: '1rem', fontWeight: 600 }}>
                        Want to save your reports and get personalized advice?
                    </p>
                    <Link to="/register" className="btn btn-primary">
                        Create a free account →
                    </Link>
                </div>
            </section>

            {/* Footer */}
            <footer style={{ textAlign: 'center', padding: '24px', borderTop: '1px solid #2A2D3A', color: '#6B7280', fontSize: '0.8rem' }}>
                Healthora © 2025 • Not a substitute for professional medical advice
            </footer>
        </div>
    );
};

export default Landing;
