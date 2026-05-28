import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useApp } from '../context/AppContext'
import { roleColors } from '../constants'

export default function Rankings() {
  const { activeAuction } = useApp()
  const navigate = useNavigate()
  const [players, setPlayers] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('sold')

  useEffect(() => {
    if (activeAuction) loadRankings()
  }, [activeAuction])

  async function loadRankings() {
    setLoading(true)
    const { data } = await supabase
      .from('players')
      .select('*, teams(name, color, logo_url)')
      .eq('auction_id', activeAuction.id)
      .order('sold_price', { ascending: false })
    setPlayers(data || [])
    setLoading(false)
  }

  const soldPlayers = players.filter(p => p.status === 'sold')
  const displayed = tab === 'sold' ? soldPlayers : players.filter(p => p.base_price > 0)

  const totalSpent = soldPlayers.reduce((s, p) => s + (p.sold_price || 0), 0)
  const teamsCount = [...new Set(soldPlayers.filter(p => p.team_id).map(p => p.team_id))].length

  const top3 = soldPlayers.slice(0, 3)
  const rest = soldPlayers.slice(3)

  if (!activeAuction) {
    return (
      <div className="page-content">
        <div className="empty-state">
          <div className="empty-state-icon">🏅</div>
          <div className="empty-state-title">No Auction Selected</div>
          <div className="empty-state-desc">Create or select an auction from the menu to view rankings.</div>
        </div>
      </div>
    )
  }

  return (
    <div className="page-content">
      {/* Stats */}
      <div className="stats-row">
        <div className="stat-item">
          <span className="stat-icon" style={{ color: 'var(--green)' }}>🔨</span>
          <div className="stat-value">{soldPlayers.length}</div>
          <div className="stat-label">Players Sold</div>
        </div>
        <div className="stat-item">
          <span className="stat-icon" style={{ color: 'var(--gold)' }}>💰</span>
          <div className="stat-value">₹{totalSpent.toFixed(2)}L</div>
          <div className="stat-label">Total Spent</div>
        </div>
        <div className="stat-item">
          <span className="stat-icon" style={{ color: 'var(--purple)' }}>🛡️</span>
          <div className="stat-value">{teamsCount}</div>
          <div className="stat-label">Teams</div>
        </div>
      </div>

      <h1 className="page-title" style={{ marginBottom: 16 }}>RANKINGS</h1>

      {/* Tabs */}
      <div className="filter-tabs" style={{ marginBottom: 20 }}>
        <button className={`filter-tab${tab === 'sold' ? ' active' : ''}`} onClick={() => setTab('sold')} id="tab-sold">SOLD PLAYERS</button>
        <button className={`filter-tab${tab === 'all' ? ' active' : ''}`} onClick={() => setTab('all')} id="tab-all">ALL PLAYERS</button>
      </div>

      {loading ? (
        <div className="loading-spinner"><div className="spinner" /></div>
      ) : soldPlayers.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🏅</div>
          <div className="empty-state-title">No Results Yet</div>
          <div className="empty-state-desc">Rankings will appear once players are sold in the auction.</div>
        </div>
      ) : (
        <>
          {/* Top 3 Podium */}
          {tab === 'sold' && top3.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <div style={{
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'center',
                gap: 8,
                minHeight: 200,
              }}>
                {/* 2nd place */}
                {top3[1] && (
                  <PodiumCard player={top3[1]} rank={2} onClick={() => navigate(`/players/${top3[1].id}`)} />
                )}
                {/* 1st place */}
                {top3[0] && (
                  <PodiumCard player={top3[0]} rank={1} onClick={() => navigate(`/players/${top3[0].id}`)} />
                )}
                {/* 3rd place */}
                {top3[2] && (
                  <PodiumCard player={top3[2]} rank={3} onClick={() => navigate(`/players/${top3[2].id}`)} />
                )}
              </div>
            </div>
          )}

          {/* Rankings Table */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {/* Header */}
            <div style={{
              display: 'grid', gridTemplateColumns: '40px 1fr auto auto',
              gap: 8, padding: '10px 14px',
              borderBottom: '1px solid var(--border)',
              fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5
            }}>
              <span>Rank</span>
              <span>Player</span>
              <span style={{ textAlign: 'right' }}>Bid</span>
              <span style={{ textAlign: 'right' }}>Role</span>
            </div>

            {(tab === 'sold' ? rest : displayed).map((player, idx) => {
              const rankNum = tab === 'sold' ? idx + 4 : idx + 1
              return (
                <div
                  key={player.id}
                  style={{
                    display: 'grid', gridTemplateColumns: '40px 1fr auto auto',
                    gap: 8, padding: '12px 14px',
                    borderBottom: '1px solid var(--border)',
                    alignItems: 'center', cursor: 'pointer',
                    transition: 'background 0.2s'
                  }}
                  onClick={() => navigate(`/players/${player.id}`)}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-card-hover)'}
                  onMouseLeave={e => e.currentTarget.style.background = ''}
                >
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-muted)' }}>{rankNum}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {player.photo_url ? (
                      <img src={player.photo_url} alt={player.name} style={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>👤</div>
                    )}
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{player.name}</div>
                      {player.teams && (
                        <div style={{ fontSize: 10, color: player.teams.color || 'var(--text-muted)' }}>{player.teams.name}</div>
                      )}
                    </div>
                  </div>
                  <div style={{ fontWeight: 700, color: 'var(--gold)', fontSize: 13, textAlign: 'right' }}>
                    {player.status === 'sold' ? `₹${player.sold_price}L` : `₹${player.base_price}L`}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: 9, fontWeight: 700, color: roleColors[player.role] || 'var(--blue)', background: `${roleColors[player.role] || 'var(--blue)'}22`, padding: '2px 6px', borderRadius: 4 }}>
                      {player.role?.toUpperCase().replace(' ', '\n')}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

function PodiumCard({ player, rank, onClick }) {
  const isFirst = rank === 1
  const colors = {
    1: { bg: 'linear-gradient(180deg, #f5a62322, #f5a62308)', border: '#f5a62344', medal: '🥇', glow: 'rgba(245,166,35,0.3)' },
    2: { bg: 'linear-gradient(180deg, #9ca3af22, #9ca3af08)', border: '#9ca3af44', medal: '🥈', glow: 'rgba(156,163,175,0.2)' },
    3: { bg: 'linear-gradient(180deg, #cd7f3222, #cd7f3208)', border: '#cd7f3244', medal: '🥉', glow: 'rgba(205,127,50,0.2)' },
  }
  const c = colors[rank]

  return (
    <div
      style={{
        flex: 1,
        maxWidth: isFirst ? 160 : 130,
        background: c.bg,
        border: `1px solid ${c.border}`,
        borderRadius: 'var(--radius-lg)',
        padding: 12,
        textAlign: 'center',
        cursor: 'pointer',
        transition: 'all 0.2s',
        boxShadow: `0 4px 20px ${c.glow}`,
        marginBottom: isFirst ? 0 : 24,
      }}
      onClick={onClick}
    >
      <div style={{ fontSize: isFirst ? 24 : 20, marginBottom: 4 }}>{c.medal}</div>
      {player.photo_url ? (
        <img src={player.photo_url} alt={player.name} style={{
          width: isFirst ? 72 : 56, height: isFirst ? 72 : 56,
          borderRadius: '50%', objectFit: 'cover',
          margin: '0 auto 8px', display: 'block',
          border: `2px solid ${c.border}`
        }} />
      ) : (
        <div style={{
          width: isFirst ? 72 : 56, height: isFirst ? 72 : 56,
          borderRadius: '50%', background: 'var(--bg-secondary)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: isFirst ? 36 : 28, margin: '0 auto 8px',
          border: `2px solid ${c.border}`
        }}>👤</div>
      )}
      <div style={{ fontFamily: 'Rajdhani', fontWeight: 700, fontSize: isFirst ? 15 : 13, lineHeight: 1.2, marginBottom: 4 }}>
        {player.name}
      </div>
      {player.teams && (
        <div style={{ fontSize: 10, color: player.teams.color || 'var(--text-muted)', marginBottom: 4 }}>
          {player.teams.name}
        </div>
      )}
      <div style={{ fontSize: isFirst ? 15 : 13, fontWeight: 800, color: 'var(--gold)' }}>
        ₹{player.sold_price}L
      </div>
      <div style={{ fontSize: 9, color: roleColors[player.role] || 'var(--blue)', marginTop: 4, fontWeight: 700 }}>
        {player.role?.toUpperCase()}
      </div>
    </div>
  )
}
