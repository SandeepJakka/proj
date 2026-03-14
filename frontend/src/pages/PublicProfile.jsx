import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { User, Heart, Activity, AlertCircle } from 'lucide-react'

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
    <div style={{ minHeight: '100vh', background: '#0F1117',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#9CA3AF' }}>
      Loading...
    </div>
  )

  if (error) return (
    <div style={{ minHeight: '100vh', background: '#0F1117',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexDirection: 'column', gap: 16 }}>
      <AlertCircle size={48} color="#EF4444" />
      <p style={{ color: '#9CA3AF' }}>Profile not found or not public</p>
      <Link to="/" style={{ color: '#2563EB' }}>Go to Healthora</Link>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#0F1117', 
      padding: '40px 20px' }}>
      <div style={{ maxWidth: 500, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ width: 30, height: 30, background: '#2563EB',
            borderRadius: 8, display: 'inline-flex', alignItems: 'center',
            justifyContent: 'center', fontWeight: 800, color: '#fff',
            fontSize: 14, marginBottom: 16 }}>H</div>
          <h1 style={{ color: '#F8F9FA', fontSize: '1.5rem', 
            fontWeight: 700 }}>Health Profile</h1>
          <p style={{ color: '#9CA3AF' }}>@{username}</p>
        </div>

        <div style={{ background: '#1A1D27', border: '1px solid #2A2D3A',
          borderRadius: 16, padding: 28, marginBottom: 20 }}>
          {profile.full_name && (
            <div style={{ display: 'flex', justifyContent: 'space-between',
              padding: '12px 0', borderBottom: '1px solid #2A2D3A' }}>
              <span style={{ color: '#9CA3AF' }}>Name</span>
              <span style={{ color: '#F8F9FA', fontWeight: 600 }}>
                {profile.full_name}
              </span>
            </div>
          )}
          {profile.age && (
            <div style={{ display: 'flex', justifyContent: 'space-between',
              padding: '12px 0', borderBottom: '1px solid #2A2D3A' }}>
              <span style={{ color: '#9CA3AF' }}>Age</span>
              <span style={{ color: '#F8F9FA', fontWeight: 600 }}>
                {profile.age} years
              </span>
            </div>
          )}
          {profile.gender && (
            <div style={{ display: 'flex', justifyContent: 'space-between',
              padding: '12px 0', borderBottom: '1px solid #2A2D3A' }}>
              <span style={{ color: '#9CA3AF' }}>Gender</span>
              <span style={{ color: '#F8F9FA', fontWeight: 600 }}>
                {profile.gender}
              </span>
            </div>
          )}
          {profile.blood_type && (
            <div style={{ display: 'flex', justifyContent: 'space-between',
              padding: '12px 0', borderBottom: '1px solid #2A2D3A' }}>
              <span style={{ color: '#9CA3AF' }}>Blood Type</span>
              <span style={{ color: '#EF4444', fontWeight: 700 }}>
                {profile.blood_type}
              </span>
            </div>
          )}
          {profile.activity_level && (
            <div style={{ display: 'flex', justifyContent: 'space-between',
              padding: '12px 0', borderBottom: '1px solid #2A2D3A' }}>
              <span style={{ color: '#9CA3AF' }}>Activity Level</span>
              <span style={{ color: '#F8F9FA', fontWeight: 600 }}>
                {profile.activity_level}
              </span>
            </div>
          )}
          {profile.known_conditions && (
            <div style={{ padding: '12px 0', borderBottom: '1px solid #2A2D3A' }}>
              <span style={{ color: '#9CA3AF', display: 'block',
                marginBottom: 6 }}>Known Conditions</span>
              <span style={{ color: '#F8F9FA' }}>{profile.known_conditions}</span>
            </div>
          )}
          {profile.allergies && (
            <div style={{ padding: '12px 0' }}>
              <span style={{ color: '#9CA3AF', display: 'block',
                marginBottom: 6 }}>Allergies</span>
              <span style={{ color: '#F59E0B' }}>{profile.allergies}</span>
            </div>
          )}
        </div>

        <div style={{ textAlign: 'center', padding: '20px',
          background: 'rgba(37,99,235,0.08)',
          border: '1px solid rgba(37,99,235,0.2)',
          borderRadius: 12 }}>
          <p style={{ color: '#9CA3AF', fontSize: '0.875rem', 
            marginBottom: 12 }}>
            Manage your own health profile on Healthora
          </p>
          <Link to="/register" style={{
            background: '#2563EB', color: '#fff', padding: '8px 20px',
            borderRadius: 8, textDecoration: 'none', fontWeight: 600,
            fontSize: '0.875rem'
          }}>
            Create Free Account
          </Link>
        </div>
      </div>
    </div>
  )
}

export default PublicProfile
