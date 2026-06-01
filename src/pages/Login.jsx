import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { showToast } from '../components/Toast'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  async function handleAuth(e) {
    e.preventDefault()
    if (!email.trim() || !password.trim()) {
      return showToast('Please enter both email and password', 'error')
    }

    setLoading(true)

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        if (data.session === null && data.user?.identities?.length > 0) {
          showToast('Account created! Please check your email to confirm.', 'info')
          setIsSignUp(false)
        } else {
          showToast('Account created successfully!', 'success')
          navigate('/dashboard')
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        showToast('Logged in successfully!', 'success')
        navigate('/dashboard')
      }
    } catch (error) {
      showToast(error.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page" style={{ background: '#000000' }}>
      <div className="login-card" style={{ background: '#0a0a0c', borderColor: 'rgba(255,255,255,0.08)' }}>
        {/* Logo */}
        <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'center' }}>
          <img
            src="/cricauction-logo.jpeg"
            alt="CricAuction Powered by BRICX"
            style={{ width: 140, height: 'auto', borderRadius: 14, boxShadow: '0 8px 28px rgba(0,0,0,0.6)' }}
          />
        </div>

        <h1 style={{ fontFamily: 'Rajdhani', fontSize: 28, fontWeight: 800, marginBottom: 6, color: '#ffffff', letterSpacing: 1 }}>
          ELITE LEAGUE
        </h1>
        <p style={{ color: '#8892a4', marginBottom: 28, fontSize: 13, lineHeight: 1.5 }}>
          {isSignUp ? 'Create a new account to get started' : 'Sign in to access your auctions'}
        </p>

        <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <input
            type="email"
            placeholder="Email Address"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            className="form-input"
            style={{ textAlign: 'left', background: '#121216', borderColor: 'rgba(255,255,255,0.1)', color: '#ffffff' }}
            autoComplete="email"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            className="form-input"
            style={{ textAlign: 'left', background: '#121216', borderColor: 'rgba(255,255,255,0.1)', color: '#ffffff' }}
            autoComplete={isSignUp ? 'new-password' : 'current-password'}
          />
          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary btn-full"
            style={{ padding: '13px 0', marginTop: 4, background: 'var(--blue)', color: '#ffffff', fontWeight: 700 }}
          >
            {loading ? 'Please wait...' : (isSignUp ? 'Create Account' : 'Sign In')}
          </button>
        </form>

        <div style={{ marginTop: 20, borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 20 }}>
          <button
            type="button"
            onClick={() => setIsSignUp(!isSignUp)}
            style={{ background: 'none', border: 'none', color: 'var(--blue)', cursor: 'pointer', fontSize: 13, fontWeight: 600, width: '100%' }}
          >
            {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
          </button>
        </div>

        {/* Powered by */}
        <div style={{ marginTop: 24, opacity: 0.45, fontSize: 10, letterSpacing: 1, color: '#4a5568', textTransform: 'uppercase' }}>
          Powered by BricX
        </div>
      </div>
    </div>
  )
}
