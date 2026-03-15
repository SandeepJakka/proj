import React, { useState, useEffect, useRef } from 'react'
import { Upload, Trash2, MessageSquare, Send } from 'lucide-react'
import toast, { Toaster } from 'react-hot-toast'
import ReactMarkdown from 'react-markdown'

const BASE = 'http://localhost:8000/api'

const authHeaders = () => ({
  'Authorization': `Bearer ${localStorage.getItem('access_token')}`
})

const Insurance = () => {
  const [policies, setPolicies] = useState([])
  const [loadingPolicies, setLoadingPolicies] = useState(true)
  const [selectedPolicy, setSelectedPolicy] = useState(null)
  const [activeTab, setActiveTab] = useState('claim')
  const [uploadOpen, setUploadOpen] = useState(false)

  // Upload state
  const [uploading, setUploading] = useState(false)
  const [policyName, setPolicyName] = useState('')
  const [policyNumber, setPolicyNumber] = useState('')
  const policyFileRef = useRef(null)

  // Claim check state
  const [situation, setSituation] = useState('')
  const [claimLoading, setClaimLoading] = useState(false)
  const [claimResult, setClaimResult] = useState(null)
  const billFileRef = useRef(null)
  const [uploadingBill, setUploadingBill] = useState(false)
  const [claimLanguage, setClaimLanguage] = useState('english')

  // Chat state
  const [chatMessages, setChatMessages] = useState([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const chatScrollRef = useRef(null)

  useEffect(() => { fetchPolicies() }, [])

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight
    }
  }, [chatMessages])

  const fetchPolicies = async () => {
    try {
      const res = await fetch(`${BASE}/insurance/policies`, { headers: authHeaders() })
      const data = await res.json()
      setPolicies(data)
      if (data.length > 0 && !selectedPolicy) setSelectedPolicy(data[0])
    } catch {
      toast.error('Failed to load policies')
    } finally {
      setLoadingPolicies(false)
    }
  }

  const handleUploadPolicy = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!policyName.trim()) { toast.error('Please enter a policy name first'); return }
    setUploading(true)
    const toastId = toast.loading('Reading policy document...')
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('policy_name', policyName)
      formData.append('policy_number', policyNumber)
      const res = await fetch(`${BASE}/insurance/upload-policy`, {
        method: 'POST', headers: authHeaders(), body: formData
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Upload failed')
      toast.success(`✅ ${data.message}`, { id: toastId, duration: 4000 })
      setUploadOpen(false); setPolicyName(''); setPolicyNumber('')
      await fetchPolicies()
    } catch (err) {
      toast.error(err.message || 'Upload failed', { id: toastId })
    } finally {
      setUploading(false)
      if (policyFileRef.current) policyFileRef.current.value = ''
    }
  }

  const handleDeletePolicy = async (id) => {
    if (!window.confirm('Delete this policy?')) return
    try {
      await fetch(`${BASE}/insurance/policies/${id}`, { method: 'DELETE', headers: authHeaders() })
      toast.success('Policy deleted')
      if (selectedPolicy?.id === id) setSelectedPolicy(null)
      await fetchPolicies()
    } catch { toast.error('Failed to delete policy') }
  }

  const handleCheckClaim = async () => {
    if (!selectedPolicy) { toast.error('Please select a policy first'); return }
    if (!situation.trim()) { toast.error('Please describe your medical situation'); return }
    setClaimLoading(true); setClaimResult(null)
    try {
      const res = await fetch(`${BASE}/insurance/check-claim`, {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ policy_id: selectedPolicy.id, situation, language: claimLanguage })
      })
      const data = await res.json()
      if (data.success) setClaimResult(data.data)
      else toast.error(data.error || 'Analysis failed')
    } catch { toast.error('Connection error. Please try again.') }
    finally { setClaimLoading(false) }
  }

  const handleBillUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file || !selectedPolicy) return
    setUploadingBill(true); setClaimResult(null)
    const toastId = toast.loading('Reading bill and checking policy...')
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('policy_id', selectedPolicy.id)
      formData.append('situation', situation || 'Check if this bill is claimable')
      formData.append('language', claimLanguage)
      const res = await fetch(`${BASE}/insurance/check-claim-with-bill`, {
        method: 'POST', headers: authHeaders(), body: formData
      })
      const data = await res.json()
      if (data.success) { setClaimResult(data.data); toast.success('Bill analyzed!', { id: toastId }) }
      else toast.error(data.error || 'Analysis failed', { id: toastId })
    } catch { toast.error('Failed to analyze bill', { id: toastId }) }
    finally {
      setUploadingBill(false)
      if (billFileRef.current) billFileRef.current.value = ''
    }
  }

  const handleChatSend = async (e) => {
    e.preventDefault()
    if (!chatInput.trim() || !selectedPolicy || chatLoading) return
    const question = chatInput.trim()
    setChatInput('')
    setChatMessages(prev => [...prev, { role: 'user', content: question }])
    setChatLoading(true)
    try {
      const res = await fetch(`${BASE}/insurance/chat`, {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          policy_id: selectedPolicy.id, question,
          chat_history: chatMessages.slice(-6), language: claimLanguage
        })
      })
      const data = await res.json()
      setChatMessages(prev => [...prev, { role: 'assistant', content: data.response }])
    } catch {
      setChatMessages(prev => [...prev, { role: 'assistant', content: '⚠️ Connection error. Please try again.' }])
    } finally { setChatLoading(false) }
  }

  const getPolicyTypeColor = (type) => {
    const colors = {
      health: { color: '#10B981', bg: 'rgba(16,185,129,0.1)' },
      life: { color: '#2563EB', bg: 'rgba(37,99,235,0.1)' },
      vehicle: { color: '#F59E0B', bg: 'rgba(245,158,11,0.1)' },
      other: { color: '#8B5CF6', bg: 'rgba(139,92,246,0.1)' }
    }
    return colors[type] || colors.other
  }

  const SITUATION_CHIPS = [
    'Hospitalization for surgery', 'Dengue/malaria treatment',
    'Maternity expenses', 'Cancer treatment',
    'Ambulance charges', 'Day care procedure',
    'Pre-existing condition', 'Outpatient consultation'
  ]

  return (
    <div className="page-enter" style={{ maxWidth: 960, margin: '0 auto' }}>
      <Toaster position="top-right" />

      {/* ── Header ─────────────────────────────────────────── */}
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        alignItems: 'flex-start', marginBottom: 24,
        flexWrap: 'wrap', gap: 12
      }}>
        <div>
          <h1 style={{
            fontSize: 'clamp(1.2rem, 4vw, 1.75rem)',
            fontWeight: 700, color: '#F8F9FA', marginBottom: 4
          }}>
            🛡️ Insurance Claim Checker
          </h1>
          <p style={{ color: '#9CA3AF', margin: 0, fontSize: '0.875rem' }}>
            Upload your policy → Check claim eligibility → Chat with your policy
          </p>
        </div>
        <button
          onClick={() => setUploadOpen(v => !v)}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '10px 18px', borderRadius: 10,
            background: '#2563EB', border: 'none',
            color: '#fff', cursor: 'pointer',
            fontWeight: 600, fontSize: '0.875rem'
          }}
        >
          <Upload size={16} /> Upload Policy
        </button>
      </div>

      {/* ── Upload Panel ───────────────────────────────────── */}
      {uploadOpen && (
        <div style={{
          background: '#1A1D27',
          border: '1px solid rgba(37,99,235,0.3)',
          borderRadius: 14, padding: 20, marginBottom: 20
        }}>
          <div style={{
            fontWeight: 700, color: '#F8F9FA', fontSize: '0.9rem',
            marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8
          }}>
            <Upload size={16} color="#2563EB" />
            Upload Insurance Policy Document
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 12, marginBottom: 14
          }}>
            <div>
              <label style={{ color: '#9CA3AF', fontSize: '0.78rem', fontWeight: 600, display: 'block', marginBottom: 6 }}>
                Policy Name *
              </label>
              <input
                className="form-input"
                placeholder="e.g. Star Health Family Plan"
                value={policyName}
                onChange={e => setPolicyName(e.target.value)}
                style={{ fontSize: '16px' }}
              />
            </div>
            <div>
              <label style={{ color: '#9CA3AF', fontSize: '0.78rem', fontWeight: 600, display: 'block', marginBottom: 6 }}>
                Policy Number (optional)
              </label>
              <input
                className="form-input"
                placeholder="e.g. P/211111/01/2024/123456"
                value={policyNumber}
                onChange={e => setPolicyNumber(e.target.value)}
                style={{ fontSize: '16px' }}
              />
            </div>
          </div>
          <input
            ref={policyFileRef} type="file"
            style={{ display: 'none' }} accept=".pdf,.jpg,.jpeg,.png"
            onChange={handleUploadPolicy}
          />
          <button
            onClick={() => {
              if (!policyName.trim()) { toast.error('Please enter policy name first'); return }
              policyFileRef.current?.click()
            }}
            disabled={uploading}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '10px 20px', borderRadius: 10,
              background: uploading ? 'rgba(37,99,235,0.3)' : 'rgba(37,99,235,0.1)',
              border: '1px solid rgba(37,99,235,0.3)',
              color: uploading ? '#6B7280' : '#60A5FA',
              cursor: uploading ? 'not-allowed' : 'pointer',
              fontWeight: 600, fontSize: '0.875rem'
            }}
          >
            {uploading ? '⏳ Processing...' : '📄 Choose PDF / Image'}
          </button>
          <p style={{ color: '#6B7280', fontSize: '0.72rem', marginTop: 8 }}>
            Supports PDF (up to 200 pages), JPG, PNG. Policy text stored securely in your account.
          </p>
        </div>
      )}

      {/* ── Main Layout ────────────────────────────────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: policies.length > 0 ? 'clamp(200px, 25%, 260px) 1fr' : '1fr',
        gap: 20, alignItems: 'start'
      }}>

        {/* Policies Sidebar */}
        {policies.length > 0 && (
          <div style={{
            background: '#1A1D27', border: '1px solid #2A2D3A',
            borderRadius: 14, overflow: 'hidden'
          }}>
            <div style={{
              padding: '14px 16px', borderBottom: '1px solid #2A2D3A',
              fontWeight: 700, color: '#F8F9FA', fontSize: '0.85rem'
            }}>
              📋 My Policies ({policies.length})
            </div>
            {policies.map(policy => {
              const tc = getPolicyTypeColor(policy.policy_type)
              return (
                <div
                  key={policy.id}
                  onClick={() => { setSelectedPolicy(policy); setClaimResult(null); setChatMessages([]) }}
                  style={{
                    padding: '12px 16px', borderBottom: '1px solid #2A2D3A',
                    cursor: 'pointer',
                    background: selectedPolicy?.id === policy.id ? 'rgba(37,99,235,0.1)' : 'transparent',
                    borderLeft: selectedPolicy?.id === policy.id ? '3px solid #2563EB' : '3px solid transparent',
                    transition: 'all 0.15s'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        color: '#F8F9FA', fontWeight: 600, fontSize: '0.82rem',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                      }}>
                        {policy.policy_name}
                      </div>
                      {policy.insurer_name && (
                        <div style={{ color: '#9CA3AF', fontSize: '0.72rem', marginTop: 2 }}>
                          {policy.insurer_name}
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
                        <span style={{
                          background: tc.bg, color: tc.color,
                          fontSize: '0.62rem', padding: '1px 6px',
                          borderRadius: 4, fontWeight: 600, textTransform: 'capitalize'
                        }}>
                          {policy.policy_type}
                        </span>
                        <span style={{ color: '#6B7280', fontSize: '0.62rem' }}>{policy.page_count}p</span>
                      </div>
                    </div>
                    <button
                      onClick={e => { e.stopPropagation(); handleDeletePolicy(policy.id) }}
                      style={{ background: 'none', border: 'none', color: '#4B5563', cursor: 'pointer', padding: 2, flexShrink: 0 }}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Main Content */}
        <div>
          {!selectedPolicy ? (
            <div style={{
              background: '#1A1D27', border: '1px dashed #2A2D3A',
              borderRadius: 14, padding: 48, textAlign: 'center'
            }}>
              <div style={{ fontSize: '3rem', marginBottom: 16 }}>🛡️</div>
              <h2 style={{ color: '#F8F9FA', fontWeight: 700, fontSize: '1.1rem', marginBottom: 8 }}>
                No Policy Uploaded Yet
              </h2>
              <p style={{
                color: '#9CA3AF', fontSize: '0.875rem',
                marginBottom: 20, maxWidth: 360, margin: '0 auto 20px'
              }}>
                Upload your health insurance policy PDF and Healthora will read every page — then check
                claim eligibility and ask any question about your coverage.
              </p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 20 }}>
                {['Star Health', 'HDFC Ergo', 'Aarogyasri', 'New India', 'United India', 'CGHS'].map(ins => (
                  <span key={ins} style={{
                    background: 'rgba(37,99,235,0.08)', border: '1px solid rgba(37,99,235,0.15)',
                    borderRadius: 6, padding: '3px 10px', color: '#9CA3AF', fontSize: '0.72rem'
                  }}>{ins}</span>
                ))}
              </div>
              <button
                onClick={() => setUploadOpen(true)}
                style={{
                  padding: '10px 24px', borderRadius: 10,
                  background: '#2563EB', border: 'none',
                  color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem'
                }}
              >
                Upload Policy Now
              </button>
            </div>
          ) : (
            <div>
              {/* Selected Policy Header */}
              <div style={{
                background: '#1A1D27', border: '1px solid #2A2D3A',
                borderRadius: 12, padding: '14px 18px', marginBottom: 16,
                display: 'flex', justifyContent: 'space-between',
                alignItems: 'center', flexWrap: 'wrap', gap: 8
              }}>
                <div>
                  <div style={{ color: '#F8F9FA', fontWeight: 700, fontSize: '0.95rem' }}>
                    🛡️ {selectedPolicy.policy_name}
                  </div>
                  <div style={{ color: '#9CA3AF', fontSize: '0.75rem', marginTop: 2 }}>
                    {selectedPolicy.insurer_name || 'Insurance Policy'}
                    {selectedPolicy.policy_number && ` · ${selectedPolicy.policy_number}`}
                    {` · ${selectedPolicy.page_count} pages`}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {['english', 'telugu'].map(lang => (
                    <button
                      key={lang}
                      onClick={() => setClaimLanguage(lang)}
                      style={{
                        padding: '4px 10px', borderRadius: 6,
                        border: claimLanguage === lang ? '1.5px solid #2563EB' : '1px solid #2A2D3A',
                        background: claimLanguage === lang ? 'rgba(37,99,235,0.15)' : 'transparent',
                        color: claimLanguage === lang ? '#60A5FA' : '#6B7280',
                        cursor: 'pointer', fontSize: '0.75rem',
                        fontWeight: claimLanguage === lang ? 600 : 400
                      }}
                    >
                      {lang === 'english' ? 'EN' : 'తె'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tabs */}
              <div style={{ display: 'flex', borderBottom: '1px solid #2A2D3A', marginBottom: 20 }}>
                {[{ key: 'claim', label: '🔍 Check Claim' }, { key: 'chat', label: '💬 Chat with Policy' }].map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    style={{
                      padding: '12px 20px', background: 'none', border: 'none',
                      borderBottom: activeTab === tab.key ? '2px solid #2563EB' : '2px solid transparent',
                      color: activeTab === tab.key ? '#60A5FA' : '#9CA3AF',
                      cursor: 'pointer', fontWeight: activeTab === tab.key ? 600 : 400,
                      fontSize: '0.875rem', marginBottom: -1
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* ── Claim Check Tab ─────────────────────────── */}
              {activeTab === 'claim' && (
                <div>
                  {!claimResult ? (
                    <div style={{ background: '#1A1D27', border: '1px solid #2A2D3A', borderRadius: 12, padding: 20 }}>
                      <div style={{ marginBottom: 16 }}>
                        <label style={{ color: '#9CA3AF', fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: 8 }}>
                          📝 Describe your medical situation
                        </label>
                        <textarea
                          value={situation}
                          onChange={e => setSituation(e.target.value)}
                          placeholder="e.g. I was admitted to Apollo Hospital for 3 days with dengue fever. Total bill ₹45,000. Or upload your medical report/bill directly."
                          rows={4}
                          style={{
                            width: '100%', background: '#0F1117',
                            border: '1px solid #2A2D3A', borderRadius: 8,
                            padding: '10px 12px', color: '#F8F9FA',
                            fontSize: '16px', resize: 'vertical',
                            fontFamily: 'inherit', lineHeight: 1.6
                          }}
                        />
                      </div>
                      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
                        <button
                          onClick={handleCheckClaim}
                          disabled={claimLoading || !situation.trim()}
                          style={{
                            flex: 1, padding: '11px 20px', borderRadius: 10,
                            background: claimLoading || !situation.trim() ? 'rgba(37,99,235,0.3)' : '#2563EB',
                            border: 'none', color: '#fff',
                            cursor: claimLoading || !situation.trim() ? 'not-allowed' : 'pointer',
                            fontWeight: 600, fontSize: '0.875rem',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
                          }}
                        >
                          {claimLoading ? (
                            <><div style={{
                              width: 16, height: 16,
                              border: '2px solid rgba(255,255,255,0.3)',
                              borderTop: '2px solid #fff',
                              borderRadius: '50%', animation: 'spin 1s linear infinite'
                            }} /> Analyzing Policy...</>
                          ) : '🔍 Check Claim Eligibility'}
                        </button>
                        <div>
                          <input
                            ref={billFileRef} type="file"
                            style={{ display: 'none' }} accept=".pdf,.jpg,.jpeg,.png"
                            onChange={handleBillUpload}
                          />
                          <button
                            onClick={() => billFileRef.current?.click()}
                            disabled={uploadingBill}
                            style={{
                              padding: '11px 16px', borderRadius: 10,
                              background: 'rgba(16,185,129,0.08)',
                              border: '1px solid rgba(16,185,129,0.25)',
                              color: '#10B981', cursor: uploadingBill ? 'not-allowed' : 'pointer',
                              fontWeight: 600, fontSize: '0.875rem',
                              display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap'
                            }}
                          >
                            {uploadingBill ? '⏳' : <Upload size={14} />} Upload Bill / Report
                          </button>
                        </div>
                      </div>
                      <div>
                        <div style={{ color: '#6B7280', fontSize: '0.72rem', marginBottom: 8 }}>
                          Common situations (tap to add):
                        </div>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {SITUATION_CHIPS.map(s => (
                            <button
                              key={s}
                              onClick={() => setSituation(prev => prev ? prev + ', ' + s : s)}
                              style={{
                                padding: '3px 10px', borderRadius: 20,
                                border: '1px solid #2A2D3A',
                                background: 'rgba(255,255,255,0.03)',
                                color: '#9CA3AF', cursor: 'pointer', fontSize: '0.72rem'
                              }}
                            >
                              {s}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                      <button
                        onClick={() => { setClaimResult(null); setSituation('') }}
                        style={{
                          alignSelf: 'flex-start', padding: '6px 14px', borderRadius: 8,
                          background: 'rgba(107,114,128,0.1)', border: '1px solid #2A2D3A',
                          color: '#9CA3AF', cursor: 'pointer', fontSize: '0.78rem'
                        }}
                      >
                        ← Check Another Situation
                      </button>

                      {/* Verdict Banner */}
                      <div style={{
                        background: claimResult.eligible ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                        border: `1px solid ${claimResult.eligible ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
                        borderRadius: 12, padding: '16px 20px',
                        display: 'flex', justifyContent: 'space-between',
                        alignItems: 'center', flexWrap: 'wrap', gap: 12
                      }}>
                        <div>
                          <div style={{ fontSize: '1.5rem', marginBottom: 4 }}>
                            {claimResult.eligible ? '✅' : '❌'}
                          </div>
                          <div style={{
                            color: claimResult.eligible ? '#10B981' : '#EF4444',
                            fontWeight: 700, fontSize: '1rem'
                          }}>
                            {claimResult.eligible ? 'Claim Likely Eligible' : 'Claim May Not Be Covered'}
                          </div>
                          <div style={{ color: '#D1D5DB', fontSize: '0.82rem', marginTop: 4 }}>
                            {claimResult.verdict}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          {claimResult.covered_amount && (
                            <div style={{ color: '#10B981', fontWeight: 800, fontSize: '1.2rem' }}>
                              {claimResult.covered_amount}
                            </div>
                          )}
                          <div style={{ color: '#9CA3AF', fontSize: '0.7rem' }}>est. claimable</div>
                          {claimResult.confidence && (
                            <span style={{
                              background: 'rgba(255,255,255,0.08)', color: '#9CA3AF',
                              fontSize: '0.65rem', padding: '2px 8px', borderRadius: 6,
                              fontWeight: 600, textTransform: 'uppercase',
                              marginTop: 4, display: 'inline-block'
                            }}>
                              {claimResult.confidence} confidence
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Cashless / Reimbursement guidance */}
                      {claimResult.claim_type && (
                        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                          {(claimResult.claim_type === 'cashless' || claimResult.claim_type === 'both') && (
                            <div style={{
                              background: 'rgba(37,99,235,0.08)', border: '1px solid rgba(37,99,235,0.2)',
                              borderRadius: 10, padding: '10px 14px', flex: 1, minWidth: 160
                            }}>
                              <div style={{ color: '#60A5FA', fontWeight: 700, fontSize: '0.75rem', marginBottom: 4 }}>
                                💳 CASHLESS
                              </div>
                              <p style={{ color: '#D1D5DB', fontSize: '0.78rem', margin: 0, lineHeight: 1.5 }}>
                                {claimResult.cashless_guidance || 'Use at network hospitals'}
                              </p>
                            </div>
                          )}
                          {(claimResult.claim_type === 'reimbursement' || claimResult.claim_type === 'both') && (
                            <div style={{
                              background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)',
                              borderRadius: 10, padding: '10px 14px', flex: 1, minWidth: 160
                            }}>
                              <div style={{ color: '#A78BFA', fontWeight: 700, fontSize: '0.75rem', marginBottom: 4 }}>
                                🔄 REIMBURSEMENT
                              </div>
                              <p style={{ color: '#D1D5DB', fontSize: '0.78rem', margin: 0, lineHeight: 1.5 }}>
                                {claimResult.reimbursement_guidance || 'Submit bills after treatment'}
                              </p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Details Grid */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
                        {claimResult.covered_items?.length > 0 && (
                          <div style={{ background: '#1A1D27', border: '1px solid #2A2D3A', borderRadius: 10, padding: '14px 16px' }}>
                            <div style={{ color: '#10B981', fontWeight: 700, fontSize: '0.75rem', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>✅ What's Covered</div>
                            {claimResult.covered_items.map((item, i) => (
                              <div key={i} style={{ color: '#D1D5DB', fontSize: '0.8rem', marginBottom: 5, display: 'flex', gap: 6 }}>
                                <span style={{ color: '#10B981', flexShrink: 0 }}>✓</span>{item}
                              </div>
                            ))}
                          </div>
                        )}
                        {claimResult.not_covered?.length > 0 && (
                          <div style={{ background: '#1A1D27', border: '1px solid #2A2D3A', borderRadius: 10, padding: '14px 16px' }}>
                            <div style={{ color: '#EF4444', fontWeight: 700, fontSize: '0.75rem', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>❌ Exclusions</div>
                            {claimResult.not_covered.map((item, i) => (
                              <div key={i} style={{ color: '#D1D5DB', fontSize: '0.8rem', marginBottom: 5, display: 'flex', gap: 6 }}>
                                <span style={{ color: '#EF4444', flexShrink: 0 }}>✗</span>{item}
                              </div>
                            ))}
                          </div>
                        )}
                        {claimResult.documents_required?.length > 0 && (
                          <div style={{ background: '#1A1D27', border: '1px solid #2A2D3A', borderRadius: 10, padding: '14px 16px' }}>
                            <div style={{ color: '#8B5CF6', fontWeight: 700, fontSize: '0.75rem', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>📁 Documents Required</div>
                            {claimResult.documents_required.map((doc, i) => (
                              <div key={i} style={{ color: '#D1D5DB', fontSize: '0.8rem', marginBottom: 5, display: 'flex', gap: 6 }}>
                                <span style={{ color: '#8B5CF6', flexShrink: 0 }}>📄</span>{doc}
                              </div>
                            ))}
                          </div>
                        )}
                        {claimResult.conditions?.length > 0 && (
                          <div style={{ background: '#1A1D27', border: '1px solid #2A2D3A', borderRadius: 10, padding: '14px 16px' }}>
                            <div style={{ color: '#F59E0B', fontWeight: 700, fontSize: '0.75rem', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>⚠️ Conditions / Waiting Periods</div>
                            {claimResult.conditions.map((cond, i) => (
                              <div key={i} style={{ color: '#D1D5DB', fontSize: '0.8rem', marginBottom: 5, display: 'flex', gap: 6 }}>
                                <span style={{ color: '#F59E0B', flexShrink: 0 }}>•</span>{cond}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Claim Steps */}
                      {claimResult.claim_steps?.length > 0 && (
                        <div style={{ background: '#1A1D27', border: '1px solid #2A2D3A', borderRadius: 10, padding: '14px 16px' }}>
                          <div style={{ color: '#60A5FA', fontWeight: 700, fontSize: '0.75rem', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>📋 How to File Your Claim</div>
                          {claimResult.claim_steps.map((step, i) => (
                            <div key={i} style={{ display: 'flex', gap: 12, marginBottom: 10, alignItems: 'flex-start' }}>
                              <div style={{
                                width: 24, height: 24, borderRadius: '50%',
                                background: 'rgba(37,99,235,0.2)', border: '1px solid rgba(37,99,235,0.3)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: '#60A5FA', fontWeight: 700, fontSize: '0.72rem', flexShrink: 0
                              }}>{i + 1}</div>
                              <div style={{ color: '#D1D5DB', fontSize: '0.82rem', lineHeight: 1.5, paddingTop: 2 }}>{step}</div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Tips */}
                      {claimResult.tips?.length > 0 && (
                        <div style={{ background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.15)', borderRadius: 10, padding: '12px 16px' }}>
                          <div style={{ color: '#10B981', fontWeight: 700, fontSize: '0.75rem', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>💡 Claim Tips</div>
                          {claimResult.tips.map((tip, i) => (
                            <div key={i} style={{ color: '#A7F3D0', fontSize: '0.8rem', marginBottom: 5, display: 'flex', gap: 6 }}>
                              <span style={{ flexShrink: 0 }}>•</span>{tip}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Aarogyasri Note */}
                      {claimResult.aarogyasri_applicable && (
                        <div style={{ background: 'rgba(37,99,235,0.08)', border: '1px solid rgba(37,99,235,0.2)', borderRadius: 10, padding: '10px 14px', fontSize: '0.78rem', color: '#93C5FD' }}>
                          🏥 <strong>Aarogyasri Scheme:</strong> This condition may be covered under Andhra Pradesh's Aarogyasri health scheme. Check at your nearest empanelled hospital.
                        </div>
                      )}

                      {/* Disclaimer */}
                      <div style={{ fontSize: '0.7rem', color: '#6B7280', padding: '8px 12px', background: 'rgba(107,114,128,0.05)', borderRadius: 8, lineHeight: 1.5 }}>
                        ⚠️ This is an AI analysis for guidance only. Actual claim decisions are made by your insurer. Always consult your TPA or insurance agent for final confirmation.
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── Chat Tab ──────────────────────────────────── */}
              {activeTab === 'chat' && (
                <div style={{ background: '#1A1D27', border: '1px solid #2A2D3A', borderRadius: 12, overflow: 'hidden' }}>
                  <div style={{ padding: '12px 16px', borderBottom: '1px solid #2A2D3A', background: '#0F1117', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <MessageSquare size={16} color="#2563EB" />
                    <span style={{ color: '#F8F9FA', fontWeight: 600, fontSize: '0.85rem' }}>
                      Chat with {selectedPolicy.policy_name}
                    </span>
                  </div>

                  <div ref={chatScrollRef} style={{ height: 360, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {chatMessages.length === 0 && (
                      <div style={{ textAlign: 'center', padding: '24px 16px', color: '#6B7280' }}>
                        <MessageSquare size={32} style={{ marginBottom: 10, opacity: 0.3 }} />
                        <p style={{ fontSize: '0.82rem', marginBottom: 14 }}>Ask anything about your policy</p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center' }}>
                          {['What is my sum insured?', 'Is maternity covered?', 'What is the waiting period?', 'Which hospitals are in network?', 'What is the co-payment clause?'].map(q => (
                            <button key={q} onClick={() => setChatInput(q)}
                              style={{ padding: '6px 14px', borderRadius: 20, border: '1px solid #2A2D3A', background: 'rgba(255,255,255,0.03)', color: '#9CA3AF', cursor: 'pointer', fontSize: '0.75rem' }}>
                              {q}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    {chatMessages.map((msg, i) => (
                      <div key={i} style={{ display: 'flex', flexDirection: msg.role === 'user' ? 'row-reverse' : 'row', gap: 8, alignItems: 'flex-start' }}>
                        <div style={{
                          width: 28, height: 28, borderRadius: '50%',
                          background: msg.role === 'user' ? '#2563EB' : 'rgba(37,99,235,0.15)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          flexShrink: 0, fontSize: '0.75rem',
                          color: msg.role === 'user' ? '#fff' : '#2563EB', fontWeight: 700
                        }}>
                          {msg.role === 'user' ? 'U' : '🛡️'}
                        </div>
                        <div style={{
                          maxWidth: '80%',
                          background: msg.role === 'user' ? '#2563EB' : 'rgba(255,255,255,0.05)',
                          borderRadius: msg.role === 'user' ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
                          padding: '10px 14px', color: '#F8F9FA', fontSize: '0.85rem', lineHeight: 1.6
                        }}>
                          <ReactMarkdown>{msg.content}</ReactMarkdown>
                        </div>
                      </div>
                    ))}
                    {chatLoading && (
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(37,99,235,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem' }}>🛡️</div>
                        <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '4px 16px 16px 16px', padding: '12px 16px' }}>
                          <div style={{ display: 'flex', gap: 4 }}>
                            {[0, 1, 2].map(n => (
                              <div key={n} style={{ width: 6, height: 6, borderRadius: '50%', background: '#6B7280', animation: `bounce 1.2s ease-in-out ${n * 0.2}s infinite` }} />
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div style={{ padding: '12px 16px', borderTop: '1px solid #2A2D3A', background: '#0F1117' }}>
                    <form onSubmit={handleChatSend} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <input
                        value={chatInput}
                        onChange={e => setChatInput(e.target.value)}
                        placeholder="Ask about your policy..."
                        disabled={chatLoading}
                        style={{
                          flex: 1, background: '#1A1D27', border: '1px solid #2A2D3A',
                          borderRadius: 8, padding: '9px 14px', color: '#F8F9FA',
                          fontSize: '16px', fontFamily: 'inherit'
                        }}
                      />
                      <button
                        type="submit"
                        disabled={chatLoading || !chatInput.trim()}
                        style={{
                          width: 38, height: 38, borderRadius: 8,
                          background: chatLoading || !chatInput.trim() ? 'rgba(37,99,235,0.3)' : '#2563EB',
                          border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          cursor: chatLoading || !chatInput.trim() ? 'not-allowed' : 'pointer', flexShrink: 0
                        }}
                      >
                        <Send size={16} color="#fff" />
                      </button>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes bounce { 0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; } 40% { transform: scale(1); opacity: 1; } }
        @media (max-width: 768px) {
          div[style*="clamp(200px, 25%"] { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}

export default Insurance
