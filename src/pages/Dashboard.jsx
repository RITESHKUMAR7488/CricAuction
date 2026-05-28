import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { showToast } from '../components/Toast'

export default function Dashboard() {
  const { user, logout, auctions, createAuction, joinAuction, switchAuction } = useApp()
  const navigate = useNavigate()
  
  const [showCreate, setShowCreate] = useState(false)
  const [newAuctionName, setNewAuctionName] = useState('')
  
  const [showJoin, setShowJoin] = useState(false)
  const [joinCode, setJoinCode] = useState('')
  const [loading, setLoading] = useState(false)

  const hostedAuctions = auctions.filter(a => a.host_id === user?.id)
  const joinedAuctions = auctions.filter(a => a.host_id !== user?.id)

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

  return (
    <div style={{ padding: 24, maxWidth: 1000, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <h1 style={{ fontFamily: 'Rajdhani', fontSize: 32, color: 'var(--text-main)' }}>Dashboard</h1>
        <button onClick={logout} className="btn btn-outline" style={{ borderColor: 'var(--red)', color: 'var(--red)' }}>
          Logout
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24, marginBottom: 48 }}>
        <div style={{ background: 'var(--bg-card)', padding: 24, borderRadius: 12, border: '1px solid var(--border)' }}>
          <h2 style={{ fontSize: 20, marginBottom: 16 }}>Create Auction</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 24, fontSize: 14 }}>
            Host a new auction. You will have full control to manage teams and players.
          </p>
          {!showCreate ? (
            <button className="btn btn-primary" onClick={() => setShowCreate(true)} style={{ width: '100%' }}>
              + Create New Auction
            </button>
          ) : (
            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input 
                type="text" 
                placeholder="Auction Name" 
                value={newAuctionName}
                onChange={e => setNewAuctionName(e.target.value)}
                required
                className="input-field"
                style={{ width: '100%', padding: '10px 14px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-main)', color: 'white' }}
              />
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="submit" disabled={loading} className="btn btn-primary" style={{ flex: 1 }}>
                  Create
                </button>
                <button type="button" onClick={() => setShowCreate(false)} className="btn btn-outline">
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>

        <div style={{ background: 'var(--bg-card)', padding: 24, borderRadius: 12, border: '1px solid var(--border)' }}>
          <h2 style={{ fontSize: 20, marginBottom: 16 }}>Join Auction</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 24, fontSize: 14 }}>
            Join an existing auction as a member to watch live stats.
          </p>
          {!showJoin ? (
            <button className="btn btn-outline" onClick={() => setShowJoin(true)} style={{ width: '100%' }}>
              Join with Code
            </button>
          ) : (
            <form onSubmit={handleJoin} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input 
                type="text" 
                placeholder="7-8 character join code" 
                value={joinCode}
                onChange={e => setJoinCode(e.target.value)}
                required
                className="input-field"
                style={{ width: '100%', padding: '10px 14px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-main)', color: 'white', textTransform: 'uppercase' }}
              />
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="submit" disabled={loading} className="btn btn-primary" style={{ flex: 1 }}>
                  Join
                </button>
                <button type="button" onClick={() => setShowJoin(false)} className="btn btn-outline">
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      <h2 style={{ fontSize: 24, marginBottom: 16, borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>
        My Hosted Auctions
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 32 }}>
        {hostedAuctions.length === 0 ? (
          <div style={{ color: 'var(--text-muted)' }}>You are not hosting any auctions.</div>
        ) : (
          hostedAuctions.map(a => (
            <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-card)', padding: '16px 24px', borderRadius: 8, border: '1px solid var(--border)' }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 600 }}>{a.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
                  Invite Code: <span style={{ color: 'var(--gold)', fontWeight: 'bold' }}>{a.join_code}</span>
                </div>
              </div>
              <button onClick={() => handleEnterAuction(a)} className="btn btn-primary">
                Manage
              </button>
            </div>
          ))
        )}
      </div>

      <h2 style={{ fontSize: 24, marginBottom: 16, borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>
        Joined Auctions
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {joinedAuctions.length === 0 ? (
          <div style={{ color: 'var(--text-muted)' }}>You haven't joined any auctions.</div>
        ) : (
          joinedAuctions.map(a => (
            <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-card)', padding: '16px 24px', borderRadius: 8, border: '1px solid var(--border)' }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 600 }}>{a.name}</div>
              </div>
              <button onClick={() => handleEnterAuction(a)} className="btn btn-outline">
                Watch Live
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
