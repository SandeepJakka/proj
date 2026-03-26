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

  // Medicine info state
  const [medInfo, setMedInfo] = useState(null)
  const [medInfoLoading, setMedInfoLoading] = useState(false)
  const [showMedInfo, setShowMedInfo] = useState(false)

  // Name correction state
  const [nameCorrected, setNameCorrected] = useState(false)
  const [correctedTo, setCorrectedTo] = useState('')

  const handleFreqChange = (f) => {
    setFreq(f)
    setTimes([...DEFAULT_TIMES[f]])
  }

  const handleConfirm = async () => {
    setConfirming(true)
    await onConfirm(times, freq, instructions)
    setConfirming(false)
  }

  // Fetch medicine info when card mounts
  useEffect(() => {
    const fetchMedInfo = async () => {
      setMedInfoLoading(true)
      try {
        const token = localStorage.getItem('access_token')
        const res = await fetch(
          'http://localhost:8000/api/medicines/medicine-info',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              medicine_name: medicine.name,
              dosage: medicine.dosage || '',
              language: 'english'
            })
          }
        )
        const data = await res.json()
        if (data.success) {
          setMedInfo(data.data)
          // If name looks very different from what was scanned,
          // show a soft warning
          if (data.data.verified_name &&
              data.data.verified_name.toLowerCase() !==
              medicine.name.toLowerCase()) {
            setNameCorrected(true)
            setCorrectedTo(data.data.verified_name)
          }
        }
      } catch {}
      finally { setMedInfoLoading(false) }
    }
    fetchMedInfo()
  }, [medicine.name])

  return (
    <div>
      {/* Medicine info header + expandable panel */}
      <div style={{ marginBottom: 20 }}>
        {/* Medicine header */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 14,
          padding: '14px 16px',
          background: 'rgba(37,99,235,0.08)',
          border: '1px solid rgba(37,99,235,0.2)',
          borderRadius: showMedInfo ? '12px 12px 0 0' : 12,
          cursor: 'pointer'
        }} onClick={() => setShowMedInfo(v => !v)}>
          <div style={{
            width: 48, height: 48, background: 'rgba(37,99,235,0.15)',
            borderRadius: 12, display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: '1.4rem', flexShrink: 0
          }}>💊</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, color: '#F8F9FA', fontSize: '1rem' }}>
              {medInfo?.verified_name || medicine.name}
              {medInfo?.web_verified && (
                <span style={{
                  background: 'rgba(16,185,129,0.15)',
                  color: '#10B981', fontSize: '0.62rem',
                  padding: '1px 6px', borderRadius: 4,
                  marginLeft: 6, fontWeight: 700
                }}>✓ Verified</span>
              )}
            </div>
            <div style={{ color: '#9CA3AF', fontSize: '0.8rem', marginTop: 2 }}>
              {medInfo?.generic_name && (
                <span style={{ color: '#60A5FA' }}>{medInfo.generic_name} · </span>
              )}
              {[medicine.dosage, medicine.duration].filter(Boolean).join(' • ') || ''}
              {medInfo?.category && (
                <span style={{ color: '#9CA3AF' }}> · {medInfo.category}</span>
              )}
            </div>
            {medInfoLoading && (
              <div style={{ color: '#6B7280', fontSize: '0.72rem', marginTop: 3 }}>
                🔍 Looking up medicine info...
              </div>
            )}
            {nameCorrected && correctedTo && (
              <div style={{
                marginTop: 6, padding: '5px 10px',
                background: 'rgba(245,158,11,0.08)',
                border: '1px solid rgba(245,158,11,0.2)',
                borderRadius: 6, fontSize: '0.72rem',
                color: '#F59E0B', display: 'flex',
                alignItems: 'center', gap: 5
              }}>
                ✏️ Prescription read as{' '}
                <strong>"{medicine.name}"</strong>
                {' '}— showing info for{' '}
                <strong>"{correctedTo}"</strong>
              </div>
            )}
          </div>
          <div style={{ color: '#6B7280', fontSize: '0.75rem', flexShrink: 0 }}>
            {showMedInfo ? '▲ Less' : '▼ About'}
          </div>
        </div>

        {/* Medicine info expandable panel */}
        {showMedInfo && medInfo && (
          <div style={{
            background: '#0F1117',
            border: '1px solid rgba(37,99,235,0.2)',
            borderTop: 'none',
            borderRadius: '0 0 12px 12px',
            padding: 16
          }}>
            {/* What it's for */}
            <div style={{ marginBottom: 14 }}>
              <div style={{
                color: '#60A5FA', fontWeight: 700,
                fontSize: '0.72rem', textTransform: 'uppercase',
                letterSpacing: '0.06em', marginBottom: 6
              }}>
                🎯 What it's used for
              </div>
              <p style={{ color: '#D1D5DB', fontSize: '0.82rem',
                lineHeight: 1.6, margin: 0 }}>
                {medInfo.used_for}
              </p>
            </div>

            {/* How it works */}
            {medInfo.how_it_works && (
              <div style={{ marginBottom: 14 }}>
                <div style={{
                  color: '#8B5CF6', fontWeight: 700,
                  fontSize: '0.72rem', textTransform: 'uppercase',
                  letterSpacing: '0.06em', marginBottom: 6
                }}>
                  ⚙️ How it works
                </div>
                <p style={{ color: '#D1D5DB', fontSize: '0.82rem',
                  lineHeight: 1.6, margin: 0 }}>
                  {medInfo.how_it_works}
                </p>
              </div>
            )}

            {/* How to take */}
            {medInfo.how_to_take && (
              <div style={{
                background: 'rgba(16,185,129,0.06)',
                border: '1px solid rgba(16,185,129,0.15)',
                borderRadius: 8, padding: '10px 12px', marginBottom: 14
              }}>
                <div style={{
                  color: '#10B981', fontWeight: 700,
                  fontSize: '0.72rem', textTransform: 'uppercase',
                  letterSpacing: '0.06em', marginBottom: 6
                }}>
                  💊 How to take
                </div>
                <p style={{ color: '#A7F3D0', fontSize: '0.82rem',
                  lineHeight: 1.6, margin: 0 }}>
                  {medInfo.how_to_take}
                </p>
              </div>
            )}

            {/* Side effects */}
            {medInfo.common_side_effects?.length > 0 && (
              <div style={{ marginBottom: 14 }}>
                <div style={{
                  color: '#F59E0B', fontWeight: 700,
                  fontSize: '0.72rem', textTransform: 'uppercase',
                  letterSpacing: '0.06em', marginBottom: 6
                }}>
                  ⚠️ Common side effects
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {medInfo.common_side_effects.map((se, i) => (
                    <span key={i} style={{
                      background: 'rgba(245,158,11,0.1)',
                      border: '1px solid rgba(245,158,11,0.2)',
                      borderRadius: 6, padding: '2px 8px',
                      color: '#FDE68A', fontSize: '0.72rem'
                    }}>
                      {se}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Warnings */}
            {medInfo.important_warnings?.length > 0 && (
              <div style={{
                background: 'rgba(239,68,68,0.06)',
                border: '1px solid rgba(239,68,68,0.15)',
                borderRadius: 8, padding: '10px 12px', marginBottom: 14
              }}>
                <div style={{
                  color: '#EF4444', fontWeight: 700,
                  fontSize: '0.72rem', textTransform: 'uppercase',
                  letterSpacing: '0.06em', marginBottom: 6
                }}>
                  🚨 Important warnings
                </div>
                {medInfo.important_warnings.map((w, i) => (
                  <div key={i} style={{
                    color: '#FCA5A5', fontSize: '0.78rem',
                    marginBottom: 3, display: 'flex', gap: 6
                  }}>
                    <span>•</span><span>{w}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Patient tip */}
            {medInfo.patient_tip && (
              <div style={{
                display: 'flex', gap: 8,
                background: 'rgba(37,99,235,0.06)',
                border: '1px solid rgba(37,99,235,0.12)',
                borderRadius: 8, padding: '8px 12px'
              }}>
                <span style={{ flexShrink: 0 }}>💡</span>
                <p style={{ color: '#93C5FD', fontSize: '0.78rem',
                  lineHeight: 1.5, margin: 0 }}>
                  {medInfo.patient_tip}
                </p>
              </div>
            )}

            {/* Indian brands */}
            {medInfo.indian_brands?.length > 0 && (
              <div style={{ marginTop: 10 }}>
                <div style={{
                  color: '#9CA3AF', fontSize: '0.68rem',
                  marginBottom: 4
                }}>
                  Common Indian brands:
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {medInfo.indian_brands.map((b, i) => (
                    <span key={i} style={{
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid #2A2D3A',
                      borderRadius: 4, padding: '1px 6px',
                      color: '#9CA3AF', fontSize: '0.68rem'
                    }}>
                      {b}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div style={{
              marginTop: 10, fontSize: '0.65rem', color: '#6B7280',
              display: 'flex', alignItems: 'center', gap: 4
            }}>
              {medInfo.fda_data_used
                ? '✓ Data sourced from FDA drug database'
                : '⚠️ Based on AI medical knowledge — verify with pharmacist'}
            </div>
          </div>
        )}
      </div>

      {/* Fallback when medicine info unavailable */}
      {!medInfoLoading && !medInfo && (
        <div style={{
          background: 'rgba(107,114,128,0.06)',
          border: '1px solid rgba(107,114,128,0.15)',
          borderRadius: 10, padding: '10px 14px',
          marginBottom: 14,
          display: 'flex', alignItems: 'center', gap: 8
        }}>
          <span style={{ fontSize: '1rem' }}>⚠️</span>
          <div>
            <div style={{
              color: '#9CA3AF', fontSize: '0.78rem',
              fontWeight: 600, marginBottom: 2
            }}>
              Medicine details unavailable
            </div>
            <div style={{
              color: '#6B7280', fontSize: '0.72rem',
              lineHeight: 1.4
            }}>
              Could not find "{medicine.name}" in our database.
              Please verify the name with your pharmacist
              before setting a reminder.
            </div>
          </div>
        </div>
      )}

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

  const [priceOpen, setPriceOpen] = useState(false)
  const [priceInput, setPriceInput] = useState('')
  const [priceLoading, setPriceLoading] = useState(false)
  const [priceResult, setPriceResult] = useState(null)
  const [priceLang, setPriceLang] = useState('english')

  const [interactionOpen, setInteractionOpen] = useState(false)
  const [interactionInput, setInteractionInput] = useState('')
  const [interactionLoading, setInteractionLoading] = useState(false)
  const [interactionResult, setInteractionResult] = useState(null)

  // Reminder medicine info state
  const [reminderInfoMap, setReminderInfoMap] = useState({})
  const [reminderInfoLoading, setReminderInfoLoading] = useState({})
  const [expandedReminderInfo, setExpandedReminderInfo] = useState({})

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

  const handlePriceCheck = async (medicines) => {
    if (!medicines || medicines.length === 0) {
      toast.error('Please enter at least one medicine name')
      return
    }
    setPriceLoading(true)
    setPriceResult(null)
    try {
      const token = localStorage.getItem('access_token')
      const res = await fetch(
        'http://localhost:8000/api/medicines/price-check',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            medicines: medicines,
            language: priceLang
          })
        }
      )
      const data = await res.json()
      if (data.success) {
        setPriceResult(data.data)
      } else {
        toast.error(data.error || 'Failed to fetch prices')
      }
    } catch {
      toast.error('Connection error. Please try again.')
    } finally {
      setPriceLoading(false)
    }
  }

  const handleInteractionCheck = async (medicines) => {
    if (!medicines || medicines.length < 2) {
      toast.error('Need at least 2 medicines to check interactions')
      return
    }
    setInteractionLoading(true)
    setInteractionResult(null)
    try {
      const token = localStorage.getItem('access_token')
      const res = await fetch(
        'http://localhost:8000/api/medicines/interactions',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            medicines,
            language: 'english'
          })
        }
      )
      const data = await res.json()
      if (data.success) setInteractionResult(data.data)
      else toast.error(data.error || 'Failed to check interactions')
    } catch {
      toast.error('Connection error. Please try again.')
    } finally {
      setInteractionLoading(false)
    }
  }

  const getMedicinesFromReminders = () => {
    return reminders
      .filter(r => r.is_active)
      .map(r => r.medicine_name + (r.dosage ? ` ${r.dosage}` : ''))
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

  const fetchReminderInfo = async (reminderId, medicineName, dosage) => {
    if (reminderInfoMap[reminderId]) {
      // Toggle if already loaded
      setExpandedReminderInfo(prev => ({
        ...prev,
        [reminderId]: !prev[reminderId]
      }))
      return
    }
    setReminderInfoLoading(prev => ({ ...prev, [reminderId]: true }))
    try {
      const token = localStorage.getItem('access_token')
      const res = await fetch(
        'http://localhost:8000/api/medicines/medicine-info',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            medicine_name: medicineName,
            dosage: dosage || '',
            language: 'english'
          })
        }
      )
      const data = await res.json()
      if (data.success) {
        setReminderInfoMap(prev => ({
          ...prev,
          [reminderId]: data.data
        }))
        setExpandedReminderInfo(prev => ({
          ...prev,
          [reminderId]: true
        }))
      } else {
        toast.error('Could not load medicine info')
      }
    } catch {
      toast.error('Failed to fetch medicine info')
    } finally {
      setReminderInfoLoading(prev => ({ ...prev, [reminderId]: false }))
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
            onClick={() => {
              setPriceOpen(true)
              setPriceResult(null)
              setPriceInput('')
            }}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: 'clamp(8px, 2vw, 10px) clamp(12px, 3vw, 18px)',
              borderRadius: 10,
              border: '1.5px solid rgba(245,158,11,0.4)',
              background: 'rgba(245,158,11,0.08)',
              color: '#F59E0B', cursor: 'pointer',
              fontWeight: 600,
              fontSize: 'clamp(0.75rem, 2.5vw, 0.85rem)',
              transition: 'all 0.2s'
            }}
          >
            💰 Price Check
          </button>
          <button
            onClick={() => {
              setInteractionOpen(true)
              setInteractionResult(null)
              setInteractionInput(
                reminders.filter(r => r.is_active)
                  .map(r => r.medicine_name).join('\n')
              )
            }}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: 'clamp(8px, 2vw, 10px) clamp(12px, 3vw, 18px)',
              borderRadius: 10,
              border: '1.5px solid rgba(239,68,68,0.4)',
              background: 'rgba(239,68,68,0.08)',
              color: '#EF4444', cursor: 'pointer',
              fontWeight: 600,
              fontSize: 'clamp(0.75rem,2.5vw,0.85rem)',
              transition: 'all 0.2s'
            }}
          >
            ⚠️ Check Interactions
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

      {/* ── Interaction Modal ───────────────────── */}
      {interactionOpen && (
        <div style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.85)',
          backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'flex-start',
          justifyContent: 'center',
          zIndex: 1000, padding: '20px', overflowY: 'auto'
        }} onClick={() => !interactionLoading && setInteractionOpen(false)}>
          <div style={{
            background: '#1A1D27', border: '1px solid #2A2D3A',
            borderRadius: 16, width: '100%', maxWidth: 640,
            marginTop: 20, marginBottom: 20,
            boxShadow: '0 25px 80px rgba(0,0,0,0.6)'
          }} onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div style={{
              padding: '20px 24px', borderBottom: '1px solid #2A2D3A',
              display: 'flex', justifyContent: 'space-between',
              alignItems: 'center', background: '#0F1117',
              borderRadius: '16px 16px 0 0'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: '1.3rem' }}>⚠️</span>
                <div>
                  <div style={{ fontWeight: 700, color: '#F8F9FA', fontSize: '1rem' }}>
                    Drug Interaction Checker
                  </div>
                  <div style={{ color: '#9CA3AF', fontSize: '0.75rem' }}>
                    Powered by FDA drug interaction database
                  </div>
                </div>
              </div>
              <button onClick={() => setInteractionOpen(false)}
                style={{ background: 'rgba(239,68,68,0.1)',
                  border: '1px solid rgba(239,68,68,0.2)',
                  borderRadius: 8, color: '#EF4444',
                  cursor: 'pointer', padding: '6px 12px',
                  fontSize: '0.8rem', fontWeight: 600 }}>
                ✕ Close
              </button>
            </div>

            <div style={{ padding: 24 }}>
              {!interactionResult && (
                <>
                  {/* Auto-filled from reminders */}
                  {reminders.filter(r => r.is_active).length >= 2 && (
                    <div style={{
                      background: 'rgba(239,68,68,0.06)',
                      border: '1px solid rgba(239,68,68,0.15)',
                      borderRadius: 10, padding: '12px 16px',
                      marginBottom: 16
                    }}>
                      <div style={{ color: '#EF4444', fontWeight: 600,
                        fontSize: '0.82rem', marginBottom: 8 }}>
                        ⚡ Check your active medicines:
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                        {reminders.filter(r => r.is_active).map((r, i) => (
                          <span key={i} style={{
                            background: 'rgba(239,68,68,0.1)',
                            border: '1px solid rgba(239,68,68,0.2)',
                            borderRadius: 6, padding: '2px 8px',
                            color: '#FCA5A5', fontSize: '0.75rem'
                          }}>💊 {r.medicine_name}</span>
                        ))}
                      </div>
                      <button
                        onClick={() => handleInteractionCheck(
                          reminders.filter(r => r.is_active).map(r => r.medicine_name)
                        )}
                        disabled={interactionLoading}
                        style={{
                          padding: '8px 18px', borderRadius: 8,
                          background: '#EF4444', border: 'none',
                          color: '#fff', cursor: 'pointer',
                          fontWeight: 600, fontSize: '0.82rem'
                        }}>
                        🔍 Check My Medicines
                      </button>
                    </div>
                  )}

                  <div style={{ marginBottom: 14 }}>
                    <label style={{ color: '#9CA3AF', fontSize: '0.8rem',
                      fontWeight: 600, display: 'block', marginBottom: 8 }}>
                      Or enter medicines manually (one per line):
                    </label>
                    <textarea
                      value={interactionInput}
                      onChange={e => setInteractionInput(e.target.value)}
                      placeholder={'Metformin 500mg\nAmlodipine 5mg\nAspirin 75mg'}
                      rows={4}
                      style={{ width: '100%', background: '#0F1117',
                        border: '1px solid #2A2D3A', borderRadius: 8,
                        padding: '10px 12px', color: '#F8F9FA',
                        fontSize: '16px', resize: 'vertical',
                        fontFamily: 'inherit', lineHeight: 1.6 }}
                    />
                  </div>

                  <button
                    onClick={() => handleInteractionCheck(
                      interactionInput.split('\n').map(m => m.trim()).filter(Boolean)
                    )}
                    disabled={interactionLoading || interactionInput.split('\n').filter(m => m.trim()).length < 2}
                    style={{
                      width: '100%', padding: '12px', borderRadius: 10,
                      background: interactionLoading ? 'rgba(239,68,68,0.3)' : '#EF4444',
                      border: 'none', color: '#fff',
                      cursor: interactionLoading ? 'not-allowed' : 'pointer',
                      fontWeight: 700, fontSize: '0.9rem',
                      display: 'flex', alignItems: 'center',
                      justifyContent: 'center', gap: 10
                    }}>
                    {interactionLoading ? (
                      <>
                        <div style={{ width: 16, height: 16,
                          border: '2px solid rgba(255,255,255,0.3)',
                          borderTop: '2px solid #fff', borderRadius: '50%',
                          animation: 'spin 1s linear infinite' }} />
                        Checking FDA database...
                      </>
                    ) : '⚠️ Check Drug Interactions'}
                  </button>
                </>
              )}

              {interactionLoading && (
                <div style={{ textAlign: 'center', padding: 40, color: '#9CA3AF' }}>
                  <div style={{ width: 44, height: 44, margin: '0 auto 16px',
                    border: '3px solid #2A2D3A', borderTop: '3px solid #EF4444',
                    borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                  <p>Checking FDA drug interaction database...</p>
                </div>
              )}

              {interactionResult && !interactionLoading && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <button onClick={() => { setInteractionResult(null); setInteractionInput('') }}
                    style={{ alignSelf: 'flex-start', padding: '6px 14px',
                      borderRadius: 8, background: 'rgba(107,114,128,0.1)',
                      border: '1px solid #2A2D3A', color: '#9CA3AF',
                      cursor: 'pointer', fontSize: '0.78rem' }}>
                    ← Check Again
                  </button>

                  {/* Overall risk banner */}
                  <div style={{
                    background: interactionResult.overall_risk === 'high'
                      ? 'rgba(239,68,68,0.1)'
                      : interactionResult.overall_risk === 'medium'
                        ? 'rgba(245,158,11,0.1)'
                        : 'rgba(16,185,129,0.1)',
                    border: `1px solid ${interactionResult.overall_risk === 'high'
                      ? 'rgba(239,68,68,0.3)'
                      : interactionResult.overall_risk === 'medium'
                        ? 'rgba(245,158,11,0.3)'
                        : 'rgba(16,185,129,0.3)'}`,
                    borderRadius: 12, padding: '14px 18px',
                    display: 'flex', justifyContent: 'space-between',
                    alignItems: 'center', flexWrap: 'wrap', gap: 8
                  }}>
                    <div>
                      <div style={{ fontSize: '1.3rem', marginBottom: 4 }}>
                        {interactionResult.overall_risk === 'high' ? '🚨'
                          : interactionResult.overall_risk === 'medium' ? '⚠️'
                          : interactionResult.overall_risk === 'low' ? '🟡' : '✅'}
                      </div>
                      <div style={{
                        color: interactionResult.overall_risk === 'high' ? '#EF4444'
                          : interactionResult.overall_risk === 'medium' ? '#F59E0B'
                          : '#10B981',
                        fontWeight: 700, fontSize: '0.95rem'
                      }}>
                        {interactionResult.overall_risk === 'high' ? 'High Risk — Consult Doctor Immediately'
                          : interactionResult.overall_risk === 'medium' ? 'Moderate Risk — Consult Doctor'
                          : interactionResult.overall_risk === 'low' ? 'Low Risk — Monitor Yourself'
                          : 'No Significant Interactions Found'}
                      </div>
                      <p style={{ color: '#D1D5DB', fontSize: '0.82rem',
                        margin: '4px 0 0', lineHeight: 1.5 }}>
                        {interactionResult.summary}
                      </p>
                    </div>
                    {interactionResult.consult_doctor && (
                      <span style={{ background: '#EF4444', color: '#fff',
                        fontSize: '0.72rem', padding: '4px 10px',
                        borderRadius: 6, fontWeight: 700 }}>
                        See Doctor
                      </span>
                    )}
                  </div>

                  {/* Individual interactions */}
                  {interactionResult.interactions?.filter(i => i.severity !== 'none').length > 0 && (
                    <div style={{ background: '#1A1D27',
                      border: '1px solid #2A2D3A', borderRadius: 10,
                      padding: '14px 16px' }}>
                      <div style={{ color: '#EF4444', fontWeight: 700,
                        fontSize: '0.75rem', marginBottom: 10,
                        textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        🔴 Interactions Found
                      </div>
                      {interactionResult.interactions
                        .filter(i => i.severity !== 'none')
                        .map((interaction, i) => (
                        <div key={i} style={{
                          padding: '10px 12px', marginBottom: 8,
                          background: interaction.severity === 'major'
                            ? 'rgba(239,68,68,0.08)'
                            : interaction.severity === 'moderate'
                              ? 'rgba(245,158,11,0.08)'
                              : 'rgba(107,114,128,0.08)',
                          borderRadius: 8,
                          borderLeft: `3px solid ${interaction.severity === 'major'
                            ? '#EF4444'
                            : interaction.severity === 'moderate'
                              ? '#F59E0B' : '#6B7280'}`
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between',
                            alignItems: 'center', marginBottom: 4 }}>
                            <span style={{ color: '#F8F9FA', fontWeight: 600,
                              fontSize: '0.82rem' }}>
                              {interaction.medicine_1} + {interaction.medicine_2}
                            </span>
                            <span style={{
                              background: interaction.severity === 'major'
                                ? '#EF4444'
                                : interaction.severity === 'moderate'
                                  ? '#F59E0B' : '#6B7280',
                              color: '#fff', fontSize: '0.65rem',
                              padding: '2px 8px', borderRadius: 4,
                              fontWeight: 700, textTransform: 'uppercase'
                            }}>
                              {interaction.severity}
                            </span>
                          </div>
                          <p style={{ color: '#9CA3AF', fontSize: '0.78rem',
                            margin: '0 0 4px', lineHeight: 1.5 }}>
                            {interaction.description}
                          </p>
                          <p style={{ color: '#60A5FA', fontSize: '0.75rem',
                            margin: 0, fontStyle: 'italic' }}>
                            💡 {interaction.recommendation}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Safe combinations */}
                  {interactionResult.safe_combinations?.length > 0 && (
                    <div style={{ background: 'rgba(16,185,129,0.06)',
                      border: '1px solid rgba(16,185,129,0.15)',
                      borderRadius: 10, padding: '12px 16px' }}>
                      <div style={{ color: '#10B981', fontWeight: 700,
                        fontSize: '0.75rem', marginBottom: 8,
                        textTransform: 'uppercase' }}>
                        ✅ Safe Combinations
                      </div>
                      {interactionResult.safe_combinations.map((combo, i) => (
                        <div key={i} style={{ color: '#A7F3D0',
                          fontSize: '0.8rem', marginBottom: 4,
                          display: 'flex', gap: 6 }}>
                          <span>✓</span><span>{combo}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div style={{ fontSize: '0.7rem', color: '#6B7280',
                    padding: '8px 12px',
                    background: 'rgba(107,114,128,0.05)',
                    borderRadius: 8, lineHeight: 1.5 }}>
                    ⚕️ Based on FDA drug interaction database.
                    Always consult your doctor before changing medicines.
                    Call 108 for emergencies.
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Price Check Modal ───────────────────── */}
      {priceOpen && (
        <div style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.85)',
          backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'flex-start',
          justifyContent: 'center',
          zIndex: 1000, padding: '20px',
          overflowY: 'auto'
        }} onClick={() => !priceLoading && setPriceOpen(false)}>
          <div style={{
            background: '#1A1D27',
            border: '1px solid #2A2D3A',
            borderRadius: 16, padding: 0,
            width: '100%', maxWidth: 680,
            marginTop: 20, marginBottom: 20,
            boxShadow: '0 25px 80px rgba(0,0,0,0.6)'
          }} onClick={e => e.stopPropagation()}>

            {/* Modal Header */}
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid #2A2D3A',
              display: 'flex', justifyContent: 'space-between',
              alignItems: 'center',
              background: '#0F1117',
              borderRadius: '16px 16px 0 0'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: '1.3rem' }}>💰</span>
                <div>
                  <div style={{
                    fontWeight: 700, color: '#F8F9FA', fontSize: '1rem'
                  }}>
                    Medicine Price Comparator
                  </div>
                  <div style={{ color: '#9CA3AF', fontSize: '0.75rem' }}>
                    Find cheaper alternatives in India
                  </div>
                </div>
              </div>
              <button
                onClick={() => setPriceOpen(false)}
                disabled={priceLoading}
                style={{
                  background: 'rgba(239,68,68,0.1)',
                  border: '1px solid rgba(239,68,68,0.2)',
                  borderRadius: 8, color: '#EF4444',
                  cursor: 'pointer', padding: '6px 12px',
                  fontSize: '0.8rem', fontWeight: 600
                }}
              >
                ✕ Close
              </button>
            </div>

            <div style={{ padding: 24 }}>

              {/* Input section — only show when no result */}
              {!priceResult && (
                <>
                  {/* Language toggle */}
                  <div style={{
                    display: 'flex', gap: 8, marginBottom: 16,
                    alignItems: 'center'
                  }}>
                    <span style={{
                      color: '#9CA3AF', fontSize: '0.78rem'
                    }}>
                      Language:
                    </span>
                    {['english', 'telugu'].map(lang => (
                      <button
                        key={lang}
                        onClick={() => setPriceLang(lang)}
                        style={{
                          padding: '4px 12px', borderRadius: 6,
                          border: priceLang === lang
                            ? '1.5px solid #F59E0B'
                            : '1px solid #2A2D3A',
                          background: priceLang === lang
                            ? 'rgba(245,158,11,0.15)' : 'transparent',
                          color: priceLang === lang
                            ? '#F59E0B' : '#9CA3AF',
                          cursor: 'pointer', fontSize: '0.78rem',
                          fontWeight: priceLang === lang ? 600 : 400
                        }}
                      >
                        {lang === 'english' ? '🇬🇧 English' : '🇮🇳 Telugu'}
                      </button>
                    ))}
                  </div>

                  {/* Auto-fill from reminders */}
                  {reminders.filter(r => r.is_active).length > 0 && (
                    <div style={{
                      background: 'rgba(37,99,235,0.06)',
                      border: '1px solid rgba(37,99,235,0.15)',
                      borderRadius: 10, padding: '14px 16px',
                      marginBottom: 16
                    }}>
                      <div style={{
                        color: '#60A5FA', fontWeight: 600,
                        fontSize: '0.82rem', marginBottom: 8
                      }}>
                        ⚡ Quick Check — Your Active Reminders
                      </div>
                      <div style={{
                        display: 'flex', flexWrap: 'wrap', gap: 6,
                        marginBottom: 12
                      }}>
                        {reminders
                          .filter(r => r.is_active)
                          .map((r, i) => (
                            <span key={i} style={{
                              background: 'rgba(37,99,235,0.1)',
                              border: '1px solid rgba(37,99,235,0.2)',
                              borderRadius: 6, padding: '3px 10px',
                              color: '#93C5FD', fontSize: '0.75rem'
                            }}>
                              💊 {r.medicine_name}
                              {r.dosage ? ` ${r.dosage}` : ''}
                            </span>
                          ))}
                      </div>
                      <button
                        onClick={() => handlePriceCheck(
                          getMedicinesFromReminders()
                        )}
                        disabled={priceLoading}
                        style={{
                          padding: '8px 18px', borderRadius: 8,
                          background: '#2563EB', border: 'none',
                          color: '#fff', cursor: 'pointer',
                          fontWeight: 600, fontSize: '0.82rem',
                          display: 'flex', alignItems: 'center', gap: 6
                        }}
                      >
                        🔍 Check Prices for All My Medicines
                      </button>
                    </div>
                  )}

                  {/* Divider */}
                  <div style={{
                    display: 'flex', alignItems: 'center',
                    gap: 12, marginBottom: 16
                  }}>
                    <div style={{
                      flex: 1, height: 1, background: '#2A2D3A'
                    }} />
                    <span style={{
                      color: '#6B7280', fontSize: '0.75rem'
                    }}>
                      OR
                    </span>
                    <div style={{
                      flex: 1, height: 1, background: '#2A2D3A'
                    }} />
                  </div>

                  {/* Manual input */}
                  <div style={{ marginBottom: 16 }}>
                    <label style={{
                      color: '#9CA3AF', fontSize: '0.8rem',
                      fontWeight: 600, display: 'block', marginBottom: 8
                    }}>
                      ✏️ Type medicine names (one per line)
                    </label>
                    <textarea
                      value={priceInput}
                      onChange={e => setPriceInput(e.target.value)}
                      placeholder={
                        'Metformin 500mg\nAmlodipine 5mg\nAtorvastatin 10mg'
                      }
                      rows={4}
                      style={{
                        width: '100%', background: '#0F1117',
                        border: '1px solid #2A2D3A', borderRadius: 8,
                        padding: '10px 12px', color: '#F8F9FA',
                        fontSize: '16px', resize: 'vertical',
                        fontFamily: 'inherit', lineHeight: 1.6
                      }}
                    />
                    <p style={{
                      color: '#6B7280', fontSize: '0.72rem', marginTop: 4
                    }}>
                      Include dosage if known (e.g. Metformin 500mg)
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      const meds = priceInput
                        .split('\n')
                        .map(m => m.trim())
                        .filter(Boolean)
                      handlePriceCheck(meds)
                    }}
                    disabled={priceLoading || !priceInput.trim()}
                    style={{
                      width: '100%', padding: '12px',
                      background: priceLoading || !priceInput.trim()
                        ? 'rgba(245,158,11,0.3)' : '#F59E0B',
                      border: 'none', borderRadius: 10,
                      color: '#000', cursor: priceLoading || !priceInput.trim()
                        ? 'not-allowed' : 'pointer',
                      fontWeight: 700, fontSize: '0.9rem',
                      display: 'flex', alignItems: 'center',
                      justifyContent: 'center', gap: 10
                    }}
                  >
                    {priceLoading ? (
                      <>
                        <div style={{
                          width: 18, height: 18,
                          border: '2px solid rgba(0,0,0,0.3)',
                          borderTop: '2px solid #000',
                          borderRadius: '50%',
                          animation: 'spin 1s linear infinite'
                        }} />
                        Checking prices...
                      </>
                    ) : (
                      '💰 Check Medicine Prices'
                    )}
                  </button>
                </>
              )}

              {/* Loading state */}
              {priceLoading && (
                <div style={{
                  textAlign: 'center', padding: 48, color: '#9CA3AF'
                }}>
                  <div style={{
                    width: 44, height: 44, margin: '0 auto 16px',
                    border: '3px solid #2A2D3A',
                    borderTop: '3px solid #F59E0B',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }} />
                  <p style={{ fontSize: '0.875rem' }}>
                    Comparing prices across Indian pharmacies...
                  </p>
                  <p style={{
                    fontSize: '0.78rem', color: '#6B7280', marginTop: 4
                  }}>
                    Finding generic alternatives and Jan Aushadhi prices
                  </p>
                </div>
              )}

              {/* Results */}
              {priceResult && !priceLoading && (
                <div style={{
                  display: 'flex', flexDirection: 'column', gap: 16
                }}>

                  {/* Reset button */}
                  <button
                    onClick={() => {
                      setPriceResult(null)
                      setPriceInput('')
                    }}
                    style={{
                      alignSelf: 'flex-start',
                      padding: '6px 14px', borderRadius: 8,
                      background: 'rgba(107,114,128,0.1)',
                      border: '1px solid #2A2D3A',
                      color: '#9CA3AF', cursor: 'pointer',
                      fontSize: '0.78rem'
                    }}
                  >
                    ← Check Different Medicines
                  </button>

                  {/* Savings summary banner */}
                  {priceResult.total_savings && (
                    <div style={{
                      background: 'linear-gradient(135deg, rgba(16,185,129,0.12), rgba(16,185,129,0.06))',
                      border: '1px solid rgba(16,185,129,0.25)',
                      borderRadius: 12, padding: '16px 20px',
                      display: 'flex', justifyContent: 'space-between',
                      alignItems: 'center', flexWrap: 'wrap', gap: 12
                    }}>
                      <div>
                        <div style={{
                          color: '#10B981', fontWeight: 700,
                          fontSize: '0.82rem', marginBottom: 4
                        }}>
                          💰 Monthly Savings Potential
                        </div>
                        <div style={{
                          color: '#F8F9FA', fontSize: '0.8rem'
                        }}>
                          Brand: {priceResult.total_brand_cost} →
                          Generic: {priceResult.total_generic_cost}
                        </div>
                      </div>
                      <div style={{
                        background: 'rgba(16,185,129,0.2)',
                        border: '1px solid rgba(16,185,129,0.3)',
                        borderRadius: 10, padding: '8px 16px',
                        textAlign: 'center'
                      }}>
                        <div style={{
                          color: '#10B981', fontWeight: 800,
                          fontSize: '1.2rem'
                        }}>
                          {priceResult.total_savings}
                        </div>
                        <div style={{
                          color: '#9CA3AF', fontSize: '0.65rem'
                        }}>
                          saved/month
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Summary tip */}
                  {priceResult.summary_tip && (
                    <div style={{
                      background: 'rgba(245,158,11,0.06)',
                      border: '1px solid rgba(245,158,11,0.15)',
                      borderRadius: 10, padding: '10px 14px',
                      display: 'flex', gap: 8,
                      alignItems: 'flex-start'
                    }}>
                      <span style={{ flexShrink: 0 }}>💡</span>
                      <p style={{
                        color: '#FDE68A', fontSize: '0.82rem',
                        lineHeight: 1.5, margin: 0
                      }}>
                        {priceResult.summary_tip}
                      </p>
                    </div>
                  )}

                  {/* Medicine cards */}
                  {priceResult.medicines?.map((med, idx) => (
                    <div key={idx} style={{
                      background: '#0F1117',
                      border: '1px solid #2A2D3A',
                      borderRadius: 12, overflow: 'hidden',
                      marginBottom: 12
                    }}>
                      {/* Medicine header */}
                      <div style={{
                        padding: '16px 20px',
                        borderBottom: '1px solid #2A2D3A',
                        display: 'flex', justifyContent: 'space-between',
                        alignItems: 'flex-start', flexWrap: 'wrap', gap: 12,
                        background: '#1A1D27'
                      }}>
                        <div>
                          <div style={{
                            color: '#F8F9FA', fontWeight: 700,
                            fontSize: '0.95rem', marginBottom: 4
                          }}>
                            💊 {med.name}
                          </div>
                          <div style={{
                            color: '#9CA3AF', fontSize: '0.75rem'
                          }}>
                            {med.generic_name && `Generic: ${med.generic_name}`}
                            {med.category && ` · ${med.category}`}
                          </div>
                          <div style={{
                            marginTop: 8, display: 'flex', gap: 6, alignItems: 'center'
                          }}>
                            {med.price_source === 'scraped' ? (
                              <span style={{
                                background: 'rgba(16,185,129,0.1)',
                                color: '#10B981', fontSize: '0.65rem',
                                padding: '2px 6px', borderRadius: 4,
                                fontWeight: 700, border: '1px solid rgba(16,185,129,0.2)'
                              }}>
                                📡 Live from 1mg/PharmEasy
                              </span>
                            ) : (
                              <span style={{
                                background: 'rgba(107,114,128,0.1)',
                                color: '#9CA3AF', fontSize: '0.65rem',
                                padding: '2px 6px', borderRadius: 4,
                                fontWeight: 600, border: '1px solid rgba(107,114,128,0.2)'
                              }}>
                                ✨ AI Estimate (Scraping failed)
                              </span>
                            )}
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {med.jan_aushadhi_available && (
                            <span style={{
                              background: 'rgba(16,185,129,0.15)',
                              color: '#10B981', fontSize: '0.68rem',
                              padding: '2px 8px', borderRadius: 6,
                              fontWeight: 700
                            }}>
                              ✓ Jan Aushadhi
                            </span>
                          )}
                          {med.prescription_required && (
                            <span style={{
                              background: 'rgba(239,68,68,0.1)',
                              color: '#EF4444', fontSize: '0.68rem',
                              padding: '2px 8px', borderRadius: 6,
                              fontWeight: 600
                            }}>
                              Rx Required
                            </span>
                          )}
                        </div>
                      </div>

                      <div style={{ padding: '14px 18px' }}>
                        {/* Price comparison grid */}
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                          gap: 10, marginBottom: 14
                        }}>
                          <div style={{
                            background: 'rgba(239,68,68,0.08)',
                            border: '1px solid rgba(239,68,68,0.15)',
                            borderRadius: 8, padding: '10px 12px',
                            textAlign: 'center'
                          }}>
                            <div style={{
                              color: '#9CA3AF', fontSize: '0.65rem',
                              fontWeight: 600, marginBottom: 4,
                              textTransform: 'uppercase'
                            }}>
                              Brand Price
                            </div>
                            <div style={{
                              color: '#FCA5A5', fontWeight: 700,
                              fontSize: '1rem'
                            }}>
                              {med.brand_price || '—'}
                            </div>
                            {med.brand_name && (
                              <div style={{
                                color: '#6B7280', fontSize: '0.65rem',
                                marginTop: 2
                              }}>
                                {med.brand_name}
                              </div>
                            )}
                          </div>

                          <div style={{
                            background: 'rgba(16,185,129,0.08)',
                            border: '1px solid rgba(16,185,129,0.2)',
                            borderRadius: 8, padding: '10px 12px',
                            textAlign: 'center'
                          }}>
                            <div style={{
                              color: '#9CA3AF', fontSize: '0.65rem',
                              fontWeight: 600, marginBottom: 4,
                              textTransform: 'uppercase'
                            }}>
                              Generic Price
                            </div>
                            <div style={{
                              color: '#34D399', fontWeight: 700,
                              fontSize: '1rem'
                            }}>
                              {med.generic_price || '—'}
                            </div>
                            {med.savings_percent && (
                              <div style={{
                                color: '#10B981', fontSize: '0.65rem',
                                marginTop: 2
                              }}>
                                Save {med.savings_percent}
                              </div>
                            )}
                          </div>

                          {med.jan_aushadhi_price && (
                            <div style={{
                              background: 'rgba(37,99,235,0.08)',
                              border: '1px solid rgba(37,99,235,0.2)',
                              borderRadius: 8, padding: '10px 12px',
                              textAlign: 'center'
                            }}>
                              <div style={{
                                color: '#9CA3AF', fontSize: '0.65rem',
                                fontWeight: 600, marginBottom: 4,
                                textTransform: 'uppercase'
                              }}>
                                Jan Aushadhi
                              </div>
                              <div style={{
                                color: '#60A5FA', fontWeight: 700,
                                fontSize: '1rem'
                              }}>
                                {med.jan_aushadhi_price}
                              </div>
                              <div style={{
                                color: '#6B7280', fontSize: '0.65rem',
                                marginTop: 2
                              }}>
                                Govt Store
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Online pharmacy prices */}
                        {med.online_prices && (
                          <div style={{ marginBottom: 14 }}>
                            <div style={{
                              color: '#9CA3AF', fontSize: '0.72rem',
                              fontWeight: 600, marginBottom: 8,
                              textTransform: 'uppercase', letterSpacing: '0.04em'
                            }}>
                              🛒 Online Pharmacies
                            </div>
                            <div style={{
                              display: 'flex', gap: 8, flexWrap: 'wrap'
                            }}>
                              {Object.entries(med.online_prices)
                                .filter(([_, v]) => v)
                                .map(([platform, price]) => (
                                <div key={platform} style={{
                                  background: 'rgba(255,255,255,0.04)',
                                  border: '1px solid #2A2D3A',
                                  borderRadius: 8, padding: '6px 12px',
                                  display: 'flex', alignItems: 'center',
                                  gap: 6
                                }}>
                                  <span style={{
                                    color: '#9CA3AF', fontSize: '0.72rem',
                                    textTransform: 'capitalize'
                                  }}>
                                    {platform}:
                                  </span>
                                  <span style={{
                                    color: '#F8F9FA', fontWeight: 600,
                                    fontSize: '0.78rem'
                                  }}>
                                    {price}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Alternatives */}
                        {med.alternatives?.length > 0 && (
                          <div style={{ marginBottom: 12 }}>
                            <div style={{
                              color: '#9CA3AF', fontSize: '0.72rem',
                              fontWeight: 600, marginBottom: 8,
                              textTransform: 'uppercase', letterSpacing: '0.04em'
                            }}>
                              🔄 Cheaper Alternatives
                            </div>
                            <div style={{
                              display: 'flex', flexDirection: 'column',
                              gap: 6
                            }}>
                              {med.alternatives.map((alt, ai) => (
                                <div key={ai} style={{
                                  background: 'rgba(245,158,11,0.06)',
                                  border: '1px solid rgba(245,158,11,0.12)',
                                  borderRadius: 8, padding: '8px 12px',
                                  display: 'flex', justifyContent: 'space-between',
                                  alignItems: 'flex-start', gap: 8,
                                  flexWrap: 'wrap'
                                }}>
                                  <div>
                                    <span style={{
                                      color: '#F8F9FA', fontWeight: 600,
                                      fontSize: '0.82rem'
                                    }}>
                                      {alt.name}
                                    </span>
                                    <span style={{
                                      background: alt.type === 'generic'
                                        ? 'rgba(16,185,129,0.15)'
                                        : 'rgba(139,92,246,0.15)',
                                      color: alt.type === 'generic'
                                        ? '#10B981' : '#A78BFA',
                                      fontSize: '0.62rem',
                                      padding: '1px 6px', borderRadius: 4,
                                      marginLeft: 6, fontWeight: 600,
                                      textTransform: 'capitalize'
                                    }}>
                                      {alt.type}
                                    </span>
                                    {alt.note && (
                                      <div style={{
                                        color: '#9CA3AF', fontSize: '0.72rem',
                                        marginTop: 2
                                      }}>
                                        {alt.note}
                                      </div>
                                    )}
                                  </div>
                                  <span style={{
                                    color: '#34D399', fontWeight: 700,
                                    fontSize: '0.85rem', flexShrink: 0
                                  }}>
                                    {alt.price}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Buying tip */}
                        {med.buying_tip && (
                          <div style={{
                            background: 'rgba(37,99,235,0.06)',
                            border: '1px solid rgba(37,99,235,0.12)',
                            borderRadius: 8, padding: '8px 12px',
                            display: 'flex', gap: 6,
                            alignItems: 'flex-start'
                          }}>
                            <span style={{ flexShrink: 0, fontSize: '0.85rem' }}>
                              💡
                            </span>
                            <span style={{
                              color: '#93C5FD', fontSize: '0.75rem',
                              lineHeight: 1.5
                            }}>
                              {med.buying_tip}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Jan Aushadhi note */}
                  <div style={{
                    background: 'rgba(16,185,129,0.05)',
                    border: '1px solid rgba(16,185,129,0.12)',
                    borderRadius: 10, padding: '12px 16px',
                    fontSize: '0.75rem', color: '#9CA3AF',
                    lineHeight: 1.6
                  }}>
                    🏥 <strong style={{ color: '#10B981' }}>
                      Jan Aushadhi Stores
                    </strong> — Government generic medicine stores
                    available in Vijayawada, Visakhapatnam, Tirupati,
                    Guntur and other AP cities. Prices up to 90% cheaper
                    than branded medicines. Find nearest store at
                    janaushadhi.gov.in
                    <br /><br />
                    ⚕️ Prices are approximate estimates.
                    Always consult your doctor before switching medicines.
                  </div>
                </div>
              )}
            </div>
          </div>
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
              <div key={reminder.id} className="stagger-item">
                <div className="card-hover" style={{
                  background: '#1A1D27',
                  border: `1px solid ${reminder.is_active ? '#2A2D3A' : 'rgba(107,114,128,0.2)'}`,
                  borderRadius: expandedReminderInfo[reminder.id] ? '12px 12px 0 0' : 12,
                  padding: 'clamp(12px, 3vw, 16px) clamp(14px, 4vw, 20px)',
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
                      onClick={() => fetchReminderInfo(
                        reminder.id,
                        reminder.medicine_name,
                        reminder.dosage
                      )}
                      title="About this medicine"
                      style={{
                        width: 34, height: 34, borderRadius: 8,
                        border: 'none', cursor: 'pointer',
                        display: 'flex', alignItems: 'center',
                        justifyContent: 'center',
                        background: expandedReminderInfo[reminder.id]
                          ? 'rgba(139,92,246,0.2)'
                          : 'rgba(139,92,246,0.08)',
                        color: '#A78BFA',
                        transition: 'all 0.15s'
                      }}
                    >
                      {reminderInfoLoading[reminder.id]
                        ? <div style={{
                            width: 12, height: 12,
                            border: '2px solid rgba(167,139,250,0.3)',
                            borderTop: '2px solid #A78BFA',
                            borderRadius: '50%',
                            animation: 'spin 1s linear infinite'
                          }} />
                        : <span style={{ fontSize: '0.75rem' }}>ℹ️</span>
                      }
                    </button>
                    <button
                      onClick={() => handleToggle(reminder)}
                      title={reminder.is_active ? 'Pause' : 'Resume'}
                      style={{
                        width: 34, height: 34, borderRadius: 8,
                        border: 'none', cursor: 'pointer',
                        display: 'flex', alignItems: 'center',
                        justifyContent: 'center',
                        background: reminder.is_active
                          ? 'rgba(16,185,129,0.12)'
                          : 'rgba(107,114,128,0.1)',
                        color: reminder.is_active ? '#10B981' : '#6B7280',
                        transition: 'all 0.15s'
                      }}
                    >
                      <Check size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(
                        reminder.id, reminder.medicine_name
                      )}
                      title="Delete"
                      style={{
                        width: 34, height: 34, borderRadius: 8,
                        border: 'none', cursor: 'pointer',
                        display: 'flex', alignItems: 'center',
                        justifyContent: 'center',
                        background: 'rgba(239,68,68,0.08)',
                        color: '#EF4444',
                        transition: 'all 0.15s'
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Medicine info panel */}
                {expandedReminderInfo[reminder.id] &&
                  reminderInfoMap[reminder.id] && (
                  <div style={{
                    background: '#0F1117',
                    border: '1px solid rgba(139,92,246,0.2)',
                    borderTop: 'none',
                    borderRadius: '0 0 12px 12px',
                    padding: '14px 16px',
                    marginTop: -2
                  }}>
                    {/* Used for */}
                    {reminderInfoMap[reminder.id].used_for && (
                      <div style={{ marginBottom: 10 }}>
                        <div style={{
                          color: '#60A5FA', fontWeight: 700,
                          fontSize: '0.7rem', textTransform: 'uppercase',
                          letterSpacing: '0.06em', marginBottom: 4
                        }}>
                          🎯 What it's for
                        </div>
                        <p style={{
                          color: '#D1D5DB', fontSize: '0.8rem',
                          lineHeight: 1.6, margin: 0
                        }}>
                          {reminderInfoMap[reminder.id].used_for}
                        </p>
                      </div>
                    )}

                    {/* How to take */}
                    {reminderInfoMap[reminder.id].how_to_take && (
                      <div style={{
                        background: 'rgba(16,185,129,0.06)',
                        border: '1px solid rgba(16,185,129,0.15)',
                        borderRadius: 8, padding: '8px 12px',
                        marginBottom: 10
                      }}>
                        <div style={{
                          color: '#10B981', fontWeight: 700,
                          fontSize: '0.7rem', textTransform: 'uppercase',
                          letterSpacing: '0.06em', marginBottom: 4
                        }}>
                          💊 How to take
                        </div>
                        <p style={{
                          color: '#A7F3D0', fontSize: '0.8rem',
                          lineHeight: 1.5, margin: 0
                        }}>
                          {reminderInfoMap[reminder.id].how_to_take}
                        </p>
                      </div>
                    )}

                    {/* Side effects */}
                    {reminderInfoMap[reminder.id].common_side_effects?.length > 0 && (
                      <div style={{ marginBottom: 10 }}>
                        <div style={{
                          color: '#F59E0B', fontWeight: 700,
                          fontSize: '0.7rem', textTransform: 'uppercase',
                          letterSpacing: '0.06em', marginBottom: 6
                        }}>
                          ⚠️ Side effects
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                          {reminderInfoMap[reminder.id].common_side_effects
                            .slice(0, 4).map((se, i) => (
                            <span key={i} style={{
                              background: 'rgba(245,158,11,0.1)',
                              border: '1px solid rgba(245,158,11,0.15)',
                              borderRadius: 6, padding: '2px 8px',
                              color: '#FDE68A', fontSize: '0.7rem'
                            }}>
                              {se}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Patient tip */}
                    {reminderInfoMap[reminder.id].patient_tip && (
                      <div style={{
                        display: 'flex', gap: 6,
                        background: 'rgba(37,99,235,0.05)',
                        border: '1px solid rgba(37,99,235,0.1)',
                        borderRadius: 8, padding: '8px 10px'
                      }}>
                        <span style={{ flexShrink: 0 }}>💡</span>
                        <p style={{
                          color: '#93C5FD', fontSize: '0.75rem',
                          lineHeight: 1.5, margin: 0
                        }}>
                          {reminderInfoMap[reminder.id].patient_tip}
                        </p>
                      </div>
                    )}

                    {/* Source badge */}
                    <div style={{
                      marginTop: 8, fontSize: '0.65rem', color: '#6B7280'
                    }}>
                      {reminderInfoMap[reminder.id].fda_data_used
                        ? '✓ Data from FDA drug database'
                        : '⚠️ AI medical knowledge — verify with pharmacist'}
                    </div>
                  </div>
                )}
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
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

export default Reminders
