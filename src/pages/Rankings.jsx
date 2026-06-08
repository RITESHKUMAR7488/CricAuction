import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useApp } from '../context/AppContext'
import { Medal, Crown, User, Trophy } from 'lucide-react'

export default function Rankings() {
  const { activeAuction } = useApp()
  const navigate = useNavigate()
  const [players, setPlayers] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('sold')

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

  const getRankedPlayers = (list) => {
    let rank = 1
    let prevPrice = null
    return list.map((p) => {
      const price = p.status === 'sold' ? (p.sold_price || 0) : -1
      if (prevPrice !== null && price < prevPrice) rank++
      prevPrice = price
      return { ...p, computedRank: rank }
    })
  }

  const soldPlayers = getRankedPlayers(players.filter(p => p.status === 'sold'))
  const allPlayers = getRankedPlayers(players.filter(p => p.base_price > 0))
  const displayed = tab === 'all' ? allPlayers : soldPlayers

  const rank1Players = soldPlayers.filter(p => p.computedRank === 1)
  const rank2Players = soldPlayers.filter(p => p.computedRank === 2)
  const rank3Players = soldPlayers.filter(p => p.computedRank === 3)
  const rest = displayed.filter(p => p.computedRank > 3)

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
    <div className="page-content rankings-page">
      {/* Page title */}
      <div className="page-header" style={{ marginBottom: 16 }}>
        <h1 className="page-title">RANKINGS</h1>
      </div>

      {/* Tabs */}
      <div className="tab-underline-row">
        <button className={`tab-underline${tab === 'all' ? ' active' : ''}`} onClick={() => setTab('all')} id="tab-all">
          ALL PLAYERS
        </button>
        <button className={`tab-underline${tab === 'sold' ? ' active' : ''}`} onClick={() => setTab('sold')} id="tab-sold">
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
          {/* ── PODIUM SECTION ── */}
          {tab === 'sold' && rank1Players.length > 0 && (
            <div className="rk-podium-scene">
              {/* Decorative glow backdrop */}
              <div className="rk-podium-glow" />

              <div className="rk-podium-stage">
                {/* ── RANK 2 (left column) ── */}
                <div className="rk-podium-col rk-col-2">
                  <div className="rk-podium-players">
                    {rank2Players.length > 0 ? rank2Players.map(p => (
                      <PodiumPlayerCard key={p.id} player={p} rank={2} onClick={() => navigate(`/players/${p.id}`)} />
                    )) : (
                      <div className="rk-podium-empty-col" />
                    )}
                  </div>
                  <div className="rk-podium-block rk-block-2">
                    <span className="rk-block-rank">2</span>
                  </div>
                </div>

                {/* ── RANK 1 (center column, tallest) ── */}
                <div className="rk-podium-col rk-col-1">
                  <div className="rk-crown"><Crown size={22} color="var(--gold)" /></div>
                  <div className="rk-podium-players">
                    {rank1Players.map(p => (
                      <PodiumPlayerCard key={p.id} player={p} rank={1} onClick={() => navigate(`/players/${p.id}`)} />
                    ))}
                  </div>
                  <div className="rk-podium-block rk-block-1">
                    <span className="rk-block-rank">1</span>
                  </div>
                </div>

                {/* ── RANK 3 (right column) ── */}
                <div className="rk-podium-col rk-col-3">
                  <div className="rk-podium-players">
                    {rank3Players.length > 0 ? rank3Players.map(p => (
                      <PodiumPlayerCard key={p.id} player={p} rank={3} onClick={() => navigate(`/players/${p.id}`)} />
                    )) : (
                      <div className="rk-podium-empty-col" />
                    )}
                  </div>
                  <div className="rk-podium-block rk-block-3">
                    <span className="rk-block-rank">3</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── REST OF TABLE ── */}
          {(tab === 'sold' ? rest : displayed).length > 0 && (
            <div className="rk-table-section">
              {tab === 'sold' && rest.length > 0 && (
                <div className="rk-table-divider">
                  <div className="rk-table-divider-line" />
                  <span className="rk-table-divider-label">MORE PLAYERS</span>
                  <div className="rk-table-divider-line" />
                </div>
              )}
              <div className="rk-table">
                {(tab === 'sold' ? rest : displayed).map((player) => (
                  <div
                    key={player.id}
                    className="rk-table-row"
                    onClick={() => navigate(`/players/${player.id}`)}
                  >
                    {/* Rank */}
                    <div className="rk-row-rank">
                      <span>{player.computedRank}</span>
                    </div>

                    {/* Photo */}
                    <div className="rk-row-photo">
                      {player.photo_url
                        ? <img src={player.photo_url} alt={player.name} />
                        : <div className="rk-row-photo-placeholder" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}><User size={20} color="var(--text-muted)" /></div>
                      }
                    </div>

                    {/* Info */}
                    <div className="rk-row-info">
                      <div className="rk-row-name">{player.name}</div>
                      <div className="rk-row-meta">
                        {player.teams && (
                          <span className="rk-row-team" style={{ color: player.teams.color || 'var(--text-muted)' }}>
                            {player.teams.name}
                          </span>
                        )}
                        {player.role && (
                          <span className="rk-row-role">{player.role}</span>
                        )}
                      </div>
                    </div>

                    {/* Price */}
                    <div className="rk-row-price">
                      {player.status === 'sold'
                        ? `₹${player.sold_price}L`
                        : <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>₹{player.base_price}L base</span>
                      }
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

/* ── PODIUM PLAYER CARD ── */
const rankConfig = {
  1: {
    badge: 'linear-gradient(135deg, #f5a623, #ffd066)',
    badgeText: '#000',
    border: 'rgba(245,166,35,0.55)',
    glow: '0 0 32px rgba(245,166,35,0.28)',
    bg: 'linear-gradient(170deg, rgba(245,166,35,0.14) 0%, rgba(245,166,35,0.04) 100%)',
    priceColor: 'var(--gold)',
  },
  2: {
    badge: 'linear-gradient(135deg, #c0c8d8, #9ca3af)',
    badgeText: '#000',
    border: 'rgba(156,163,175,0.45)',
    glow: '0 0 20px rgba(156,163,175,0.15)',
    bg: 'linear-gradient(170deg, rgba(156,163,175,0.12) 0%, rgba(156,163,175,0.03) 100%)',
    priceColor: '#c0c8d8',
  },
  3: {
    badge: 'linear-gradient(135deg, #e8a96a, #cd7f32)',
    badgeText: '#fff',
    border: 'rgba(205,127,50,0.45)',
    glow: '0 0 20px rgba(205,127,50,0.15)',
    bg: 'linear-gradient(170deg, rgba(205,127,50,0.12) 0%, rgba(205,127,50,0.03) 100%)',
    priceColor: '#e8a96a',
  },
}

function PodiumPlayerCard({ player, rank, onClick }) {
  const c = rankConfig[rank] || rankConfig[3]
  return (
    <div className={`rk-player-card rk-rank-${rank}`} onClick={onClick}
      style={{ background: c.bg, border: `1.5px solid ${c.border}`, boxShadow: c.glow }}
    >
      {/* Rank badge */}
      <div className="rk-card-rank-badge" style={{ background: c.badge, color: c.badgeText }}>
        {rank}
      </div>

      {/* Photo */}
      <div className="rk-card-photo-wrap" style={{ borderColor: c.border }}>
        {player.photo_url
          ? <img src={player.photo_url} alt={player.name} className="rk-card-photo" />
          : <div className="rk-card-photo-placeholder" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}><User size={28} color="var(--text-muted)" /></div>
        }
      </div>

      {/* Name */}
      <div className="rk-card-name">{player.name}</div>

      {/* Team */}
      {player.teams && (
        <div className="rk-card-team" style={{ color: player.teams.color || 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
          <Trophy size={11} />
          {player.teams.name}
        </div>
      )}

      {/* Price */}
      <div className="rk-card-price" style={{ color: c.priceColor }}>
        ₹{player.sold_price}L
      </div>

      {/* Role */}
      {player.role && (
        <div className="rk-card-role" style={{ borderColor: c.border, color: c.priceColor }}>
          {player.role.toUpperCase()}
        </div>
      )}
    </div>
  )
}
