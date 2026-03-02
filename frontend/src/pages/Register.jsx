import React, { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';
import { registerUser, verifyOTP, resendOTP } from '../services/api';
import { Eye, EyeOff, CheckCircle } from 'lucide-react';

const Register = () => {
    const [step, setStep] = useState('register'); // register | otp | success
    const [email, setEmail] = useState('');
    const [fullName, setFullName] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPw, setConfirmPw] = useState('');
    const [showPw, setShowPw] = useState(false);
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [loading, setLoading] = useState(false);
    const [countdown, setCountdown] = useState(0);
    const otpRefs = useRef([]);
    const navigate = useNavigate();

    const startCountdown = () => {
        setCountdown(60);
        const t = setInterval(() => {
            setCountdown(c => {
                if (c <= 1) { clearInterval(t); return 0; }
                return c - 1;
            });
        }, 1000);
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        if (password !== confirmPw) { toast.error('Passwords do not match'); return; }
        if (password.length < 8) { toast.error('Password must be at least 8 characters'); return; }
        setLoading(true);
        try {
            await registerUser(email, password, fullName);
            toast.success('Account created! Check your email for OTP.');
            setStep('otp');
            startCountdown();
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Registration failed');
        } finally {
            setLoading(false);
        }
    };

    const handleOtpChange = (val, idx) => {
        const next = [...otp];
        next[idx] = val.slice(-1);
        setOtp(next);
        if (val && idx < 5) otpRefs.current[idx + 1]?.focus();
    };

    const handleOtpKeyDown = (e, idx) => {
        if (e.key === 'Backspace' && !otp[idx] && idx > 0) otpRefs.current[idx - 1]?.focus();
    };

    const handleVerify = async () => {
        const code = otp.join('');
        if (code.length < 6) { toast.error('Enter all 6 digits'); return; }
        setLoading(true);
        try {
            const res = await verifyOTP(email, code);
            localStorage.setItem('access_token', res.data.access_token);
            localStorage.setItem('refresh_token', res.data.refresh_token);
            toast.success('Email verified successfully!');
            navigate('/dashboard');
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Invalid or expired OTP');
        } finally {
            setLoading(false);
        }
    };

    const handleResend = async () => {
        if (countdown > 0) return;
        try {
            await resendOTP(email);
            toast.success('OTP resent!');
            startCountdown();
        } catch (err) {
            toast.error('Failed to resend OTP');
        }
    };

    return (
        <div style={{ minHeight: '100vh', background: '#0F1117', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
            <Toaster position="top-center" toastOptions={{ className: 'toast-dark' }} />

            <div style={{ width: '100%', maxWidth: 400 }}>
                {/* Logo */}
                <div style={{ textAlign: 'center', marginBottom: 32 }}>
                    <div style={{ width: 52, height: 52, background: '#2563EB', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', fontSize: 26, fontWeight: 800, color: '#fff' }}>H</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>Healthora</div>
                </div>

                <div className="card" style={{ padding: 32 }}>
                    {step === 'register' && (
                        <>
                            <h2 style={{ textAlign: 'center', marginBottom: 6 }}>Create account</h2>
                            <p style={{ textAlign: 'center', marginBottom: 28, fontSize: '0.875rem' }}>Free forever • No credit card needed</p>

                            <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                                <div className="form-group">
                                    <label className="form-label">Full Name</label>
                                    <input className="form-input" type="text" placeholder="John Doe" value={fullName} onChange={e => setFullName(e.target.value)} required />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Email address</label>
                                    <input className="form-input" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Password</label>
                                    <div style={{ position: 'relative' }}>
                                        <input className="form-input" type={showPw ? 'text' : 'password'} placeholder="Min 8 characters" value={password} onChange={e => setPassword(e.target.value)} required style={{ paddingRight: 44 }} />
                                        <button type="button" onClick={() => setShowPw(v => !v)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer' }}>
                                            {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Confirm Password</label>
                                    <input className="form-input" type="password" placeholder="Re-enter password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} required />
                                </div>

                                <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '12px', marginTop: 4 }} disabled={loading}>
                                    {loading ? 'Creating account…' : 'Create Account'}
                                </button>
                            </form>

                            <p style={{ textAlign: 'center', marginTop: 20, fontSize: '0.85rem', color: '#9CA3AF' }}>
                                Already have an account?{' '}
                                <Link to="/login" style={{ color: '#2563EB', fontWeight: 600 }}>Sign in</Link>
                            </p>
                        </>
                    )}

                    {step === 'otp' && (
                        <>
                            <h2 style={{ textAlign: 'center', marginBottom: 8 }}>Verify Email</h2>
                            <p style={{ textAlign: 'center', marginBottom: 28, fontSize: '0.875rem' }}>
                                We sent a 6-digit code to <strong style={{ color: '#F8F9FA' }}>{email}</strong>
                            </p>

                            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginBottom: 28 }}>
                                {otp.map((d, i) => (
                                    <input
                                        key={i}
                                        ref={el => otpRefs.current[i] = el}
                                        type="text"
                                        inputMode="numeric"
                                        maxLength={1}
                                        value={d}
                                        onChange={e => handleOtpChange(e.target.value, i)}
                                        onKeyDown={e => handleOtpKeyDown(e, i)}
                                        style={{
                                            width: 46, height: 56, textAlign: 'center', fontSize: '1.4rem', fontWeight: 700,
                                            background: '#21253A', border: `2px solid ${d ? '#2563EB' : '#2A2D3A'}`,
                                            borderRadius: 10, color: '#F8F9FA', outline: 'none'
                                        }}
                                    />
                                ))}
                            </div>

                            <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '12px' }} onClick={handleVerify} disabled={loading}>
                                {loading ? 'Verifying…' : 'Verify Email'}
                            </button>

                            <div style={{ textAlign: 'center', marginTop: 16, fontSize: '0.85rem' }}>
                                <button
                                    onClick={handleResend}
                                    disabled={countdown > 0}
                                    style={{ background: 'none', border: 'none', color: countdown > 0 ? '#6B7280' : '#2563EB', cursor: countdown > 0 ? 'not-allowed' : 'pointer', fontWeight: 600 }}
                                >
                                    {countdown > 0 ? `Resend OTP in ${countdown}s` : 'Resend OTP'}
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Register;
