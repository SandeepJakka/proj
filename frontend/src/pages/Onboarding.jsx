import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { updateOnboardingProfile } from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import toast from 'react-hot-toast';

const STEPS = ['Health Info', 'Conditions', 'Preferences'];

const ACTIVITY_OPTIONS = [
  { value: 'sedentary', label: 'Sedentary', sub: 'Little or no exercise', icon: '🛋️' },
  { value: 'light', label: 'Light', sub: '1–3 days/week', icon: '🚶' },
  { value: 'moderate', label: 'Moderate', sub: '3–5 days/week', icon: '🏃' },
  { value: 'active', label: 'Active', sub: '6–7 days/week', icon: '💪' },
];

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const FOOD_OPTIONS = [
  { value: 'vegetarian', label: 'Vegetarian', icon: '🥗' },
  { value: 'non_vegetarian', label: 'Non-Vegetarian', icon: '🍗' },
  { value: 'vegan', label: 'Vegan', icon: '🌱' },
  { value: 'eggetarian', label: 'Eggetarian', icon: '🥚' },
];

const FIRST_ACTION_OPTIONS = [
  { value: 'upload', label: 'Upload a Report', sub: 'Analyze your medical reports with AI', icon: '📄', path: '/analyze' },
  { value: 'chat', label: 'Chat with AI', sub: 'Ask any health question', icon: '💬', path: '/chat' },
  { value: 'reminder', label: 'Set a Reminder', sub: 'Never miss a medicine dose', icon: '💊', path: '/reminders' },
  { value: 'dashboard', label: 'Explore Dashboard', sub: 'See everything at a glance', icon: '🏠', path: '/dashboard' },
];

const Onboarding = () => {
  const navigate = useNavigate();
  const { language, setLang } = useLanguage();

  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [firstAction, setFirstAction] = useState('dashboard');

  const [form, setForm] = useState({
    age: '',
    gender: '',
    weight_kg: '',
    height_cm: '',
    blood_type: '',
    activity_level: '',
    known_conditions: '',
    food_preference: '',
  });

  // If not a new user, skip onboarding
  useEffect(() => {
    const isNew = localStorage.getItem('healthora_new_user');
    if (!isNew) {
      navigate('/dashboard', { replace: true });
    }
  }, []);

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const handleNext = () => {
    if (step === 0) {
      // Step 1 validation — age and gender required
      if (!form.age || !form.gender) {
        toast.error('Please fill in at least your age and gender');
        return;
      }
      if (form.age < 1 || form.age > 120) {
        toast.error('Please enter a valid age');
        return;
      }
    }
    setStep(s => s + 1);
  };

  const handleBack = () => setStep(s => s - 1);

  const handleSkip = () => {
    if (step < 2) {
      setStep(s => s + 1);
    } else {
      handleFinish();
    }
  };

  const handleFinish = async () => {
    setSaving(true);
    try {
      // Only send fields that have values
      const payload = {};
      if (form.age) payload.age = parseInt(form.age);
      if (form.gender) payload.gender = form.gender;
      if (form.weight_kg) payload.weight_kg = parseFloat(form.weight_kg);
      if (form.height_cm) payload.height_cm = parseFloat(form.height_cm);
      if (form.blood_type) payload.blood_type = form.blood_type;
      if (form.activity_level) payload.activity_level = form.activity_level;
      if (form.known_conditions) payload.known_conditions = form.known_conditions;
      if (form.food_preference) payload.food_preference = form.food_preference;

      if (Object.keys(payload).length > 0) {
        await updateOnboardingProfile(payload);
      }

      localStorage.removeItem('healthora_new_user');

      const chosen = FIRST_ACTION_OPTIONS.find(o => o.value === firstAction);
      const destination = chosen?.path || '/dashboard';

      toast.success('Welcome to Vaidya Assist! 🎉');
      navigate(destination, { replace: true });
    } catch (err) {
      toast.error('Could not save profile. You can update it later in Profile settings.');
      localStorage.removeItem('healthora_new_user');
      navigate('/dashboard', { replace: true });
    } finally {
      setSaving(false);
    }
  };

  // ── Shared styles ───────────────────────────────────
  const optionBtn = (selected) => ({
    padding: '12px 16px',
    borderRadius: 10,
    border: selected ? '2px solid #2563EB' : '1px solid #2A2D3A',
    background: selected ? 'rgba(37,99,235,0.12)' : 'rgba(255,255,255,0.02)',
    color: selected ? '#60A5FA' : '#9CA3AF',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'all 0.15s',
    width: '100%',
  });

  const inputStyle = {
    background: '#0F1117',
    border: '1px solid #2A2D3A',
    borderRadius: 8,
    padding: '10px 14px',
    color: '#F8F9FA',
    width: '100%',
    fontSize: '0.9rem',
    outline: 'none',
    boxSizing: 'border-box',
  };

  const labelStyle = {
    color: '#9CA3AF',
    fontSize: '0.78rem',
    fontWeight: 600,
    display: 'block',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  };

  // ── Step renders ────────────────────────────────────
  const renderStep0 = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <p style={{ color: '#9CA3AF', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: 24 }}>
          Help us personalize your experience. This takes under 2 minutes.
          You can update everything later in your profile.
        </p>
      </div>

      {/* Age + Gender row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div>
          <label style={labelStyle}>Age *</label>
          <input
            type="number"
            min="1" max="120"
            placeholder="e.g. 28"
            value={form.age}
            onChange={e => set('age', e.target.value)}
            style={inputStyle}
          />
        </div>
        <div>
          <label style={labelStyle}>Gender *</label>
          <select
            value={form.gender}
            onChange={e => set('gender', e.target.value)}
            style={{ ...inputStyle, appearance: 'none' }}
          >
            <option value="">Select</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
            <option value="prefer_not_to_say">Prefer not to say</option>
          </select>
        </div>
      </div>

      {/* Weight + Height row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div>
          <label style={labelStyle}>Weight (kg)</label>
          <input
            type="number"
            min="1" max="500"
            placeholder="e.g. 70"
            value={form.weight_kg}
            onChange={e => set('weight_kg', e.target.value)}
            style={inputStyle}
          />
        </div>
        <div>
          <label style={labelStyle}>Height (cm)</label>
          <input
            type="number"
            min="1" max="300"
            placeholder="e.g. 170"
            value={form.height_cm}
            onChange={e => set('height_cm', e.target.value)}
            style={inputStyle}
          />
        </div>
      </div>

      {/* Blood Type */}
      <div>
        <label style={labelStyle}>Blood Type</label>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {BLOOD_TYPES.map(bt => (
            <button
              key={bt}
              onClick={() => set('blood_type', form.blood_type === bt ? '' : bt)}
              style={{
                padding: '8px 14px',
                borderRadius: 8,
                border: form.blood_type === bt
                  ? '2px solid #EF4444'
                  : '1px solid #2A2D3A',
                background: form.blood_type === bt
                  ? 'rgba(239,68,68,0.1)'
                  : 'transparent',
                color: form.blood_type === bt ? '#EF4444' : '#9CA3AF',
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: '0.85rem',
                transition: 'all 0.15s',
              }}
            >
              {bt}
            </button>
          ))}
        </div>
      </div>

      {/* Activity Level */}
      <div>
        <label style={labelStyle}>Activity Level</label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8 }}>
          {ACTIVITY_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => set('activity_level',
                form.activity_level === opt.value ? '' : opt.value)}
              style={optionBtn(form.activity_level === opt.value)}
            >
              <div style={{ fontSize: '1.2rem', marginBottom: 4 }}>{opt.icon}</div>
              <div style={{ fontWeight: 600, fontSize: '0.82rem' }}>{opt.label}</div>
              <div style={{ fontSize: '0.7rem', opacity: 0.7, marginTop: 2 }}>{opt.sub}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  const renderStep1 = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <p style={{ color: '#9CA3AF', fontSize: '0.9rem', lineHeight: 1.6 }}>
        This helps the AI give you safer, more accurate advice.
        Leave blank if not applicable.
      </p>

      {/* Known Conditions */}
      <div>
        <label style={labelStyle}>Known Health Conditions</label>
        <textarea
          placeholder="e.g. Diabetes, Hypertension, Thyroid (comma separated)"
          value={form.known_conditions}
          onChange={e => set('known_conditions', e.target.value)}
          rows={3}
          style={{
            ...inputStyle,
            resize: 'vertical',
            lineHeight: 1.6,
            fontFamily: 'inherit',
          }}
        />
        <p style={{ color: '#6B7280', fontSize: '0.72rem', marginTop: 6 }}>
          Separate multiple conditions with commas
        </p>
      </div>

      {/* Food Preference */}
      <div>
        <label style={labelStyle}>Food Preference</label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8 }}>
          {FOOD_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => set('food_preference',
                form.food_preference === opt.value ? '' : opt.value)}
              style={optionBtn(form.food_preference === opt.value)}
            >
              <div style={{ fontSize: '1.4rem', marginBottom: 4 }}>{opt.icon}</div>
              <div style={{ fontWeight: 600, fontSize: '0.82rem' }}>{opt.label}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <p style={{ color: '#9CA3AF', fontSize: '0.9rem', lineHeight: 1.6 }}>
        Almost done! Set your preferences and choose where to start.
      </p>

      {/* Language */}
      <div>
        <label style={labelStyle}>Preferred Language</label>
        <div style={{ display: 'flex', gap: 12 }}>
          {[
            { value: 'english', label: '🇬🇧 English' },
            { value: 'telugu', label: '🇮🇳 తెలుగు' },
          ].map(opt => (
            <button
              key={opt.value}
              onClick={() => setLang(opt.value)}
              style={{
                ...optionBtn(language === opt.value),
                flex: 1,
                textAlign: 'center',
                padding: '14px',
                fontSize: '0.9rem',
                fontWeight: 600,
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* First Action */}
      <div>
        <label style={labelStyle}>What would you like to do first?</label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {FIRST_ACTION_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setFirstAction(opt.value)}
              style={{
                ...optionBtn(firstAction === opt.value),
                display: 'flex',
                alignItems: 'center',
                gap: 14,
              }}
            >
              <span style={{ fontSize: '1.4rem', flexShrink: 0 }}>{opt.icon}</span>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.875rem',
                  color: firstAction === opt.value ? '#60A5FA' : '#F8F9FA' }}>
                  {opt.label}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#6B7280', marginTop: 2 }}>
                  {opt.sub}
                </div>
              </div>
              {firstAction === opt.value && (
                <div style={{ marginLeft: 'auto', color: '#2563EB', fontSize: '1rem' }}>
                  ✓
                </div>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  // ── Main render ─────────────────────────────────────
  return (
    <div style={{
      minHeight: '100vh',
      background: '#0F1117',
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'center',
      padding: '24px 16px 40px',
      overflowY: 'auto',
    }}>
      <div style={{ width: '100%', maxWidth: 520 }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            width: 48, height: 48, background: '#2563EB',
            borderRadius: 12, display: 'flex', alignItems: 'center',
            justifyContent: 'center', margin: '0 auto 10px',
            fontWeight: 800, color: '#fff', fontSize: 22,
          }}>H</div>
          <div style={{ fontWeight: 800, fontSize: '1.25rem', color: '#F8F9FA' }}>
            Vaidya Assist
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ marginBottom: 28 }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between',
            alignItems: 'center', marginBottom: 10,
          }}>
            {STEPS.map((label, i) => (
              <div
                key={i}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  opacity: i <= step ? 1 : 0.35,
                  transition: 'opacity 0.2s',
                }}
              >
                <div style={{
                  width: 24, height: 24, borderRadius: '50%',
                  background: i < step
                    ? '#10B981'
                    : i === step
                      ? '#2563EB'
                      : '#2A2D3A',
                  display: 'flex', alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.7rem', fontWeight: 700, color: '#fff',
                  transition: 'background 0.2s',
                }}>
                  {i < step ? '✓' : i + 1}
                </div>
                <span style={{
                  fontSize: '0.72rem', fontWeight: 600,
                  color: i === step ? '#F8F9FA' : '#6B7280',
                }}>
                  {label}
                </span>
                {i < STEPS.length - 1 && (
                  <div style={{
                    width: 40, height: 2,
                    background: i < step ? '#10B981' : '#2A2D3A',
                    marginLeft: 4, borderRadius: 1,
                    transition: 'background 0.2s',
                  }} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Card */}
        <div style={{
          background: '#1A1D27',
          border: '1px solid #2A2D3A',
          borderRadius: 16,
          padding: 'clamp(20px, 5vw, 32px)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
        }}>
          {/* Step header */}
          <div style={{ marginBottom: 24 }}>
            <h2 style={{
              fontSize: 'clamp(1.1rem, 4vw, 1.4rem)',
              fontWeight: 700, color: '#F8F9FA', margin: 0,
            }}>
              {step === 0 && '👤 Your Health Profile'}
              {step === 1 && '🏥 Health Conditions'}
              {step === 2 && '⚙️ Your Preferences'}
            </h2>
            <p style={{
              color: '#6B7280', fontSize: '0.78rem',
              margin: '4px 0 0',
            }}>
              Step {step + 1} of {STEPS.length}
            </p>
          </div>

          {/* Step content */}
          {step === 0 && renderStep0()}
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}

          {/* Navigation buttons */}
          <div style={{
            display: 'flex', gap: 10, marginTop: 28,
            alignItems: 'center',
          }}>
            {step > 0 && (
              <button
                onClick={handleBack}
                style={{
                  padding: '11px 20px',
                  background: 'transparent',
                  border: '1px solid #2A2D3A',
                  borderRadius: 10, color: '#9CA3AF',
                  cursor: 'pointer', fontWeight: 500,
                  fontSize: '0.875rem',
                }}
              >
                ← Back
              </button>
            )}

            <button
              onClick={handleSkip}
              style={{
                padding: '11px 16px',
                background: 'transparent',
                border: 'none',
                color: '#6B7280',
                cursor: 'pointer',
                fontWeight: 500,
                fontSize: '0.8rem',
                marginLeft: step === 0 ? 'auto' : 0,
              }}
            >
              Skip
            </button>

            {step < 2 ? (
              <button
                onClick={handleNext}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: '#2563EB',
                  border: 'none', borderRadius: 10,
                  color: '#fff', cursor: 'pointer',
                  fontWeight: 700, fontSize: '0.9rem',
                  transition: 'background 0.15s',
                }}
              >
                Continue →
              </button>
            ) : (
              <button
                onClick={handleFinish}
                disabled={saving}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: saving
                    ? 'rgba(37,99,235,0.5)'
                    : '#2563EB',
                  border: 'none', borderRadius: 10,
                  color: '#fff',
                  cursor: saving ? 'not-allowed' : 'pointer',
                  fontWeight: 700, fontSize: '0.9rem',
                  transition: 'background 0.15s',
                }}
              >
                {saving ? 'Setting up…' : '🚀 Get Started'}
              </button>
            )}
          </div>
        </div>

        {/* Footer note */}
        <p style={{
          textAlign: 'center',
          color: '#4B5563',
          fontSize: '0.72rem',
          marginTop: 16,
          lineHeight: 1.5,
        }}>
          Your data is private and secure.
          You can edit all this information later in Profile settings.
        </p>
      </div>
    </div>
  );
};

export default Onboarding;
