import React, { useState, useEffect } from 'react'
import { Bell, Plus, Trash2, Clock, Pill, X, Check } from 'lucide-react'
import toast, { Toaster } from 'react-hot-toast'
import { getReminders, createReminder, updateReminder, deleteReminder } from '../services/api'

const FREQUENCY_OPTIONS = [
  { value: 'once_daily', label: 'Once Daily', times: 1 },
  { value: 'twice_daily', label: 'Twice Daily', times: 2 },
  { value: 'three_times', label: 'Three Times Daily', times: 3 },
  { value: 'custom', label: 'Custom', times: 1 },
]

const DEFAULT_TIMES = {
  once_daily: ['08:00'],
  twice_daily: ['08:00', '20:00'],
  three_times: ['08:00', '14:00', '20:00'],
  custom: ['08:00'],
}

const getTimeOfDay = (time) => {
  const hour = parseInt(time.split(':')[0])
  if (hour >= 6 && hour < 12) return { label: 'Morning', color: '#F59E0B' }
  if (hour >= 12 && hour < 18) return { label: 'Afternoon', color: '#2563EB' }
  if (hour >= 18 && hour < 22) return { label: 'Evening', color: '#8B5CF6' }
  return { label: 'Night', color: '#1E40AF' }
}

const Reminders = () => {
  const [reminders, setReminders] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
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

  const handleFrequencyChange = (freq) => {
    setForm(prev => ({
      ...prev,
      frequency: freq,
      reminder_times: [...DEFAULT_TIMES[freq]]
    }))
  }

  const handleTimeChange = (index, value) => {
    setForm(prev => {
      const times = [...prev.reminder_times]
      times[index] = value
      return { ...prev, reminder_times: times }
    })
  }

  const addCustomTime = () => {
    setForm(prev => ({
      ...prev,
      reminder_times: [...prev.reminder_times, '08:00']
    }))
  }

  const removeCustomTime = (index) => {
    setForm(prev => ({
      ...prev,
      reminder_times: prev.reminder_times.filter((_, i) => i !== index)
    }))
  }

  const handleSubmit = async () => {
    if (!form.medicine_name.trim()) {
      toast.error('Please enter medicine name')
      return
    }
    if (form.reminder_times.length === 0) {
      toast.error('Please add at least one reminder time')
      return
    }
    setSaving(true)
    try {
      const payload = {
        medicine_name: form.medicine_name.trim(),
        dosage: form.dosage.trim() || null,
        frequency: form.frequency,
        reminder_times: form.reminder_times,
        instructions: form.instructions.trim() || null,
        end_date: form.end_date || null,
      }
      await createReminder(payload)
      toast.success('Reminder created! You will receive email alerts.')
      setShowForm(false)
      setForm({
        medicine_name: '',
        dosage: '',
        frequency: 'once_daily',
        reminder_times: ['08:00'],
        instructions: '',
        end_date: '',
      })
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

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <Toaster position="top-right" />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', 
        justifyContent: 'space-between', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, 
            color: '#F8F9FA', marginBottom: 4 }}>
            Medicine Reminders
          </h1>
          <p style={{ color: '#9CA3AF' }}>Never miss a dose</p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => setShowForm(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 8 }}
        >
          <Plus size={16} /> Add Reminder
        </button>
      </div>

      {/* Add Reminder Modal */}
      {showForm && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, padding: 16
        }}>
          <div style={{
            background: '#1A1D27', border: '1px solid #2A2D3A',
            borderRadius: 16, padding: 28, width: '100%', maxWidth: 500,
            maxHeight: '90vh', overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between',
              alignItems: 'center', marginBottom: 24 }}>
              <h2 style={{ color: '#F8F9FA', fontSize: '1.1rem', fontWeight: 700 }}>
                Add Medicine Reminder
              </h2>
              <button onClick={() => setShowForm(false)}
                style={{ background: 'none', border: 'none', 
                  color: '#9CA3AF', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ color: '#9CA3AF', fontSize: '0.8rem', 
                  fontWeight: 600, display: 'block', marginBottom: 6 }}>
                  Medicine Name *
                </label>
                <input
                  className="form-input"
                  placeholder="e.g. Paracetamol, Metformin"
                  value={form.medicine_name}
                  onChange={e => setForm(p => ({...p, medicine_name: e.target.value}))}
                />
              </div>

              <div>
                <label style={{ color: '#9CA3AF', fontSize: '0.8rem',
                  fontWeight: 600, display: 'block', marginBottom: 6 }}>
                  Dosage
                </label>
                <input
                  className="form-input"
                  placeholder="e.g. 500mg, 1 tablet"
                  value={form.dosage}
                  onChange={e => setForm(p => ({...p, dosage: e.target.value}))}
                />
              </div>

              <div>
                <label style={{ color: '#9CA3AF', fontSize: '0.8rem',
                  fontWeight: 600, display: 'block', marginBottom: 6 }}>
                  Frequency
                </label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {FREQUENCY_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => handleFrequencyChange(opt.value)}
                      style={{
                        padding: '6px 14px', borderRadius: 8, fontSize: '0.8rem',
                        cursor: 'pointer', fontWeight: 500,
                        background: form.frequency === opt.value 
                          ? '#2563EB' : 'rgba(255,255,255,0.05)',
                        border: form.frequency === opt.value 
                          ? '1px solid #2563EB' : '1px solid #2A2D3A',
                        color: form.frequency === opt.value ? '#fff' : '#9CA3AF',
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ color: '#9CA3AF', fontSize: '0.8rem',
                  fontWeight: 600, display: 'block', marginBottom: 6 }}>
                  Reminder Times
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {form.reminder_times.map((time, i) => (
                    <div key={i} style={{ display: 'flex', gap: 8, 
                      alignItems: 'center' }}>
                      <input
                        type="time"
                        value={time}
                        onChange={e => handleTimeChange(i, e.target.value)}
                        style={{
                          background: '#0F1117', border: '1px solid #2A2D3A',
                          borderRadius: 8, padding: '8px 12px', color: '#F8F9FA',
                          flex: 1, fontSize: '0.9rem'
                        }}
                      />
                      {form.frequency === 'custom' && 
                       form.reminder_times.length > 1 && (
                        <button type="button"
                          onClick={() => removeCustomTime(i)}
                          style={{ background: 'none', border: 'none',
                            color: '#EF4444', cursor: 'pointer' }}>
                          <X size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                  {form.frequency === 'custom' && (
                    <button type="button"
                      onClick={addCustomTime}
                      className="btn btn-ghost btn-sm"
                      style={{ alignSelf: 'flex-start' }}>
                      + Add Time
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label style={{ color: '#9CA3AF', fontSize: '0.8rem',
                  fontWeight: 600, display: 'block', marginBottom: 6 }}>
                  Instructions (optional)
                </label>
                <input
                  className="form-input"
                  placeholder="e.g. After food, Before sleep"
                  value={form.instructions}
                  onChange={e => setForm(p => ({...p, instructions: e.target.value}))}
                />
              </div>

              <div>
                <label style={{ color: '#9CA3AF', fontSize: '0.8rem',
                  fontWeight: 600, display: 'block', marginBottom: 6 }}>
                  End Date (optional — leave empty for ongoing)
                </label>
                <input
                  type="date"
                  value={form.end_date}
                  onChange={e => setForm(p => ({...p, end_date: e.target.value}))}
                  style={{
                    background: '#0F1117', border: '1px solid #2A2D3A',
                    borderRadius: 8, padding: '8px 12px', color: '#F8F9FA',
                    width: '100%', fontSize: '0.9rem'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="btn btn-ghost"
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  className="btn btn-primary"
                  disabled={saving}
                  style={{ flex: 1 }}
                >
                  {saving ? 'Saving...' : 'Save Reminder'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reminders List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#9CA3AF' }}>
          Loading reminders...
        </div>
      ) : reminders.length === 0 ? (
        <div style={{
          background: '#1A1D27', border: '1px solid #2A2D3A',
          borderRadius: 16, padding: 48, textAlign: 'center'
        }}>
          <Bell size={48} color="#374151" style={{ marginBottom: 16 }} />
          <h3 style={{ color: '#F8F9FA', marginBottom: 8 }}>
            No reminders yet
          </h3>
          <p style={{ color: '#9CA3AF', marginBottom: 20 }}>
            Add your first medicine reminder to get email alerts
          </p>
          <button
            className="btn btn-primary"
            onClick={() => setShowForm(true)}
          >
            <Plus size={16} /> Add First Reminder
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {reminders.map(reminder => (
            <div key={reminder.id} style={{
              background: '#1A1D27', border: '1px solid #2A2D3A',
              borderRadius: 12, padding: '16px 20px',
              display: 'flex', alignItems: 'center', gap: 16,
              opacity: reminder.is_active ? 1 : 0.6
            }}>
              <div style={{
                width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                background: reminder.is_active 
                  ? 'rgba(37,99,235,0.15)' : 'rgba(107,114,128,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: reminder.is_active ? '#2563EB' : '#6B7280'
              }}>
                <Pill size={20} />
              </div>

              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', 
                  gap: 8, marginBottom: 4 }}>
                  <span style={{ fontWeight: 700, color: '#F8F9FA',
                    fontSize: '0.95rem' }}>
                    {reminder.medicine_name}
                  </span>
                  {reminder.dosage && (
                    <span style={{
                      background: 'rgba(37,99,235,0.1)',
                      color: '#60A5FA', fontSize: '0.75rem',
                      padding: '2px 8px', borderRadius: 6, fontWeight: 500
                    }}>
                      {reminder.dosage}
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap',
                  alignItems: 'center' }}>
                  {reminder.reminder_times.map((time, i) => {
                    const tod = getTimeOfDay(time)
                    return (
                      <span key={i} style={{
                        background: `${tod.color}20`,
                        border: `1px solid ${tod.color}40`,
                        color: tod.color, fontSize: '0.75rem',
                        padding: '2px 8px', borderRadius: 6,
                        display: 'flex', alignItems: 'center', gap: 4
                      }}>
                        <Clock size={10} /> {time} · {tod.label}
                      </span>
                    )
                  })}
                  {reminder.instructions && (
                    <span style={{ color: '#6B7280', fontSize: '0.75rem' }}>
                      · {reminder.instructions}
                    </span>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                <button
                  onClick={() => handleToggle(reminder)}
                  title={reminder.is_active ? 'Pause' : 'Resume'}
                  style={{
                    width: 32, height: 32, borderRadius: 8, border: 'none',
                    cursor: 'pointer', display: 'flex', alignItems: 'center',
                    justifyContent: 'center',
                    background: reminder.is_active
                      ? 'rgba(16,185,129,0.15)' : 'rgba(107,114,128,0.15)',
                    color: reminder.is_active ? '#10B981' : '#6B7280'
                  }}
                >
                  <Check size={14} />
                </button>
                <button
                  onClick={() => handleDelete(reminder.id, reminder.medicine_name)}
                  title="Delete"
                  style={{
                    width: 32, height: 32, borderRadius: 8, border: 'none',
                    cursor: 'pointer', display: 'flex', alignItems: 'center',
                    justifyContent: 'center',
                    background: 'rgba(239,68,68,0.1)', color: '#EF4444'
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
  )
}

export default Reminders
