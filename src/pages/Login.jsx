import React, { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { showToast } from '../components/Toast'

// Helper: convert phone number to a deterministic email for Supabase auth
function phoneToEmail(phone) {
  // Strip non-digits
  const digits = phone.replace(/\D/g, '')
  return `${digits}@cricauction.app`
}

export default function Login() {
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [mobile, setMobile] = useState('')
  const [gender, setGender] = useState('Male')
  const [picture, setPicture] = useState(null)
  const [picturePreview, setPicturePreview] = useState(null)
  const [isSignUp, setIsSignUp] = useState(() => window.location.search.includes('signup=true'))
  const [loading, setLoading] = useState(false)
  const fileInputRef = useRef(null)

  const navigate = useNavigate()

  async function handleAuth(e) {
    e.preventDefault()

    if (isSignUp) {
      if (!name.trim() || !mobile.trim() || !password.trim()) {
        return showToast('Please fill in all required fields', 'error')
      }
      if (password.length < 6) {
        return showToast('Password must be at least 6 characters', 'error')
      }
    } else {
      if (!phone.trim() || !password.trim()) {
        return showToast('Please enter your phone number and password', 'error')
      }
    }

    setLoading(true)

    try {
      if (isSignUp) {
        let avatar_url = null
        if (picture) {
          const fileExt = picture.name.split('.').pop()
          const fileName = `temp-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
          const { error: uploadError } = await supabase.storage
            .from('cricket-auction')
            .upload(`avatars/${fileName}`, picture)
          
          if (uploadError) throw uploadError
          
          const { data: { publicUrl } } = supabase.storage
            .from('cricket-auction')
            .getPublicUrl(`avatars/${fileName}`)
            
          avatar_url = publicUrl
        }

        const signupEmail = phoneToEmail(mobile)

        const { data, error } = await supabase.auth.signUp({
          email: signupEmail,
          password,
          options: {
            data: {
              full_name: name,
              phone: mobile,
              gender,
              avatar_url: avatar_url
            }
          }
        })
        if (error) throw error
        if (data.session === null && data.user?.identities?.length > 0) {
          showToast('Account created! Please check your email to confirm.', 'info')
          setIsSignUp(false)
        } else {
          showToast('Account created successfully!', 'success')
          navigate('/dashboard' + window.location.search)
        }
      } else {
        // Sign in with phone → convert to email
        const signinEmail = phoneToEmail(phone)
        const { error } = await supabase.auth.signInWithPassword({ email: signinEmail, password })
        if (error) throw error
        showToast('Logged in successfully!', 'success')
        navigate('/dashboard' + window.location.search)
      }
    } catch (error) {
      showToast(error.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  const onFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0]
      setPicture(file)
      setPicturePreview(URL.createObjectURL(file))
    }
  }

  return (
    <div className="login-page" style={{ background: '#000000', position: 'relative' }}>
      <button 
        onClick={() => navigate('/')} 
        style={{ position: 'absolute', top: 20, left: 20, background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', padding: '8px 16px', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, zIndex: 10 }}
      >
        <span>←</span> Back
      </button>
      <div className="login-card" style={{ background: '#0a0a0c', borderColor: 'rgba(255,255,255,0.08)' }}>
        {/* Logo */}
        <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'center', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <img
            src="/cricauction-logo.jpeg"
            alt="CricAuction"
            style={{ width: 80, height: 'auto', borderRadius: 14, boxShadow: '0 8px 28px rgba(0,0,0,0.6)' }}
          />
          <span style={{ fontFamily: 'Rajdhani, sans-serif', fontWeight: 800, fontSize: 22, color: '#ffffff', letterSpacing: 1.5 }}>CricAuction</span>
        </div>
        <p style={{ color: '#8892a4', marginBottom: 28, fontSize: 13, lineHeight: 1.5 }}>
          {isSignUp ? 'Create a new account to get started' : 'Sign in with your phone number'}
        </p>

        <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {isSignUp && (
            <>
              {/* Circular Picture Upload */}
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
                <div 
                  onClick={() => fileInputRef.current && fileInputRef.current.click()}
                  style={{
                    width: 90, height: 90, borderRadius: '50%', background: '#121216',
                    border: '2px dashed rgba(255,255,255,0.2)', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                    overflow: 'hidden', position: 'relative'
                  }}
                >
                  {picturePreview ? (
                    <img src={picturePreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <span style={{ fontSize: 32, color: 'rgba(255,255,255,0.4)' }}>+</span>
                  )}
                </div>
                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  onChange={onFileChange}
                  style={{ display: 'none' }}
                />
              </div>

              <input
                type="text"
                placeholder="Full Name *"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                className="form-input"
                style={{ textAlign: 'left', background: '#121216', borderColor: 'rgba(255,255,255,0.1)', color: '#ffffff' }}
              />
              <input
                type="tel"
                placeholder="Mobile Number *"
                value={mobile}
                onChange={e => setMobile(e.target.value)}
                required
                className="form-input"
                style={{ textAlign: 'left', background: '#121216', borderColor: 'rgba(255,255,255,0.1)', color: '#ffffff' }}
              />

              {/* Gender Selection */}
              <div style={{ display: 'flex', gap: 10 }}>
                {['Male', 'Female'].map(g => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setGender(g)}
                    style={{
                      flex: 1, padding: '10px 0', borderRadius: 8, cursor: 'pointer',
                      background: gender === g ? 'var(--blue)' : '#121216',
                      border: `1px solid ${gender === g ? 'var(--blue)' : 'rgba(255,255,255,0.1)'}`,
                      color: gender === g ? '#fff' : '#8892a4',
                      fontWeight: 700, fontSize: 13, transition: 'all 0.2s',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
                    }}
                  >
                    {g === 'Male' ? '♂' : '♀'} {g}
                  </button>
                ))}
              </div>
            </>
          )}

          {/* Phone field for sign-in, or shown as readonly info in sign-up (mobile is already the key) */}
          {!isSignUp && (
            <input
              type="tel"
              placeholder="Phone Number"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              required
              className="form-input"
              style={{ textAlign: 'left', background: '#121216', borderColor: 'rgba(255,255,255,0.1)', color: '#ffffff' }}
              autoComplete="tel"
            />
          )}

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
            onClick={() => { setIsSignUp(!isSignUp); setPhone(''); setPassword('') }}
            style={{ background: 'none', border: 'none', color: 'var(--blue)', cursor: 'pointer', fontSize: 13, fontWeight: 600, width: '100%' }}
          >
            {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
          </button>
        </div>

        {/* Powered by */}
        <div style={{ marginTop: 24, opacity: 0.9, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10, fontSize: 10, letterSpacing: 1, color: '#4a5568', textTransform: 'uppercase' }}>
          Powered by <img src="/bricx-logo.png" alt="BricX" style={{ height: 44, width: 'auto' }} />
        </div>
      </div>
    </div>
  )
}
