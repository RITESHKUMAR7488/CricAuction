import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, uploadFile } from '../lib/supabase'
import { useApp } from '../context/AppContext'
import { showToast } from '../components/Toast'
import PlayerFormModal from '../components/PlayerFormModal'
import { ROLES, STYLES, roleColors } from '../constants'

export default function Players() {
  const { activeAuction, userRole } = useApp()
  const navigate = useNavigate()
  const [players, setPlayers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('ALL')
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    if (activeAuction) loadPlayers()
  }, [activeAuction])

  async function loadPlayers() {
    setLoading(true)
    const { data } = await supabase
      .from('players')
      .select('*, teams(name, color)')
      .eq('auction_id', activeAuction.id)
      .order('code')
    setPlayers(data || [])
    setLoading(false)
  }

  async function handleDeletePlayer(player) {
    if (!window.confirm(`Are you sure you want to delete player ${player.name}?`)) return
    const { error } = await supabase.from('players').delete().eq('id', player.id)
    if (error) {
      showToast(error.message, 'error')
    } else {
      showToast('Player deleted', 'success')
      loadPlayers()
    }
  }

  const filtered = players.filter(p => {
    const matchSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.code.toLowerCase().includes(search.toLowerCase())
    const matchRole = roleFilter === 'ALL' || p.role === roleFilter
    return matchSearch && matchRole
  })

  const totalPlayers = players.length
  const available = players.filter(p => p.status === 'available').length
  const sold = players.filter(p => p.status === 'sold').length
  const teamsCount = [...new Set(players.filter(p => p.team_id).map(p => p.team_id))].length

  if (!activeAuction) {
    return (
      <div className="page-content">
        <div className="empty-state">
          <div className="empty-state-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
          </div>
          <div className="empty-state-title">No Auction Selected</div>
          <div className="empty-state-desc">Create or select an auction from the menu (☰) to get started.</div>
        </div>
      </div>
    )
  }

  return (
    <div className="page-content">
      {/* Header */}
      <div className="page-header" style={{ marginBottom: 16, alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
          <h1 className="page-title">PLAYERS</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#fff', fontFamily: 'Rajdhani', letterSpacing: 0.5 }}>{sold}/{totalPlayers}</div>
              <div style={{ fontSize: 9, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Total Players</div>
            </div>
            {userRole === 'host' && (
              <button className="btn btn-primary btn-sm" onClick={() => setShowModal(true)} id="register-player-btn" style={{ padding: '6px 10px', fontSize: 11 }}>
                + REGISTER
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Search + Filter row */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <div className="search-bar" style={{ flex: 1, marginBottom: 0 }}>
          <span className="search-icon">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          </span>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or code..."
            id="player-search"
          />
        </div>
        <button
          className="btn btn-ghost btn-sm"
          style={{ flexShrink: 0, gap: 4 }}
          onClick={() => setRoleFilter('ALL')}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M3 6h18M7 12h10M11 18h2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          FILTERS
        </button>
      </div>

      {/* Role Filters */}
      <div className="filter-tabs">
        {['ALL', ...ROLES].map(role => (
          <button
            key={role}
            className={`filter-tab${roleFilter === role ? ' active' : ''}`}
            onClick={() => setRoleFilter(role)}
            id={`filter-${role.toLowerCase().replace(' ', '-')}`}
          >
            {role}
          </button>
        ))}
      </div>

      {/* Players List */}
      {loading ? (
        <div className="loading-spinner"><div className="spinner" /><span>Loading players...</span></div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle></svg>
          </div>
          <div className="empty-state-title">No Players Found</div>
          <div className="empty-state-desc">
            {players.length === 0
              ? 'Register players using the button above to get started.'
              : 'No players match your current search or filter.'}
          </div>
        </div>
      ) : (
        filtered.map(player => (
          <PlayerCard
            key={player.id}
            player={player}
            roleColors={roleColors}
            onClick={() => navigate(`/players/${player.id}`)}
            onDelete={userRole === 'host' ? () => handleDeletePlayer(player) : null}
          />
        ))
      )}

      {showModal && (
        <PlayerFormModal
          auctionId={activeAuction.id}
          existingCodes={players.map(p => p.code)}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); loadPlayers() }}
        />
      )}
    </div>
  )
}

function PlayerCard({ player, roleColors, onClick, onDelete }) {
  const roleColor = roleColors[player.role] || 'var(--blue)'
  const isBowler = player.role === 'Bowler'

  return (
    <div 
      className="player-card" 
      onClick={onClick} 
      id={`player-card-${player.id}`}
      style={{ background: roleColor + '15', borderColor: roleColor + '33' }}
    >
      {/* Photo */}
      <div className="player-photo-wrap" style={{ background: roleColor + '15', borderRight: `1px solid ${roleColor}33` }}>
        {player.photo_url ? (
          <img src={player.photo_url} alt={player.name} className="player-photo" />
        ) : (
          <div className="player-photo-placeholder">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="player-info">
        <div style={{ fontSize: 9, fontWeight: 800, color: roleColor, letterSpacing: 0.5, marginBottom: 2 }}>{player.code}</div>
        <div className="player-name">{player.name}</div>
        <div className="player-role" style={{ color: roleColor }}>{player.role}</div>
        <div className="player-stats">
          {player.age && (
            <div className="player-stat">
              <span className="player-stat-label">Age</span>
              <span className="player-stat-value">{player.age}</span>
            </div>
          )}
          {player.style && (
            <div className="player-stat">
              <span className="player-stat-label">Style</span>
              <span className="player-stat-value">{player.style}</span>
            </div>
          )}
          {player.matches > 0 && (
            <div className="player-stat">
              <span className="player-stat-label">Matches</span>
              <span className="player-stat-value">{player.matches}</span>
            </div>
          )}
          {!isBowler && player.strike_rate && (
            <div className="player-stat">
              <span className="player-stat-label">Strike Rate</span>
              <span className="player-stat-value">{player.strike_rate}</span>
            </div>
          )}
          {isBowler && player.economy && (
            <div className="player-stat">
              <span className="player-stat-label">Economy</span>
              <span className="player-stat-value">{player.economy}</span>
            </div>
          )}
        </div>
      </div>

      {/* Price + Status */}
      <div className="player-price-col">
        <div>
          <div className="player-price-label">
            {player.status === 'sold' ? 'SOLD FOR' : 'BASE PRICE'}
          </div>
          <div className="player-price-value">
            ₹ {player.status === 'sold' ? player.sold_price : player.base_price} L
          </div>
        </div>
        <span className={`badge badge-${player.status}`}>
          {player.status.toUpperCase()}
        </span>
        {player.status === 'sold' && player.teams && (
          <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>{player.teams.name}</div>
        )}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', alignItems: 'center', paddingRight: 6 }}>
        <div className="player-chevron">›</div>
      </div>
    </div>
  )
}
