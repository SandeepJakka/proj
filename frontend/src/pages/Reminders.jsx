import React, { useState, useEffect } from 'react';
import { Bell, Plus, Trash2, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import { getReminders, createReminder, updateReminder, deleteReminder } from '../services/api';

const Reminders = () => {
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    medicine_name: '',
    dosage: '',
    frequency: 'once_daily',
    reminder_times: ['08:00'],
    instructions: '',
    end_date: ''
  });

  useEffect(() => {
    loadReminders();
  }, []);

  const loadReminders = async () => {
    try {
      const res = await getReminders();
      setReminders(res.data.reminders || []);
    } catch (err) {
      toast.error('Failed to load reminders');
    } finally {
      setLoading(false);
    }
  };

  const handleFrequencyChange = (freq) => {
    const times = {
      once_daily: ['08:00'],
      twice_daily: ['08:00', '20:00'],
      three_times: ['08:00', '14:00', '20:00'],
      custom: ['08:00']
    };
    setFormData({ ...formData, frequency: freq, reminder_times: times[freq] });
  };

  const handleTimeChange = (index, value) => {
    const newTimes = [...formData.reminder_times];
    newTimes[index] = value;
    setFormData({ ...formData, reminder_times: newTimes });
  };

  const addCustomTime = () => {
    setFormData({ ...formData, reminder_times: [...formData.reminder_times, '12:00'] });
  };

  const removeTime = (index) => {
    const newTimes = formData.reminder_times.filter((_, i) => i !== index);
    setFormData({ ...formData, reminder_times: newTimes });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.medicine_name.trim()) {
      toast.error('Medicine name is required');
      return;
    }
    try {
      await createReminder(formData);
      toast.success('Reminder created!');
      setShowForm(false);
      setFormData({
        medicine_name: '',
        dosage: '',
        frequency: 'once_daily',
        reminder_times: ['08:00'],
        instructions: '',
        end_date: ''
      });
      loadReminders();
    } catch (err) {
      toast.error('Failed to create reminder');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this reminder?')) return;
    try {
      await deleteReminder(id);
      toast.success('Reminder deleted');
      loadReminders();
    } catch (err) {
      toast.error('Failed to delete reminder');
    }
  };

  const toggleActive = async (reminder) => {
    try {
      await updateReminder(reminder.id, { is_active: !reminder.is_active });
      toast.success(reminder.is_active ? 'Reminder paused' : 'Reminder activated');
      loadReminders();
    } catch (err) {
      toast.error('Failed to update reminder');
    }
  };

  const getTimeColor = (time) => {
    const hour = parseInt(time.split(':')[0]);
    if (hour >= 6 && hour < 12) return '#F59E0B';
    if (hour >= 12 && hour < 18) return '#2563EB';
    if (hour >= 18 && hour < 22) return '#8b5cf6';
    return '#1e40af';
  };

  if (loading) return <div className="page-container"><p>Loading...</p></div>;

  return (
    <div className="page-container">
      <div className="page-header">
        <h1><Bell size={32} /> Medicine Reminders</h1>
        <p>Never miss a dose</p>
      </div>

      <button className="btn btn-primary" onClick={() => setShowForm(!showForm)} style={{ marginBottom: 24 }}>
        <Plus size={18} /> Add Reminder
      </button>

      {showForm && (
        <div className="card" style={{ marginBottom: 24 }}>
          <h3 style={{ marginBottom: 16 }}>New Reminder</h3>
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 16 }}>
              <label className="form-label">Medicine Name *</label>
              <input
                className="form-input"
                value={formData.medicine_name}
                onChange={(e) => setFormData({ ...formData, medicine_name: e.target.value })}
                placeholder="e.g. Aspirin"
                required
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label className="form-label">Dosage</label>
              <input
                className="form-input"
                value={formData.dosage}
                onChange={(e) => setFormData({ ...formData, dosage: e.target.value })}
                placeholder="e.g. 500mg"
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label className="form-label">Frequency</label>
              <select
                className="form-input"
                value={formData.frequency}
                onChange={(e) => handleFrequencyChange(e.target.value)}
              >
                <option value="once_daily">Once daily</option>
                <option value="twice_daily">Twice daily</option>
                <option value="three_times">Three times daily</option>
                <option value="custom">Custom</option>
              </select>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label className="form-label">Reminder Times</label>
              {formData.reminder_times.map((time, idx) => (
                <div key={idx} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  <input
                    type="time"
                    className="form-input"
                    value={time}
                    onChange={(e) => handleTimeChange(idx, e.target.value)}
                    style={{ flex: 1 }}
                  />
                  {formData.frequency === 'custom' && formData.reminder_times.length > 1 && (
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => removeTime(idx)}>
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              ))}
              {formData.frequency === 'custom' && (
                <button type="button" className="btn btn-ghost btn-sm" onClick={addCustomTime}>
                  <Plus size={16} /> Add Time
                </button>
              )}
            </div>

            <div style={{ marginBottom: 16 }}>
              <label className="form-label">Instructions</label>
              <input
                className="form-input"
                value={formData.instructions}
                onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                placeholder="e.g. After food"
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label className="form-label">End Date (optional)</label>
              <input
                type="date"
                className="form-input"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
              />
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button type="submit" className="btn btn-primary">Save Reminder</button>
              <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {reminders.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 40 }}>
          <Bell size={48} color="#6B7280" style={{ marginBottom: 16 }} />
          <p>No reminders yet. Add your first medicine.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {reminders.map((reminder) => (
            <div key={reminder.id} className="card" style={{ opacity: reminder.is_active ? 1 : 0.6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 12 }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem' }}>
                    💊 {reminder.medicine_name}
                    {reminder.dosage && <span style={{ color: '#9CA3AF', fontWeight: 400, marginLeft: 8 }}>({reminder.dosage})</span>}
                  </h3>
                  <p style={{ color: '#9CA3AF', fontSize: '0.875rem', margin: '4px 0 0 0' }}>
                    {reminder.frequency.replace('_', ' ')}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={reminder.is_active}
                      onChange={() => toggleActive(reminder)}
                      style={{ marginRight: 6 }}
                    />
                    <span style={{ fontSize: '0.875rem', color: '#9CA3AF' }}>Active</span>
                  </label>
                  <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(reminder.id)} style={{ color: '#EF4444' }}>
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                {reminder.reminder_times.map((time, idx) => (
                  <span
                    key={idx}
                    style={{
                      background: `${getTimeColor(time)}22`,
                      color: getTimeColor(time),
                      padding: '4px 12px',
                      borderRadius: 16,
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4
                    }}
                  >
                    <Clock size={14} /> {time}
                  </span>
                ))}
              </div>

              {reminder.instructions && (
                <p style={{ color: '#9CA3AF', fontSize: '0.875rem', margin: 0 }}>
                  📝 {reminder.instructions}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Reminders;
