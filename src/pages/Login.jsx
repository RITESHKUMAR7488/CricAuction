import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { showToast } from '../components/Toast'

export default function Login() {
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [step, setStep] = useState('email') // 'email' | 'otp'
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  async function requestOtp(e) {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.auth.signInWithOtp({
      email: email,
    })
    setLoading(false)
    if (error) {
      showToast(error.message, 'error')
    } else {
      setStep('otp')
      showToast('OTP sent to your email!', 'success')
    }
  }

  async function verifyOtp(e) {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.auth.verifyOtp({
      email: email,
      token: otp,
      type: 'email'
    })
    setLoading(false)
    if (error) {
      showToast(error.message, 'error')
    } else {
      showToast('Logged in successfully!', 'success')
      navigate('/dashboard')
    }
  }

  return (
    <div className="login-container" style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', 
      minHeight: '100vh', padding: 24, background: 'var(--bg-main)'
    }}>
      <div style={{
        background: 'var(--bg-card)', padding: 40, borderRadius: 16, border: '1px solid var(--border)',
        width: '100%', maxWidth: 400, textAlign: 'center'
      }}>
        <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'center' }}>
          <img src="/cricauction-logo.jpeg" alt="CricAuction Powered by BRICX" style={{ width: 180, height: 'auto', borderRadius: '16px', boxShadow: '0 8px 24px rgba(0,0,0,0.3)' }} />
        </div>
        <h1 style={{ fontFamily: 'Rajdhani', fontSize: 32, marginBottom: 8, color: 'var(--text-main)' }}>
          ELITE LEAGUE
        </h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 32 }}>
          {step === 'email' ? 'Sign in to access your auctions' : 'Enter the OTP sent to your email'}
        </p>

        {step === 'email' ? (
          <form onSubmit={requestOtp} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <input 
              type="email" 
              placeholder="Email Address (e.g., you@example.com)" 
              value={email} 
              onChange={e => setEmail(e.target.value)}
              required
              className="input-field"
              style={{ width: '100%', padding: '12px 16px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-main)', color: 'var(--text-main)', fontSize: 16 }}
            />
            <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%', padding: 14 }}>
              {loading ? 'Sending...' : 'Send OTP'}
            </button>
          </form>
        ) : (
          <form onSubmit={verifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <input 
              type="text" 
              placeholder="6-digit OTP" 
              value={otp} 
              onChange={e => setOtp(e.target.value)}
              required
              className="input-field"
              style={{ width: '100%', padding: '12px 16px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-main)', color: 'var(--text-main)', fontSize: 16, letterSpacing: 2, textAlign: 'center' }}
            />
            <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%', padding: 14 }}>
              {loading ? 'Verifying...' : 'Verify & Login'}
            </button>
            <button type="button" onClick={() => setStep('email')} style={{ background: 'none', border: 'none', color: 'var(--blue)', cursor: 'pointer', marginTop: 8, fontSize: 14 }}>
              Change Email Address
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
