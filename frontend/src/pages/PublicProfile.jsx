import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { AlertCircle, Activity, FileText, Heart } from 'lucide-react'

// ── BMI color helper ──────────────────────────────────────
const getBmiColor = (bmi) => {
  if (!bmi) return '#9CA3AF'
  if (bmi < 18.5) return '#60A5FA'
  if (bmi < 25) return '#10B981'
  if (bmi < 30) return '#F59E0B'
  return '#EF4444'
}

const getBmiWidth = (bmi) => {
  if (!bmi) return 0
  // Map BMI 10–40 to 0–100%
  return Math.min(100, Math.max(0, ((bmi - 10) / 30) * 100))
}

const getReportTypeColor = (type) => {
  if (!type) return '#6B7280'
  const t = type.toLowerCase()
  if (t.includes('blood') || t.includes('cbc')) return '#EF4444'
  if (t.includes('urine')) return '#F59E0B'
  if (t.includes('liver') || t.includes('lft')) return '#8B5CF6'
  if (t.includes('thyroid')) return '#2563EB'
  if (t.includes('sugar') || t.includes('glucose') || t.includes('diabetes')) return '#10B981'
  if (t.includes('x-ray') || t.includes('scan') || t.includes('mri')) return '#60A5FA'
  return '#6B7280'
}

// ── Row component ─────────────────────────────────────────
const ProfileRow = ({ label, value, valueColor }) => (
  <div style={{
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
    padding: '12px 0', borderBottom: '1px solid #2A2D3A',
  }}>
    <span style={{ color: '#9CA3AF', fontSize: '0.85rem', flexShrink: 0, marginRight: 16 }}>
      {label}
    </span>
    <span style={{ color: valueColor || '#F8F9FA', fontWeight: 600, fontSize: '0.875rem', textAlign: 'right' }}>
      {value}
    </span>
  </div>
)

// ── Main Component ────────────────────────────────────────
const PublicProfile = () => {
  const { username } = useParams()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetch(`http://localhost:8000/api/profile/public/${username}`)
      .then(r => r.json())
      .then(data => {
        if (data.detail) setError(data.detail)
        else setProfile(data)
      })
      .catch(() => setError('Could not load profile'))
      .finally(() => setLoading(false))
  }, [username])

  if (loading) return (
    <div style={{
      minHeight: '100vh', background: '#0F1117',
      display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9CA3AF',
    }}>
      Loading profile...
    </div>
  )

  if (error) return (
    <div style={{
      minHeight: '100vh', background: '#0F1117',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexDirection: 'column', gap: 16,
    }}>
      <AlertCircle size={48} color="#EF4444" />
      <p style={{ color: '#9CA3AF' }}>Profile not found or not public</p>
      <Link to="/" style={{ color: '#2563EB' }}>Go to Vaidya Assist</Link>
    </div>
  )

  const bmi = profile.health_summary?.bmi
  const bmiCategory = profile.health_summary?.bmi_category

  return (
    <div style={{ minHeight: '100vh', background: '#0F1117', padding: '40px 20px' }}>
      <div style={{ maxWidth: 560, margin: '0 auto' }}>

        {/* ── Healthora logo header ─────────────────── */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 36, height: 36, background: '#2563EB', borderRadius: 10,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 800, color: '#fff', fontSize: 16, marginBottom: 12,
          }}>H</div>
          <h1 style={{ color: '#F8F9FA', fontSize: '1.4rem', fontWeight: 700, margin: '0 0 4px' }}>
            {profile.full_name || `@${username}`}
          </h1>
          <p style={{ color: '#6B7280', margin: 0, fontSize: '0.85rem' }}>
            @{username} · Health Profile on Vaidya Assist
          </p>
        </div>

        {/* ── Basic Info Card ───────────────────────── */}
        {(profile.age || profile.gender || profile.blood_type ||
          profile.activity_level || profile.known_conditions || profile.allergies) && (
            <div style={{
              background: '#1A1D27', border: '1px solid #2A2D3A',
              borderRadius: 16, padding: '8px 24px', marginBottom: 16,
            }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '14px 0', borderBottom: '1px solid #2A2D3A', marginBottom: 4,
              }}>
                <Heart size={16} color="#EF4444" />
                <span style={{ color: '#F8F9FA', fontWeight: 700, fontSize: '0.9rem' }}>
                  Basic Information
                </span>
              </div>

              {profile.age && <ProfileRow label="Age" value={`${profile.age} years`} />}
              {profile.gender && <ProfileRow label="Gender" value={profile.gender} />}
              {profile.blood_type && (
                <ProfileRow label="Blood Type" value={profile.blood_type} valueColor="#EF4444" />
              )}
              {profile.activity_level && (
                <ProfileRow label="Activity Level" value={profile.activity_level} />
              )}
              {profile.known_conditions && (
                <div style={{ padding: '12px 0', borderBottom: '1px solid #2A2D3A' }}>
                  <span style={{ color: '#9CA3AF', fontSize: '0.85rem', display: 'block', marginBottom: 6 }}>
                    Known Conditions
                  </span>
                  <span style={{ color: '#F8F9FA', fontSize: '0.875rem', lineHeight: 1.6 }}>
                    {profile.known_conditions}
                  </span>
                </div>
              )}
              {profile.allergies && (
                <div style={{ padding: '12px 0' }}>
                  <span style={{ color: '#9CA3AF', fontSize: '0.85rem', display: 'block', marginBottom: 6 }}>
                    Allergies
                  </span>
                  <span style={{ color: '#F59E0B', fontSize: '0.875rem' }}>
                    ⚠️ {profile.allergies}
                  </span>
                </div>
              )}
            </div>
          )}

        {/* ── Health Summary Card (BMI) ─────────────── */}
        {profile.health_summary && (
          <div style={{
            background: '#1A1D27', border: '1px solid #2A2D3A',
            borderRadius: 16, padding: '8px 24px', marginBottom: 16,
          }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '14px 0', borderBottom: '1px solid #2A2D3A', marginBottom: 16,
            }}>
              <Activity size={16} color="#10B981" />
              <span style={{ color: '#F8F9FA', fontWeight: 700, fontSize: '0.9rem' }}>
                Health Summary
              </span>
            </div>

            {bmi && (
              <div style={{ marginBottom: 20 }}>
                <div style={{
                  display: 'flex', justifyContent: 'space-between',
                  alignItems: 'baseline', marginBottom: 10,
                }}>
                  <span style={{ color: '#9CA3AF', fontSize: '0.85rem' }}>
                    BMI (Body Mass Index)
                  </span>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ color: getBmiColor(bmi), fontSize: '1.4rem', fontWeight: 800 }}>
                      {bmi}
                    </span>
                    <span style={{ color: getBmiColor(bmi), fontSize: '0.75rem', marginLeft: 6, fontWeight: 600 }}>
                      {bmiCategory}
                    </span>
                  </div>
                </div>

                {/* BMI bar */}
                <div style={{
                  height: 8, background: '#2A2D3A', borderRadius: 4,
                  overflow: 'hidden', position: 'relative',
                }}>
                  {/* Colour zone backgrounds */}
                  <div style={{ position: 'absolute', inset: 0, display: 'flex' }}>
                    <div style={{ width: '28%', background: 'rgba(96,165,250,0.3)' }} />
                    <div style={{ width: '24%', background: 'rgba(16,185,129,0.3)' }} />
                    <div style={{ width: '17%', background: 'rgba(245,158,11,0.3)' }} />
                    <div style={{ flex: 1, background: 'rgba(239,68,68,0.3)' }} />
                  </div>
                  {/* Indicator line */}
                  <div style={{
                    position: 'absolute', top: 0,
                    left: `${getBmiWidth(bmi)}%`,
                    transform: 'translateX(-50%)',
                    width: 3, height: '100%',
                    background: getBmiColor(bmi), borderRadius: 2,
                  }} />
                </div>

                {/* BMI scale labels */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                  {['Underweight', 'Normal', 'Overweight', 'Obese'].map((label, i) => (
                    <span key={i} style={{ fontSize: '0.62rem', color: '#6B7280' }}>{label}</span>
                  ))}
                </div>
              </div>
            )}

            {profile.health_summary.conditions && (
              <div style={{ padding: '12px 0', borderTop: '1px solid #2A2D3A' }}>
                <span style={{ color: '#9CA3AF', fontSize: '0.8rem', display: 'block', marginBottom: 6 }}>
                  Conditions Overview
                </span>
                <span style={{ color: '#F8F9FA', fontSize: '0.85rem', lineHeight: 1.6 }}>
                  {profile.health_summary.conditions}
                </span>
              </div>
            )}
          </div>
        )}

        {/* ── Recent Reports Card ───────────────────── */}
        {profile.reports && profile.reports.length > 0 && (
          <div style={{
            background: '#1A1D27', border: '1px solid #2A2D3A',
            borderRadius: 16, padding: '8px 24px', marginBottom: 16,
          }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '14px 0', borderBottom: '1px solid #2A2D3A', marginBottom: 4,
            }}>
              <FileText size={16} color="#8B5CF6" />
              <span style={{ color: '#F8F9FA', fontWeight: 700, fontSize: '0.9rem' }}>
                Recent Reports
              </span>
              <span style={{
                background: 'rgba(139,92,246,0.15)', color: '#8B5CF6',
                fontSize: '0.7rem', padding: '2px 8px', borderRadius: 20,
                fontWeight: 600, marginLeft: 4,
              }}>
                {profile.reports.length}
              </span>
            </div>

            {profile.reports.map((report, i) => {
              const typeColor = getReportTypeColor(report.report_type)
              return (
                <div key={i} style={{
                  padding: '14px 0',
                  borderBottom: i < profile.reports.length - 1 ? '1px solid #2A2D3A' : 'none',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                    <div style={{
                      width: 8, height: 8, borderRadius: '50%',
                      background: typeColor, flexShrink: 0,
                    }} />
                    <span style={{ color: '#F8F9FA', fontWeight: 600, fontSize: '0.85rem', flex: 1 }}>
                      {report.filename}
                    </span>
                    <span style={{
                      background: `${typeColor}18`, color: typeColor,
                      fontSize: '0.68rem', padding: '2px 8px', borderRadius: 6,
                      fontWeight: 600, flexShrink: 0,
                    }}>
                      {report.report_type?.replace(/_/g, ' ') || 'Report'}
                    </span>
                  </div>
                  {report.summary && (
                    <p style={{
                      color: '#9CA3AF', fontSize: '0.78rem', lineHeight: 1.6,
                      margin: '0 0 0 18px',
                    }}>
                      {report.summary}
                    </p>
                  )}
                  {report.date && (
                    <div style={{ color: '#6B7280', fontSize: '0.72rem', marginTop: 4, marginLeft: 18 }}>
                      {new Date(report.date).toLocaleDateString('en-IN', {
                        day: 'numeric', month: 'short', year: 'numeric',
                      })}
                    </div>
                  )}
                </div>
              )
            })}

            <div style={{ padding: '10px 0 4px', borderTop: '1px solid #2A2D3A' }}>
              <p style={{ color: '#6B7280', fontSize: '0.72rem', margin: 0, textAlign: 'center' }}>
                🔒 Only report summaries are shown. Actual files are private.
              </p>
            </div>
          </div>
        )}

        {/* ── Join Healthora CTA ────────────────────── */}
        <div style={{
          textAlign: 'center', padding: '20px 24px',
          background: 'rgba(37,99,235,0.06)',
          border: '1px solid rgba(37,99,235,0.15)', borderRadius: 14,
        }}>
          <div style={{ fontSize: '1.5rem', marginBottom: 8 }}>🏥</div>
          <p style={{ color: '#9CA3AF', fontSize: '0.85rem', marginBottom: 14, lineHeight: 1.6 }}>
            Manage your health, analyze reports, and get AI-powered insights on Vaidya Assist
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/register" style={{
              background: '#2563EB', color: '#fff',
              padding: '9px 22px', borderRadius: 9,
              textDecoration: 'none', fontWeight: 600, fontSize: '0.85rem',
            }}>
              Create Free Account
            </Link>
            <Link to="/" style={{
              background: 'rgba(255,255,255,0.05)', border: '1px solid #2A2D3A',
              color: '#9CA3AF', padding: '9px 22px', borderRadius: 9,
              textDecoration: 'none', fontWeight: 500, fontSize: '0.85rem',
            }}>
              Learn More
            </Link>
          </div>
        </div>

      </div>
    </div>
  )
}

export default PublicProfile
