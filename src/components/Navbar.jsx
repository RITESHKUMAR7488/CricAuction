import React from 'react'
import { NavLink } from 'react-router-dom'
import { useApp } from '../context/AppContext'

const navItems = [
  { to: '/', label: 'AUCTION', icon: '⚡', exact: true },
  { to: '/teams', label: 'TEAMS', icon: '🛡️' },
  { to: '/rankings', label: 'RANKINGS', icon: '🏅' },
  { to: '/players', label: 'PLAYERS', icon: '👤' },
  { to: '/sponsors', label: 'SPONSORS', icon: '⭐' },
]

export default function Navbar() {
  const { leagueName } = useApp()

  return (
    <nav className="bottom-nav">
      {/* Sidebar logo — only visible on desktop */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">🏆</div>
        <div className="sidebar-logo-name">{leagueName || 'ELITE LEAGUE'}</div>
      </div>

      {navItems.map(item => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.exact}
          className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
          id={`nav-${item.label.toLowerCase()}`}
        >
          {({ isActive }) => (
            <>
              <div className={isActive ? 'nav-icon-wrap' : ''}>
                <span className="nav-icon">{item.icon}</span>
              </div>
              <span>{item.label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}
