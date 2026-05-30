import React, { useState, useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { supabase } from '../lib/supabase'

// SVG icons matching the reference app design
const GavelIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M9 3L5 7l10 10 4-4L9 3z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M5 7L3 9l5 5 2-2L5 7z" fill="currentColor" opacity="0.4"/>
    <path d="M4 20h8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    <path d="M14 10l-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
  </svg>
)

const UsersIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
    <circle cx="9" cy="7" r="4"></circle>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
  </svg>
)

const TrophyIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"></path>
    <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"></path>
    <path d="M4 22h16"></path>
    <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"></path>
    <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"></path>
    <path d="M18 2H6v7c0 3.31 2.69 6 6 6s6-2.69 6-6V2z"></path>
  </svg>
)

const PersonIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
    <circle cx="12" cy="7" r="4"></circle>
  </svg>
)

const StarIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

const navItems = [
  { to: '/',         label: 'AUCTION',   Icon: GavelIcon,  exact: true },
  { to: '/teams',    label: 'TEAMS',     Icon: UsersIcon },
  { to: '/rankings', label: 'RANKINGS',  Icon: TrophyIcon },
  { to: '/players',  label: 'PLAYERS',   Icon: PersonIcon },
  { to: '/sponsors', label: 'SPONSORS',  Icon: StarIcon },
]

export default function Navbar() {
  const { leagueName, activeAuction } = useApp()
  const [sponsors, setSponsors] = useState([])

  useEffect(() => {
    supabase.from('sponsors').select('*').then(({ data }) => setSponsors(data || []))
  }, [])

  const titleSponsor = sponsors.find(s => s.category === 'Title Sponsor')
  const coSponsor = sponsors.find(s => s.category === 'Co-Sponsor')

  return (
    <>
      <div className="sponsor-strip" style={{
        position: 'fixed',
        bottom: '95px',
        left: '50%',
        transform: 'translateX(-50%)',
        width: 'calc(100% - 32px)',
        maxWidth: 'calc(480px - 32px)',
        height: '44px',
        background: 'rgba(18, 22, 33, 0.7)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '22px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        zIndex: 100,
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)'
      }}>
        {/* Left: BricX Logo */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'flex-start' }}>
           <div style={{ fontSize: 16, fontWeight: 900, fontFamily: 'Rajdhani', color: '#fff', letterSpacing: 1.5 }}>BricX</div>
        </div>

        {/* Center: Title Sponsor */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {titleSponsor?.logo_url ? (
            <img src={titleSponsor.logo_url} alt="Title Sponsor" style={{ maxHeight: 28, maxWidth: 80, objectFit: 'contain' }} />
          ) : titleSponsor ? (
             <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gold)', fontFamily: 'Rajdhani', letterSpacing: 0.5 }}>{titleSponsor.name.toUpperCase()}</div>
          ) : (
            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>No Title Sponsor</div>
          )}
        </div>

        {/* Right: Co Sponsor */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
          {coSponsor?.logo_url ? (
            <img src={coSponsor.logo_url} alt="Co-Sponsor" style={{ maxHeight: 24, maxWidth: 60, objectFit: 'contain' }} />
          ) : coSponsor ? (
             <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--blue)', fontFamily: 'Rajdhani', letterSpacing: 0.5 }}>{coSponsor.name.toUpperCase()}</div>
          ) : (
            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>No Co-Sponsor</div>
          )}
        </div>
      </div>

      <nav className="bottom-nav">
        {/* Sidebar logo — only visible on desktop */}
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon" style={{ display: 'flex', alignItems: 'center', overflow: 'hidden' }}>
            <img src="/cricauction-logo.jpeg" alt="Logo" style={{ width: 32, height: 32, borderRadius: 8, objectFit: 'cover' }} />
          </div>
          <div className="sidebar-logo-name" style={{ fontSize: 13 }}>{activeAuction ? activeAuction.name : (leagueName || 'ELITE LEAGUE')}</div>
        </div>

        {navItems.map(({ to, label, Icon, exact }) => (
          <NavLink
            key={to}
            to={to}
            end={exact}
            className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
            style={({ isActive }) => ({ color: isActive ? 'var(--blue)' : '#ffffff' })}
            id={`nav-${label.toLowerCase()}`}
          >
            {({ isActive }) => (
              <>
                <div className={isActive ? 'nav-icon-wrap' : ''}>
                  <span className="nav-icon">
                    <Icon size={20} />
                  </span>
                </div>
                <span style={{ color: isActive ? 'var(--blue)' : '#ffffff' }}>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </>
  )
}
