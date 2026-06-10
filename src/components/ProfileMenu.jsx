import React, { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { supabase, uploadFile } from '../lib/supabase'
import { showToast } from './Toast'
import { User, X, Pencil, LogOut, Camera, Phone, ExternalLink, ChevronRight, Trophy, Ticket, Video, Bell } from 'lucide-react'

export default function ProfileMenu({ buttonStyle }) {
  const { user, logout } = useApp()
  const navigate = useNavigate()

  const [profileOpen, setProfileOpen] = useState(false)
  const [profile, setProfile] = useState(null)
  const [editMode, setEditMode] = useState(false)
  const [editName, setEditName] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [photoFile, setPhotoFile] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [saving, setSaving] = useState(false)
  const fileRef = useRef()

  useEffect(() => {
    if (user) loadProfile()
  }, [user])

  async function loadProfile() {
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    if (data) {
      setProfile(data)
      setEditName(data.full_name || '')
      setEditPhone(data.phone || '')
      setPhotoPreview(data.avatar_url || null)
    }
  }

  async function handleSaveProfile() {
    if (!editName.trim()) return showToast('Name is required', 'error')
    setSaving(true)
    try {
      let avatar_url = profile?.avatar_url || null
      if (photoFile) avatar_url = await uploadFile(photoFile, 'avatars')
      await supabase.from('profiles').update({ full_name: editName.trim(), phone: editPhone.trim(), avatar_url }).eq('id', user.id)
      await loadProfile()
      setEditMode(false)
      setPhotoFile(null)
      showToast('Profile updated!', 'success')
    } catch (err) {
      showToast('Error: ' + err.message, 'error')
    }
    setSaving(false)
  }

  const displayName = profile?.full_name || user?.email?.split('@')[0] || 'Player'
  const avatarUrl = photoPreview || profile?.avatar_url

  return (
    <>
      <button
        onClick={() => setProfileOpen(true)}
        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: 8, ...buttonStyle }}
        title="My Profile"
      >
        <div style={{
          width: 36, height: 36, borderRadius: '50%', overflow: 'hidden',
          border: '2px solid var(--blue)', flexShrink: 0,
        }}>
          {avatarUrl
            ? <img src={avatarUrl} alt="me" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <div style={{ width: '100%', height: '100%', background: 'var(--bg-card)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><User size={18} color="var(--blue)" /></div>
          }
        </div>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--blue)', maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {displayName}
        </span>
      </button>

      {/* ── Profile Drawer ── */}
      {profileOpen && createPortal(
        <div className="menu-overlay" style={{ zIndex: 9999 }}>
          <div
            className="menu-backdrop"
            onClick={() => { setProfileOpen(false); setEditMode(false) }}
            style={{ zIndex: 1 }}
          />

          {/* ── Profile Drawer Panel ── */}
          <div className="menu-panel" style={{ zIndex: 3, padding: 0, width: 300, display: 'flex', flexDirection: 'column' }}>
        {/* Drawer Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '18px 16px 14px',
          borderBottom: '1px solid var(--border)',
        }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: 0.5, textTransform: 'uppercase' }}>My Profile</div>
          <button
            onClick={() => { setProfileOpen(false); setEditMode(false) }}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center' }}
          ><X size={18} /></button>
        </div>

        {/* Avatar + Name */}
        <div style={{ padding: '20px 16px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, borderBottom: '1px solid var(--border)' }}>
          <div style={{ position: 'relative' }}>
            <div style={{
              width: 76, height: 76, borderRadius: '50%', overflow: 'hidden',
              border: '2.5px solid var(--blue)', boxShadow: '0 0 16px rgba(74,158,255,0.25)',
            }}>
              {avatarUrl
                ? <img src={avatarUrl} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <div style={{ width: '100%', height: '100%', background: 'var(--bg-card)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><User size={32} color="var(--text-muted)" /></div>
              }
            </div>
            {editMode && (
              <>
                <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => {
                  const f = e.target.files[0]
                  if (f) { setPhotoFile(f); setPhotoPreview(URL.createObjectURL(f)) }
                }} />
                <button onClick={() => fileRef.current?.click()} style={{
                  position: 'absolute', bottom: 0, right: 0,
                  background: 'var(--blue)', border: 'none', borderRadius: '50%',
                  width: 24, height: 24, cursor: 'pointer', color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}><Camera size={12} /></button>
              </>
            )}
          </div>

          {editMode ? (
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <input className="form-input" value={editName} onChange={e => setEditName(e.target.value)} placeholder="Full Name" style={{ fontSize: 13 }} />
              <input className="form-input" value={editPhone} onChange={e => setEditPhone(e.target.value)} placeholder="Phone" type="tel" style={{ fontSize: 13 }} />
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="btn btn-ghost btn-sm" onClick={() => { setEditMode(false); setPhotoPreview(profile?.avatar_url || null); setPhotoFile(null) }} style={{ flex: 1 }}>Cancel</button>
                <button className="btn btn-primary btn-sm" onClick={handleSaveProfile} disabled={saving} style={{ flex: 1 }}>
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'Rajdhani', letterSpacing: 0.4 }}>{displayName}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{user?.email}</div>
              {profile?.phone && (
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                  <Phone size={10} /> {profile.phone}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        {!editMode && (
          <div style={{ padding: '8px 0' }}>
            <button
              onClick={() => setEditMode(true)}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-primary)', fontSize: 13, fontWeight: 500 }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-card)'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}
            >
              <Pencil size={15} color="var(--text-muted)" />
              <span style={{ flex: 1, textAlign: 'left' }}>Edit Profile</span>
            </button>

            {[
              { label: 'Profile & Stats', tab: 'Profile', icon: <User size={15} color="var(--text-muted)" /> },
              { label: 'My Tournaments', tab: 'My Tournaments', icon: <Trophy size={15} color="var(--text-muted)" /> },
              { label: 'Food Coupons', tab: 'Food Coupons', icon: <Ticket size={15} color="var(--text-muted)" /> },
              { label: 'My Library', tab: 'My Library', icon: <Video size={15} color="var(--text-muted)" /> },
              { label: 'Notifications', tab: 'Notifications', icon: <Bell size={15} color="var(--text-muted)" /> },
            ].map(item => (
              <button
                key={item.label}
                onClick={() => { setProfileOpen(false); navigate('/profile', { state: { tab: item.tab } }) }}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-primary)', fontSize: 13, fontWeight: 500 }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-card)'}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}
              >
                {item.icon}
                <span style={{ flex: 1, textAlign: 'left' }}>{item.label}</span>
                <ChevronRight size={13} color="var(--text-muted)" />
              </button>
            ))}

            <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />

            <button
              onClick={logout}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--red)', fontSize: 13, fontWeight: 500 }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(231,76,60,0.06)'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}
            >
              <LogOut size={15} />
              <span>Log Out</span>
            </button>
          </div>
        )}

        {/* Bricx footer */}
        <div style={{ marginTop: 'auto', padding: '16px', textAlign: 'center', borderTop: '1px solid var(--border)' }}>
          <img src="/bricx-logo.png" alt="BricX" style={{ width: 100, opacity: 0.7 }} />
        </div>
      </div>
    </div>
    , document.body)}
    </>
  )
}
