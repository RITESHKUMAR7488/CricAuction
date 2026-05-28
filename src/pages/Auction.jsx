import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useApp } from '../context/AppContext'
import { showToast } from '../components/Toast'
import { exportAuctionPDF, exportAuctionCSV } from '../lib/exportUtils'

export default function Auction() {
  const { activeAuction, leagueName, userRole } = useApp()
  const navigate = useNavigate()
  const [teams, setTeams] = useState([])
  const [players, setPlayers] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedPlayer, setSelectedPlayer] = useState(null)
  const [showBidding, setShowBidding] = useState(false)
  const [spinning, setSpinning] = useState(false)

  useEffect(() => {
    if (activeAuction) {
      loadData()
    }
  }, [activeAuction])

  async function loadData() {
    setLoading(true)
    const [{ data: teamsData }, { data: playersData }] = await Promise.all([
      supabase.from('teams').select('*, players(id, status, sold_price), owners(name)').eq('auction_id', activeAuction.id).order('created_at'),
      supabase.from('players').select('*').eq('auction_id', activeAuction.id).order('code'),
    ])
    setTeams(teamsData || [])
    setPlayers(playersData || [])
    setLoading(false)
  }

  const availablePlayers = players.filter(p => p.status === 'available')
  const soldPlayers = players.filter(p => p.status === 'sold')
  const totalSpent = teams.reduce((s, t) => {
    const tSpent = (t.players || []).filter(p => p.status === 'sold').reduce((ss, p) => ss + (p.sold_price || 0), 0)
    return s + tSpent
  }, 0)

  function getTeamSpent(team) {
    return (team.players || []).filter(p => p.status === 'sold').reduce((s, p) => s + (p.sold_price || 0), 0)
  }

  function handleSpinResult(playerCode) {
    const player = players.find(p => p.code === playerCode)
    if (player) {
      setSelectedPlayer(player)
      setShowBidding(true)
    }
  }

  async function handleSold(playerId, teamId, soldPrice) {
    try {
      await supabase.from('players').update({
        status: 'sold', team_id: teamId, sold_price: soldPrice
      }).eq('id', playerId)
      showToast('Player sold! 🔨', 'success')
      setShowBidding(false)
      setSelectedPlayer(null)
      loadData()
    } catch(e) {
      showToast('Error: ' + e.message, 'error')
    }
  }

  async function handleUnsold(playerId) {
    await supabase.from('players').update({ status: 'unsold' }).eq('id', playerId)
    showToast('Player marked unsold', 'info')
    setShowBidding(false)
    setSelectedPlayer(null)
    loadData()
  }

  const [exporting, setExporting] = useState(false)

  async function handleExportPDF() {
    if (!activeAuction) return
    setExporting(true)
    try { await exportAuctionPDF(activeAuction.id, leagueName) }
    catch(e) { showToast('Export error: ' + e.message, 'error') }
    finally { setExporting(false) }
  }

  if (!activeAuction) {
    return (
      <div className="page-content" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>⚡</div>
        <div style={{ fontFamily: 'Rajdhani', fontSize: 24, fontWeight: 700, marginBottom: 8 }}>No Auction Active</div>
        <div style={{ color: 'var(--text-muted)', textAlign: 'center', marginBottom: 24, fontSize: 14 }}>
          Create or select an auction from the menu to start bidding
        </div>
        <div style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Tap ☰ in the top right</div>
      </div>
    )
  }

  return (
    <div className="page-content">
      {/* Desktop two-column wrapper */}
      <div className="auction-desktop-grid">
        {/* LEFT COLUMN — teams overview + stats */}
        <div>
          {/* Teams Purse Overview */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 1 }}>
                TEAMS & PURSE OVERVIEW
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => navigate('/teams')} style={{ fontSize: 10 }}>VIEW ALL →</button>
            </div>
            <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 6, scrollbarWidth: 'none' }}>
              {loading ? (
                <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Loading teams...</div>
              ) : teams.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>No teams yet. Add teams first.</div>
              ) : (
                teams.map(team => {
                  const spent = getTeamSpent(team)
                  const purseLeft = team.total_purse - spent
                  const playerCount = (team.players || []).filter(p => p.status === 'sold').length
                  return (
                    <div
                      key={team.id}
                      onClick={() => navigate(`/teams/${team.id}`)}
                      style={{
                        background: `${team.color}15`,
                        border: `1px solid ${team.color}44`,
                        borderRadius: 12,
                        padding: '12px 14px',
                        minWidth: 110,
                        flexShrink: 0,
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                    >
                      {team.logo_url ? (
                        <img src={team.logo_url} alt={team.name} style={{ width: 36, height: 36, borderRadius: 8, objectFit: 'cover', marginBottom: 6, display: 'block' }} />
                      ) : (
                        <div style={{ width: 36, height: 36, borderRadius: 8, background: team.color + '33', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, marginBottom: 6 }}>🛡️</div>
                      )}
                      <div style={{ fontSize: 12, fontWeight: 700, fontFamily: 'Rajdhani', letterSpacing: 0.5, marginBottom: 2 }}>
                        {team.name.toUpperCase()}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 6 }}>
                        {playerCount}/{team.max_players} players
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: purseLeft < 20 ? 'var(--red)' : 'var(--green)' }}>
                        ₹{purseLeft.toFixed(1)}L
                      </div>
                      <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Purse Left</div>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          {/* Stats bar */}
          <div className="stats-row" style={{ marginBottom: 16 }}>
            <div className="stat-item">
              <span className="stat-icon" style={{ color: 'var(--green)' }}>🔨</span>
              <div className="stat-value">{soldPlayers.length}</div>
              <div className="stat-label">Players Sold</div>
            </div>
            <div className="stat-item">
              <span className="stat-icon" style={{ color: 'var(--gold)' }}>💰</span>
              <div className="stat-value">₹{totalSpent.toFixed(1)}L</div>
              <div className="stat-label">Total Spent</div>
            </div>
            <div className="stat-item">
              <span className="stat-icon" style={{ color: 'var(--blue)' }}>🎯</span>
              <div className="stat-value">{soldPlayers.length}/{players.length}</div>
              <div className="stat-label">Total Players</div>
            </div>
          </div>

          {/* Download quick access */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <button
              className="btn btn-ghost btn-sm"
              onClick={handleExportPDF}
              disabled={exporting}
              id="auction-download-pdf-btn"
              style={{ flex: 1, justifyContent: 'center' }}
            >
              {exporting ? '⏳ Generating...' : '📄 PDF Report'}
            </button>
            <button
              className="btn btn-ghost btn-sm"
              onClick={async () => {
                setExporting(true)
                try { await exportAuctionCSV(activeAuction.id, leagueName) }
                catch(e) { showToast('Error: ' + e.message, 'error') }
                finally { setExporting(false) }
              }}
              disabled={exporting}
              id="auction-download-csv-btn"
              style={{ flex: 1, justifyContent: 'center' }}
            >
              {exporting ? '⏳' : '📊 CSV Files'}
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN — Spin Wheel */}
        <div>
          {availablePlayers.length > 0 ? (
            <SpinWheel
              players={availablePlayers}
              spinning={spinning}
              setSpinning={setSpinning}
              onResult={handleSpinResult}
              disabled={userRole !== 'host'}
            />
          ) : (
            <div className="empty-state" style={{ minHeight: 300 }}>
              <div style={{ fontSize: 64 }}>🎉</div>
              <div className="empty-state-title">Auction Complete!</div>
              <div className="empty-state-desc">
                {players.length === 0
                  ? 'Register players in the Players section to start the auction.'
                  : 'All players have been auctioned.'}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bidding Modal */}
      {showBidding && selectedPlayer && (
        <BiddingModal
          player={selectedPlayer}
          teams={teams}
          onSold={handleSold}
          onUnsold={handleUnsold}
          onClose={() => { setShowBidding(false); setSelectedPlayer(null) }}
          getTeamSpent={getTeamSpent}
        />
      )}
    </div>
  )
}

// ===================== SPIN WHEEL =====================
const WHEEL_COLORS = [
  '#4a9eff', '#9b59b6', '#f5a623', '#27ae60',
  '#e74c3c', '#00d4aa', '#e67e22', '#1abc9c',
  '#3498db', '#8e44ad', '#16a085', '#c0392b',
]

function SpinWheel({ players, spinning, setSpinning, onResult, disabled }) {
  const canvasRef = useRef(null)
  const animRef = useRef(null)
  const angleRef = useRef(0)
  const [resultCode, setResultCode] = useState(null)

  // Use up to 16 players on the wheel
  const wheelPlayers = players.slice(0, 16)
  const numSegments = wheelPlayers.length
  const segAngle = (2 * Math.PI) / numSegments

  const drawWheel = useCallback((angle) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const cx = canvas.width / 2
    const cy = canvas.height / 2
    const r = cx - 8

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Outer glow ring
    const grd = ctx.createRadialGradient(cx, cy, r - 10, cx, cy, r + 4)
    grd.addColorStop(0, 'rgba(245,166,35,0.6)')
    grd.addColorStop(1, 'rgba(245,166,35,0)')
    ctx.beginPath()
    ctx.arc(cx, cy, r + 2, 0, 2 * Math.PI)
    ctx.strokeStyle = grd
    ctx.lineWidth = 8
    ctx.stroke()

    // Draw segments
    for (let i = 0; i < numSegments; i++) {
      const startAngle = angle + i * segAngle
      const endAngle = startAngle + segAngle

      ctx.beginPath()
      ctx.moveTo(cx, cy)
      ctx.arc(cx, cy, r, startAngle, endAngle)
      ctx.closePath()
      ctx.fillStyle = WHEEL_COLORS[i % WHEEL_COLORS.length]
      ctx.fill()
      ctx.strokeStyle = 'rgba(0,0,0,0.3)'
      ctx.lineWidth = 1.5
      ctx.stroke()

      // Segment text
      ctx.save()
      ctx.translate(cx, cy)
      ctx.rotate(startAngle + segAngle / 2)
      ctx.fillStyle = 'rgba(255,255,255,0.95)'
      ctx.font = `bold ${numSegments > 10 ? 11 : 13}px Inter`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.shadowColor = 'rgba(0,0,0,0.5)'
      ctx.shadowBlur = 3
      ctx.fillText(wheelPlayers[i].code, r * 0.65, 0)
      ctx.restore()
    }

    // Center circle
    ctx.beginPath()
    ctx.arc(cx, cy, 48, 0, 2 * Math.PI)
    const centerGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 48)
    centerGrad.addColorStop(0, '#1a1f2e')
    centerGrad.addColorStop(1, '#0e1118')
    ctx.fillStyle = centerGrad
    ctx.fill()
    ctx.strokeStyle = 'rgba(245,166,35,0.4)'
    ctx.lineWidth = 2
    ctx.stroke()

    // Center text
    ctx.fillStyle = spinning ? 'var(--gold)' : '#fff'
    ctx.font = 'bold 11px Inter'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(spinning ? 'SPINNING' : 'TAP TO', cx, cy - 7)
    ctx.fillStyle = 'var(--gold)'
    ctx.font = 'bold 15px Rajdhani'
    ctx.fillText('SPIN', cx, cy + 9)
  }, [wheelPlayers, numSegments, segAngle, spinning])

  useEffect(() => {
    drawWheel(angleRef.current)
  }, [drawWheel])

  function spin() {
    if (spinning || wheelPlayers.length === 0 || disabled) return
    setSpinning(true)
    setResultCode(null)

    const targetIdx = Math.floor(Math.random() * wheelPlayers.length)
    const fullRotations = (8 + Math.random() * 8) * 2 * Math.PI
    // Land on center of target segment
    const targetAngle = -(targetIdx * segAngle + segAngle / 2) + (Math.PI / 2 * 3)
    const finalAngle = (Math.round(fullRotations / (2 * Math.PI)) * 2 * Math.PI) + targetAngle

    const duration = 4000 + Math.random() * 2000
    const startAngle = angleRef.current
    const startTime = performance.now()

    function easeOut(t) {
      return 1 - Math.pow(1 - t, 4)
    }

    function frame(now) {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      const easedProgress = easeOut(progress)
      const currentAngle = startAngle + (finalAngle - startAngle) * easedProgress
      angleRef.current = currentAngle
      drawWheel(currentAngle)

      if (progress < 1) {
        animRef.current = requestAnimationFrame(frame)
      } else {
        angleRef.current = finalAngle
        setSpinning(false)
        const code = wheelPlayers[targetIdx].code
        setResultCode(code)
        setTimeout(() => onResult(code), 600)
      }
    }

    animRef.current = requestAnimationFrame(frame)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      {/* Draw Label */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16,
        color: 'var(--gold)', fontFamily: 'Rajdhani', fontSize: 15, fontWeight: 700, letterSpacing: 2
      }}>
        <span>→</span> NEXT PLAYER DRAW <span>←</span>
      </div>

      {/* Pointer */}
      <div style={{ position: 'relative', width: '100%', display: 'flex', justifyContent: 'center' }}>
        <div style={{
          position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)',
          width: 0, height: 0, zIndex: 10,
          borderLeft: '10px solid transparent',
          borderRight: '10px solid transparent',
          borderTop: '24px solid var(--gold)',
          filter: 'drop-shadow(0 0 8px rgba(245,166,35,0.8))'
        }} />
        <canvas
          ref={canvasRef}
          width={300}
          height={300}
          style={{ cursor: spinning || disabled ? 'default' : 'pointer', maxWidth: '100%', filter: 'drop-shadow(0 0 24px rgba(0,0,0,0.6))', opacity: disabled ? 0.7 : 1 }}
          onClick={spin}
        />
      </div>

      {resultCode && (
        <div style={{
          marginTop: 16,
          background: 'rgba(245,166,35,0.1)',
          border: '1px solid rgba(245,166,35,0.3)',
          borderRadius: 12,
          padding: '10px 20px',
          textAlign: 'center',
          animation: 'fadeIn 0.4s ease'
        }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 2 }}>Selected</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--gold)', fontFamily: 'Rajdhani' }}>{resultCode}</div>
        </div>
      )}

      <div style={{ marginTop: 12, color: 'var(--text-muted)', fontSize: 12, textAlign: 'center' }}>
        {wheelPlayers.length} players available{wheelPlayers.length < (players?.length || 0) ? ' — showing first 16' : ''}
      </div>
    </div>
  )
}

// ===================== BIDDING MODAL =====================
function BiddingModal({ player, teams, onSold, onUnsold, onClose, getTeamSpent }) {
  const [currentBid, setCurrentBid] = useState(player.base_price)
  const [selectedTeam, setSelectedTeam] = useState(null)
  const [bidHistory, setBidHistory] = useState([{ amount: player.base_price, label: 'Base Price' }])

  const BID_INCREMENTS = [0.25, 0.5, 1, 2, 5]

  function placeBid(team, increment) {
    const newBid = parseFloat((currentBid + increment).toFixed(2))
    const teamSpent = getTeamSpent(team)
    const purseLeft = team.total_purse - teamSpent
    if (newBid > purseLeft) {
      showToast(`${team.name} doesn't have enough purse!`, 'error')
      return
    }
    setCurrentBid(newBid)
    setSelectedTeam(team)
    setBidHistory(h => [...h, { amount: newBid, teamName: team.name, teamColor: team.color }])
  }

  function handleSold() {
    if (!selectedTeam) return showToast('Select a team first by placing a bid', 'error')
    onSold(player.id, selectedTeam.id, currentBid)
  }

  const roleColors = {
    'Batter': 'var(--blue)', 'Bowler': 'var(--purple)',
    'All Rounder': 'var(--gold)', 'Wicket Keeper': 'var(--cyan)',
  }

  return (
    <div className="modal-overlay" style={{ alignItems: 'flex-start', paddingTop: 70, overflowY: 'auto' }}>
      <div className="modal" style={{ borderRadius: 'var(--radius-xl)', maxWidth: 460, margin: '0 auto' }}>
        {/* Player info */}
        <div style={{
          background: `linear-gradient(135deg, ${roleColors[player.role] || 'var(--blue)'}22, transparent)`,
          border: `1px solid ${roleColors[player.role] || 'var(--blue)'}33`,
          borderRadius: 12, padding: 16, marginBottom: 16,
          display: 'flex', gap: 12, alignItems: 'center'
        }}>
          {player.photo_url ? (
            <img src={player.photo_url} alt={player.name} style={{ width: 72, height: 72, borderRadius: 12, objectFit: 'cover' }} />
          ) : (
            <div style={{ width: 72, height: 72, borderRadius: 12, background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36 }}>👤</div>
          )}
          <div>
            <div style={{ fontSize: 10, color: 'var(--blue)', fontWeight: 600, marginBottom: 2 }}>{player.code}</div>
            <div style={{ fontFamily: 'Rajdhani', fontSize: 22, fontWeight: 800, lineHeight: 1 }}>{player.name}</div>
            <div style={{ color: roleColors[player.role] || 'var(--blue)', fontSize: 13, marginTop: 2 }}>{player.role}</div>
          </div>
        </div>

        {/* Current Bid */}
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Current Bid</div>
          <div style={{ fontSize: 40, fontWeight: 900, color: 'var(--gold)', fontFamily: 'Rajdhani', lineHeight: 1 }}>
            ₹ {currentBid} L
          </div>
          {selectedTeam && (
            <div style={{ marginTop: 6, display: 'inline-flex', alignItems: 'center', gap: 6,
              background: `${selectedTeam.color}22`, border: `1px solid ${selectedTeam.color}44`,
              borderRadius: 8, padding: '4px 12px'
            }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: selectedTeam.color }} />
              <span style={{ fontWeight: 700, fontSize: 13, color: selectedTeam.color }}>{selectedTeam.name}</span>
            </div>
          )}
        </div>

        {/* Teams bidding buttons */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>
            Place Bid — Select Team & Increment
          </div>

          {teams.map(team => {
            const spent = getTeamSpent(team)
            const purseLeft = team.total_purse - spent
            const playerCount = (team.players || []).filter(p => p.status === 'sold').length
            const isFull = playerCount >= team.max_players
            const canBid = !isFull && purseLeft > currentBid

            return (
              <div key={team.id} style={{ marginBottom: 10 }}>
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  marginBottom: 4, padding: '6px 10px',
                  background: selectedTeam?.id === team.id ? `${team.color}15` : 'transparent',
                  borderRadius: 8,
                  border: selectedTeam?.id === team.id ? `1px solid ${team.color}44` : '1px solid transparent'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: team.color }} />
                    <span style={{ fontWeight: 600, fontSize: 13 }}>{team.name}</span>
                    {isFull && <span style={{ fontSize: 10, color: 'var(--red)' }}>FULL</span>}
                  </div>
                  <div style={{ fontSize: 12, color: purseLeft < 20 ? 'var(--red)' : 'var(--green)', fontWeight: 600 }}>
                    ₹{purseLeft.toFixed(1)}L left
                  </div>
                </div>
                {canBid && (
                  <div style={{ display: 'flex', gap: 5, paddingLeft: 10 }}>
                    {BID_INCREMENTS.map(inc => (
                      currentBid + inc <= purseLeft && (
                        <button
                          key={inc}
                          onClick={() => placeBid(team, inc)}
                          style={{
                            padding: '4px 8px', borderRadius: 6,
                            background: `${team.color}22`, border: `1px solid ${team.color}44`,
                            color: team.color, fontSize: 11, fontWeight: 700, cursor: 'pointer',
                            transition: 'all 0.15s'
                          }}
                          onMouseEnter={e => { e.currentTarget.style.background = `${team.color}44` }}
                          onMouseLeave={e => { e.currentTarget.style.background = `${team.color}22` }}
                        >
                          +{inc}L
                        </button>
                      )
                    ))}
                  </div>
                )}
                {!canBid && !isFull && (
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', paddingLeft: 10 }}>Insufficient purse</div>
                )}
              </div>
            )
          })}
        </div>

        {/* Bid History */}
        {bidHistory.length > 1 && (
          <div style={{ marginBottom: 16, maxHeight: 80, overflowY: 'auto' }}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Bid History</div>
            {bidHistory.slice().reverse().map((h, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-secondary)', marginBottom: 2 }}>
                <span style={{ color: h.teamColor }}>{h.teamName || h.label}</span>
                <span style={{ fontWeight: 700 }}>₹{h.amount}L</span>
              </div>
            ))}
          </div>
        )}

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => onUnsold(player.id)} id="mark-unsold-btn">
            UNSOLD
          </button>
          <button
            className="btn btn-gold"
            style={{ flex: 2, fontSize: 15, fontFamily: 'Rajdhani', fontWeight: 700, letterSpacing: 1 }}
            onClick={handleSold}
            disabled={!selectedTeam}
            id="sold-btn"
          >
            🔨 SOLD! ₹{currentBid}L
          </button>
          <button className="btn btn-ghost" style={{ flex: 0.6 }} onClick={onClose}>✕</button>
        </div>
      </div>
    </div>
  )
}
