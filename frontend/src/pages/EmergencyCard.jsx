import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'

const EmergencyCard = () => {
  const { username } = useParams()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetch(`http://localhost:8000/api/profile/emergency/${username}`)
      .then(r => r.json())
      .then(d => {
        if (d.detail) setError(d.detail)
        else setData(d)
      })
      .catch(() => setError('Could not load emergency card'))
      .finally(() => setLoading(false))
  }, [username])

  if (loading) return (
    <div style={{
      minHeight: '100vh', background: '#0F1117',
      display: 'flex', alignItems: 'center',
      justifyContent: 'center', color: '#9CA3AF',
      flexDirection: 'column', gap: 12
    }}>
      <div style={{
        width: 40, height: 40,
        border: '3px solid #2A2D3A',
        borderTop: '3px solid #EF4444',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite'
      }} />
      <p>Loading emergency card...</p>
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )

  if (error) return (
    <div style={{
      minHeight: '100vh', background: '#0F1117',
      display: 'flex', alignItems: 'center',
      justifyContent: 'center', flexDirection: 'column',
      gap: 16, padding: 20
    }}>
      <span style={{ fontSize: '3rem' }}>🚨</span>
      <p style={{ color: '#EF4444', fontWeight: 700 }}>
        Emergency card not found
      </p>
      <p style={{ color: '#9CA3AF', fontSize: '0.875rem' }}>
        This card may not exist or has been removed
      </p>
      <Link to="/" style={{ color: '#2563EB' }}>Go to Healthora</Link>
    </div>
  )

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0F1117 0%, #1a0a0a 100%)',
      display: 'flex', alignItems: 'center',
      justifyContent: 'center', padding: '20px'
    }}>
      <div style={{ width: '100%', maxWidth: 480 }}>

        {/* Emergency banner */}
        <div style={{
          background: '#EF4444',
          borderRadius: '12px 12px 0 0',
          padding: '12px 20px',
          display: 'flex', alignItems: 'center',
          gap: 10
        }}>
          <span style={{ fontSize: '1.5rem' }}>🚨</span>
          <div>
            <div style={{
              color: '#fff', fontWeight: 800,
              fontSize: '0.9rem', letterSpacing: '0.05em'
            }}>
              EMERGENCY MEDICAL INFORMATION
            </div>
            <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.72rem' }}>
              Show this to medical personnel
            </div>
          </div>
        </div>

        {/* Card body */}
        <div style={{
          background: '#1A1D27',
          border: '2px solid #EF4444',
          borderTop: 'none',
          borderRadius: '0 0 16px 16px',
          padding: 24
        }}>
          {/* Name + Blood type */}
          <div style={{
            display: 'flex', justifyContent: 'space-between',
            alignItems: 'flex-start', marginBottom: 20
          }}>
            <div>
              <div style={{
                color: '#F8F9FA', fontWeight: 800,
                fontSize: '1.4rem', lineHeight: 1.2,
                marginBottom: 4
              }}>
                {data.full_name}
              </div>
              <div style={{ color: '#9CA3AF', fontSize: '0.8rem' }}>
                {data.age && `${data.age} years`}
                {data.age && data.gender && ' · '}
                {data.gender}
              </div>
            </div>
            {data.blood_type && (
              <div style={{
                background: '#EF4444',
                borderRadius: 12, padding: '10px 16px',
                textAlign: 'center'
              }}>
                <div style={{
                  color: '#fff', fontWeight: 800,
                  fontSize: '1.6rem', lineHeight: 1
                }}>
                  {data.blood_type}
                </div>
                <div style={{
                  color: 'rgba(255,255,255,0.8)',
                  fontSize: '0.6rem', marginTop: 2
                }}>
                  BLOOD TYPE
                </div>
              </div>
            )}
          </div>

          {/* Allergies */}
          {data.allergies && (
            <div style={{
              background: 'rgba(239,68,68,0.1)',
              border: '1.5px solid rgba(239,68,68,0.4)',
              borderRadius: 10, padding: '12px 14px',
              marginBottom: 12
            }}>
              <div style={{
                color: '#EF4444', fontWeight: 700,
                fontSize: '0.7rem', textTransform: 'uppercase',
                letterSpacing: '0.08em', marginBottom: 4
              }}>
                ⚠️ ALLERGIES — CRITICAL
              </div>
              <div style={{
                color: '#FCA5A5', fontWeight: 600,
                fontSize: '0.9rem'
              }}>
                {data.allergies}
              </div>
            </div>
          )}

          {/* Conditions */}
          {data.known_conditions && (
            <div style={{
              background: 'rgba(245,158,11,0.08)',
              border: '1px solid rgba(245,158,11,0.3)',
              borderRadius: 10, padding: '12px 14px',
              marginBottom: 12
            }}>
              <div style={{
                color: '#F59E0B', fontWeight: 700,
                fontSize: '0.7rem', textTransform: 'uppercase',
                letterSpacing: '0.08em', marginBottom: 4
              }}>
                🏥 MEDICAL CONDITIONS
              </div>
              <div style={{ color: '#FDE68A', fontSize: '0.875rem' }}>
                {data.known_conditions}
              </div>
            </div>
          )}

          {/* Current medicines */}
          {data.current_medicines && (
            <div style={{
              background: 'rgba(37,99,235,0.08)',
              border: '1px solid rgba(37,99,235,0.25)',
              borderRadius: 10, padding: '12px 14px',
              marginBottom: 12
            }}>
              <div style={{
                color: '#60A5FA', fontWeight: 700,
                fontSize: '0.7rem', textTransform: 'uppercase',
                letterSpacing: '0.08em', marginBottom: 4
              }}>
                💊 CURRENT MEDICINES
              </div>
              <div style={{ color: '#BFDBFE', fontSize: '0.875rem' }}>
                {data.current_medicines}
              </div>
            </div>
          )}

          {/* Emergency contact */}
          {data.emergency_contact_name && (
            <div style={{
              background: 'rgba(16,185,129,0.08)',
              border: '1px solid rgba(16,185,129,0.3)',
              borderRadius: 10, padding: '12px 14px',
              marginBottom: 12
            }}>
              <div style={{
                color: '#10B981', fontWeight: 700,
                fontSize: '0.7rem', textTransform: 'uppercase',
                letterSpacing: '0.08em', marginBottom: 8
              }}>
                📞 EMERGENCY CONTACT
              </div>
              <div style={{
                display: 'flex', justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <div style={{
                    color: '#F8F9FA', fontWeight: 700,
                    fontSize: '1rem'
                  }}>
                    {data.emergency_contact_name}
                  </div>
                  {data.emergency_contact_relation && (
                    <div style={{
                      color: '#9CA3AF', fontSize: '0.75rem'
                    }}>
                      {data.emergency_contact_relation}
                    </div>
                  )}
                </div>
                {data.emergency_contact_phone && (
                  <a
                    href={`tel:${data.emergency_contact_phone}`}
                    style={{
                      background: '#10B981',
                      color: '#fff', fontWeight: 700,
                      fontSize: '0.875rem',
                      padding: '8px 14px', borderRadius: 8,
                      textDecoration: 'none',
                      display: 'flex', alignItems: 'center', gap: 6
                    }}
                  >
                    📞 {data.emergency_contact_phone}
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Doctor */}
          {data.primary_doctor_name && (
            <div style={{
              background: 'rgba(139,92,246,0.08)',
              border: '1px solid rgba(139,92,246,0.2)',
              borderRadius: 10, padding: '12px 14px',
              marginBottom: 16
            }}>
              <div style={{
                color: '#8B5CF6', fontWeight: 700,
                fontSize: '0.7rem', textTransform: 'uppercase',
                letterSpacing: '0.08em', marginBottom: 8
              }}>
                👨‍⚕️ PRIMARY DOCTOR
              </div>
              <div style={{
                display: 'flex', justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div style={{
                  color: '#F8F9FA', fontWeight: 600,
                  fontSize: '0.9rem'
                }}>
                  {data.primary_doctor_name}
                </div>
                {data.primary_doctor_phone && (
                  <a
                    href={`tel:${data.primary_doctor_phone}`}
                    style={{
                      color: '#C4B5FD', fontWeight: 600,
                      fontSize: '0.875rem', textDecoration: 'none'
                    }}
                  >
                    📞 {data.primary_doctor_phone}
                  </a>
                )}
              </div>
            </div>
          )}

          {/* BMI row if available */}
          {data.bmi && (
            <div style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid #2A2D3A',
              borderRadius: 10, padding: '10px 14px',
              marginBottom: 16,
              display: 'flex', gap: 20
            }}>
              {data.weight_kg && (
                <div>
                  <div style={{ color: '#6B7280', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Weight</div>
                  <div style={{ color: '#F8F9FA', fontWeight: 600, fontSize: '0.875rem' }}>{data.weight_kg} kg</div>
                </div>
              )}
              {data.height_cm && (
                <div>
                  <div style={{ color: '#6B7280', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Height</div>
                  <div style={{ color: '#F8F9FA', fontWeight: 600, fontSize: '0.875rem' }}>{data.height_cm} cm</div>
                </div>
              )}
              <div>
                <div style={{ color: '#6B7280', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>BMI</div>
                <div style={{ color: '#F8F9FA', fontWeight: 600, fontSize: '0.875rem' }}>{data.bmi}</div>
              </div>
            </div>
          )}

          {/* Footer */}
          <div style={{
            borderTop: '1px solid #2A2D3A', paddingTop: 12,
            display: 'flex', justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div style={{ color: '#6B7280', fontSize: '0.68rem' }}>
              🔒 Healthora Medical ID
            </div>
            <div style={{ color: '#6B7280', fontSize: '0.68rem' }}>
              healthora.app
            </div>
          </div>
        </div>

        {/* Powered by */}
        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <Link to="/register" style={{
            color: '#9CA3AF', fontSize: '0.75rem',
            textDecoration: 'none'
          }}>
            Create your own Emergency Card at Healthora →
          </Link>
        </div>
      </div>
    </div>
  )
}

export default EmergencyCard
