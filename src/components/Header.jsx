import React from 'react'
import { useApp } from '../context/AppContext'

export default function Header({ onMenuToggle }) {
  const { leagueName, leagueLogo, activeAuction } = useApp()

  return (
    <header className="header">
      <div className="header-logo">
        <div className="header-logo-icon">
          <img src={leagueLogo} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
        <div className="header-logo-text">
          <span className="elite" style={{ color: '#fff' }}>{leagueName.split(' ')[0] || 'ELITE'}</span>
          <span className="league" style={{ color: '#fff' }}>{leagueName.split(' ').slice(1).join(' ') || 'LEAGUE'}</span>
        </div>
      </div>

      {activeAuction && (
        <div className="header-live-badge">
          <div className="header-live-dot" />
          LIVE AUCTION
        </div>
      )}

      <div className="header-actions">
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
