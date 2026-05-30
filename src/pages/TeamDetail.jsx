import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useApp } from '../context/AppContext'
import { showToast } from '../components/Toast'
import { roleColors } from '../constants'

export default function TeamDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { userRole } = useApp()
  const [team, setTeam] = useState(null)
  const [players, setPlayers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddPlayer, setShowAddPlayer] = useState(false)

  useEffect(() => {
    loadTeam()

    // Real-time: squad list and purse bar update as players are sold to this team
    const channel = supabase
      .channel(`team-detail-live-${id}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'players',
        filter: `team_id=eq.${id}`,
      }, () => loadTeam())
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'teams',
        filter: `id=eq.${id}`,
      }, () => loadTeam())
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [id])

  async function loadTeam() {
    const { data: teamData } = await supabase
      .from('teams')
      .select('*, owners(name, photo_url)')
      .eq('id', id)
      .single()
    setTeam(teamData)

    const { data: playerData } = await supabase
      .from('players')
      .select('*')
      .eq('team_id', id)
      .eq('status', 'sold')
      .order('sold_price', { ascending: false })
    setPlayers(playerData || [])
    setLoading(false)
  }

  async function handleRemovePlayer(e, player) {
    e.stopPropagation()
    if (!window.confirm(`Remove ${player.name} from ${team.name}? They will return to the auction.`)) return
    try {
      const { error } = await supabase.from('players').update({ status: 'available', team_id: null, sold_price: null }).eq('id', player.id)
      if (error) throw error
      showToast('Player removed from team', 'info')
      loadTeam()
    } catch(err) {
      showToast('Error removing player', 'error')
    }
  }

  if (loading) return <div className="page-content"><div className="loading-spinner"><div className="spinner" /></div></div>
  if (!team) return <div className="page-content"><div className="empty-state"><div className="empty-state-title">Team not found</div></div></div>

  const spent = players.reduce((s, p) => s + (p.sold_price || 0), 0)
  const purseLeft = team.total_purse - spent
  const progress = team.total_purse > 0 ? (spent / team.total_purse) * 100 : 0

  return (
    <div className="page-content" style={{ paddingTop: 0 }}>
      {/* Back Button & Header */}
      <div className="page-header" style={{ marginBottom: 16 }}>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)} style={{ padding: 0, color: 'var(--text-secondary)' }}>
          <span style={{ fontSize: 18, marginRight: 4 }}>←</span> Back
        </button>
      </div>

      {/* Team Header */}
      <div style={{
        background: `linear-gradient(135deg, ${team.color}22, var(--bg-card))`,
        border: `1px solid ${team.color}44`,
        borderRadius: 'var(--radius-xl)',
        padding: 20,
        marginBottom: 16,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {team.logo_url ? (
            <img src={team.logo_url} alt={team.name} style={{ width: 72, height: 72, borderRadius: 14, objectFit: 'cover' }} />
          ) : (
            <div style={{ width: 72, height: 72, borderRadius: 14, background: team.color + '33', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36 }}>🛡️</div>
          )}
          <div>
            <div style={{ fontFamily: 'Rajdhani', fontSize: 24, fontWeight: 800, letterSpacing: 1 }}>{team.name}</div>
            {team.owners && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                {team.owners.photo_url && (
                  <img src={team.owners.photo_url} alt={team.owners.name} style={{ width: 24, height: 24, borderRadius: '50%', objectFit: 'cover' }} />
                )}
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{team.owners.name}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Purse Stats */}
      <div className="stats-row" style={{ marginBottom: 16 }}>
        <div className="stat-item">
          <div className="stat-value" style={{ color: purseLeft < 20 ? 'var(--red)' : 'var(--green)' }}>₹{purseLeft.toFixed(1)}L</div>
          <div className="stat-label">Purse Left</div>
        </div>
        <div className="stat-item">
          <div className="stat-value" style={{ color: 'var(--text-secondary)' }}>₹{spent.toFixed(1)}L</div>
          <div className="stat-label">Spent</div>
        </div>
        <div className="stat-item">
          <div className="stat-value">{players.length}/{team.max_players}</div>
          <div className="stat-label">Players</div>
        </div>
      </div>

      {/* Progress */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Budget Used</span>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{Math.round(progress)}%</span>
        </div>
        <div className="progress-bar" style={{ height: 6 }}>
          <div className="progress-fill" style={{ width: `${Math.min(progress, 100)}%`, background: team.color }} />
        </div>
      </div>

      {/* Players */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 1 }}>
          Squad ({players.length})
        </div>
        {userRole === 'host' && (
          <button className="btn btn-primary btn-sm" onClick={() => setShowAddPlayer(true)}>
            + ADD PLAYER
          </button>
        )}
      </div>

      {players.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">👤</div>
          <div className="empty-state-title">No Players Yet</div>
          <div className="empty-state-desc">Players will appear here after they are sold to this team in the auction.</div>
        </div>
      ) : (
        players.map(player => (
          <div
            key={player.id}
            className="card"
            style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10, cursor: 'pointer' }}
            onClick={() => navigate(`/players/${player.id}`)}
          >
            {player.photo_url ? (
              <img src={player.photo_url} alt={player.name} style={{ width: 48, height: 48, borderRadius: 10, objectFit: 'cover' }} />
            ) : (
              <div style={{ width: 48, height: 48, borderRadius: 10, background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>👤</div>
            )}
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontFamily: 'Rajdhani', fontSize: 16 }}>{player.name}</div>
              <div style={{ fontSize: 12, color: roleColors[player.role] || 'var(--blue)' }}>{player.role}</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{player.code}</div>
            </div>
            <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--gold)' }}>₹{player.sold_price}L</div>
              <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Sold For</div>
              {userRole === 'host' && (
                <button 
                  onClick={(e) => handleRemovePlayer(e, player)} 
                  style={{ background: 'transparent', border: 'none', color: 'var(--red)', fontSize: 11, fontWeight: 600, cursor: 'pointer', padding: '4px 0 0', marginTop: 4, textTransform: 'uppercase' }}
                >
                  ✕ Remove
                </button>
              )}
            </div>
          </div>
        ))
      )}
      {showAddPlayer && (
        <AddPlayerModal 
          team={team} 
          onClose={() => setShowAddPlayer(false)} 
          onSaved={() => { setShowAddPlayer(false); loadTeam() }} 
        />
      )}
    </div>
  )
}

function AddPlayerModal({ team, onClose, onSaved }) {
  const [availablePlayers, setAvailablePlayers] = useState([])
  const [selectedPlayerId, setSelectedPlayerId] = useState('')
  const [soldPrice, setSoldPrice] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    async function loadAvail() {
      const { data } = await supabase.from('players')
        .select('id, name, code, role')
        .eq('auction_id', team.auction_id)
        .eq('status', 'available')
        .order('name')
      setAvailablePlayers(data || [])
    }
    loadAvail()
  }, [team.auction_id])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!selectedPlayerId) return showToast('Select a player', 'error')
    if (!soldPrice || isNaN(soldPrice)) return showToast('Enter a valid price', 'error')
    
    setLoading(true)
    try {
      const { error } = await supabase.from('players').update({
        status: 'sold',
        team_id: team.id,
        sold_price: parseFloat(soldPrice)
      }).eq('id', selectedPlayerId)
      if (error) throw error
      showToast('Player manually added to team!', 'success')
      onSaved()
    } catch(err) {
      showToast(err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <div className="modal-title">Manual Add Player</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Select Available Player</label>
            <select 
              className="form-input" 
              value={selectedPlayerId} 
              onChange={e => setSelectedPlayerId(e.target.value)}
              required
            >
              <option value="">-- Choose Player --</option>
              {availablePlayers.map(p => (
                <option key={p.id} value={p.id}>{p.name} ({p.role} - {p.code})</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Sold Price (Lakhs)</label>
            <input 
              type="number" 
              step="0.01" 
              className="form-input" 
              placeholder="e.g. 5.50" 
              value={soldPrice} 
              onChange={e => setSoldPrice(e.target.value)}
              required 
            />
          </div>
          <div className="form-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Adding...' : 'Add Player'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
