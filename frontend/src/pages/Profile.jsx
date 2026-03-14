import React, { useState, useEffect } from 'react';
import { getProfile, updateProfile, getProfileSharing, updateProfileSharing } from '../services/api';
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
        allergies: ''
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

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const res = await getProfile();
                if (res.data) setProfile(res.data);
            } catch (err) {
                console.error("Failed to fetch profile", err);
            } finally {
                setLoading(false);
            }
        };
        fetchProfile();

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
            .catch(() => {})
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
            await updateProfile(profile);
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

    if (loading) return <div className="loading">Loading profile core...</div>;

    return (
        <div className="profile-page">
            <Toaster position="top-right" />
            <header className="page-header">
                <h1>Health Identity</h1>
                <p>Manage your medical context for more accurate AI reasoning.</p>
            </header>

            <div className="profile-container">
                <form className="profile-form animate-fade-in" onSubmit={handleSave}>
                    <div className="form-section card">
                        <div className="section-title">
                            <User size={20} color="var(--accent-primary)" />
                            <h2>Personal Information</h2>
                        </div>
                        <div className="form-grid">
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

                    <div className="form-section card">
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

                    <div className="form-section card">
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
                                    onChange={e => setSharing(p => ({...p, username: e.target.value}))}
                                />
                                {sharing.username && (
                                    <span style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>
                                        Your profile link: healthora.app/profile/{sharing.username}
                                    </span>
                                )}
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center',
                                justifyContent: 'space-between', padding: '12px 16px',
                                background: 'rgba(255,255,255,0.03)', borderRadius: 8,
                                border: '1px solid #2A2D3A' }}>
                                <div>
                                    <div style={{ color: '#F8F9FA', fontWeight: 600,
                                        fontSize: '0.9rem' }}>Make Profile Public</div>
                                    <div style={{ color: '#9CA3AF', fontSize: '0.75rem' }}>
                                        Allow others to view your health profile
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setSharing(p => ({...p, profile_public: !p.profile_public}))}
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
                                    <label style={{ color: '#9CA3AF', fontSize: '0.8rem',
                                        fontWeight: 600, display: 'block', marginBottom: 10 }}>
                                        Choose what to share:
                                    </label>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                        {SHAREABLE_FIELDS.map(field => (
                                            <label key={field.key} style={{
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
                                                <span style={{ color: '#F8F9FA', fontSize: '0.875rem' }}>
                                                    {field.label}
                                                </span>
                                            </label>
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
                                        healthora.app/profile/{sharing.username}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            navigator.clipboard.writeText(
                                                `http://localhost:5173/profile/${sharing.username}`
                                            );
                                            toast.success('Link copied!');
                                        }}
                                        style={{ background: 'none', border: 'none',
                                            color: '#10B981', cursor: 'pointer' }}
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
