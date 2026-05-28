import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, uploadFile } from '../lib/supabase'
import { useApp } from '../context/AppContext'
import { showToast } from '../components/Toast'

const ROLES = ['Batter', 'Bowler', 'All Rounder', 'Wicket Keeper']
const STYLES = ['RHB', 'LHB', 'RAM', 'LAM', 'RHB+RAM', 'LHB+LAM', 'RHB+LAM', 'LHB+RAM']

const roleColors = {
  'Batter': 'var(--blue)',
  'Bowler': 'var(--purple)',
  'All Rounder': 'var(--gold)',
  'Wicket Keeper': 'var(--cyan)',
}

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
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
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
          <div className="empty-state-icon">⚡</div>
          <div className="empty-state-title">No Auction Selected</div>
          <div className="empty-state-desc">Create or select an auction from the menu (☰) to get started.</div>
        </div>
      </div>
    )
  }

  return (
    <div className="page-content">
      {/* Header */}
      <div className="page-header">
        <h1 className="page-title">PLAYERS</h1>
        {userRole === 'host' && (
          <button className="btn btn-primary btn-sm" onClick={() => setShowModal(true)} id="register-player-btn">
            + REGISTER
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="stats-row">
        <div className="stat-item">
          <span className="stat-icon" style={{ color: 'var(--blue)' }}>👥</span>
          <div className="stat-value">{totalPlayers}</div>
          <div className="stat-label">Total Players</div>
        </div>
        <div className="stat-item">
          <span className="stat-icon" style={{ color: 'var(--green)' }}>✅</span>
          <div className="stat-value">{available}</div>
          <div className="stat-label">Available</div>
        </div>
        <div className="stat-item">
          <span className="stat-icon" style={{ color: 'var(--gold)' }}>🔨</span>
          <div className="stat-value">{sold}</div>
          <div className="stat-label">Sold</div>
        </div>
        <div className="stat-item">
          <span className="stat-icon" style={{ color: 'var(--purple)' }}>🛡️</span>
          <div className="stat-value">{teamsCount}</div>
          <div className="stat-label">Teams</div>
        </div>
      </div>

      {/* Search */}
      <div className="search-bar">
        <span className="search-icon">🔍</span>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name or code..."
          id="player-search"
        />
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
          <div className="empty-state-icon">👤</div>
          <div className="empty-state-title">No Players Found</div>
          <div className="empty-state-desc">Register players using the button above to get started.</div>
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
        <RegisterPlayerModal
          auctionId={activeAuction.id}
          playerCount={players.length}
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
    <div className="player-card" onClick={onClick} id={`player-card-${player.id}`}>
      <div style={{ position: 'relative', flexShrink: 0 }}>
        {player.photo_url ? (
          <img src={player.photo_url} alt={player.name} className="player-photo" />
        ) : (
          <div className="player-photo-placeholder">👤</div>
        )}
        <div className="player-code-badge">{player.code}</div>
      </div>

      <div className="player-info">
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
              <span className="player-stat-label">SR</span>
              <span className="player-stat-value">{player.strike_rate}</span>
            </div>
          )}
          {isBowler && player.economy && (
            <div className="player-stat">
              <span className="player-stat-label">Econ</span>
              <span className="player-stat-value">{player.economy}</span>
            </div>
          )}
        </div>
      </div>

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
          <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{player.teams.name}</div>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 4 }}>
        {onDelete && (
          <button 
            onClick={(e) => { e.stopPropagation(); onDelete(); }} 
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 4, fontSize: 16 }}
          >
            🗑️
          </button>
        )}
        <div style={{ color: 'var(--text-muted)', fontSize: 16 }}>›</div>
      </div>
    </div>
  )
}

function RegisterPlayerModal({ auctionId, playerCount, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: '', role: 'Batter', age: '', style: 'RHB',
    matches: '', strike_rate: '', economy: '', base_price: '1'
  })
  const [photo, setPhoto] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [loading, setLoading] = useState(false)
  const fileRef = React.useRef()

  function handlePhotoChange(e) {
    const file = e.target.files[0]
    if (!file) return
    setPhoto(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  function nextCode() {
    const n = playerCount + 1
    return `P-${String(n).padStart(3, '0')}`
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim()) return showToast('Player name is required', 'error')
    setLoading(true)
    try {
      let photo_url = null
      if (photo) photo_url = await uploadFile(photo, 'players')
      const { error } = await supabase.from('players').insert({
        auction_id: auctionId,
        code: nextCode(),
        name: form.name.trim(),
        role: form.role,
        age: form.age ? parseInt(form.age) : null,
        style: form.style || null,
        matches: form.matches ? parseInt(form.matches) : 0,
        strike_rate: form.strike_rate ? parseFloat(form.strike_rate) : null,
        economy: form.economy ? parseFloat(form.economy) : null,
        base_price: parseFloat(form.base_price) || 1,
        photo_url,
        status: 'available'
      })
      if (error) throw error
      showToast('Player registered successfully!', 'success')
      onSaved()
    } catch(err) {
      showToast('Error: ' + err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  const isBowler = form.role === 'Bowler'

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <div className="modal-title">Register Player</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Photo */}
          <div className="form-group">
            <label className="form-label">Player Photo</label>
            <div className="photo-upload" onClick={() => fileRef.current.click()}>
              <input ref={fileRef} type="file" accept="image/*" onChange={handlePhotoChange} />
              {photoPreview ? (
                <img src={photoPreview} alt="preview" className="photo-upload-preview" />
              ) : (
                <div className="photo-upload-icon">📸</div>
              )}
              <div className="photo-upload-text">
                {photoPreview ? 'Tap to change photo' : 'Tap to upload photo'}
              </div>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Player Name *</label>
            <input
              className="form-input"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Full Name"
              id="player-name-input"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Role *</label>
              <select
                className="form-select"
                value={form.role}
                onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                id="player-role-select"
              >
                {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Style</label>
              <select
                className="form-select"
                value={form.style}
                onChange={e => setForm(f => ({ ...f, style: e.target.value }))}
                id="player-style-select"
              >
                {STYLES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Age</label>
              <input
                className="form-input"
                type="number"
                value={form.age}
                onChange={e => setForm(f => ({ ...f, age: e.target.value }))}
                placeholder="25"
                id="player-age-input"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Matches</label>
              <input
                className="form-input"
                type="number"
                value={form.matches}
                onChange={e => setForm(f => ({ ...f, matches: e.target.value }))}
                placeholder="0"
                id="player-matches-input"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">{isBowler ? 'Economy' : 'Strike Rate'}</label>
              <input
                className="form-input"
                type="number"
                step="0.1"
                value={isBowler ? form.economy : form.strike_rate}
                onChange={e => setForm(f => isBowler
                  ? { ...f, economy: e.target.value }
                  : { ...f, strike_rate: e.target.value }
                )}
                placeholder={isBowler ? '7.5' : '135.0'}
                id="player-stat-input"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Base Price (L)</label>
              <input
                className="form-input"
                type="number"
                step="0.25"
                value={form.base_price}
                onChange={e => setForm(f => ({ ...f, base_price: e.target.value }))}
                placeholder="1.00"
                id="player-base-price-input"
              />
            </div>
          </div>

          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
            Player code will be: <strong style={{ color: 'var(--blue)' }}>{nextCode()}</strong>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" className="btn btn-ghost" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" style={{ flex: 2 }} disabled={loading} id="register-player-submit">
              {loading ? 'Registering...' : 'Register Player'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
