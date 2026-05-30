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
        // Sign Up
        const { error } = await supabase.auth.signUp({
          email,
          password,
        })
        if (error) throw error
        showToast('Account created successfully!', 'success')
        navigate('/dashboard')
      } else {
        // Sign In
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
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
    <div className="login-container" style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', 
      minHeight: '100vh', flex: 1, width: '100%', padding: 24, background: 'var(--bg-primary)'
    }}>
      <div style={{
        background: 'var(--bg-card)', padding: 40, borderRadius: 16, border: '1px solid var(--border)',
        width: '100%', maxWidth: 400, textAlign: 'center'
      }}>
        <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'center' }}>
          <img src="/cricauction-logo.jpeg" alt="CricAuction Powered by BRICX" style={{ width: 180, height: 'auto', borderRadius: '16px', boxShadow: '0 8px 24px rgba(0,0,0,0.3)' }} />
        </div>
        <h1 style={{ fontFamily: 'Rajdhani', fontSize: 32, marginBottom: 8, color: 'var(--text-primary)' }}>
          ELITE LEAGUE
        </h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 32 }}>
          {isSignUp ? 'Create a new account' : 'Sign in to access your auctions'}
        </p>

        <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <input 
            type="email" 
            placeholder="Email Address" 
            value={email} 
            onChange={e => setEmail(e.target.value)}
            required
            className="input-field"
            style={{ width: '100%', padding: '12px 16px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: 16 }}
          />
          <input 
            type="password" 
            placeholder="Password" 
            value={password} 
            onChange={e => setPassword(e.target.value)}
            required
            className="input-field"
            style={{ width: '100%', padding: '12px 16px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: 16 }}
          />
          <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%', padding: 14, marginTop: 8 }}>
            {loading ? 'Processing...' : (isSignUp ? 'Sign Up' : 'Sign In')}
          </button>
        </form>

        <button 
          type="button" 
          onClick={() => setIsSignUp(!isSignUp)} 
          style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', marginTop: 24, fontSize: 14 }}
        >
          {isSignUp ? 'Already have an account? Sign In' : 'Need an account? Sign Up'}
        </button>
      </div>
    </div>
  )
}
