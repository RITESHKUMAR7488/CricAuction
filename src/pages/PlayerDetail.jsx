import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useApp } from '../context/AppContext'
import { showToast } from '../components/Toast'
import { roleColors } from '../constants'
import PlayerFormModal from '../components/PlayerFormModal'

export default function PlayerDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { userRole } = useApp()
  const [player, setPlayer] = useState(null)
  const [team, setTeam] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showEditModal, setShowEditModal] = useState(false)

  useEffect(() => {
    loadPlayer()
  }, [id])

  async function loadPlayer() {
    const { data } = await supabase
      .from('players')
      .select('*, teams(name, color, logo_url)')
      .eq('id', id)
      .single()
    if (data) {
      setPlayer(data)
      if (data.teams) setTeam(data.teams)
    }
    setLoading(false)
  }

  async function handleDelete() {
    if (!window.confirm('Are you sure you want to delete this player?')) return
    const { error } = await supabase.from('players').delete().eq('id', player.id)
    if (error) {
      showToast('Error deleting player', 'error')
    } else {
      showToast('Player deleted', 'success')
      navigate(-1)
    }
  }

  if (loading) return (
    <div className="page-content">
      <div className="loading-spinner"><div className="spinner" /></div>
    </div>
  )

  if (!player) return (
    <div className="page-content">
      <div className="empty-state"><div className="empty-state-title">Player not found</div></div>
    </div>
  )

  const roleColor = roleColors[player.role] || 'var(--blue)'
  const isBowler = player.role === 'Bowler'

  return (
    <div className="page-content" style={{ paddingTop: 0 }}>
      {/* Back Button & Header */}
      <div className="page-header" style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)} style={{ padding: 0, color: 'var(--text-secondary)' }}>
          <span style={{ fontSize: 18, marginRight: 4 }}>←</span> Back
        </button>
        {userRole === 'host' && (
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-ghost btn-sm" onClick={() => setShowEditModal(true)} style={{ padding: '6px 12px', color: 'var(--blue)' }}>
              Edit
            </button>
            <button className="btn btn-ghost btn-sm" onClick={handleDelete} style={{ padding: '6px 12px', color: 'var(--red)' }}>
              Delete
            </button>
          </div>
        )}
      </div>

      {/* Player hero card */}
      <div style={{
        background: `linear-gradient(135deg, ${roleColor}22, var(--bg-card))`,
        border: `1px solid ${roleColor}44`,
        borderRadius: 'var(--radius-xl)',
        padding: 24,
        marginBottom: 16,
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{
          position: 'absolute', top: 0, right: 0, bottom: 0, width: '40%',
          background: `radial-gradient(circle at right, ${roleColor}15, transparent)`,
          pointerEvents: 'none'
        }} />

        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
          <div style={{ position: 'relative' }}>
            {player.photo_url ? (
              <img
                src={player.photo_url}
                alt={player.name}
                style={{ width: 100, height: 100, borderRadius: 16, objectFit: 'cover', border: `2px solid ${roleColor}44` }}
              />
            ) : (
              <div style={{
                width: 100, height: 100, borderRadius: 16,
                background: 'var(--bg-secondary)', display: 'flex',
                alignItems: 'center', justifyContent: 'center', fontSize: 48,
                border: `2px solid ${roleColor}44`
              }}>👤</div>
            )}
            <div style={{
              position: 'absolute', bottom: -8, left: '50%', transform: 'translateX(-50%)',
              background: 'var(--blue-dark)', color: 'white', fontSize: 10, fontWeight: 700,
              padding: '2px 8px', borderRadius: 4, whiteSpace: 'nowrap'
            }}>{player.code}</div>
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 26, fontWeight: 800, fontFamily: 'Rajdhani', letterSpacing: 1, lineHeight: 1 }}>
              {player.name}
            </div>
            <div style={{ color: roleColor, fontWeight: 600, fontSize: 14, marginTop: 4, marginBottom: 12 }}>
              {player.role}
            </div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <span className={`badge badge-${player.status}`}>{player.status.toUpperCase()}</span>
              {team && (
                <span className="badge" style={{
                  background: `${team.color}22`,
                  color: team.color,
                  borderColor: `${team.color}44`
                }}>{team.name}</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Price info */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Base Price</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--gold)' }}>₹ {player.base_price} L</div>
        </div>
        {player.status === 'sold' && (
          <div className="card" style={{ textAlign: 'center', background: 'rgba(39,174,96,0.08)', borderColor: 'rgba(39,174,96,0.2)' }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Sold For</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--green)' }}>₹ {player.sold_price} L</div>
          </div>
        )}
        {player.status !== 'sold' && (
          <div className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Status</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: player.status === 'available' ? 'var(--green)' : 'var(--text-muted)' }}>
              {player.status.charAt(0).toUpperCase() + player.status.slice(1)}
            </div>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 }}>
          Player Stats
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          {[
            { label: 'Age', value: player.age || '—' },
            { label: 'Style', value: player.style || '—' },
            { label: 'Matches', value: player.matches || '0' },
            !isBowler && { label: 'Strike Rate', value: player.strike_rate || '—' },
            isBowler && { label: 'Economy', value: player.economy || '—' },
            !isBowler && { label: 'Role', value: player.role },
          ].filter(Boolean).map((stat, i) => (
            <div key={i} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>{stat.value}</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 2 }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Team info if sold */}
      {team && (
        <div className="card" style={{ background: `${team.color}11`, borderColor: `${team.color}33` }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Bought By</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {team.logo_url ? (
              <img src={team.logo_url} alt={team.name} style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover' }} />
            ) : (
              <div style={{ width: 40, height: 40, borderRadius: 8, background: team.color + '33', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🛡️</div>
            )}
            <div>
              <div style={{ fontWeight: 700, fontSize: 16 }}>{team.name}</div>
              <div style={{ color: 'var(--gold)', fontWeight: 600 }}>₹ {player.sold_price} L</div>
            </div>
          </div>
        </div>
      )}

      {showEditModal && (
        <PlayerFormModal
          auctionId={player.auction_id}
          editPlayer={player}
          onClose={() => setShowEditModal(false)}
          onSaved={() => { setShowEditModal(false); loadPlayer() }}
        />
      )}
    </div>
  )
}
