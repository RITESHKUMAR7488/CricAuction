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
  const [showModal, setShowModal] = useState(false)
  const [editingTeam, setEditingTeam] = useState(null)
  const [viewMode, setViewMode] = useState('grid')
  const [ownerFilter, setOwnerFilter] = useState('all')
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (!activeAuction) return
    loadTeams()
    loadOwners()

    const channel = supabase
      .channel(`teams-live-${activeAuction.id}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'players',
        filter: `auction_id=eq.${activeAuction.id}`,
      }, () => loadTeams())
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'teams',
        filter: `auction_id=eq.${activeAuction.id}`,
      }, () => loadTeams())
      .subscribe()

    return () => supabase.removeChannel(channel)
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

  const filtered = teams.filter(t => {
    const matchSearch = t.name.toLowerCase().includes(search.toLowerCase())
    const matchOwner = ownerFilter === 'all' || t.owner_id === ownerFilter
    return matchSearch && matchOwner
  })

  // Use common total purse instead of summing them all up
  const totalPurse = teams.length > 0 ? teams[0].total_purse : 0
  const totalSold = teams.reduce((s, t) => s + (t.players?.filter(p => p.status === 'sold').length || 0), 0)

  function getTeamSpent(team) {
    return (team.players || []).filter(p => p.status === 'sold').reduce((s, p) => s + (p.sold_price || 0), 0)
  }

  async function handleDeleteTeam(team) {
    if (!window.confirm(`Delete ${team.name}? All players will become 'available' again.`)) return
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
          <div className="empty-state-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
          </div>
          <div className="empty-state-title">No Auction Selected</div>
          <div className="empty-state-desc">Create or select an auction from the menu to get started.</div>
        </div>
      </div>
    )
  }

  return (
    <div className="page-content">
      {/* Header */}
      <div className="page-header">
        <h1 className="page-title">TEAMS</h1>
        {userRole === 'host' && (
          <button className="btn btn-primary btn-sm" onClick={() => { setEditingTeam(null); setShowModal(true) }} id="add-team-btn">
            + ADD TEAM
          </button>
        )}
      </div>

      {/* Search + Owner filter + View toggle (Moved above Stats) */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <div className="search-bar" style={{ flex: 1, marginBottom: 0 }}>
          <span className="search-icon">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          </span>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search teams..." id="team-search" />
        </div>

        <select
          className="form-select"
          value={ownerFilter}
          onChange={e => setOwnerFilter(e.target.value)}
          style={{ width: 'auto', padding: '10px 28px 10px 10px', fontSize: 12, flexShrink: 0 }}
          id="owner-filter-select"
        >
          <option value="all">All Owners</option>
          {owners.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
        </select>

        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
          <button
            className={`btn btn-sm ${viewMode === 'grid' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setViewMode('grid')}
            id="view-grid-btn"
            style={{ padding: '8px 10px' }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <rect x="1" y="1" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.5"/>
              <rect x="8" y="1" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.5"/>
              <rect x="1" y="8" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.5"/>
              <rect x="8" y="8" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.5"/>
            </svg>
          </button>
          <button
            className={`btn btn-sm ${viewMode === 'list' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setViewMode('list')}
            id="view-list-btn"
            style={{ padding: '8px 10px' }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <rect x="1" y="2" width="12" height="2" rx="1" fill="currentColor"/>
              <rect x="1" y="6" width="12" height="2" rx="1" fill="currentColor"/>
              <rect x="1" y="10" width="12" height="2" rx="1" fill="currentColor"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-row" style={{ marginBottom: 20 }}>
        <div className="stat-item" style={{ background: 'rgba(74,158,255,0.05)', border: '1px solid rgba(74,158,255,0.15)' }}>
          <span className="stat-icon" style={{ color: 'var(--blue)' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          </span>
          <div className="stat-value" style={{ color: '#fff' }}>{teams.length}</div>
          <div className="stat-label" style={{ color: '#fff', fontWeight: 600 }}>Total Teams</div>
        </div>
        <div className="stat-item" style={{ background: 'rgba(245,166,35,0.05)', border: '1px solid rgba(245,166,35,0.15)' }}>
          <span className="stat-icon" style={{ color: 'var(--gold)' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/></svg>
          </span>
          <div className="stat-value" style={{ color: '#fff' }}>₹{totalPurse >= 100 ? (totalPurse / 100).toFixed(2) + ' Cr' : totalPurse + 'L'}</div>
          <div className="stat-label" style={{ color: '#fff', fontWeight: 600 }}>Total Purse</div>
        </div>
        <div className="stat-item" style={{ background: 'rgba(46,204,113,0.05)', border: '1px solid rgba(46,204,113,0.15)' }}>
          <span className="stat-icon" style={{ color: 'var(--green)' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          </span>
          <div className="stat-value" style={{ color: '#fff' }}>{totalSold}</div>
          <div className="stat-label" style={{ color: '#fff', fontWeight: 600 }}>Players Sold</div>
        </div>
      </div>


      {/* Teams grid/list */}
      {loading ? (
        <div className="loading-spinner"><div className="spinner" /><span>Loading teams...</span></div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          </div>
          <div className="empty-state-title">No Teams Yet</div>
          <div className="empty-state-desc">Add teams using the button above to start the auction.</div>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="team-grid">
          {filtered.map((team, idx) => (
            <TeamCard
              key={team.id}
              team={team}
              rank={idx + 1}
              getSpent={getTeamSpent}
              onClick={() => navigate(`/teams/${team.id}`)}
              onEdit={userRole === 'host' ? () => { setEditingTeam(team); setShowModal(true) } : null}
              onDelete={userRole === 'host' ? () => handleDeleteTeam(team) : null}
            />
          ))}
        </div>
      ) : (
        <div>
          {filtered.map((team, idx) => (
            <TeamListItem
              key={team.id}
              team={team}
              rank={idx + 1}
              getSpent={getTeamSpent}
              onClick={() => navigate(`/teams/${team.id}`)}
              onEdit={userRole === 'host' ? () => { setEditingTeam(team); setShowModal(true) } : null}
              onDelete={userRole === 'host' ? () => handleDeleteTeam(team) : null}
            />
          ))}
        </div>
      )}

      {showModal && (
        <AddTeamModal
          auctionId={activeAuction.id}
          owners={owners}
          editTeam={editingTeam}
          onClose={() => { setShowModal(false); setEditingTeam(null) }}
          onSaved={() => { setShowModal(false); setEditingTeam(null); loadTeams() }}
        />
      )}
    </div>
  )
}

function TeamCard({ team, rank, getSpent, onClick, onEdit, onDelete }) {
  const spent = getSpent(team)
  const purseLeft = team.total_purse - spent
  const playerCount = (team.players || []).filter(p => p.status === 'sold').length
  const progress = team.total_purse > 0 ? (spent / team.total_purse) * 100 : 0
  const tc = team.color || 'var(--blue)'

  return (
    <div
      className="team-card"
      style={{ '--team-color': tc, background: tc + '22', borderColor: tc + '44' }}
      onClick={onClick}
      id={`team-card-${team.id}`}
    >
      {/* Top row: rank + actions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{
          width: 26, height: 26, borderRadius: 7,
          background: tc + '33',
          border: `1px solid ${tc}55`,
          color: tc,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 12, fontWeight: 800,
        }}>{rank}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {onEdit && (
            <button
              onClick={(e) => { e.stopPropagation(); onEdit() }}
              style={{ background: 'transparent', border: 'none', color: 'var(--blue)', cursor: 'pointer', padding: '4px', fontSize: 14 }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
            </button>
          )}
          {onDelete && (
            <button
              onClick={(e) => { e.stopPropagation(); onDelete() }}
              style={{ background: 'transparent', border: 'none', color: 'var(--red)', cursor: 'pointer', padding: '4px', fontSize: 16 }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            </button>
          )}
        </div>
      </div>

      {/* Logo + name + owner */}
      <div style={{ textAlign: 'center', marginBottom: 14 }}>
        {team.logo_url ? (
          <img src={team.logo_url} alt={team.name} style={{
            width: 52, height: 52, borderRadius: 12, objectFit: 'cover',
            marginBottom: 8, border: `2px solid ${tc}44`
          }} />
        ) : (
          <div style={{
            width: 52, height: 52, borderRadius: 12, margin: '0 auto 8px',
            background: tc + '20', display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: 24,
            border: `1px solid ${tc}33`
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          </div>
        )}
        <div style={{ fontWeight: 700, fontSize: 15, fontFamily: 'Rajdhani', letterSpacing: 0.5 }}>{team.name}</div>
        {team.owners && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, marginTop: 4 }}>
            {team.owners.photo_url ? (
              <img src={team.owners.photo_url} alt={team.owners.name} style={{ width: 18, height: 18, borderRadius: '50%', objectFit: 'cover' }} />
            ) : (
              <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
              </div>
            )}
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{team.owners.name}</span>
          </div>
        )}
      </div>

      {/* Stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4, marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: 8, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>Purse Left</div>
          <div style={{ fontSize: 12, fontWeight: 700, color: purseLeft < 20 ? 'var(--red)' : 'var(--green)' }}>
            ₹{purseLeft.toFixed(1)}L
          </div>
        </div>
        <div>
          <div style={{ fontSize: 8, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>Spent</div>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)' }}>₹{spent.toFixed(1)}L</div>
        </div>
        <div>
          <div style={{ fontSize: 8, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>Players</div>
          <div style={{ fontSize: 12, fontWeight: 700 }}>{playerCount}/{team.max_players}</div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${Math.min(progress, 100)}%`, background: tc }} />
      </div>

      {/* View Team link */}
      <div style={{ textAlign: 'center', marginTop: 12 }}>
        <span style={{ fontSize: 11, color: tc, fontWeight: 700, letterSpacing: 0.5 }}>VIEW TEAM →</span>
      </div>
    </div>
  )
}

function TeamListItem({ team, rank, getSpent, onClick, onEdit, onDelete }) {
  const spent = getSpent(team)
  const purseLeft = team.total_purse - spent
  const playerCount = (team.players || []).filter(p => p.status === 'sold').length
  const tc = team.color || 'var(--blue)'

  return (
    <div
      className="team-card"
      style={{
        '--team-color': tc,
        display: 'flex', alignItems: 'center', gap: 12,
        marginBottom: 10, padding: 14
      }}
      onClick={onClick}
    >
      <div style={{ fontSize: 13, fontWeight: 800, color: tc, width: 22, textAlign: 'center', flexShrink: 0 }}>{rank}</div>
      {team.logo_url ? (
        <img src={team.logo_url} alt={team.name} style={{ width: 44, height: 44, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }} />
      ) : (
        <div style={{ width: 44, height: 44, borderRadius: 10, background: tc + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 15, fontFamily: 'Rajdhani' }}>{team.name}</div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{team.owners?.name || '—'}</div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--green)' }}>₹{purseLeft.toFixed(1)}L</div>
        <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{playerCount}/{team.max_players} players</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, paddingLeft: 4 }}>
        {onEdit && (
          <button
            onClick={e => { e.stopPropagation(); onEdit() }}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--blue)', padding: '4px' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
          </button>
        )}
        {onDelete && (
          <button
            onClick={e => { e.stopPropagation(); onDelete() }}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--red)', padding: '4px' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
        )}
        <div style={{ color: 'var(--text-muted)', fontSize: 18, paddingLeft: 4 }}>›</div>
      </div>
    </div>
  )
}

function AddTeamModal({ auctionId, owners, editTeam, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: editTeam?.name || '', 
    owner_id: editTeam?.owner_id || '', 
    total_purse: editTeam?.total_purse?.toString() || '100', 
    max_players: editTeam?.max_players?.toString() || '10', 
    color: editTeam?.color || '#4a9eff'
  })
  const [logo, setLogo] = useState(null)
  const [logoPreview, setLogoPreview] = useState(editTeam?.logo_url || null)
  const [loading, setLoading] = useState(false)
  const fileRef = React.useRef()

  useEffect(() => {
    return () => { if (logoPreview && !logoPreview.startsWith('http')) URL.revokeObjectURL(logoPreview) }
  }, [logoPreview])

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
      let logo_url = editTeam?.logo_url || null
      if (logo) logo_url = await uploadFile(logo, 'teams')
      
      const payload = {
        auction_id: auctionId,
        name: form.name.trim(),
        owner_id: form.owner_id || null,
        total_purse: parseFloat(form.total_purse) || 100,
        max_players: parseInt(form.max_players) || 10,
        color: form.color,
        logo_url
      }

      let error;
      if (editTeam) {
        const res = await supabase.from('teams').update(payload).eq('id', editTeam.id)
        error = res.error
      } else {
        const res = await supabase.from('teams').insert(payload)
        error = res.error
      }
      
      if (error) throw error
      showToast(editTeam ? 'Team updated successfully!' : 'Team added successfully!', 'success')
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
          <div className="modal-title">{editTeam ? 'Edit Team' : 'Add Team'}</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Team Logo</label>
            <div className="photo-upload" onClick={() => fileRef.current.click()}>
              <input ref={fileRef} type="file" accept="image/*" onChange={handleLogoChange} />
              {logoPreview ? (
                <img src={logoPreview} alt="logo" style={{ width: 64, height: 64, borderRadius: 12, objectFit: 'cover', margin: '0 auto 8px', display: 'block' }} />
              ) : (
                <div className="photo-upload-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                </div>
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

          <div className="form-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Saving...' : (editTeam ? 'Save Changes' : 'Create Team')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
