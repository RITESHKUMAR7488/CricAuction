import React, { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { Zap, Trophy, Target, BarChart2, Shield, Users2 } from 'lucide-react'

export default function Landing() {
  const navigate = useNavigate()
  const { user } = useApp()
  const canvasRef = useRef(null)

  // Animated particle system
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let animId
    let w = canvas.width = window.innerWidth
    let h = canvas.height = window.innerHeight

    const particles = Array.from({ length: 60 }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: Math.random() * 1.5 + 0.3,
      dx: (Math.random() - 0.5) * 0.3,
      dy: (Math.random() - 0.5) * 0.3,
      opacity: Math.random() * 0.6 + 0.1,
    }))

    function draw() {
      ctx.clearRect(0, 0, w, h)
      particles.forEach(p => {
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(245, 166, 35, ${p.opacity})`
        ctx.fill()
        p.x += p.dx
        p.y += p.dy
        if (p.x < 0 || p.x > w) p.dx *= -1
        if (p.y < 0 || p.y > h) p.dy *= -1
      })
      animId = requestAnimationFrame(draw)
    }
    draw()

    const onResize = () => {
      w = canvas.width = window.innerWidth
      h = canvas.height = window.innerHeight
    }
    window.addEventListener('resize', onResize)
    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', onResize)
    }
  }, [])

  return (
    <div className="lp-root">
      {/* Canvas particle system */}
      <canvas ref={canvasRef} className="lp-canvas" />

      {/* Background layers */}
      <div className="lp-bg-mesh" />
      <div className="lp-orb lp-orb-1" />
      <div className="lp-orb lp-orb-2" />
      <div className="lp-orb lp-orb-3" />

      {/* Top nav */}
      <nav className="lp-nav">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src="/cricauction-logo.jpeg" alt="CricAuction" className="lp-nav-logo" />
          <span style={{ fontFamily: 'Rajdhani, sans-serif', fontWeight: 800, fontSize: 20, color: '#ffffff', letterSpacing: 1.5 }}>CricAuction</span>
        </div>
        {!user && (
          <button className="lp-nav-signin" onClick={() => navigate('/login')}>
            Sign In
          </button>
        )}
      </nav>

      {/* === HERO === */}
      <main className="lp-hero">

        {/* Left column: content */}
        <div className="lp-left">
          <div className="lp-pill" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Zap size={12} /> LIVE AUCTION PLATFORM</div>

          <h1 className="lp-h1">
            The Ultimate<br />
            <span className="lp-h1-gold">Cricket Auction</span><br />
            Experience
          </h1>

          <p className="lp-desc">
            Bid. Build. Dominate. CricAuction brings your fantasy league to life with real-time bidding, automated purse tracking, and professional-grade team management.
          </p>

          <div className="lp-cta-row" style={!user ? { flexDirection: 'column', gap: 16, alignItems: 'flex-start' } : {}}>
            {user ? (
              <button
                className="lp-btn-primary"
                onClick={() => navigate('/auction')}
              >
                Open Arena
                <span className="lp-btn-arrow">→</span>
              </button>
            ) : (
              <>
                <button
                  className="lp-btn-primary"
                  onClick={() => navigate('/login')}
                  style={{ width: '100%', maxWidth: 280, justifyContent: 'center' }}
                >
                  Log In
                </button>
                <button
                  className="lp-btn-ghost"
                  onClick={() => navigate('/login?signup=true')}
                  style={{ width: '100%', maxWidth: 280, justifyContent: 'center' }}
                >
                  Sign Up
                </button>
              </>
            )}
          </div>

          {/* Mini stats */}
          <div className="lp-mini-stats">
            <div className="lp-mini-stat">
              <span className="lp-mini-val">LIVE</span>
              <span className="lp-mini-label">Real-Time Bids</span>
            </div>
            <div className="lp-mini-sep" />
            <div className="lp-mini-stat">
              <span className="lp-mini-val">₹∞</span>
              <span className="lp-mini-label">Purse Tracking</span>
            </div>
            <div className="lp-mini-sep" />
            <div className="lp-mini-stat">
              <span className="lp-mini-val">PRO</span>
              <span className="lp-mini-label">Analytics Suite</span>
            </div>
          </div>
        </div>

        {/* Right column: logo + floating cards */}
        <div className="lp-right">
          {/* Giant logo glow backdrop */}
          <div className="lp-logo-glow" />
          <img
            src="/cricauction-logo.jpeg"
            alt="CricAuction Logo"
            className="lp-logo-hero"
          />

          {/* Floating cards around the logo */}
          <div className="lp-fc lp-fc-top-left">
            <div className="lp-fc-label">
              <span className="lp-live-dot" /> Live Auction
            </div>
            <div className="lp-fc-big lp-gold">₹18.5 Cr</div>
            <div className="lp-fc-sub">Highest Bid — Virat Kohli</div>
          </div>

          <div className="lp-fc lp-fc-top-right">
            <div className="lp-fc-label">Team Purse</div>
            <div className="lp-fc-big lp-blue">₹42.1 Cr</div>
            <div className="lp-fc-sub">Mumbai Royals • 14/20 players</div>
          </div>

          <div className="lp-fc lp-fc-bottom">
            <div className="lp-fc-row">
              <div className="lp-fc-avatar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Trophy size={20} color="var(--gold)" /></div>
              <div>
                <div className="lp-fc-name">Auction Progress</div>
                <div className="lp-fc-sub">Player 47 of 150</div>
              </div>
              <div style={{ marginLeft: 'auto' }}>
                <div className="lp-fc-big" style={{ fontSize: 18 }}>
                  <span style={{ color: 'var(--green)' }}>●</span> Active
                </div>
              </div>
            </div>
            <div className="lp-progress-bar">
              <div className="lp-progress-fill" style={{ width: '31%' }} />
            </div>
          </div>
        </div>
      </main>

      {/* Feature strip */}
      <div className="lp-features">
        <div className="lp-feature">
          <div className="lp-feature-icon" style={{ display: 'flex', justifyContent: 'center' }}><Target size={28} color="var(--gold)" /></div>
          <div className="lp-feature-title">Smart Bidding</div>
          <div className="lp-feature-desc">Real-time bid management with auto purse deduction</div>
        </div>
        <div className="lp-feature-divider" />
        <div className="lp-feature">
          <div className="lp-feature-icon" style={{ display: 'flex', justifyContent: 'center' }}><BarChart2 size={28} color="var(--blue)" /></div>
          <div className="lp-feature-title">Deep Analytics</div>
          <div className="lp-feature-desc">Player stats, rankings & performance dashboards</div>
        </div>
        <div className="lp-feature-divider" />
        <div className="lp-feature">
          <div className="lp-feature-icon" style={{ display: 'flex', justifyContent: 'center' }}><Shield size={28} color="var(--green)" /></div>
          <div className="lp-feature-title">Team Builder</div>
          <div className="lp-feature-desc">Manage squads, caps and player roles visually</div>
        </div>
        <div className="lp-feature-divider" />
        <div className="lp-feature">
          <div className="lp-feature-icon" style={{ display: 'flex', justifyContent: 'center' }}><Users2 size={28} color="#9b59b6" /></div>
          <div className="lp-feature-title">Multiplayer</div>
          <div className="lp-feature-desc">Invite team owners with unique join codes</div>
        </div>
      </div>

      {/* Footer */}
      <footer className="lp-footer">
        <img src="/cricauction-logo.jpeg" alt="CricAuction" className="lp-footer-logo" />
        <span className="lp-footer-text" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          © {new Date().getFullYear()} CricAuction · Powered by <img src="/bricx-logo.png" alt="BricX" style={{ height: 40, width: 'auto' }} />
        </span>
        <button
          onClick={() => navigate('/about-founder')}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-secondary)',
            fontSize: 13,
            cursor: 'pointer',
            marginTop: 8,
            textDecoration: 'underline',
            textUnderlineOffset: 3,
          }}
        >
          About the Founder
        </button>
      </footer>
    </div>
  )
}
