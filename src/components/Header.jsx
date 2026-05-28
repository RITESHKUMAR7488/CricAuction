import React, { useState } from 'react'
import { useApp } from '../context/AppContext'
import { supabase } from '../lib/supabase'

export default function Header({ onMenuToggle }) {
  const { leagueName, activeAuction } = useApp()

  return (
    <header className="header">
      <div className="header-logo">
        <div className="header-logo-icon" style={{ display: 'flex', alignItems: 'center' }}>
          <img src="/cricauction-logo.jpeg" alt="Logo" style={{ width: 28, height: 28, borderRadius: 6, objectFit: 'cover' }} />
        </div>
        <div className="header-logo-text">
          <span className="elite">{leagueName.split(' ')[0] || 'ELITE'}</span>
          <span className="league">{leagueName.split(' ').slice(1).join(' ') || 'LEAGUE'}</span>
        </div>
      </div>

      {activeAuction && (
        <div className="header-live-badge">
          <div className="header-live-dot" />
          LIVE AUCTION
        </div>
      )}

      <div className="header-actions">
        <button className="header-icon-btn" onClick={onMenuToggle} id="menu-btn" title="Menu">
          ☰
        </button>
      </div>
    </header>
  )
}
