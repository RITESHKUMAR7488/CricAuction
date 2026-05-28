import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, uploadFile } from '../lib/supabase'
import { useApp } from '../context/AppContext'
import { showToast } from '../components/Toast'

const TEAM_COLORS = [
  '#4a9eff', '#9b59b6', '#f5a623', '#27ae60',
  '#e74c3c', '#00d4aa', '#e67e22', '#e91e8c',
  '#1abc9c', '#3498db'
]

export default function Teams() {
  const { activeAuction, userRole } = useApp()
  const navigate = useNavigate()
  const [teams, setTeams] = useState([])
  const [owners, setOwners] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [viewMode, setViewMode] = useState('grid')

  useEffect(() => {
    if (activeAuction) loadTeams()
    loadOwners()
  }, [activeAuction])

  async function loadTeams() {
    setLoading(true)
    const { data } = await supabase
      .from('teams')
      .select('*, owners(name, photo_url), players(id, status, sold_price)')
      .eq('auction_id', activeAuction.id)
      .order('created_at')
    setTeams(data || [])
    setLoading(false)
  }

  async function loadOwners() {
    const { data } = await supabase.from('owners').select('*').order('name')
    setOwners(data || [])
  }

  const filtered = teams.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase())
  )

  const totalPurse = teams.reduce((s, t) => s + (t.total_purse || 0), 0)
  const totalSold = teams.reduce((s, t) => s + (t.players?.filter(p => p.status === 'sold').length || 0), 0)

  function getTeamSpent(team) {
    return (team.players || []).filter(p => p.status === 'sold').reduce((s, p) => s + (p.sold_price || 0), 0)
  }

  async function handleDeleteTeam(team) {
    if (!window.confirm(`Are you sure you want to delete ${team.name}? All players in this team will become 'available' again.`)) return
    
    await supabase.from('players').update({ status: 'available', team_id: null, sold_price: null }).eq('team_id', team.id)
    const { error } = await supabase.from('teams').delete().eq('id', team.id)
    
    if (error) {
      showToast(error.message, 'error')
    } else {
      showToast('Team deleted', 'success')
      loadTeams()
    }
  }

  if (!activeAuction) {
    return (
      <div className="page-content">
        <div className="empty-state">
          <div className="empty-state-icon">⚡</div>
          <div className="empty-state-title">No Auction Selected</div>
          <div className="empty-state-desc">Create or select an auction from the menu to get started.</div>
        </div>
      </div>
    )
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <h1 className="page-title">TEAMS</h1>
        {userRole === 'host' && (
          <button className="btn btn-primary btn-sm" onClick={() => setShowModal(true)} id="add-team-btn">
            + ADD TEAM
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="stats-row">
        <div className="stat-item">
          <span className="stat-icon" style={{ color: 'var(--blue)' }}>🛡️</span>
          <div className="stat-value">{teams.length}</div>
          <div className="stat-label">Total Teams</div>
        </div>
        <div className="stat-item">
          <span className="stat-icon" style={{ color: 'var(--gold)' }}>💰</span>
          <div className="stat-value">₹{totalPurse}L</div>
          <div className="stat-label">Total Purse</div>
        </div>
        <div className="stat-item">
          <span className="stat-icon" style={{ color: 'var(--green)' }}>🔨</span>
          <div className="stat-value">{totalSold}</div>
          <div className="stat-label">Players Sold</div>
        </div>
      </div>

      {/* Search + View toggle */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <div className="search-bar" style={{ flex: 1, marginBottom: 0 }}>
          <span className="search-icon">🔍</span>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search teams..." id="team-search" />
        </div>
        <button
          className={`btn btn-ghost btn-sm`}
          onClick={() => setViewMode(v => v === 'grid' ? 'list' : 'grid')}
          id="view-toggle-btn"
          style={{ flexShrink: 0 }}
        >
          {viewMode === 'grid' ? '☰' : '▦'}
        </button>
      </div>

      {/* Teams grid/list */}
      {loading ? (
        <div className="loading-spinner"><div className="spinner" /><span>Loading teams...</span></div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🛡️</div>
          <div className="empty-state-title">No Teams Yet</div>
          <div className="empty-state-desc">Add teams using the button above to start the auction.</div>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="team-grid">
          {filtered.map((team, idx) => (
            <TeamCard key={team.id} team={team} rank={idx + 1} getSpent={getTeamSpent} onClick={() => navigate(`/teams/${team.id}`)} onDelete={userRole === 'host' ? () => handleDeleteTeam(team) : null} />
          ))}
        </div>
      ) : (
        <div>
          {filtered.map((team, idx) => (
            <TeamListItem key={team.id} team={team} rank={idx + 1} getSpent={getTeamSpent} onClick={() => navigate(`/teams/${team.id}`)} onDelete={userRole === 'host' ? () => handleDeleteTeam(team) : null} />
          ))}
        </div>
      )}

      {showModal && (
        <AddTeamModal
          auctionId={activeAuction.id}
          owners={owners}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); loadTeams() }}
        />
      )}
    </div>
  )
}

function TeamCard({ team, rank, getSpent, onClick, onDelete }) {
  const spent = getSpent(team)
  const purseLeft = team.total_purse - spent
  const playerCount = (team.players || []).filter(p => p.status === 'sold').length
  const progress = team.total_purse > 0 ? (spent / team.total_purse) * 100 : 0

  return (
    <div
      className="team-card"
      style={{ '--team-color': team.color }}
      onClick={onClick}
      id={`team-card-${team.id}`}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{
          width: 24, height: 24, borderRadius: 6,
          background: 'rgba(245,166,35,0.2)', color: 'var(--gold)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 12, fontWeight: 700
        }}>{rank}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="badge badge-available" style={{ fontSize: 9 }}>Active</span>
          {onDelete && (
            <button 
              onClick={(e) => { e.stopPropagation(); onDelete(); }} 
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, fontSize: 16 }}
            >
              🗑️
            </button>
          )}
        </div>
      </div>

      <div style={{ textAlign: 'center', marginBottom: 12 }}>
        {team.logo_url ? (
          <img src={team.logo_url} alt={team.name} style={{ width: 48, height: 48, borderRadius: 10, objectFit: 'cover', marginBottom: 6 }} />
        ) : (
          <div style={{
            width: 48, height: 48, borderRadius: 10, margin: '0 auto 6px',
            background: team.color + '33', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 28, border: `1px solid ${team.color}44`
          }}>🛡️</div>
        )}
        <div style={{ fontWeight: 700, fontSize: 15, fontFamily: 'Rajdhani', letterSpacing: 0.5 }}>{team.name}</div>
        {team.owners && (
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{team.owners.name}</div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
        <div>
          <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Purse Left</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: purseLeft < 20 ? 'var(--red)' : 'var(--green)' }}>₹{purseLeft.toFixed(1)}L</div>
        </div>
        <div>
          <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Spent</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)' }}>₹{spent.toFixed(1)}L</div>
        </div>
        <div>
          <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Players</div>
          <div style={{ fontSize: 13, fontWeight: 700 }}>{playerCount}/{team.max_players}</div>
        </div>
      </div>

      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${Math.min(progress, 100)}%`, background: team.color }} />
      </div>

      <div style={{ textAlign: 'center', marginTop: 12 }}>
        <span style={{ fontSize: 11, color: team.color, fontWeight: 600, letterSpacing: 0.5 }}>VIEW TEAM →</span>
      </div>
    </div>
  )
}

function TeamListItem({ team, rank, getSpent, onClick, onDelete }) {
  const spent = getSpent(team)
  const purseLeft = team.total_purse - spent
  const playerCount = (team.players || []).filter(p => p.status === 'sold').length

  return (
    <div
      className="team-card"
      style={{ '--team-color': team.color, display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10, padding: 14 }}
      onClick={onClick}
    >
      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--gold)', width: 20, textAlign: 'center' }}>{rank}</div>
      {team.logo_url ? (
        <img src={team.logo_url} alt={team.name} style={{ width: 44, height: 44, borderRadius: 8, objectFit: 'cover' }} />
      ) : (
        <div style={{ width: 44, height: 44, borderRadius: 8, background: team.color + '33', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>🛡️</div>
      )}
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700, fontSize: 15, fontFamily: 'Rajdhani' }}>{team.name}</div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{team.owners?.name || '—'}</div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--green)' }}>₹{purseLeft.toFixed(1)}L</div>
        <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{playerCount}/{team.max_players} players</div>
      </div>
      {onDelete && (
        <button 
          onClick={(e) => { e.stopPropagation(); onDelete(); }} 
          style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '0 0 0 8px', fontSize: 16 }}
        >
          🗑️
        </button>
      )}
    </div>
  )
}

function AddTeamModal({ auctionId, owners, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: '', owner_id: '', total_purse: '100', max_players: '10', color: '#4a9eff'
  })
  const [logo, setLogo] = useState(null)
  const [logoPreview, setLogoPreview] = useState(null)
  const [loading, setLoading] = useState(false)
  const fileRef = React.useRef()

  function handleLogoChange(e) {
    const file = e.target.files[0]
    if (!file) return
    setLogo(file)
    setLogoPreview(URL.createObjectURL(file))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim()) return showToast('Team name is required', 'error')
    setLoading(true)
    try {
      let logo_url = null
      if (logo) logo_url = await uploadFile(logo, 'teams')
      const { error } = await supabase.from('teams').insert({
        auction_id: auctionId,
        name: form.name.trim(),
        owner_id: form.owner_id || null,
        total_purse: parseFloat(form.total_purse) || 100,
        max_players: parseInt(form.max_players) || 10,
        color: form.color,
        logo_url
      })
      if (error) throw error
      showToast('Team added successfully!', 'success')
      onSaved()
    } catch(err) {
      showToast('Error: ' + err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <div className="modal-title">Add Team</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          {/* Logo */}
          <div className="form-group">
            <label className="form-label">Team Logo</label>
            <div className="photo-upload" onClick={() => fileRef.current.click()}>
              <input ref={fileRef} type="file" accept="image/*" onChange={handleLogoChange} />
              {logoPreview ? (
                <img src={logoPreview} alt="logo" style={{ width: 64, height: 64, borderRadius: 12, objectFit: 'cover', margin: '0 auto 8px', display: 'block' }} />
              ) : (
                <div className="photo-upload-icon">🛡️</div>
              )}
              <div className="photo-upload-text">{logoPreview ? 'Tap to change' : 'Upload team logo'}</div>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Team Name *</label>
            <input className="form-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Warriors" id="team-name-input" />
          </div>

          <div className="form-group">
            <label className="form-label">Owner</label>
            <select className="form-select" value={form.owner_id} onChange={e => setForm(f => ({ ...f, owner_id: e.target.value }))} id="team-owner-select">
              <option value="">Select Owner</option>
              {owners.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
            {owners.length === 0 && (
              <div className="form-hint">No owners registered yet. Add owners in the Sponsors section.</div>
            )}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Total Purse (Lakhs)</label>
              <input className="form-input" type="number" value={form.total_purse} onChange={e => setForm(f => ({ ...f, total_purse: e.target.value }))} placeholder="100" id="team-purse-input" />
            </div>
            <div className="form-group">
              <label className="form-label">Max Players</label>
              <input className="form-input" type="number" value={form.max_players} onChange={e => setForm(f => ({ ...f, max_players: e.target.value }))} placeholder="10" id="team-max-players-input" />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Team Color</label>
            <div className="color-picker-row">
              {TEAM_COLORS.map(color => (
                <div
                  key={color}
                  className={`color-swatch${form.color === color ? ' active' : ''}`}
                  style={{ background: color }}
                  onClick={() => setForm(f => ({ ...f, color }))}
                />
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" className="btn btn-ghost" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" style={{ flex: 2 }} disabled={loading} id="add-team-submit">
              {loading ? 'Adding...' : 'Add Team'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
