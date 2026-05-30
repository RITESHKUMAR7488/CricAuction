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
  const [tab, setTab] = useState('all')

  useEffect(() => {
    if (!activeAuction) return

    loadRankings()

    const channel = supabase
      .channel(`rankings-live-${activeAuction.id}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'players',
        filter: `auction_id=eq.${activeAuction.id}`,
      }, () => loadRankings())
      .subscribe()

    return () => supabase.removeChannel(channel)
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
  const allPlayers = players.filter(p => p.base_price > 0)
  const displayed = tab === 'all' ? allPlayers : soldPlayers

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
      {/* Stats Row Removed */}


      {/* Page title + dropdown */}
      <div className="page-header">
        <h1 className="page-title">RANKINGS</h1>
        <select
          className="form-select"
          value={tab}
          onChange={e => setTab(e.target.value)}
          style={{ width: 'auto', padding: '7px 32px 7px 12px', fontSize: 12, fontWeight: 600 }}
          id="rankings-filter-select"
        >
          <option value="all">ALL PLAYERS</option>
          <option value="sold">SOLD PLAYERS</option>
        </select>
      </div>

      {/* Underline tabs */}
      <div className="tab-underline-row">
        <button
          className={`tab-underline${tab === 'all' ? ' active' : ''}`}
          onClick={() => setTab('all')}
          id="tab-all"
        >
          ALL PLAYERS
        </button>
        <button
          className={`tab-underline${tab === 'sold' ? ' active' : ''}`}
          onClick={() => setTab('sold')}
          id="tab-sold"
        >
          SOLD PLAYERS
        </button>
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
            <div className="rankings-podium" style={{ marginBottom: 24, marginTop: 8 }}>
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
          )}

          {/* Rankings Table */}
          <div className="rankings-table">
            {/* Header */}
            <div className="rankings-table-header">
              <span>Rank</span>
              <span>Player</span>
              <span>Team</span>
              <span style={{ textAlign: 'right' }}>Final Bid</span>
            </div>

            {(tab === 'sold' ? rest : displayed).map((player, idx) => {
              const rankNum = tab === 'sold' ? idx + 4 : idx + 1
              return (
                <div
                  key={player.id}
                  className="rankings-table-row"
                  onClick={() => navigate(`/players/${player.id}`)}
                >
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)' }}>{rankNum}</div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                    {player.photo_url ? (
                      <img src={player.photo_url} alt={player.name} style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                    ) : (
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>👤</div>
                    )}
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{player.name}</div>
                    </div>
                  </div>

                  <div style={{ fontSize: 11, minWidth: 0 }}>
                    {player.teams ? (
                      <span style={{ color: player.teams.color || 'var(--text-muted)', fontWeight: 600, fontSize: 11 }}>
                        {player.teams.name}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)' }}>—</span>
                    )}
                  </div>

                  <div style={{ fontWeight: 700, color: 'var(--gold)', fontSize: 12, textAlign: 'right' }}>
                    {player.status === 'sold' ? `₹${player.sold_price}L` : `₹${player.base_price}L`}
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

  const configs = {
    1: {
      bg: 'linear-gradient(180deg, rgba(245,166,35,0.18) 0%, rgba(245,166,35,0.05) 100%)',
      border: 'rgba(245,166,35,0.4)',
      glow: '0 8px 32px rgba(245,166,35,0.25)',
      rankBg: '#f5a623',
      rankColor: '#000',
      badgeBg: 'rgba(245,166,35,0.15)',
      badgeColor: 'var(--gold)',
    },
    2: {
      bg: 'linear-gradient(180deg, rgba(156,163,175,0.15) 0%, rgba(156,163,175,0.04) 100%)',
      border: 'rgba(156,163,175,0.35)',
      glow: '0 8px 24px rgba(156,163,175,0.15)',
      rankBg: '#9ca3af',
      rankColor: '#000',
      badgeBg: 'rgba(156,163,175,0.15)',
      badgeColor: '#9ca3af',
    },
    3: {
      bg: 'linear-gradient(180deg, rgba(205,127,50,0.15) 0%, rgba(205,127,50,0.04) 100%)',
      border: 'rgba(205,127,50,0.35)',
      glow: '0 8px 24px rgba(205,127,50,0.15)',
      rankBg: '#cd7f32',
      rankColor: '#fff',
      badgeBg: 'rgba(205,127,50,0.15)',
      badgeColor: '#cd7f32',
    },
  }

  const c = configs[rank]
  const photoSize = isFirst ? 72 : 58

  return (
    <div
      className="podium-card"
      style={{
        background: c.bg,
        border: `1px solid ${c.border}`,
        boxShadow: c.glow,
        marginBottom: isFirst ? 0 : 28,
        paddingTop: 20,
      }}
      onClick={onClick}
    >
      {/* Rank badge */}
      <div className="podium-rank-badge" style={{ background: c.rankBg, color: c.rankColor }}>
        {rank}
      </div>

      {/* Photo */}
      {player.photo_url ? (
        <img
          src={player.photo_url}
          alt={player.name}
          className="podium-photo"
          style={{ border: `2px solid ${c.border}` }}
        />
      ) : (
        <div
          className="podium-photo-placeholder"
          style={{ fontSize: isFirst ? 36 : 28 }}
        >
          👤
        </div>
      )}

      {/* Name */}
      <div className="podium-name" style={{ fontSize: isFirst ? 14 : 12 }}>{player.name}</div>

      {/* Team */}
      {player.teams && (
        <div className="podium-team" style={{ color: player.teams.color || 'var(--text-muted)' }}>
          <span style={{ fontSize: 12 }}>🏆</span>
          <span style={{ fontSize: 10, fontWeight: 600 }}>{player.teams.name}</span>
        </div>
      )}

      {/* Price */}
      <div className="podium-price" style={{ fontSize: isFirst ? 15 : 13 }}>
        ₹{player.sold_price}L
      </div>

      {/* Role badge */}
      <div
        className="podium-role-badge"
        style={{ background: c.badgeBg, color: c.badgeColor, border: `1px solid ${c.border}` }}
      >
        {player.role?.toUpperCase()}
      </div>
    </div>
  )
}
