import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { showToast } from '../components/Toast'
import { supabase, uploadFile } from '../lib/supabase'
import { User, Plus, Ticket, Activity, Building2, X, Pencil, LogOut, Camera, Phone, ExternalLink, ChevronRight } from 'lucide-react'
import ProfileMenu from '../components/ProfileMenu'

export default function Dashboard() {
  const { user, logout, auctions, createAuction, joinAuction, switchAuction } = useApp()
  const navigate = useNavigate()

  const [showCreate, setShowCreate] = useState(false)
  const [newAuctionName, setNewAuctionName] = useState('')
  const [showJoin, setShowJoin] = useState(false)
  const [joinCode, setJoinCode] = useState('')
  const [loading, setLoading] = useState(false)

  // Profile data for welcome message
  const [profile, setProfile] = useState(null)

  const hostedAuctions = auctions.filter(a => a.host_id === user?.id)
  const joinedAuctions = auctions.filter(a => a.host_id !== user?.id)

  useEffect(() => {
    if (user) {
      supabase.from('profiles').select('*').eq('id', user.id).single().then(({ data }) => {
        if (data) setProfile(data)
      })
    }
  }, [user])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const joinParam = params.get('join')
    if (joinParam) {
      setJoinCode(joinParam.toUpperCase())
      setShowJoin(true)
      // Clean up the URL so it doesn't stay there if they refresh
      window.history.replaceState(null, '', window.location.pathname)
    }
  }, [])

  async function handleCreate(e) {
    e.preventDefault()
    setLoading(true)
    try {
      const auction = await createAuction(newAuctionName)
      showToast(`Auction created! Invite code: ${auction.join_code}`, 'success')
      navigate('/')
    } catch (err) {
      showToast(err.message, 'error')
    }
    setLoading(false)
  }

  async function handleJoin(e) {
    e.preventDefault()
    setLoading(true)
    try {
      await joinAuction(joinCode)
      showToast('Joined auction successfully!', 'success')
      navigate('/')
    } catch (err) {
      showToast(err.message || 'Failed to join auction. Check the code.', 'error')
    }
    setLoading(false)
  }

  async function handleEnterAuction(auction) {
    await switchAuction(auction)
    navigate('/')
  }

  const displayName = profile?.full_name || user?.email?.split('@')[0] || 'Player'

  return (
    <div className="dashboard-page" style={{ position: 'relative', overflow: 'hidden', background: 'var(--blue)15' }}>

      {/* ── Top bar ── */}
      <div className="dashboard-topbar">
        <div className="dashboard-brand">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <img src="/cricauction-logo.jpeg" alt="Logo" style={{ width: 44, height: 44, borderRadius: 10, objectFit: 'cover', boxShadow: '0 4px 14px rgba(0,0,0,0.4)' }} />
            <span style={{ fontFamily: 'Rajdhani, sans-serif', fontWeight: 800, fontSize: 20, color: '#ffffff', letterSpacing: 1.5 }}>CricAuction</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <ProfileMenu />
        </div>
      </div>

      <div className="dashboard-content">
        {/* Welcome */}
        <div className="dashboard-welcome">
          <h1 style={{ fontFamily: 'Rajdhani', fontSize: 28, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
            Welcome back
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14, margin: '6px 0 0' }}>
            {displayName}
          </p>
        </div>

        {/* Action cards */}
        <div className="dashboard-action-grid">
          {/* Create */}
          <div className="dashboard-card" style={{ background: 'var(--blue)15', borderColor: 'var(--blue)33' }}>
            <div style={{ width: 48, height: 48, marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 12, background: 'rgba(74,158,255,0.1)', border: '1px solid rgba(74,158,255,0.2)' }}>
              <Activity size={24} color="var(--blue)" />
            </div>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, color: 'var(--text-primary)' }}>Create Auction</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 20, fontSize: 13, lineHeight: 1.5 }}>
              Host a new auction. You'll have full control to manage teams and players.
            </p>
            {!showCreate ? (
              <button className="btn btn-primary btn-full" onClick={() => setShowCreate(true)}>
                + Create New Auction
              </button>
            ) : (
              <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <input type="text" placeholder="Auction Name (e.g. IPL 2025)" value={newAuctionName} onChange={e => setNewAuctionName(e.target.value)} required className="form-input" />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="submit" disabled={loading} className="btn btn-primary" style={{ flex: 1 }}>{loading ? 'Creating...' : 'Create'}</button>
                  <button type="button" onClick={() => setShowCreate(false)} className="btn btn-ghost">Cancel</button>
                </div>
              </form>
            )}
          </div>

          {/* Join */}
          <div className="dashboard-card" style={{ background: 'var(--blue)15', borderColor: 'var(--blue)33' }}>
            <div style={{ width: 48, height: 48, marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 12, background: 'rgba(46,204,113,0.1)', border: '1px solid rgba(46,204,113,0.2)' }}>
              <Ticket size={24} color="var(--green)" />
            </div>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, color: 'var(--text-primary)' }}>Join Auction</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 20, fontSize: 13, lineHeight: 1.5 }}>
              Join an existing auction as a member to watch live stats and bidding.
            </p>
            {!showJoin ? (
              <button className="btn btn-ghost btn-full" onClick={() => setShowJoin(true)}>Join with Code</button>
            ) : (
              <form onSubmit={handleJoin} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <input type="text" placeholder="Enter 7-8 character code" value={joinCode} onChange={e => setJoinCode(e.target.value)} required className="form-input" style={{ textTransform: 'uppercase' }} />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="submit" disabled={loading} className="btn btn-primary" style={{ flex: 1 }}>{loading ? 'Joining...' : 'Join'}</button>
                  <button type="button" onClick={() => setShowJoin(false)} className="btn btn-ghost">Cancel</button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* My Hosted Auctions */}
        <div className="dashboard-section">
          <h2 className="dashboard-section-title">My Hosted Auctions</h2>
          <div className="dashboard-auction-list">
            {hostedAuctions.length === 0 ? (
              <div className="empty-state" style={{ padding: '28px 16px' }}>
                <div className="empty-state-icon" style={{ display: 'flex', justifyContent: 'center' }}><Building2 size={32} color="var(--text-muted)" /></div>
                <div className="empty-state-title">No hosted auctions yet</div>
                <div className="empty-state-desc">Create one above to get started.</div>
              </div>
            ) : (
              hostedAuctions.map(a => (
                <div key={a.id} className="dashboard-auction-item" style={{ background: 'var(--blue)15', borderColor: 'var(--blue)33' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(74,158,255,0.15)', border: '1px solid rgba(74,158,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Activity size={20} color="var(--blue)" />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                        Code: <span style={{ color: 'var(--gold)', fontWeight: 700, letterSpacing: 1 }}>{a.join_code}</span>
                      </div>
                    </div>
                  </div>
                  <button onClick={() => handleEnterAuction(a)} className="btn btn-primary btn-sm" style={{ flexShrink: 0 }}>
                    Manage
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Joined Auctions */}
        <div className="dashboard-section">
          <h2 className="dashboard-section-title">Joined Auctions</h2>
          <div className="dashboard-auction-list">
            {joinedAuctions.length === 0 ? (
              <div className="empty-state" style={{ padding: '28px 16px' }}>
                <div className="empty-state-icon" style={{ display: 'flex', justifyContent: 'center' }}><Ticket size={32} color="var(--text-muted)" /></div>
                <div className="empty-state-title">No joined auctions</div>
                <div className="empty-state-desc">Use a join code to enter an auction.</div>
              </div>
            ) : (
              joinedAuctions.map(a => (
                <div key={a.id} className="dashboard-auction-item" style={{ background: 'var(--blue)15', borderColor: 'var(--blue)33' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(46,204,113,0.12)', border: '1px solid rgba(46,204,113,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Ticket size={20} color="var(--green)" />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Member</div>
                    </div>
                  </div>
                  <button onClick={() => handleEnterAuction(a)} className="btn btn-ghost btn-sm" style={{ flexShrink: 0 }}>
                    Watch Live
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', padding: '16px 0 32px', opacity: 0.9 }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8, fontWeight: 600 }}>Powered by</div>
          <img src="/bricx-logo.png" alt="Powered by BricX" style={{ width: 160, height: 'auto', marginBottom: 8 }} />
        </div>
      </div>
    </div>
  )
}
