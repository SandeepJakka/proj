import React, { useState, useEffect } from 'react';
import { getProfile, updateProfile } from '../services/api';
import { User, ShieldCheck, Activity, Save, Loader } from 'lucide-react';

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
            alert("Profile updated successfully!");
        } catch (err) {
            alert("Update failed.");
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="loading">Loading profile core...</div>;

    return (
        <div className="profile-page">
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
