import React, { useState, useEffect } from 'react'
import { useApp } from '../context/AppContext'
import ProfileMenu from './ProfileMenu'

export default function Header({ onMenuToggle }) {
  const { leagueName, leagueLogo, activeAuction } = useApp()
  const [isFullscreen, setIsFullscreen] = useState(false)

  const currentLogo = activeAuction?.logo_url || leagueLogo
  const currentName = activeAuction?.name || leagueName

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable full-screen mode: ${err.message}`)
      })
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen()
      }
    }
  }

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

      {activeAuction && (
        <div className="header-live-badge">
          <div className="header-live-dot" />
          LIVE AUCTION
        </div>
      )}

      <div className="header-actions" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <ProfileMenu buttonStyle={{ marginRight: 8 }} />
        <button className="header-icon-btn" onClick={toggleFullScreen} title="Toggle Fullscreen" style={{ fontSize: 16, color: '#fff' }}>
          {isFullscreen ? '↙️' : '↗️'}
        </button>
        <button className="header-icon-btn" onClick={onMenuToggle} id="menu-btn" title="Menu" style={{ fontSize: 16, color: '#fff' }}>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <rect x="2" y="4" width="14" height="1.8" rx="0.9" fill="#fff"/>
            <rect x="2" y="8.1" width="14" height="1.8" rx="0.9" fill="#fff"/>
            <rect x="2" y="12.2" width="10" height="1.8" rx="0.9" fill="#fff"/>
          </svg>
        </button>
      </div>
    </header>
  )
}
