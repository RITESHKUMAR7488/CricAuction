import React, { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { showToast } from '../components/Toast'
import Cropper from 'react-easy-crop'
import getCroppedImg from '../lib/cropImage'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [mobile, setMobile] = useState('')
  const [picture, setPicture] = useState(null)
  const [isSignUp, setIsSignUp] = useState(false)
  const [loading, setLoading] = useState(false)
  
  // Cropping states
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null)
  const [imageSrc, setImageSrc] = useState(null)
  const [showCropModal, setShowCropModal] = useState(false)
  const [croppedPreviewUrl, setCroppedPreviewUrl] = useState(null)
  const fileInputRef = useRef(null)

  const navigate = useNavigate()

  async function handleAuth(e) {
    e.preventDefault()
    if (!email.trim() || !password.trim()) {
      return showToast('Please enter both email and password', 'error')
    }
    if (isSignUp && (!name.trim() || !mobile.trim() || !picture)) {
      return showToast('Please enter all mandatory fields (Name, Mobile, and Profile Picture)', 'error')
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

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: name,
              phone: mobile,
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

  const onFileChange = async (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0]
      const reader = new FileReader()
      reader.addEventListener('load', () => {
        setImageSrc(reader.result)
        setShowCropModal(true)
      })
      reader.readAsDataURL(file)
    }
  }

  const onCropComplete = (croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels)
  }

  const generateCroppedImage = async () => {
    try {
      const croppedImageBlob = await getCroppedImg(imageSrc, croppedAreaPixels)
      setPicture(new File([croppedImageBlob], 'profile.jpg', { type: 'image/jpeg' }))
      setCroppedPreviewUrl(URL.createObjectURL(croppedImageBlob))
      setShowCropModal(false)
    } catch (e) {
      console.error(e)
      showToast('Failed to crop image', 'error')
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
        <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'center' }}>
          <img
            src="/cricauction-logo.jpeg"
            alt="CricAuction"
            style={{ width: 140, height: 'auto', borderRadius: 14, boxShadow: '0 8px 28px rgba(0,0,0,0.6)' }}
          />
        </div>
        <p style={{ color: '#8892a4', marginBottom: 28, fontSize: 13, lineHeight: 1.5 }}>
          {isSignUp ? 'Create a new account to get started' : 'Sign in to access your auctions'}
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
                  {croppedPreviewUrl ? (
                    <img src={croppedPreviewUrl} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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
                placeholder="Full Name"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                className="form-input"
                style={{ textAlign: 'left', background: '#121216', borderColor: 'rgba(255,255,255,0.1)', color: '#ffffff' }}
              />
              <input
                type="tel"
                placeholder="Mobile Number"
                value={mobile}
                onChange={e => setMobile(e.target.value)}
                required
                className="form-input"
                style={{ textAlign: 'left', background: '#121216', borderColor: 'rgba(255,255,255,0.1)', color: '#ffffff' }}
              />
            </>
          )}
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
        <div style={{ marginTop: 24, opacity: 0.9, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10, fontSize: 10, letterSpacing: 1, color: '#4a5568', textTransform: 'uppercase' }}>
          Powered by <img src="/bricx-logo.png" alt="BricX" style={{ height: 44, width: 'auto' }} />
        </div>
      </div>

      {/* Crop Modal */}
      {showCropModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.9)', zIndex: 9999, display: 'flex',
          flexDirection: 'column'
        }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={1}
              cropShape="round"
              showGrid={false}
              onCropChange={setCrop}
              onCropComplete={onCropComplete}
              onZoomChange={setZoom}
            />
          </div>
          <div style={{ padding: 20, display: 'flex', justifyContent: 'center', gap: 20, background: '#121216' }}>
            <button type="button" onClick={() => setShowCropModal(false)} className="btn" style={{ background: '#333', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: 8, cursor: 'pointer' }}>Cancel</button>
            <button type="button" onClick={generateCroppedImage} className="btn btn-primary" style={{ padding: '10px 20px', cursor: 'pointer' }}>Save Crop</button>
          </div>
        </div>
      )}
    </div>
  )
}
