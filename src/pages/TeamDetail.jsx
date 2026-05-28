import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useApp } from '../context/AppContext'
import { showToast } from '../components/Toast'

const roleColors = {
  'Batter': 'var(--blue)',
  'Bowler': 'var(--purple)',
  'All Rounder': 'var(--gold)',
  'Wicket Keeper': 'var(--cyan)',
}

export default function TeamDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { userRole } = useApp()
  const [team, setTeam] = useState(null)
  const [players, setPlayers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadTeam() }, [id])

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

  if (loading) return <div className="page-content"><div className="loading-spinner"><div className="spinner" /></div></div>
  if (!team) return <div className="page-content"><div className="empty-state"><div className="empty-state-title">Team not found</div></div></div>

  const spent = players.reduce((s, p) => s + (p.sold_price || 0), 0)
  const purseLeft = team.total_purse - spent
  const progress = team.total_purse > 0 ? (spent / team.total_purse) * 100 : 0

  return (
    <div className="page-content" style={{ paddingTop: 16 }}>
      <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)} style={{ marginBottom: 16 }}>← Back</button>

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
      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
        Squad ({players.length})
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
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--gold)' }}>₹{player.sold_price}L</div>
              <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Sold For</div>
            </div>
          </div>
        ))
      )}
    </div>
  )
}
