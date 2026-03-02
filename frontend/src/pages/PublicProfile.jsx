import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { User, Heart } from 'lucide-react';
import { getPublicProfile } from '../services/api';

const PublicProfile = () => {
  const { username } = useParams();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadProfile();
  }, [username]);

  const loadProfile = async () => {
    try {
      const res = await getPublicProfile(username);
      setProfile(res.data);
    } catch (err) {
      setError('Profile not found or not public');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#0F1117', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#F8F9FA' }}>Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: '100vh', background: '#0F1117', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
        <User size={64} color="#6B7280" />
        <p style={{ color: '#F8F9FA', fontSize: '1.25rem' }}>{error}</p>
        <Link to="/" className="btn btn-primary">Go to Healthora</Link>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0F1117', padding: '40px 20px' }}>
      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ background: '#2563EB', color: 'white', width: 64, height: 64, borderRadius: 16, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, fontWeight: 800, marginBottom: 16 }}>
            H
          </div>
          <h1 style={{ color: '#F8F9FA', marginBottom: 8 }}>Health Profile</h1>
          <p style={{ color: '#9CA3AF' }}>@{username}</p>
        </div>

        <div className="card" style={{ marginBottom: 24 }}>
          {profile.full_name && (
            <div style={{ marginBottom: 16 }}>
              <label style={{ color: '#9CA3AF', fontSize: '0.875rem', display: 'block', marginBottom: 4 }}>Name</label>
              <p style={{ color: '#F8F9FA', fontSize: '1.1rem', margin: 0 }}>{profile.full_name}</p>
            </div>
          )}

          {profile.age && (
            <div style={{ marginBottom: 16 }}>
              <label style={{ color: '#9CA3AF', fontSize: '0.875rem', display: 'block', marginBottom: 4 }}>Age</label>
              <p style={{ color: '#F8F9FA', margin: 0 }}>{profile.age} years</p>
            </div>
          )}

          {profile.gender && (
            <div style={{ marginBottom: 16 }}>
              <label style={{ color: '#9CA3AF', fontSize: '0.875rem', display: 'block', marginBottom: 4 }}>Gender</label>
              <p style={{ color: '#F8F9FA', margin: 0, textTransform: 'capitalize' }}>{profile.gender}</p>
            </div>
          )}

          {profile.blood_type && (
            <div style={{ marginBottom: 16 }}>
              <label style={{ color: '#9CA3AF', fontSize: '0.875rem', display: 'block', marginBottom: 4 }}>Blood Type</label>
              <p style={{ color: '#F8F9FA', margin: 0 }}>{profile.blood_type}</p>
            </div>
          )}

          {profile.activity_level && (
            <div style={{ marginBottom: 16 }}>
              <label style={{ color: '#9CA3AF', fontSize: '0.875rem', display: 'block', marginBottom: 4 }}>Activity Level</label>
              <p style={{ color: '#F8F9FA', margin: 0, textTransform: 'capitalize' }}>{profile.activity_level}</p>
            </div>
          )}

          {profile.known_conditions && (
            <div style={{ marginBottom: 16 }}>
              <label style={{ color: '#9CA3AF', fontSize: '0.875rem', display: 'block', marginBottom: 4 }}>Known Conditions</label>
              <p style={{ color: '#F8F9FA', margin: 0 }}>{profile.known_conditions}</p>
            </div>
          )}

          {profile.allergies && (
            <div style={{ marginBottom: 16 }}>
              <label style={{ color: '#9CA3AF', fontSize: '0.875rem', display: 'block', marginBottom: 4 }}>Allergies</label>
              <p style={{ color: '#F8F9FA', margin: 0 }}>{profile.allergies}</p>
            </div>
          )}
        </div>

        <div style={{ textAlign: 'center', padding: 24, background: '#1A1D27', borderRadius: 12 }}>
          <Heart size={32} color="#2563EB" style={{ marginBottom: 12 }} />
          <p style={{ color: '#9CA3AF', fontSize: '0.875rem', marginBottom: 16 }}>
            Powered by Healthora
          </p>
          <Link to="/signup" className="btn btn-primary">
            Create Your Health Profile
          </Link>
        </div>
      </div>
    </div>
  );
};

export default PublicProfile;
