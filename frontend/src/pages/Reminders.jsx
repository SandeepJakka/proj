import React, { useState, useEffect, useRef } from 'react'
import {
  Bell, Plus, Trash2, Clock, X, Check,
  Camera, ChevronRight, Upload, Pill,
  AlertCircle
} from 'lucide-react'
import toast, { Toaster } from 'react-hot-toast'
import { useT } from '../context/LanguageContext'
import {
  getReminders, createReminder,
  updateReminder, deleteReminder
} from '../services/api'

// ── Helpers ──────────────────────────────────────────────
const DEFAULT_TIMES = {
  once_daily: ['08:00'],
  twice_daily: ['08:00', '20:00'],
  three_times: ['08:00', '14:00', '20:00'],
  custom: ['08:00'],
}

const getTimeOfDay = (time) => {
  const hour = parseInt(time.split(':')[0])
  if (hour >= 5 && hour < 12) return { label: 'Morning', color: '#F59E0B', bg: '#FEF3C720' }
  if (hour >= 12 && hour < 17) return { label: 'Afternoon', color: '#2563EB', bg: '#DBEAFE20' }
  if (hour >= 17 && hour < 21) return { label: 'Evening', color: '#8B5CF6', bg: '#EDE9FE20' }
  return { label: 'Night', color: '#1E40AF', bg: '#1E3A5F20' }
}

// ── MedicineSetupCard Component ───────────────────────────
const MedicineSetupCard = ({ medicine, onConfirm, onSkip, index, total }) => {
  const t = useT()
  const FREQUENCY_OPTIONS = [
    { value: 'once_daily', label: t('rem_freq_once'), sublabel: '1x daily', times: ['08:00'] },
    { value: 'twice_daily', label: t('rem_freq_twice'), sublabel: '2x daily', times: ['08:00', '20:00'] },
    { value: 'three_times', label: t('rem_freq_thrice'), sublabel: '3x daily', times: ['08:00', '14:00', '20:00'] },
    { value: 'custom', label: t('rem_freq_custom'), sublabel: 'Set times', times: ['08:00'] },
  ]
  const [freq, setFreq] = useState('once_daily')
  const [times, setTimes] = useState(['08:00'])
  const [instructions, setInstructions] = useState(medicine.instructions || '')
  const [confirming, setConfirming] = useState(false)

  const handleFreqChange = (f) => {
    setFreq(f)
    setTimes([...DEFAULT_TIMES[f]])
  }

  const handleConfirm = async () => {
    setConfirming(true)
    await onConfirm(times, freq, instructions)
    setConfirming(false)
  }

  return (
    <div>
      {/* Medicine info */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24,
        padding: '14px 16px',
        background: 'rgba(37,99,235,0.08)',
        border: '1px solid rgba(37,99,235,0.2)', borderRadius: 12,
      }}>
        <div style={{
          width: 48, height: 48, background: 'rgba(37,99,235,0.15)',
          borderRadius: 12, display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontSize: '1.4rem', flexShrink: 0,
        }}>💊</div>
        <div>
          <div style={{ fontWeight: 700, color: '#F8F9FA', fontSize: '1rem' }}>
            {medicine.name}
          </div>
          <div style={{ color: '#9CA3AF', fontSize: '0.8rem', marginTop: 2 }}>
            {[medicine.dosage, medicine.duration].filter(Boolean).join(' • ') || t('dash_no_data')}
          </div>
        </div>
      </div>

      {/* Conversation bubble */}
      <div style={{
        background: '#0F1117', borderRadius: 12, padding: '14px 16px',
        marginBottom: 20, borderLeft: '3px solid #2563EB',
      }}>
        <p style={{ color: '#F8F9FA', margin: 0, fontSize: '0.9rem', lineHeight: 1.6 }}>
          How often do you take{' '}
          <strong style={{ color: '#60A5FA' }}>{medicine.name}</strong>?
          {medicine.dosage && (
            <span style={{ color: '#9CA3AF' }}> ({medicine.dosage})</span>
          )}
        </p>
      </div>

      {/* Frequency selector */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
        gap: 8, marginBottom: 16
      }}>
        {FREQUENCY_OPTIONS.map(opt => (
          <button
            key={opt.value}
            onClick={() => handleFreqChange(opt.value)}
            style={{
              padding: '12px 16px', borderRadius: 10, cursor: 'pointer', textAlign: 'left',
              background: freq === opt.value ? 'rgba(37,99,235,0.2)' : 'rgba(255,255,255,0.03)',
              border: freq === opt.value ? '1.5px solid #2563EB' : '1px solid #2A2D3A',
              transition: 'all 0.15s',
            }}
          >
            <div style={{ fontWeight: 600, color: '#F8F9FA', fontSize: '0.85rem' }}>{opt.label}</div>
            <div style={{ color: '#6B7280', fontSize: '0.72rem', marginTop: 2 }}>{opt.sublabel}</div>
          </button>
        ))}
      </div>

      {/* Time pickers */}
      <div style={{ marginBottom: 16 }}>
        <label style={{ color: '#9CA3AF', fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: 8 }}>
          ⏰ {t('rem_form_times')}:
        </label>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', width: '100%' }}>
          {times.map((t, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <input
                type="time"
                value={t}
                onChange={e => {
                  const newTimes = [...times]
                  newTimes[i] = e.target.value
                  setTimes(newTimes)
                }}
                style={{
                  background: '#0F1117', border: '1px solid #2A2D3A', borderRadius: 8,
                  padding: '8px 12px', color: '#F8F9FA', fontSize: '0.9rem',
                  width: '100%', minWidth: 120
                }}
              />
              {freq === 'custom' && times.length > 1 && (
                <button
                  onClick={() => setTimes(times.filter((_, idx) => idx !== i))}
                  style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer' }}
                >
                  <X size={14} />
                </button>
              )}
            </div>
          ))}
          {freq === 'custom' && (
            <button
              onClick={() => setTimes([...times, '08:00'])}
              style={{
                background: 'rgba(37,99,235,0.1)',
                border: '1px dashed rgba(37,99,235,0.4)',
                borderRadius: 8, padding: '8px 14px',
                color: '#60A5FA', cursor: 'pointer', fontSize: '0.8rem',
              }}
            >
              {t('rem_form_add_time')}
            </button>
          )}
        </div>
      </div>

      {/* Instructions */}
      <div style={{ marginBottom: 24 }}>
        <label style={{ color: '#9CA3AF', fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: 8 }}>
          📝 {t('rem_form_instructions')}:
        </label>
        <input
          className="form-input"
          value={instructions}
          onChange={e => setInstructions(e.target.value)}
          placeholder={t('rem_form_instructions_ph')}
        />
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 10 }}>
        <button
          onClick={onSkip}
          style={{
            flex: 1, padding: '12px',
            background: 'rgba(107,114,128,0.1)', border: '1px solid #2A2D3A',
            borderRadius: 10, color: '#9CA3AF', cursor: 'pointer',
            fontWeight: 500, fontSize: '0.875rem',
          }}
        >
          {t('rem_form_cancel')}
        </button>
        <button
          onClick={handleConfirm}
          disabled={confirming}
          style={{
            flex: 2, padding: '12px',
            background: confirming ? 'rgba(37,99,235,0.5)' : '#2563EB',
            border: 'none', borderRadius: 10, color: '#fff',
            cursor: confirming ? 'not-allowed' : 'pointer',
            fontWeight: 600, fontSize: '0.875rem',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
        >
          {confirming ? t('rem_scanning') : (
            <><Check size={16} /> {t('rem_form_save')} for {medicine.name}</>
          )}
        </button>
      </div>
    </div>
  )
}

// ── Main Reminders Component ──────────────────────────────
const Reminders = () => {
  const t = useT()
  const FREQUENCY_OPTIONS = [
    { value: 'once_daily', label: t('rem_freq_once'), sublabel: '1x daily', times: ['08:00'] },
    { value: 'twice_daily', label: t('rem_freq_twice'), sublabel: '2x daily', times: ['08:00', '20:00'] },
    { value: 'three_times', label: t('rem_freq_thrice'), sublabel: '3x daily', times: ['08:00', '14:00', '20:00'] },
    { value: 'custom', label: t('rem_freq_custom'), sublabel: 'Set times', times: ['08:00'] },
  ]
  const [reminders, setReminders] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)

  // Prescription scan state
  const [scanning, setScanning] = useState(false)
  const [scannedMedicines, setScannedMedicines] = useState([])
  const [setupIndex, setSetupIndex] = useState(0)
  const [setupComplete, setSetupComplete] = useState(false)
  const [doctorInfo, setDoctorInfo] = useState(null)
  const prescriptionRef = useRef(null)

  // Manual form state
  const [form, setForm] = useState({
    medicine_name: '',
    dosage: '',
    frequency: 'once_daily',
    reminder_times: ['08:00'],
    instructions: '',
    end_date: '',
  })

  useEffect(() => { fetchReminders() }, [])

  const fetchReminders = async () => {
    try {
      const res = await getReminders()
      setReminders(res.data?.reminders || [])
    } catch {
      toast.error('Failed to load reminders')
    } finally {
      setLoading(false)
    }
  }

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {[1,2,3].map(i => (
        <div key={i} className="skeleton-card stagger-item" style={{
          display: 'flex', alignItems: 'center', gap: 14
        }}>
          <div className="skeleton skeleton-circle" style={{ width: 40, height: 40, flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div className="skeleton skeleton-text" style={{ width: '40%' }} />
            <div className="skeleton skeleton-text" style={{ width: '65%' }} />
          </div>
          <div className="skeleton" style={{ width: 60, height: 28, borderRadius: 8 }} />
        </div>
      ))}
    </div>
  )

  // ── Prescription scan ─────────────────────────────────
  const handlePrescriptionScan = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    const allowed = ['image/jpeg', 'image/png', 'application/pdf']
    if (!allowed.includes(file.type)) {
      toast.error('Please upload JPG, PNG or PDF')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File too large. Max 10MB.')
      return
    }

    setScanning(true)
    const loadingToast = toast.loading('🔍 Reading your prescription...')

    try {
      const formData = new FormData()
      formData.append('file', file)

      const token = localStorage.getItem('access_token')
      const res = await fetch('http://localhost:8000/api/reminders/scan-prescription', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.detail || 'Could not read prescription')
      }

      if (data.medicines?.length > 0) {
        toast.success(`Found ${data.medicines.length} medicine(s)!`, { id: loadingToast })
        setScannedMedicines(data.medicines)
        setSetupIndex(0)
        setSetupComplete(false)
        if (data.doctor_name || data.prescription_date) {
          setDoctorInfo({ doctor: data.doctor_name, date: data.prescription_date })
        }
        setTimeout(() => {
          document.getElementById('prescription-wizard')?.scrollIntoView({ behavior: 'smooth' })
        }, 300)
      } else {
        toast.error('No medicines found. Try a clearer photo.', { id: loadingToast })
      }
    } catch (err) {
      toast.error(err.message || 'Scan failed. Please try again.', { id: loadingToast })
    } finally {
      setScanning(false)
      if (prescriptionRef.current) prescriptionRef.current.value = ''
    }
  }

  const handleSetupAnswer = async (times, frequency, instructions) => {
    const medicine = scannedMedicines[setupIndex]
    try {
      await createReminder({
        medicine_name: medicine.name,
        dosage: medicine.dosage || '',
        frequency: frequency,
        reminder_times: times,
        instructions: instructions || medicine.instructions || '',
      })

      if (setupIndex < scannedMedicines.length - 1) {
        setSetupIndex(prev => prev + 1)
      } else {
        setSetupComplete(true)
        fetchReminders()
        toast.success('🎉 All reminders set! Email alerts will be sent.')
      }
    } catch {
      toast.error('Failed to set reminder for ' + medicine.name)
    }
  }

  const handleSkip = () => {
    if (setupIndex < scannedMedicines.length - 1) {
      setSetupIndex(prev => prev + 1)
    } else {
      setSetupComplete(true)
      fetchReminders()
    }
  }

  // ── Manual form ───────────────────────────────────────
  const handleFrequencyChange = (freq) => {
    setForm(prev => ({ ...prev, frequency: freq, reminder_times: [...DEFAULT_TIMES[freq]] }))
  }

  const handleTimeChange = (index, value) => {
    setForm(prev => {
      const times = [...prev.reminder_times]
      times[index] = value
      return { ...prev, reminder_times: times }
    })
  }

  const handleSubmit = async () => {
    if (!form.medicine_name.trim()) {
      toast.error('Please enter medicine name')
      return
    }
    setSaving(true)
    try {
      await createReminder({
        medicine_name: form.medicine_name.trim(),
        dosage: form.dosage.trim() || null,
        frequency: form.frequency,
        reminder_times: form.reminder_times,
        instructions: form.instructions.trim() || null,
        end_date: form.end_date || null,
      })
      toast.success('Reminder created!')
      setShowForm(false)
      setForm({ medicine_name: '', dosage: '', frequency: 'once_daily', reminder_times: ['08:00'], instructions: '', end_date: '' })
      fetchReminders()
    } catch {
      toast.error('Failed to create reminder')
    } finally {
      setSaving(false)
    }
  }

  const handleToggle = async (reminder) => {
    try {
      await updateReminder(reminder.id, { is_active: !reminder.is_active })
      toast.success(reminder.is_active ? 'Reminder paused' : 'Reminder resumed')
      fetchReminders()
    } catch {
      toast.error('Failed to update reminder')
    }
  }

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete reminder for ${name}?`)) return
    try {
      await deleteReminder(id)
      toast.success('Reminder deleted')
      setReminders(prev => prev.filter(r => r.id !== id))
    } catch {
      toast.error('Failed to delete reminder')
    }
  }

  const currentMed = scannedMedicines[setupIndex]

  // ── Render ────────────────────────────────────────────
  return (
    <div className="page-enter" style={{ maxWidth: 820, margin: '0 auto' }}>
      <Toaster position="top-right" />

      {/* ── Header ─────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        marginBottom: 20, flexWrap: 'wrap', rowGap: 12, gap: 12,
      }}>
        <div>
          <h1 style={{ fontSize: 'clamp(1.2rem, 4vw, 1.75rem)', fontWeight: 700, color: '#F8F9FA', marginBottom: 4 }}>
            {t('rem_title')}
          </h1>
          <p style={{ color: '#9CA3AF', margin: 0 }}>
            {t('rem_subtitle')}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input
            type="file"
            ref={prescriptionRef}
            style={{ display: 'none' }}
            accept=".jpg,.jpeg,.png,.pdf"
            onChange={handlePrescriptionScan}
          />
          <button
            onClick={() => prescriptionRef.current?.click()}
            disabled={scanning}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '10px 18px', borderRadius: 10,
              border: '1.5px solid rgba(16,185,129,0.4)',
              background: 'rgba(16,185,129,0.08)',
              color: '#10B981', cursor: scanning ? 'not-allowed' : 'pointer',
              fontWeight: 600, fontSize: 'clamp(0.75rem, 2.5vw, 0.85rem)',
              opacity: scanning ? 0.7 : 1, transition: 'all 0.2s',
            }}
          >
            <Camera size={16} />
            {scanning ? t('rem_scanning') : t('rem_scan')}
          </button>
          <button
            onClick={() => setShowForm(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '10px 18px', borderRadius: 10,
              background: '#2563EB', border: 'none',
              color: '#fff', cursor: 'pointer',
              fontWeight: 600, fontSize: 'clamp(0.75rem, 2.5vw, 0.85rem)',
            }}
          >
            <Plus size={16} /> {t('rem_add_manual')}
          </button>
        </div>
      </div>

      {/* ── Prescription scan hint ──────────────────── */}
      {scannedMedicines.length === 0 && !scanning && (
        <div className="scan-hint-card" style={{
          background: 'rgba(16,185,129,0.06)',
          border: '1px dashed rgba(16,185,129,0.25)',
          borderRadius: 12, padding: '16px 20px', marginBottom: 24,
          display: 'flex', alignItems: 'center', gap: 14,
        }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12, flexShrink: 0,
            background: 'rgba(16,185,129,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem',
          }}>📸</div>
          <div style={{ flex: 1 }}>
            <div style={{ color: '#10B981', fontWeight: 700, fontSize: '0.9rem', marginBottom: 3 }}>
              {t('rem_scan_hint_title')}
            </div>
            <div style={{ color: '#6B7280', fontSize: '0.8rem', lineHeight: 1.5 }}>
              {t('rem_scan_hint_desc')}
            </div>
          </div>
          <button
            className="scan-hint-button"
            onClick={() => prescriptionRef.current?.click()}
            style={{
              flexShrink: 0, padding: '8px 16px',
              background: 'rgba(16,185,129,0.15)',
              border: '1px solid rgba(16,185,129,0.3)',
              borderRadius: 8, color: '#10B981',
              cursor: 'pointer', fontWeight: 600,
              fontSize: '0.8rem', whiteSpace: 'nowrap',
            }}
          >
            {t('rem_upload_photo')}
          </button>
        </div>
      )}

      {/* ── Prescription Setup Wizard ───────────────── */}
      {scannedMedicines.length > 0 && !setupComplete && (
        <div
          id="prescription-wizard"
          style={{
            background: '#1A1D27',
            border: '1px solid rgba(37,99,235,0.3)',
            borderRadius: 16, padding: 'clamp(14px, 4vw, 24px)', marginBottom: 28,
          }}
        >
          {/* Wizard header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div>
              <div style={{ color: '#60A5FA', fontWeight: 700, fontSize: '0.9rem', marginBottom: 4 }}>
                📋 {t('rem_wizard_title')}
                {doctorInfo?.doctor && (
                  <span style={{ color: '#6B7280', fontWeight: 400, fontSize: '0.8rem', marginLeft: 8 }}>
                    — Dr. {doctorInfo.doctor}
                  </span>
                )}
              </div>
              <div style={{ color: '#9CA3AF', fontSize: '0.78rem' }}>
                {t('rem_wizard_med')} {setupIndex + 1} {t('rem_wizard_of')} {scannedMedicines.length}
              </div>
            </div>
            <button
              onClick={() => { setScannedMedicines([]); setSetupIndex(0) }}
              style={{ background: 'none', border: 'none', color: '#6B7280', cursor: 'pointer', fontSize: '1rem' }}
            >✕</button>
          </div>

          {/* Progress bar */}
          <div style={{ height: 6, background: '#2A2D3A', borderRadius: 3, marginBottom: 24, overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 3,
              background: 'linear-gradient(90deg, #2563EB, #7C3AED)',
              width: `${(setupIndex / scannedMedicines.length) * 100}%`,
              transition: 'width 0.4s ease',
            }} />
          </div>

          {/* Medicine dots */}
          <div style={{
            display: 'flex', gap: 6, marginBottom: 16,
            flexWrap: 'wrap', maxHeight: 80, overflowY: 'auto'
          }}>
            {scannedMedicines.map((med, i) => (
              <div key={i} style={{
                padding: '4px 12px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 500,
                background: i < setupIndex
                  ? 'rgba(16,185,129,0.15)'
                  : i === setupIndex
                    ? 'rgba(37,99,235,0.2)'
                    : 'rgba(255,255,255,0.05)',
                border: i < setupIndex
                  ? '1px solid rgba(16,185,129,0.3)'
                  : i === setupIndex
                    ? '1px solid rgba(37,99,235,0.4)'
                    : '1px solid #2A2D3A',
                color: i < setupIndex ? '#10B981' : i === setupIndex ? '#60A5FA' : '#6B7280',
              }}>
                {i < setupIndex ? '✓ ' : ''}{med.name}
              </div>
            ))}
          </div>

          {/* Setup card */}
          {currentMed && (
            <MedicineSetupCard
              medicine={currentMed}
              onConfirm={handleSetupAnswer}
              onSkip={handleSkip}
              index={setupIndex}
              total={scannedMedicines.length}
            />
          )}
        </div>
      )}

      {/* ── Setup complete banner ───────────────────── */}
      {setupComplete && scannedMedicines.length > 0 && (
        <div style={{
          background: 'rgba(16,185,129,0.08)',
          border: '1px solid rgba(16,185,129,0.25)',
          borderRadius: 14, padding: 24,
          textAlign: 'center', marginBottom: 28,
        }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 10 }}>🎉</div>
          <div style={{ color: '#10B981', fontWeight: 700, fontSize: '1rem', marginBottom: 6 }}>
            {t('rem_wizard_success')}
          </div>
          <div style={{ color: '#9CA3AF', fontSize: '0.85rem', marginBottom: 16 }}>
            {t('rem_wizard_desc')}
          </div>
          <button
            onClick={() => { setScannedMedicines([]); setSetupComplete(false); setDoctorInfo(null) }}
            style={{
              background: 'rgba(16,185,129,0.1)',
              border: '1px solid rgba(16,185,129,0.3)',
              borderRadius: 8, padding: '8px 20px',
              color: '#10B981', cursor: 'pointer',
              fontSize: '0.85rem', fontWeight: 600,
            }}
          >
            📸 {t('rem_wizard_scan_another')}
          </button>
        </div>
      )}

      {/* ── Manual Add Form Modal ───────────────────── */}
      {showForm && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, padding: 16,
        }}>
          <div style={{
            background: '#1A1D27', border: '1px solid #2A2D3A',
            borderRadius: 16, padding: 28,
            width: '100%', maxWidth: 480, maxHeight: '95vh', overflowY: 'auto',
            margin: '0 8px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h2 style={{ color: '#F8F9FA', fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>
                {t('rem_form_title')}
              </h2>
              <button
                onClick={() => setShowForm(false)}
                style={{ background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ color: '#9CA3AF', fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: 6 }}>
                  {t('rem_form_name')}
                </label>
                <input
                  className="form-input"
                  placeholder={t('rem_form_name_ph')}
                  value={form.medicine_name}
                  onChange={e => setForm(p => ({ ...p, medicine_name: e.target.value }))}
                />
              </div>

              <div>
                <label style={{ color: '#9CA3AF', fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: 6 }}>
                  {t('rem_form_dosage')}
                </label>
                <input
                  className="form-input"
                  placeholder={t('rem_form_dosage_ph')}
                  value={form.dosage}
                  onChange={e => setForm(p => ({ ...p, dosage: e.target.value }))}
                />
              </div>

              <div>
                <label style={{ color: '#9CA3AF', fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: 8 }}>
                  {t('rem_form_freq')}
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 8 }}>
                  {FREQUENCY_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => handleFrequencyChange(opt.value)}
                      style={{
                        padding: '10px', borderRadius: 8, cursor: 'pointer', textAlign: 'left',
                        background: form.frequency === opt.value ? 'rgba(37,99,235,0.2)' : 'rgba(255,255,255,0.03)',
                        border: form.frequency === opt.value ? '1.5px solid #2563EB' : '1px solid #2A2D3A',
                        color: form.frequency === opt.value ? '#60A5FA' : '#9CA3AF',
                        fontWeight: 500, fontSize: '0.8rem',
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ color: '#9CA3AF', fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: 8 }}>
                  {t('rem_form_times')}
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {form.reminder_times.map((time, i) => (
                    <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <input
                        type="time"
                        value={time}
                        onChange={e => handleTimeChange(i, e.target.value)}
                        style={{
                          background: '#0F1117', border: '1px solid #2A2D3A',
                          borderRadius: 8, padding: '8px 12px',
                          color: '#F8F9FA', flex: 1, fontSize: '0.9rem',
                        }}
                      />
                      {form.frequency === 'custom' && form.reminder_times.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setForm(p => ({
                            ...p,
                            reminder_times: p.reminder_times.filter((_, idx) => idx !== i),
                          }))}
                          style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer' }}
                        >
                          <X size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                  {form.frequency === 'custom' && (
                    <button
                      type="button"
                      onClick={() => setForm(p => ({ ...p, reminder_times: [...p.reminder_times, '08:00'] }))}
                      style={{
                        background: 'rgba(37,99,235,0.08)',
                        border: '1px dashed rgba(37,99,235,0.3)',
                        borderRadius: 8, padding: '8px',
                        color: '#60A5FA', cursor: 'pointer', fontSize: '0.8rem',
                      }}
                    >
                      {t('rem_form_add_time')}
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label style={{ color: '#9CA3AF', fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: 6 }}>
                  {t('rem_form_instructions')}
                </label>
                <input
                  className="form-input"
                  placeholder={t('rem_form_instructions_ph')}
                  value={form.instructions}
                  onChange={e => setForm(p => ({ ...p, instructions: e.target.value }))}
                />
              </div>

              <div>
                <label style={{ color: '#9CA3AF', fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: 6 }}>
                  {t('rem_form_end_date')}
                </label>
                <input
                  type="date"
                  value={form.end_date}
                  onChange={e => setForm(p => ({ ...p, end_date: e.target.value }))}
                  style={{
                    background: '#0F1117', border: '1px solid #2A2D3A',
                    borderRadius: 8, padding: '8px 12px',
                    color: '#F8F9FA', width: '100%', fontSize: '0.9rem',
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  style={{
                    flex: 1, padding: '12px',
                    background: 'rgba(107,114,128,0.1)', border: '1px solid #2A2D3A',
                    borderRadius: 10, color: '#9CA3AF', cursor: 'pointer', fontWeight: 500,
                  }}
                >
                  {t('rem_form_cancel')}
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={saving}
                  style={{
                    flex: 2, padding: '12px',
                    background: saving ? 'rgba(37,99,235,0.5)' : '#2563EB',
                    border: 'none', borderRadius: 10, color: '#fff',
                    cursor: saving ? 'not-allowed' : 'pointer', fontWeight: 600,
                  }}
                >
                  {saving ? t('rem_form_saving') : t('rem_form_save')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Active Reminders List ───────────────────── */}
      <div>
        <h2 style={{
          color: '#F8F9FA', fontSize: '1rem', fontWeight: 700,
          marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <Bell size={18} color="#2563EB" />
          {t('rem_active')} Reminders
          {reminders.length > 0 && (
            <span style={{
              background: 'rgba(37,99,235,0.15)', color: '#60A5FA',
              fontSize: '0.75rem', padding: '2px 8px', borderRadius: 20, fontWeight: 600,
            }}>
              {reminders.length}
            </span>
          )}
        </h2>

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[1,2,3].map(i => (
              <div key={i} className="skeleton-card stagger-item" style={{
                display: 'flex', alignItems: 'center', gap: 14
              }}>
                <div className="skeleton skeleton-circle" style={{ width: 40, height: 40, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div className="skeleton skeleton-text" style={{ width: '40%' }} />
                  <div className="skeleton skeleton-text" style={{ width: '65%' }} />
                </div>
                <div className="skeleton" style={{ width: 60, height: 28, borderRadius: 8 }} />
              </div>
            ))}
          </div>
        ) : reminders.length === 0 ? (
          <div className="empty-state" style={{
            background: '#1A1D27', border: '1px solid #2A2D3A',
            borderRadius: 16, padding: 48, textAlign: 'center',
          }}>
            <div className="empty-state-icon">💊</div>
            <h3 style={{ color: '#F8F9FA', marginBottom: 8, fontWeight: 600 }}>
              {t('rem_no_reminders_title')}
            </h3>
            <p style={{ color: '#9CA3AF', marginBottom: 20, fontSize: '0.875rem' }}>
              {t('rem_no_reminders_desc')}
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {reminders.map(reminder => (
              <div key={reminder.id} className="stagger-item card-hover" style={{
                background: '#1A1D27',
                border: `1px solid ${reminder.is_active ? '#2A2D3A' : 'rgba(107,114,128,0.2)'}`,
                borderRadius: 12, padding: 'clamp(12px, 3vw, 16px) clamp(14px, 4vw, 20px)',
                display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
                opacity: reminder.is_active ? 1 : 0.55, transition: 'all 0.2s',
              }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                  background: reminder.is_active
                    ? 'rgba(37,99,235,0.12)' : 'rgba(107,114,128,0.1)',
                  display: 'flex', alignItems: 'center',
                  justifyContent: 'center', fontSize: '1.2rem',
                }}>💊</div>

                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{ fontWeight: 700, color: '#F8F9FA', fontSize: '0.95rem' }}>
                      {reminder.medicine_name}
                    </span>
                    {reminder.dosage && (
                      <span style={{
                        background: 'rgba(37,99,235,0.1)', color: '#60A5FA',
                        fontSize: '0.72rem', padding: '2px 8px', borderRadius: 6, fontWeight: 500,
                      }}>
                        {reminder.dosage}
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                    {reminder.reminder_times.map((time, i) => {
                      const tod = getTimeOfDay(time)
                      return (
                        <span key={i} style={{
                          background: `${tod.color}18`,
                          border: `1px solid ${tod.color}35`,
                          color: tod.color, fontSize: '0.72rem',
                          padding: '3px 8px', borderRadius: 6,
                          display: 'flex', alignItems: 'center',
                          gap: 4, fontWeight: 500,
                        }}>
                          <Clock size={10} />
                          {time} · {tod.label}
                        </span>
                      )
                    })}
                    {reminder.instructions && (
                      <span style={{ color: '#6B7280', fontSize: '0.72rem' }}>
                        · {reminder.instructions}
                      </span>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <button
                    onClick={() => handleToggle(reminder)}
                    title={reminder.is_active ? 'Pause' : 'Resume'}
                    style={{
                      width: 34, height: 34, borderRadius: 8, border: 'none',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: reminder.is_active
                        ? 'rgba(16,185,129,0.12)' : 'rgba(107,114,128,0.1)',
                      color: reminder.is_active ? '#10B981' : '#6B7280',
                      transition: 'all 0.15s',
                    }}
                  >
                    <Check size={14} />
                  </button>
                  <button
                    onClick={() => handleDelete(reminder.id, reminder.medicine_name)}
                    title="Delete"
                    style={{
                      width: 34, height: 34, borderRadius: 8, border: 'none',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: 'rgba(239,68,68,0.08)', color: '#EF4444',
                      transition: 'all 0.15s',
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <style>{`
        @media (max-width: 768px) {
          #prescription-wizard {
            border-radius: 12px !important;
          }
          .reminder-time-tag {
            font-size: 0.68rem !important;
          }
          .scan-hint-card {
            flex-direction: column;
            text-align: center;
            padding: 24px 20px !important;
          }
          .scan-hint-button {
            width: 100%;
            padding: 10px 16px !important;
          }
        }
        @media (max-width: 480px) {
          .form-input {
            font-size: 16px !important;
          }
        }
      `}</style>
    </div>
  )
}

export default Reminders
