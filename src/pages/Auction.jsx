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
  const [currentBid, setCurrentBid] = useState(0)
  const [selectedTeam, setSelectedTeam] = useState(null)
  const [bidHistory, setBidHistory] = useState([])
  const [liveSyncChannel, setLiveSyncChannel] = useState(null)

  useEffect(() => {
    if (!activeAuction) return

    loadData()

    const channel = supabase.channel(`auction-live-${activeAuction.id}`)
      
    channel.on('postgres_changes', {
      event: '*', schema: 'public', table: 'players',
      filter: `auction_id=eq.${activeAuction.id}`,
    }, () => loadData())
    
    channel.on('postgres_changes', {
      event: '*', schema: 'public', table: 'teams',
      filter: `auction_id=eq.${activeAuction.id}`,
    }, () => loadData())

    // Audience listeners
    channel.on('broadcast', { event: 'spin_start' }, (payload) => {
      if (userRole !== 'host') setSpinning(true)
    })

    channel.on('broadcast', { event: 'spin_result' }, (payload) => {
      if (userRole !== 'host') {
        setSpinning(false)
        if (payload.payload?.playerId) {
          // Find player in data
        }
      }
    })

    channel.on('broadcast', { event: 'bidding_update' }, (payload) => {
      if (userRole !== 'host') {
        const { playerId, currentBid: cb, selectedTeamId, bidHistory: bh } = payload.payload
        setCurrentBid(cb)
        setBidHistory(bh || [])
        // We need to set selectedTeam object later when teams are loaded.
        // We will just use an effect below to sync it.
      }
    })

    channel.subscribe((status) => {
      setIsLive(status === 'SUBSCRIBED')
    })
    
    setLiveSyncChannel(channel)

    return () => {
      supabase.removeChannel(channel)
      setLiveSyncChannel(null)
    }
  }, [activeAuction, userRole])

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
  const unsoldPlayers = players.filter(p => p.status === 'unsold')
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
      setCurrentBid(player.base_price)
      setSelectedTeam(null)
      setBidHistory([{ amount: player.base_price, label: 'Base Price' }])
      setShowBidding(true)

      if (liveSyncChannel && userRole === 'host') {
        liveSyncChannel.send({
          type: 'broadcast', event: 'bidding_update',
          payload: {
            playerId: player.id,
            currentBid: player.base_price,
            selectedTeamId: null,
            bidHistory: [{ amount: player.base_price, label: 'Base Price' }]
          }
        })
      }
    }
  }

  // Effect to broadcast state changes when host updates bidding
  useEffect(() => {
    if (liveSyncChannel && userRole === 'host' && showBidding && selectedPlayer) {
      liveSyncChannel.send({
        type: 'broadcast', event: 'bidding_update',
        payload: {
          playerId: selectedPlayer.id,
          currentBid,
          selectedTeamId: selectedTeam?.id,
          bidHistory
        }
      })
    }
  }, [currentBid, selectedTeam, bidHistory, showBidding, selectedPlayer, liveSyncChannel, userRole])

  // Effect to sync audience selectedTeam from ID (since broadcast gives ID)
  useEffect(() => {
    if (userRole !== 'host' && showBidding) {
      // Find the player and team from the last broadcast
      if (bidHistory.length > 0) {
        const lastBid = bidHistory[bidHistory.length - 1]
        if (lastBid.teamId) {
          const t = teams.find(team => team.id === lastBid.teamId)
          if (t) setSelectedTeam(t)
        } else {
          setSelectedTeam(null)
        }
      }
    }
  }, [bidHistory, teams, userRole, showBidding])

  // Effect to catch audience up if they join late (handled by postgres_changes partially, but for bidding we rely on broadcasts)
  // To keep it simple, audience will see the modal when the next bid happens or when wheel spins.

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
    try {
      const { error } = await supabase.from('players').update({ status: 'unsold' }).eq('id', playerId)
      if (error) throw error
      showToast('Player marked unsold', 'info')
      setShowBidding(false)
      setSelectedPlayer(null)
      loadData()
    } catch (e) {
      showToast('Error: ' + e.message, 'error')
    }
  }

  async function handleRehostUnsold() {
    if (!window.confirm('Are you sure you want to re-host all unsold players?')) return
    try {
      const { error } = await supabase.from('players').update({ status: 'available' }).eq('auction_id', activeAuction.id).eq('status', 'unsold')
      if (error) throw error
      showToast('Unsold players are back in the auction! 🔄', 'success')
      loadData()
    } catch (e) {
      showToast('Error: ' + e.message, 'error')
    }
  }

  const [exportingPDF, setExportingPDF] = useState(false)
  const [exportingCSV, setExportingCSV] = useState(false)

  async function handleExportPDF() {
    if (!activeAuction) return
    setExportingPDF(true)
    try { await exportAuctionPDF(activeAuction.id, leagueName) }
    catch(e) { showToast('Export error: ' + e.message, 'error') }
    finally { setExportingPDF(false) }
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
      {/* Header */}
      <div className="page-header" style={{ marginBottom: 20 }}>
        <h1 className="page-title">AUCTION</h1>
      </div>

      {/* Desktop two-column wrapper */}
      <div className="auction-desktop-grid">
        {/* LEFT COLUMN — teams overview + stats */}
        <div>
          {/* Teams Purse Overview */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#fff', textTransform: 'uppercase', letterSpacing: 1 }}>
                  TEAMS &amp; PURSE OVERVIEW
                </div>
              </div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--blue)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                {soldPlayers.length} PLAYERS SOLD
              </div>
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
                        position: 'relative',
                        background: `${team.color}22`,
                        border: `1px solid ${team.color}55`,
                        borderRadius: 12,
                        padding: '16px 12px 14px',
                        minWidth: 105,
                        flexShrink: 0,
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        overflow: 'hidden'
                      }}
                    >
                      {team.logo_url ? (
                        <img src={team.logo_url} alt={team.name} style={{ width: 44, height: 44, borderRadius: 8, objectFit: 'cover', marginBottom: 8 }} />
                      ) : (
                        <div style={{ width: 44, height: 44, borderRadius: 8, background: team.color + '33', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, marginBottom: 8 }}>🛡️</div>
                      )}
                      <div style={{ fontSize: 13, fontWeight: 800, color: '#fff', fontFamily: 'Rajdhani', letterSpacing: 0.5, marginBottom: 10, textAlign: 'center' }}>
                        {team.name.toUpperCase()}
                      </div>
                      
                      <div style={{ fontSize: 14, fontWeight: 700, color: playerCount >= team.max_players ? 'var(--green)' : '#fff', lineHeight: 1.1 }}>
                        {playerCount}/{team.max_players}
                      </div>
                      <div style={{ fontSize: 9, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>
                        PLAYERS
                      </div>

                      <div style={{ fontSize: 14, fontWeight: 700, color: purseLeft < 20 ? 'var(--red)' : 'var(--green)', lineHeight: 1.1 }}>
                        ₹ {purseLeft.toFixed(2)} L
                      </div>
                      <div style={{ fontSize: 9, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        PURSE LEFT
                      </div>

                      {/* Progress Line */}
                      <div style={{ position: 'absolute', bottom: 0, left: 0, height: 4, background: `${team.color}33`, width: '100%' }} />
                      <div style={{ position: 'absolute', bottom: 0, left: 0, height: 4, background: team.color, width: `${team.total_purse > 0 ? (spent / team.total_purse) * 100 : 0}%`, transition: 'width 0.3s ease' }} />
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN — Spin Wheel */}
        <div>
          {availablePlayers.length > 0 ? (
      <div className="auction-wheel-section" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <SpinWheel
          players={availablePlayers}
          spinning={spinning}
          setSpinning={setSpinning}
          onResult={handleSpinResult}
          disabled={userRole !== 'host'}
          liveSyncChannel={liveSyncChannel}
          userRole={userRole}
        />
      </div>
          ) : (
            <div className="empty-state" style={{ minHeight: 300 }}>
              <div style={{ fontSize: 64 }}>🎉</div>
              <div className="empty-state-title">Auction Complete!</div>
              <div className="empty-state-desc">
                {players.length === 0
                  ? 'Register players in the Players section to start the auction.'
                  : 'All players have been auctioned.'}
              </div>
              {unsoldPlayers.length > 0 && userRole === 'host' && (
                <button 
                  onClick={handleRehostUnsold} 
                  className="btn btn-primary" 
                  style={{ marginTop: 20, padding: '12px 24px', fontSize: 16, fontFamily: 'Rajdhani', fontWeight: 700, letterSpacing: 1 }}
                >
                  🔄 RE-HOST {unsoldPlayers.length} UNSOLD PLAYERS
                </button>
              )}
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
          userRole={userRole}
          currentBid={currentBid}
          setCurrentBid={setCurrentBid}
          selectedTeam={selectedTeam}
          setSelectedTeam={setSelectedTeam}
          bidHistory={bidHistory}
          setBidHistory={setBidHistory}
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

function SpinWheel({ players, spinning, setSpinning, onResult, disabled, liveSyncChannel, userRole }) {
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
      // Draw name instead of code, truncated if too long
      const displayName = wheelPlayers[i].name.length > 12 ? wheelPlayers[i].name.substring(0, 10) + '..' : wheelPlayers[i].name
      ctx.fillText(displayName, r * 0.65, 0)
      ctx.restore()
    }

    // Center circle
    ctx.beginPath()
    ctx.arc(cx, cy, 54, 0, 2 * Math.PI)
    const centerGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 54)
    centerGrad.addColorStop(0, '#111420')
    centerGrad.addColorStop(0.7, '#161b26')
    centerGrad.addColorStop(1, '#0e1118')
    ctx.fillStyle = centerGrad
    ctx.fill()
    ctx.strokeStyle = 'rgba(245,166,35,0.8)'
    ctx.lineWidth = 4
    ctx.stroke()
    
    // Inner center glowing ring
    ctx.beginPath()
    ctx.arc(cx, cy, 46, 0, 2 * Math.PI)
    ctx.strokeStyle = 'rgba(74,158,255,0.3)'
    ctx.lineWidth = 1
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

  // Cancel any in-progress animation when the wheel unmounts to prevent RAF leak
  useEffect(() => {
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current)
    }
  }, [])

  function spin() {
    if (spinning || wheelPlayers.length === 0 || disabled) return
    setSpinning(true)
    setResultCode(null)

    if (liveSyncChannel && userRole === 'host') {
      liveSyncChannel.send({ type: 'broadcast', event: 'spin_start' })
    }

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
          position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)',
          width: 0, height: 0, zIndex: 10,
          borderLeft: '14px solid transparent',
          borderRight: '14px solid transparent',
          borderTop: '32px solid var(--gold)',
          filter: 'drop-shadow(0 0 12px rgba(245,166,35,0.9))'
        }} />
        <canvas
          ref={canvasRef}
          width={380}
          height={380}
          style={{ 
            cursor: spinning || disabled ? 'default' : 'pointer', 
            maxWidth: '100%', 
            filter: 'drop-shadow(0 0 32px rgba(74,158,255,0.25)) drop-shadow(0 0 16px rgba(245,166,35,0.15))', 
            opacity: disabled ? 0.7 : 1,
            borderRadius: '50%'
          }}
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
function BiddingModal({ 
  player, teams, onSold, onUnsold, onClose, getTeamSpent, userRole,
  currentBid, setCurrentBid, selectedTeam, setSelectedTeam, bidHistory, setBidHistory 
}) {
  const BID_INCREMENTS = [0, 0.10, 0.20, 0.30]

  function placeBid(team, increment) {
    const newBid = Math.round((currentBid + increment) * 100) / 100
    const teamSpent = getTeamSpent(team)
    const purseLeft = team.total_purse - teamSpent
    if (newBid > purseLeft) {
      showToast(`${team.name} doesn't have enough purse!`, 'error')
      return
    }
    setCurrentBid(newBid)
    setSelectedTeam(team)
    setBidHistory(h => [...h, { amount: newBid, teamName: team.name, teamColor: team.color, teamId: team.id }])
  }

  function undoBid() {
    if (bidHistory.length <= 1) return
    const newHistory = bidHistory.slice(0, -1)
    const lastBid = newHistory[newHistory.length - 1]
    setBidHistory(newHistory)
    setCurrentBid(lastBid.amount)
    
    if (lastBid.teamId) {
      const prevTeam = teams.find(t => t.id === lastBid.teamId)
      setSelectedTeam(prevTeam)
    } else {
      setSelectedTeam(null)
    }
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
    <div className="modal-overlay" style={{ 
      padding: 0, 
      background: 'rgba(12,14,20,0.98)', 
      backdropFilter: 'blur(32px)',
      WebkitBackdropFilter: 'blur(32px)',
      display: 'flex', 
      flexDirection: 'column',
      justifyContent: 'space-between'
    }}>
      {/* Top right close button (acts as cancel) */}
      <button 
        onClick={onClose} 
        style={{ 
          position: 'absolute', top: 20, right: 20, 
          width: 44, height: 44, 
          background: 'rgba(255,255,255,0.08)', 
          border: '1px solid rgba(255,255,255,0.1)', 
          borderRadius: '50%', 
          color: '#fff', fontSize: 22, 
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', zIndex: 100, transition: 'all 0.2s'
        }}
      >
        ✕
      </button>

      {/* Top half: Player Photo & Details */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 20px 20px',
        background: `radial-gradient(circle at top, ${roleColors[player.role] || 'var(--blue)'}22 0%, transparent 80%)`
      }}>
        {player.photo_url ? (
          <img src={player.photo_url} alt={player.name} style={{ width: 160, height: 160, borderRadius: '50%', objectFit: 'cover', border: `4px solid ${roleColors[player.role] || 'var(--blue)'}55`, boxShadow: '0 12px 32px rgba(0,0,0,0.5)', marginBottom: 24 }} />
        ) : (
          <div style={{ width: 160, height: 160, borderRadius: '50%', background: 'var(--bg-secondary)', border: `4px solid ${roleColors[player.role] || 'var(--blue)'}55`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 64, marginBottom: 24, boxShadow: '0 12px 32px rgba(0,0,0,0.5)' }}>👤</div>
        )}
        <div style={{ fontSize: 14, color: 'var(--blue)', fontWeight: 800, letterSpacing: 2, marginBottom: 8, textTransform: 'uppercase' }}>{player.code}</div>
        <div style={{ fontFamily: 'Rajdhani', fontSize: 42, fontWeight: 900, lineHeight: 1.1, textAlign: 'center', textTransform: 'uppercase', marginBottom: 8 }}>{player.name}</div>
        <div style={{ color: roleColors[player.role] || 'var(--blue)', fontSize: 16, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase' }}>{player.role}</div>
      </div>

      {/* Middle: Current Bid */}
      <div style={{ padding: '0 24px', textAlign: 'center', marginBottom: 32 }}>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 6 }}>Current Bid</div>
        <div style={{ fontSize: 64, fontWeight: 900, color: 'var(--gold)', fontFamily: 'Rajdhani', lineHeight: 1, filter: 'drop-shadow(0 4px 16px rgba(245,166,35,0.4))' }}>
          ₹ {currentBid} L
        </div>
        {selectedTeam && (
          <div style={{ marginTop: 16, display: 'inline-flex', alignItems: 'center', gap: 10,
            background: `${selectedTeam.color}22`, border: `1px solid ${selectedTeam.color}66`,
            borderRadius: 12, padding: '8px 20px'
          }}>
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: selectedTeam.color, boxShadow: `0 0 12px ${selectedTeam.color}` }} />
            <span style={{ fontWeight: 800, fontSize: 16, color: selectedTeam.color, letterSpacing: 0.5 }}>{selectedTeam.name.toUpperCase()}</span>
          </div>
        )}
      </div>

      {/* Bottom half: Teams, Increments, Actions */}
      <div style={{
        background: 'var(--bg-card)',
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        padding: '24px 20px 32px',
        boxShadow: '0 -12px 40px rgba(0,0,0,0.6)',
        display: 'flex', flexDirection: 'column', gap: 16
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 1 }}>
            Select Team & Increment
          </div>
          {userRole === 'host' && (
            <button 
              onClick={undoBid} 
              disabled={bidHistory.length <= 1}
              style={{ 
                background: bidHistory.length <= 1 ? 'transparent' : 'rgba(255,255,255,0.05)', 
                border: '1px solid var(--border)', 
                color: bidHistory.length <= 1 ? 'var(--text-muted)' : 'var(--text-primary)', 
                padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                cursor: bidHistory.length <= 1 ? 'default' : 'pointer',
                transition: 'all 0.2s'
              }}
            >
              ↩ Undo
            </button>
          )}
        </div>

        {/* Teams List */}
        <div style={{ maxHeight: '25vh', overflowY: 'auto', paddingRight: 4, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {teams.map(team => {
            const spent = getTeamSpent(team)
            const purseLeft = team.total_purse - spent
            const playerCount = (team.players || []).filter(p => p.status === 'sold').length
            const isFull = playerCount >= team.max_players
            const canBid = !isFull && purseLeft > currentBid

            return (
              <div key={team.id} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '8px 12px',
                  background: selectedTeam?.id === team.id ? `${team.color}15` : 'rgba(255,255,255,0.02)',
                  borderRadius: 12,
                  border: selectedTeam?.id === team.id ? `1px solid ${team.color}55` : '1px solid var(--border)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 12, height: 12, borderRadius: '50%', background: team.color }} />
                    <span style={{ fontWeight: 700, fontSize: 14 }}>{team.name}</span>
                    {isFull && <span style={{ fontSize: 10, color: 'var(--red)', fontWeight: 800 }}>FULL</span>}
                  </div>
                  <div style={{ fontSize: 13, color: purseLeft < 20 ? 'var(--red)' : 'var(--green)', fontWeight: 800 }}>
                    ₹{purseLeft.toFixed(1)}L left
                  </div>
                </div>
                {canBid && (
                  <div style={{ display: 'flex', gap: 6, paddingLeft: 12 }}>
                    {BID_INCREMENTS.map(inc => (
                      (Math.round((currentBid + inc) * 100) / 100) <= purseLeft && (
                        <button
                          key={inc}
                          onClick={() => placeBid(team, inc)}
                          disabled={userRole !== 'host'}
                          style={{
                            padding: '6px 10px', borderRadius: 8,
                            background: userRole === 'host' ? `${team.color}22` : 'transparent', 
                            border: `1px solid ${userRole === 'host' ? `${team.color}44` : 'var(--border)'}`,
                            color: userRole === 'host' ? team.color : 'var(--text-muted)', 
                            fontSize: 12, fontWeight: 800, 
                            cursor: userRole === 'host' ? 'pointer' : 'default',
                            transition: 'all 0.15s'
                          }}
                        >
                          +{inc}L
                        </button>
                      )
                    ))}
                  </div>
                )}
                {!canBid && !isFull && (
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', paddingLeft: 12, fontWeight: 600 }}>Insufficient purse for next bid</div>
                )}
              </div>
            )
          })}
        </div>

        {/* Bid History Optional (can be omitted for cleaner full screen, or kept small) */}
        {bidHistory.length > 1 && (
          <div style={{ maxHeight: 60, overflowY: 'auto', marginTop: 4 }}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Recent Bids</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {bidHistory.slice(-3).reverse().map((h, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-secondary)' }}>
                  <span style={{ color: h.teamColor, fontWeight: 600 }}>{h.teamName || h.label}</span>
                  <span style={{ fontWeight: 800 }}>₹{h.amount}L</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Fixed Bottom Action buttons */}
        <div style={{ display: 'flex', gap: 12, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
          <button className="btn btn-ghost" style={{ flex: 1, padding: '16px 0', fontSize: 14, fontWeight: 800, letterSpacing: 1 }} onClick={() => onUnsold(player.id)}>
            UNSOLD
          </button>
          <button
            className="btn btn-gold"
            style={{ flex: 2, padding: '16px 0', fontSize: 20, fontFamily: 'Rajdhani', fontWeight: 900, letterSpacing: 1.5 }}
            onClick={handleSold}
            disabled={!selectedTeam}
          >
            🔨 SOLD! ₹{currentBid}L
          </button>
        </div>
      </div>
    </div>
  )
}
