import React, { useState, useEffect } from 'react';
import { getProfile, updateProfile, getProfileSharing, updateProfileSharing, getCurrentUser, updateCurrentUser } from '../services/api';
import { User, ShieldCheck, Activity, Save, Loader, Link2, Copy, Eye, EyeOff } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

const SHAREABLE_FIELDS = [
    { key: 'full_name', label: 'Full Name' },
    { key: 'age', label: 'Age' },
    { key: 'gender', label: 'Gender' },
    { key: 'blood_type', label: 'Blood Type' },
    { key: 'known_conditions', label: 'Known Conditions' },
    { key: 'allergies', label: 'Allergies' },
    { key: 'activity_level', label: 'Activity Level' },
    { key: 'health_summary', label: 'Health Summary', desc: 'BMI and conditions overview' },
    { key: 'reports', label: 'Recent Reports', desc: 'Last 5 reports, summaries only' },
];

const Profile = () => {
    const [profile, setProfile] = useState({
        age: '',
        gender: '',
        height_cm: '',
        weight_kg: '',
        blood_type: '',
        activity_level: 'Moderate',
        dietary_preferences: '',
        known_conditions: '',
        allergies: '',
        emergency_contact_name: '',
        emergency_contact_phone: '',
        emergency_contact_relation: '',
        primary_doctor_name: '',
        primary_doctor_phone: '',
        current_medicines: '',
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [sharing, setSharing] = useState({
        username: '',
        profile_public: false,
        public_fields: []
    });
    const [sharingLoaded, setSharingLoaded] = useState(false);
    const [savingSharing, setSavingSharing] = useState(false);
    const [userEmail, setUserEmail] = useState('');
    const [userName, setUserName] = useState('');
    const [cardView, setCardView] = useState(false);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const res = await getProfile();
                if (res.data) setProfile(res.data);

                // Ensure emergency columns exist
                fetch('http://localhost:8000/api/profile/migrate-emergency-fields', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('access_token')}`
                    }
                }).catch(() => {});
            } catch (err) {
                console.error("Failed to fetch profile", err);
            } finally {
                setLoading(false);
            }
        };
        fetchProfile();

        getCurrentUser()
            .then(r => {
                setUserEmail(r.data?.email || '');
                setUserName(r.data?.full_name || '');
            })
            .catch(() => { });

        getProfileSharing()
            .then(r => {
                if (r.data) {
                    setSharing({
                        username: r.data.username || '',
                        profile_public: r.data.profile_public || false,
                        public_fields: r.data.public_fields || []
                    });
                }
            })
            .catch(() => { })
            .finally(() => setSharingLoaded(true));
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setProfile(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await Promise.all([
                updateProfile(profile),
                updateCurrentUser({ full_name: userName })
            ]);
            toast.success("Profile saved successfully!");
        } catch (err) {
            toast.error("Failed to save profile. Please try again.");
        } finally {
            setSaving(false);
        }
    };

    const handleSaveSharing = async () => {
        if (sharing.username && !/^[a-zA-Z0-9_]{3,20}$/.test(sharing.username)) {
            toast.error('Username must be 3-20 chars, letters, numbers, underscore only');
            return;
        }
        setSavingSharing(true);
        try {
            await updateProfileSharing(sharing);
            toast.success('Sharing settings saved!');
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Failed to save sharing settings');
        } finally {
            setSavingSharing(false);
        }
    };

    if (loading) return (
        <div className="profile-page page-enter">
            <header className="page-header">
                <div className="skeleton skeleton-title" style={{ width: 200, height: 40, marginBottom: 12 }} />
                <div className="skeleton skeleton-text" style={{ width: 400 }} />
            </header>
            <div className="profile-container">
                <div className="skeleton-card" style={{ height: 400, marginBottom: 24 }} />
                <div className="skeleton-card" style={{ height: 300 }} />
            </div>
        </div>
    );

    return (
        <div className="profile-page page-enter">
            <Toaster position="top-right" />
            <header className="page-header">
                <h1>Health Identity</h1>
                <p>Manage your medical context for more accurate AI reasoning.</p>
            </header>

            <div className="profile-container">
                <form className="profile-form" style={{ animation: 'none' }} onSubmit={handleSave}>
                    <div className="form-section card stagger-item">
                        <div className="section-title">
                            <User size={20} color="var(--accent-primary)" />
                            <h2>Personal Information</h2>
                        </div>
                        <div className="form-grid">
                            <div className="input-field" style={{ gridColumn: '1 / -1' }}>
                                <label>Email Address</label>
                                <div style={{
                                    background: 'rgba(255,255,255,0.03)',
                                    border: '1px solid #2A2D3A',
                                    borderRadius: 12,
                                    padding: '12px 16px',
                                    color: '#9CA3AF',
                                    fontSize: '0.9rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between'
                                }}>
                                    <span>{userEmail || 'Loading...'}</span>
                                    <span style={{
                                        background: 'rgba(16,185,129,0.1)',
                                        color: '#10B981',
                                        fontSize: '0.7rem',
                                        padding: '2px 8px',
                                        borderRadius: 20,
                                        fontWeight: 600
                                    }}>
                                        ✓ Verified
                                    </span>
                                </div>
                                <span style={{ fontSize: '0.72rem', color: '#6B7280' }}>
                                    Email cannot be changed
                                </span>
                            </div>
                            <div className="input-field" style={{ gridColumn: '1 / -1' }}>
                                <label>Full Name</label>
                                <input 
                                    type="text" 
                                    placeholder="e.g. Sandeep Jakka" 
                                    value={userName} 
                                    onChange={e => setUserName(e.target.value)} 
                                />
                            </div>
                            <div className="input-field">
                                <label>Age</label>
                                <input type="number" name="age" value={profile.age || ''} onChange={handleChange} />
                            </div>
                            <div className="input-field">
                                <label>Gender</label>
                                <select name="gender" value={profile.gender || ''} onChange={handleChange}>
                                    <option value="">Select</option>
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                            <div className="input-field">
                                <label>Height (cm)</label>
                                <input type="number" name="height_cm" value={profile.height_cm || ''} onChange={handleChange} />
                            </div>
                            <div className="input-field">
                                <label>Weight (kg)</label>
                                <input type="number" name="weight_kg" value={profile.weight_kg || ''} onChange={handleChange} />
                            </div>
                            <div className="input-field">
                                <label>Blood Type</label>
                                <select name="blood_type" value={profile.blood_type || ''} onChange={handleChange}>
                                    <option value="">Select</option>
                                    <option value="A+">A+</option>
                                    <option value="A-">A-</option>
                                    <option value="B+">B+</option>
                                    <option value="B-">B-</option>
                                    <option value="AB+">AB+</option>
                                    <option value="AB-">AB-</option>
                                    <option value="O+">O+</option>
                                    <option value="O-">O-</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="form-section card stagger-item">
                        <div className="section-title">
                            <Activity size={20} color="var(--accent-secondary)" />
                            <h2>Lifestyle & Context</h2>
                        </div>
                        <div className="form-grid full-width">
                            <div className="input-field">
                                <label>Activity Level</label>
                                <select name="activity_level" value={profile.activity_level || ''} onChange={handleChange}>
                                    <option value="Sedentary">Sedentary</option>
                                    <option value="Light">Light</option>
                                    <option value="Moderate">Moderate</option>
                                    <option value="Active">Active</option>
                                </select>
                            </div>
                            <div className="input-field">
                                <label>Dietary Preferences (e.g., Vegan, Keto)</label>
                                <input type="text" name="dietary_preferences" value={profile.dietary_preferences || ''} onChange={handleChange} placeholder="Comma separated..." />
                            </div>
                            <div className="input-field">
                                <label>Known Conditions</label>
                                <textarea name="known_conditions" value={profile.known_conditions || ''} onChange={handleChange} placeholder="e.g. Asthma, Hypertension..." />
                            </div>
                            <div className="input-field">
                                <label>Allergies</label>
                                <textarea name="allergies" value={profile.allergies || ''} onChange={handleChange} placeholder="e.g. Penicillin, Peanuts..." />
                            </div>
                        </div>
                    </div>

                    <div className="form-section card stagger-item">
                        <div className="section-title">
                            <Link2 size={20} color="#10B981" />
                            <h2>Share Your Profile</h2>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            <div className="input-field">
                                <label>Username</label>
                                <input
                                    type="text"
                                    placeholder="e.g. sandeep_health"
                                    value={sharing.username}
                                    onChange={e => setSharing(p => ({ ...p, username: e.target.value }))}
                                />
                                {sharing.username && (
                                    <span style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>
                                        Your profile link: vaidya-assist.app/profile/{sharing.username}
                                    </span>
                                )}
                            </div>

                            <div style={{
                                display: 'flex', alignItems: 'center',
                                justifyContent: 'space-between', padding: '12px 16px',
                                background: 'rgba(255,255,255,0.03)', borderRadius: 8,
                                border: '1px solid #2A2D3A'
                            }}>
                                <div>
                                    <div style={{
                                        color: '#F8F9FA', fontWeight: 600,
                                        fontSize: '0.9rem'
                                    }}>Make Profile Public</div>
                                    <div style={{ color: '#9CA3AF', fontSize: '0.75rem' }}>
                                        Allow others to view your health profile
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setSharing(p => ({ ...p, profile_public: !p.profile_public }))}
                                    style={{
                                        width: 44, height: 24, borderRadius: 12, border: 'none',
                                        cursor: 'pointer', position: 'relative', transition: 'background 0.2s',
                                        background: sharing.profile_public ? '#2563EB' : '#374151'
                                    }}
                                >
                                    <div style={{
                                        width: 18, height: 18, borderRadius: '50%',
                                        background: '#fff', position: 'absolute', top: 3,
                                        transition: 'left 0.2s',
                                        left: sharing.profile_public ? 23 : 3
                                    }} />
                                </button>
                            </div>

                            {sharing.profile_public && (
                                <div>
                                    <label style={{
                                        color: '#9CA3AF', fontSize: '0.8rem',
                                        fontWeight: 600, display: 'block', marginBottom: 10
                                    }}>
                                        Choose what to share:
                                    </label>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                        {SHAREABLE_FIELDS.map(field => (
                                            <div key={field.key}>
                                                <label style={{
                                                    display: 'flex', alignItems: 'center', gap: 10,
                                                    cursor: 'pointer', padding: '8px 12px',
                                                    background: 'rgba(255,255,255,0.02)',
                                                    borderRadius: 8, border: '1px solid #2A2D3A'
                                                }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={sharing.public_fields.includes(field.key)}
                                                        onChange={e => {
                                                            if (e.target.checked) {
                                                                setSharing(p => ({
                                                                    ...p,
                                                                    public_fields: [...p.public_fields, field.key]
                                                                }));
                                                            } else {
                                                                setSharing(p => ({
                                                                    ...p,
                                                                    public_fields: p.public_fields.filter(f => f !== field.key)
                                                                }));
                                                            }
                                                        }}
                                                        style={{ accentColor: '#2563EB' }}
                                                    />
                                                    <div>
                                                        <span style={{ color: '#F8F9FA', fontSize: '0.875rem' }}>
                                                            {field.label}
                                                        </span>
                                                        {field.desc && (
                                                            <div style={{ color: '#6B7280', fontSize: '0.72rem', marginTop: 1 }}>
                                                                {field.desc}
                                                            </div>
                                                        )}
                                                    </div>
                                                </label>
                                                {field.key === 'reports' && sharing.public_fields?.includes('reports') && (
                                                    <p style={{
                                                        color: '#F59E0B', fontSize: '0.72rem',
                                                        margin: '4px 0 0 12px', lineHeight: 1.4
                                                    }}>
                                                        ⚠️ Only report summaries are shared, not the actual files
                                                    </p>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {sharing.username && sharing.profile_public && (
                                <div style={{
                                    background: 'rgba(16,185,129,0.08)',
                                    border: '1px solid rgba(16,185,129,0.2)',
                                    borderRadius: 8, padding: '12px 16px',
                                    display: 'flex', alignItems: 'center',
                                    justifyContent: 'space-between', gap: 8
                                }}>
                                    <span style={{ color: '#10B981', fontSize: '0.8rem', fontWeight: 500 }}>
                                        vaidya-assist.app/profile/{sharing.username}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            navigator.clipboard.writeText(
                                                `http://localhost:5173/profile/${sharing.username}`
                                            );
                                            toast.success('Link copied!');
                                        }}
                                        style={{
                                            background: 'none', border: 'none',
                                            color: '#10B981', cursor: 'pointer'
                                        }}
                                    >
                                        <Copy size={16} />
                                    </button>
                                </div>
                            )}

                            <button
                                type="button"
                                onClick={handleSaveSharing}
                                disabled={savingSharing}
                                style={{
                                    background: '#10B981', color: '#fff', border: 'none',
                                    borderRadius: 10, padding: '12px 24px', fontWeight: 600,
                                    cursor: savingSharing ? 'not-allowed' : 'pointer',
                                    opacity: savingSharing ? 0.7 : 1, alignSelf: 'flex-start'
                                }}
                            >
                                {savingSharing ? 'Saving...' : '💾 Save Sharing Settings'}
                            </button>
                        </div>
                    </div>

                    {/* ── Emergency Information Card ─────────────── */}
                    <div className="form-section card stagger-item">
                        <div className="section-title">
                            <span style={{ fontSize: '1.2rem' }}>🚨</span>
                            <h2>Emergency Information Card</h2>
                        </div>

                        {/* Card preview toggle */}
                        <div style={{
                            display: 'flex', gap: 10,
                            marginBottom: 20, flexWrap: 'wrap'
                        }}>
                            <button
                                type="button"
                                onClick={() => setCardView(false)}
                                style={{
                                    padding: '8px 16px', borderRadius: 8,
                                    border: !cardView
                                        ? '1.5px solid #2563EB'
                                        : '1px solid #2A2D3A',
                                    background: !cardView
                                        ? 'rgba(37,99,235,0.15)' : 'transparent',
                                    color: !cardView ? '#60A5FA' : '#9CA3AF',
                                    cursor: 'pointer', fontSize: '0.82rem',
                                    fontWeight: !cardView ? 600 : 400
                                }}
                            >
                                ✏️ Edit Details
                            </button>
                            <button
                                type="button"
                                onClick={() => setCardView(true)}
                                style={{
                                    padding: '8px 16px', borderRadius: 8,
                                    border: cardView
                                        ? '1.5px solid #10B981'
                                        : '1px solid #2A2D3A',
                                    background: cardView
                                        ? 'rgba(16,185,129,0.15)' : 'transparent',
                                    color: cardView ? '#10B981' : '#9CA3AF',
                                    cursor: 'pointer', fontSize: '0.82rem',
                                    fontWeight: cardView ? 600 : 400
                                }}
                            >
                                👁 Preview Card
                            </button>
                        </div>

                        {/* Edit form */}
                        {!cardView && (
                            <div className="form-grid">
                                <div className="input-field">
                                    <label>Emergency Contact Name</label>
                                    <input
                                        className="form-input"
                                        placeholder="e.g. Ravi Kumar (Father)"
                                        value={profile.emergency_contact_name || ''}
                                        onChange={e => setProfile(p => ({
                                            ...p,
                                            emergency_contact_name: e.target.value
                                        }))}
                                    />
                                </div>
                                <div className="input-field">
                                    <label>Emergency Contact Phone</label>
                                    <input
                                        className="form-input"
                                        placeholder="e.g. +91 98765 43210"
                                        value={profile.emergency_contact_phone || ''}
                                        onChange={e => setProfile(p => ({
                                            ...p,
                                            emergency_contact_phone: e.target.value
                                        }))}
                                    />
                                </div>
                                <div className="input-field">
                                    <label>Relationship</label>
                                    <input
                                        className="form-input"
                                        placeholder="e.g. Father, Mother, Spouse"
                                        value={profile.emergency_contact_relation || ''}
                                        onChange={e => setProfile(p => ({
                                            ...p,
                                            emergency_contact_relation: e.target.value
                                        }))}
                                    />
                                </div>
                                <div className="input-field">
                                    <label>Primary Doctor Name</label>
                                    <input
                                        className="form-input"
                                        placeholder="e.g. Dr. Suresh Reddy"
                                        value={profile.primary_doctor_name || ''}
                                        onChange={e => setProfile(p => ({
                                            ...p,
                                            primary_doctor_name: e.target.value
                                        }))}
                                    />
                                </div>
                                <div className="input-field">
                                    <label>Doctor Phone</label>
                                    <input
                                        className="form-input"
                                        placeholder="e.g. +91 98765 43210"
                                        value={profile.primary_doctor_phone || ''}
                                        onChange={e => setProfile(p => ({
                                            ...p,
                                            primary_doctor_phone: e.target.value
                                        }))}
                                    />
                                </div>
                                <div className="input-field" style={{ gridColumn: '1 / -1' }}>
                                    <label>Current Medicines</label>
                                    <input
                                        className="form-input"
                                        placeholder="e.g. Metformin 500mg, Amlodipine 5mg"
                                        value={profile.current_medicines || ''}
                                        onChange={e => setProfile(p => ({
                                            ...p,
                                            current_medicines: e.target.value
                                        }))}
                                    />
                                    <span style={{
                                        fontSize: '0.72rem', color: '#6B7280'
                                    }}>
                                        Separate medicines with commas
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* Card Preview */}
                        {cardView && (
                            <div>
                                {/* The actual card */}
                                <div id="emergency-card" style={{
                                    background: 'linear-gradient(135deg, #0F1117 0%, #1A1D27 100%)',
                                    border: '2px solid #EF4444',
                                    borderRadius: 16,
                                    padding: 24,
                                    maxWidth: 480,
                                    margin: '0 auto 20px',
                                    fontFamily: 'Inter, sans-serif',
                                    position: 'relative',
                                    overflow: 'hidden',
                                    boxShadow: '0 8px 32px rgba(239,68,68,0.15)'
                                }}>
                                    {/* Red accent bar top */}
                                    <div style={{
                                        position: 'absolute', top: 0, left: 0, right: 0,
                                        height: 4,
                                        background: 'linear-gradient(90deg, #EF4444, #F59E0B)'
                                    }} />

                                    {/* Card header */}
                                    <div style={{
                                        display: 'flex', justifyContent: 'space-between',
                                        alignItems: 'flex-start', marginBottom: 20
                                    }}>
                                        <div>
                                            <div style={{
                                                display: 'flex', alignItems: 'center',
                                                gap: 8, marginBottom: 4
                                            }}>
                                                <span style={{ fontSize: '1.2rem' }}>🚨</span>
                                                <span style={{
                                                    color: '#EF4444', fontWeight: 800,
                                                    fontSize: '0.75rem', letterSpacing: '0.1em',
                                                    textTransform: 'uppercase'
                                                }}>
                                                    Emergency Medical ID
                                                </span>
                                            </div>
                                            <div style={{
                                                color: '#F8F9FA', fontWeight: 700,
                                                fontSize: '1.3rem', lineHeight: 1.2
                                            }}>
                                                {userName || 'Your Name Here'}
                                            </div>
                                            <div style={{
                                                color: '#9CA3AF', fontSize: '0.78rem'
                                            }}>
                                                Powered by Vaidya Assist
                                            </div>
                                        </div>
                                        {/* Blood type badge */}
                                        {profile.blood_type && (
                                            <div style={{
                                                background: 'rgba(239,68,68,0.15)',
                                                border: '2px solid rgba(239,68,68,0.4)',
                                                borderRadius: 12, padding: '8px 14px',
                                                textAlign: 'center'
                                            }}>
                                                <div style={{
                                                    color: '#EF4444', fontWeight: 800,
                                                    fontSize: '1.4rem', lineHeight: 1
                                                }}>
                                                    {profile.blood_type}
                                                </div>
                                                <div style={{
                                                    color: '#9CA3AF', fontSize: '0.6rem',
                                                    marginTop: 2
                                                }}>
                                                    BLOOD
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Info grid */}
                                    <div style={{
                                        display: 'grid',
                                        gridTemplateColumns: '1fr 1fr',
                                        gap: 12, marginBottom: 16
                                    }}>
                                        {profile.age && (
                                            <div style={{
                                                background: 'rgba(255,255,255,0.04)',
                                                borderRadius: 8, padding: '10px 12px'
                                            }}>
                                                <div style={{
                                                    color: '#6B7280', fontSize: '0.65rem',
                                                    fontWeight: 600, textTransform: 'uppercase',
                                                    letterSpacing: '0.05em', marginBottom: 3
                                                }}>Age / Gender</div>
                                                <div style={{
                                                    color: '#F8F9FA', fontWeight: 600,
                                                    fontSize: '0.85rem'
                                                }}>
                                                    {profile.age}y · {profile.gender || '—'}
                                                </div>
                                            </div>
                                        )}
                                        {(profile.weight_kg || profile.height_cm) && (
                                            <div style={{
                                                background: 'rgba(255,255,255,0.04)',
                                                borderRadius: 8, padding: '10px 12px'
                                            }}>
                                                <div style={{
                                                    color: '#6B7280', fontSize: '0.65rem',
                                                    fontWeight: 600, textTransform: 'uppercase',
                                                    letterSpacing: '0.05em', marginBottom: 3
                                                }}>Weight / Height</div>
                                                <div style={{
                                                    color: '#F8F9FA', fontWeight: 600,
                                                    fontSize: '0.85rem'
                                                }}>
                                                    {profile.weight_kg || '—'}kg · {profile.height_cm || '—'}cm
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Allergies — highlighted red */}
                                    {profile.allergies && (
                                        <div style={{
                                            background: 'rgba(239,68,68,0.08)',
                                            border: '1px solid rgba(239,68,68,0.25)',
                                            borderRadius: 8, padding: '10px 12px',
                                            marginBottom: 12
                                        }}>
                                            <div style={{
                                                color: '#EF4444', fontSize: '0.65rem',
                                                fontWeight: 700, textTransform: 'uppercase',
                                                letterSpacing: '0.08em', marginBottom: 4,
                                                display: 'flex', alignItems: 'center', gap: 4
                                            }}>
                                                ⚠️ ALLERGIES
                                            </div>
                                            <div style={{
                                                color: '#FCA5A5', fontSize: '0.82rem',
                                                fontWeight: 500
                                            }}>
                                                {profile.allergies}
                                            </div>
                                        </div>
                                    )}

                                    {/* Known conditions */}
                                    {profile.known_conditions && (
                                        <div style={{
                                            background: 'rgba(245,158,11,0.08)',
                                            border: '1px solid rgba(245,158,11,0.2)',
                                            borderRadius: 8, padding: '10px 12px',
                                            marginBottom: 12
                                        }}>
                                            <div style={{
                                                color: '#F59E0B', fontSize: '0.65rem',
                                                fontWeight: 700, textTransform: 'uppercase',
                                                letterSpacing: '0.08em', marginBottom: 4
                                            }}>
                                                🏥 CONDITIONS
                                            </div>
                                            <div style={{
                                                color: '#FDE68A', fontSize: '0.82rem'
                                            }}>
                                                {profile.known_conditions}
                                            </div>
                                        </div>
                                    )}

                                    {/* Current medicines */}
                                    {profile.current_medicines && (
                                        <div style={{
                                            background: 'rgba(37,99,235,0.08)',
                                            border: '1px solid rgba(37,99,235,0.2)',
                                            borderRadius: 8, padding: '10px 12px',
                                            marginBottom: 12
                                        }}>
                                            <div style={{
                                                color: '#60A5FA', fontSize: '0.65rem',
                                                fontWeight: 700, textTransform: 'uppercase',
                                                letterSpacing: '0.08em', marginBottom: 4
                                            }}>
                                                💊 CURRENT MEDICINES
                                            </div>
                                            <div style={{
                                                color: '#BFDBFE', fontSize: '0.82rem'
                                            }}>
                                                {profile.current_medicines}
                                            </div>
                                        </div>
                                    )}

                                    {/* Emergency contacts */}
                                    {profile.emergency_contact_name && (
                                        <div style={{
                                            background: 'rgba(16,185,129,0.08)',
                                            border: '1px solid rgba(16,185,129,0.25)',
                                            borderRadius: 8, padding: '10px 12px',
                                            marginBottom: 12
                                        }}>
                                            <div style={{
                                                color: '#10B981', fontSize: '0.65rem',
                                                fontWeight: 700, textTransform: 'uppercase',
                                                letterSpacing: '0.08em', marginBottom: 6
                                            }}>
                                                📞 EMERGENCY CONTACT
                                            </div>
                                            <div style={{
                                                display: 'flex', justifyContent: 'space-between',
                                                alignItems: 'center'
                                            }}>
                                                <div>
                                                    <div style={{
                                                        color: '#F8F9FA', fontWeight: 600,
                                                        fontSize: '0.875rem'
                                                    }}>
                                                        {profile.emergency_contact_name}
                                                    </div>
                                                    {profile.emergency_contact_relation && (
                                                        <div style={{
                                                            color: '#9CA3AF', fontSize: '0.72rem'
                                                        }}>
                                                            {profile.emergency_contact_relation}
                                                        </div>
                                                    )}
                                                </div>
                                                {profile.emergency_contact_phone && (
                                                    <div style={{
                                                        color: '#34D399', fontWeight: 700,
                                                        fontSize: '0.875rem'
                                                    }}>
                                                        {profile.emergency_contact_phone}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* Doctor */}
                                    {profile.primary_doctor_name && (
                                        <div style={{
                                            background: 'rgba(139,92,246,0.08)',
                                            border: '1px solid rgba(139,92,246,0.2)',
                                            borderRadius: 8, padding: '10px 12px',
                                            marginBottom: 16
                                        }}>
                                            <div style={{
                                                color: '#8B5CF6', fontSize: '0.65rem',
                                                fontWeight: 700, textTransform: 'uppercase',
                                                letterSpacing: '0.08em', marginBottom: 6
                                            }}>
                                                👨‍⚕️ PRIMARY DOCTOR
                                            </div>
                                            <div style={{
                                                display: 'flex', justifyContent: 'space-between',
                                                alignItems: 'center'
                                            }}>
                                                <div style={{
                                                    color: '#F8F9FA', fontWeight: 600,
                                                    fontSize: '0.875rem'
                                                }}>
                                                    {profile.primary_doctor_name}
                                                </div>
                                                {profile.primary_doctor_phone && (
                                                    <div style={{
                                                        color: '#C4B5FD', fontWeight: 600,
                                                        fontSize: '0.875rem'
                                                    }}>
                                                        {profile.primary_doctor_phone}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* Card footer */}
                                    <div style={{
                                        borderTop: '1px solid #2A2D3A',
                                        paddingTop: 12,
                                        display: 'flex', justifyContent: 'space-between',
                                        alignItems: 'center'
                                    }}>
                                        <div style={{
                                            color: '#6B7280', fontSize: '0.65rem'
                                        }}>
                                            🔒 Generated by Vaidya Assist
                                        </div>
                                        <div style={{
                                            color: '#6B7280', fontSize: '0.65rem'
                                        }}>
                                            vaidya-assist.app
                                        </div>
                                    </div>
                                </div>

                                {/* Action buttons */}
                                <div style={{
                                    display: 'flex', gap: 10, flexWrap: 'wrap',
                                    justifyContent: 'center', marginBottom: 16
                                }}>
                                    {/* Print */}
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const card = document.getElementById('emergency-card')
                                            const printWindow = window.open('', '_blank')
                                            printWindow.document.write(`
                                                <html>
                                                <head>
                                                    <title>Emergency Medical Card - Vaidya Assist</title>
                                                    <style>
                                                        * { margin: 0; padding: 0; box-sizing: border-box; }
                                                        body {
                                                            font-family: Inter, sans-serif;
                                                            background: white;
                                                            display: flex;
                                                            align-items: center;
                                                            justify-content: center;
                                                            min-height: 100vh;
                                                            padding: 20px;
                                                        }
                                                        .card-wrapper { max-width: 480px; width: 100%; }
                                                    </style>
                                                    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap">
                                                </head>
                                                <body>
                                                    <div class="card-wrapper">${card.outerHTML}</div>
                                                    <script>window.onload = () => window.print()<\/script>
                                                </body>
                                                </html>
                                            `)
                                            printWindow.document.close()
                                        }}
                                        style={{
                                            padding: '10px 20px', borderRadius: 10,
                                            background: 'rgba(37,99,235,0.1)',
                                            border: '1px solid rgba(37,99,235,0.25)',
                                            color: '#60A5FA', cursor: 'pointer',
                                            fontWeight: 600, fontSize: '0.85rem',
                                            display: 'flex', alignItems: 'center', gap: 8
                                        }}
                                    >
                                        🖨️ Print Card
                                    </button>

                                    {/* Download as PNG using html2canvas */}
                                    <button
                                        type="button"
                                        onClick={async () => {
                                            try {
                                                const { default: html2canvas } =
                                                    await import('html2canvas')
                                                const card = document.getElementById('emergency-card')
                                                const canvas = await html2canvas(card, {
                                                    backgroundColor: '#0F1117',
                                                    scale: 2,
                                                    useCORS: true
                                                })
                                                const link = document.createElement('a')
                                                link.download = 'vaidya-assist-emergency-card.png'
                                                link.href = canvas.toDataURL('image/png')
                                                link.click()
                                                toast.success('Card downloaded!')
                                            } catch {
                                                toast.error('Download failed. Please use Print instead.')
                                            }
                                        }}
                                        style={{
                                            padding: '10px 20px', borderRadius: 10,
                                            background: 'rgba(16,185,129,0.1)',
                                            border: '1px solid rgba(16,185,129,0.25)',
                                            color: '#10B981', cursor: 'pointer',
                                            fontWeight: 600, fontSize: '0.85rem',
                                            display: 'flex', alignItems: 'center', gap: 8
                                        }}
                                    >
                                        ⬇️ Download PNG
                                    </button>

                                    {/* Share link */}
                                    {sharing?.username ? (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const url = `${window.location.origin}/emergency/${sharing.username}`
                                                navigator.clipboard.writeText(url)
                                                toast.success('Emergency card link copied!')
                                            }}
                                            style={{
                                                padding: '10px 20px', borderRadius: 10,
                                                background: 'rgba(239,68,68,0.1)',
                                                border: '1px solid rgba(239,68,68,0.25)',
                                                color: '#EF4444', cursor: 'pointer',
                                                fontWeight: 600, fontSize: '0.85rem',
                                                display: 'flex', alignItems: 'center', gap: 8
                                            }}
                                        >
                                            🔗 Copy Share Link
                                        </button>
                                    ) : (
                                        <div style={{
                                            padding: '10px 16px', borderRadius: 10,
                                            background: 'rgba(107,114,128,0.08)',
                                            border: '1px solid #2A2D3A',
                                            color: '#6B7280', fontSize: '0.8rem'
                                        }}>
                                            Set a username in Profile Sharing to get a share link
                                        </div>
                                    )}
                                </div>

                                {/* QR code / share link hint */}
                                {sharing?.username && (
                                    <div style={{
                                        textAlign: 'center', padding: '10px 16px',
                                        background: 'rgba(239,68,68,0.05)',
                                        border: '1px solid rgba(239,68,68,0.15)',
                                        borderRadius: 10, fontSize: '0.78rem',
                                        color: '#9CA3AF'
                                    }}>
                                        🚨 Share link:{' '}
                                        <span style={{ color: '#EF4444', fontWeight: 600 }}>
                                            {window.location.origin}/emergency/{sharing.username}
                                        </span>
                                        <br />
                                        <span style={{ fontSize: '0.72rem', color: '#6B7280' }}>
                                            First responders can scan or open this link
                                            to see your emergency info
                                        </span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="form-actions">
                        <button type="submit" className="btn-primary" disabled={saving}>
                            {saving ? <Loader className="spin" size={18} /> : (
                                <>
                                    <Save size={18} />
                                    Save Health Identity
                                </>
                            )}
                        </button>
                        <div className="security-notice">
                            <ShieldCheck size={16} />
                            <span>Your data is stored locally and protected.</span>
                        </div>
                    </div>
                </form>
            </div>

            <style jsx>{`
        .profile-page {
          display: flex;
          flex-direction: column;
          gap: 32px;
        }

        .profile-container {
          max-width: 900px;
          margin: 0 auto;
          width: 100%;
        }

        .profile-form {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .section-title {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 24px;
        }

        .section-title h2 {
          font-size: 20px;
        }

        .form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }

        .form-grid.full-width {
          grid-template-columns: 1fr;
        }

        .input-field {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .input-field label {
          font-size: 14px;
          font-weight: 600;
          color: var(--text-secondary);
        }

        .input-field input, .input-field select, .input-field textarea {
          background: var(--surface-lighter);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          padding: 12px 16px;
          color: white;
          outline: none;
          font-family: var(--font-family);
        }

        .input-field input:focus, .input-field select:focus, .input-field textarea:focus {
          border-color: var(--accent-primary);
        }

        .input-field textarea {
          min-height: 100px;
          resize: vertical;
        }

        .form-actions {
          margin-top: 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .form-actions .btn-primary {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 14px 30px;
        }

        .security-notice {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #00ff88;
          font-size: 13px;
        }

        .spin {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
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

export default Profile;
