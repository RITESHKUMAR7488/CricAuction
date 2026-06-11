import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { supabase } from '../lib/supabase'
import { Bell, User } from 'lucide-react'

export default function Header({ onMenuToggle }) {
  const { leagueName, leagueLogo, activeAuction, user, userRole, joinedAuctionIds } = useApp()
  const navigate = useNavigate()
  const [unreadCount, setUnreadCount] = useState(0)
  const [avatarUrl, setAvatarUrl] = useState(null)

  const currentLogo = activeAuction?.logo_url || leagueLogo
  const currentName = activeAuction?.name || leagueName

  // Load unread notification count
  useEffect(() => {
    if (!user) return
    supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('read', false)
      .then(({ count }) => setUnreadCount(count || 0))
  }, [user])

  // Load avatar
  useEffect(() => {
    if (!user) return
    supabase.from('profiles').select('avatar_url').eq('id', user.id).single()
      .then(({ data }) => { if (data?.avatar_url) setAvatarUrl(data.avatar_url) })
  }, [user])

  return (
    <header className="header">
      <div className="header-logo" style={{ maxWidth: '60%' }}>
        <div className="header-logo-icon" style={{ width: 48, height: 48, borderRadius: 12 }}>
          <img src={currentLogo} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
        <div className="header-logo-text">
          <span className="elite" style={{ color: '#fff', fontSize: 20 }}>{currentName.split(' ')[0] || 'ELITE'}</span>
          <span className="league" style={{ color: '#fff', fontSize: 11 }}>{currentName.split(' ').slice(1).join(' ') || 'LEAGUE'}</span>
        </div>
      </div>

      {activeAuction && (userRole === 'host' || joinedAuctionIds.has(activeAuction.id)) && (
        <div className="header-live-badge">
          <div className="header-live-dot" />
          LIVE AUCTION
        </div>
      )}

      <div className="header-actions" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {/* Notification Bell */}
        <button
          id="header-notification-btn"
          onClick={() => navigate('/profile', { state: { tab: 'Notifications' } })}
          title="Notifications"
          style={{
            position: 'relative', background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.15)', borderRadius: '50%',
            width: 38, height: 38, cursor: 'pointer', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, transition: 'background 0.2s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
        >
          <Bell size={18} />
          {unreadCount > 0 && (
            <span style={{
              position: 'absolute', top: 2, right: 2,
              background: 'var(--red)', color: '#fff',
              borderRadius: '50%', width: 14, height: 14,
              fontSize: 8, fontWeight: 800,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '1.5px solid var(--bg-elevated)',
            }}>
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {/* Profile icon — opens SideMenu */}
        <button
          id="header-profile-btn"
          onClick={onMenuToggle}
          title="Profile & Menu"
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            padding: 0, display: 'flex', alignItems: 'center', flexShrink: 0,
          }}
        >
          <div style={{
            width: 38, height: 38, borderRadius: '50%', overflow: 'hidden',
            border: '2px solid var(--blue)', flexShrink: 0,
            boxShadow: '0 0 10px rgba(74,158,255,0.3)',
          }}>
            {avatarUrl
              ? <img src={avatarUrl} alt="me" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <div style={{ width: '100%', height: '100%', background: 'var(--bg-card)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><User size={18} color="var(--blue)" /></div>
            }
          </div>
        </button>
      </div>
    </header>
  )
}
