import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useApp } from '../context/AppContext'
import { showToast } from '../components/Toast'
import { exportAuctionPDF, exportAuctionCSV } from '../lib/exportUtils'
import { uploadFile } from '../lib/supabase'
import { CategoryBadge } from './Players'
import { Shield, User, Zap, RefreshCw, Settings } from 'lucide-react'

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
  const [spinning, setSpinning] = useState(false)
  const [isLive, setIsLive] = useState(false)
  const [audienceSpinTarget, setAudienceSpinTarget] = useState(null)
  const [settings, setSettings] = useState(null)
  const [showFooterModal, setShowFooterModal] = useState(false)
  const [audienceSoldTrigger, setAudienceSoldTrigger] = useState(false)
  const [showBannerSplash, setShowBannerSplash] = useState(true)

  useEffect(() => {
    if (activeAuction?.banner_url) {
      const splashKey = `splash_shown_${activeAuction.id}`
      if (!sessionStorage.getItem(splashKey)) {
        setShowBannerSplash(true)
        sessionStorage.setItem(splashKey, 'true')
        const timer = setTimeout(() => setShowBannerSplash(false), 5000)
        return () => clearTimeout(timer)
      } else {
        setShowBannerSplash(false)
      }
    } else {
      setShowBannerSplash(false)
    }
  }, [activeAuction?.banner_url, activeAuction?.id])

  const playersRef = useRef(players)
  useEffect(() => {
    playersRef.current = players
  }, [players])

  const handleCloseBidding = useCallback(() => {
    setShowBidding(false)
    setSelectedPlayer(null)
    setAudienceSoldTrigger(false)

    if (liveSyncChannel && userRole === 'host') {
      liveSyncChannel.send({ type: 'broadcast', event: 'bidding_closed', payload: {} })
    }
  }, [liveSyncChannel, userRole])

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
      if (userRole !== 'host') {
        setAudienceSpinTarget(payload.payload?.targetCode)
      }
    })

    channel.on('broadcast', { event: 'bidding_update' }, (payload) => {
      if (userRole !== 'host') {
        const { playerId, currentBid: cb, selectedTeamId, bidHistory: bh } = payload.payload
        setCurrentBid(cb)
        setBidHistory(bh || [])

        setSelectedPlayer(prev => {
          if (!prev || prev.id !== playerId) {
            const p = playersRef.current.find(p => p.id === playerId)
            return p || prev
          }
          return prev
        })
        setShowBidding(true)
      }
    })

    channel.on('broadcast', { event: 'bidding_sold_animation' }, () => {
      if (userRole !== 'host') {
        setAudienceSoldTrigger(true)
      }
    })

    channel.on('broadcast', { event: 'bidding_closed' }, () => {
      if (userRole !== 'host') {
        setShowBidding(false)
        setSelectedPlayer(null)
        setAudienceSoldTrigger(false)
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
    const [{ data: teamsData }, { data: playersData }, { data: auctionData }] = await Promise.all([
      supabase.from('teams').select('*, players(id, status, sold_price), owners(name), category_config').eq('auction_id', activeAuction.id).order('created_at'),
      supabase.from('players').select('*').eq('auction_id', activeAuction.id).order('code'),
      supabase.from('auctions').select('footer_sponsors').eq('id', activeAuction.id).single()
    ])
    setTeams(teamsData || [])
    setPlayers(playersData || [])
    // Store footer_sponsors from auction row directly
    setSettings(auctionData || {})
    setLoading(false)
  }

  const availablePlayers = players.filter(p => p.status === 'available' && p.category !== 'Retained')
  const soldPlayers = players.filter(p => p.status === 'sold')
  const unsoldPlayers = players.filter(p => p.status === 'unsold')
  const totalSpent = teams.reduce((s, t) => {
    const tSpent = (t.players || []).filter(p => p.status === 'sold').reduce((ss, p) => ss + (p.sold_price || 0), 0)
    return s + tSpent
  }, 0)

  function getTeamSpent(team) {
    return (team.players || []).filter(p => p.status === 'sold').reduce((s, p) => s + (p.sold_price || 0), 0)
  }

  // Smart bid cap: purse left minus what must be reserved for remaining required players
  // currentPlayer: the player currently being auctioned (so we don't double-reserve their slot)
  function getTeamMaxBid(team, currentPlayer) {
    const config = team.category_config || {}
    const hasConfig = Object.keys(config).length > 0
    const spent = getTeamSpent(team)
    const purseLeft = team.total_purse - spent

    if (!hasConfig) return purseLeft // legacy: no config, use full purse

    // Count how many sold players belong to this team by category
    const soldInTeam = players.filter(p => p.status === 'sold' && p.team_id === team.id)
    const soldByCategory = {}
    for (const p of soldInTeam) {
      const cat = (p.category || 'gold').toLowerCase()
      soldByCategory[cat] = (soldByCategory[cat] || 0) + 1
    }

    let reserved = 0
    for (const cat of ['retained', 'platinum', 'diamond', 'gold']) {
      const required = parseInt(config[cat]?.count) || 0
      const alreadyFilled = soldByCategory[cat] || 0
      let stillNeeded = Math.max(0, required - alreadyFilled)

      // If the current player belongs to this category, winning this auction fills one slot —
      // don't reserve purse for a slot this player will fill
      if (currentPlayer && (currentPlayer.category || 'Gold').toLowerCase() === cat && stillNeeded > 0) {
        stillNeeded -= 1
      }

      const basePrice = parseFloat(config[cat]?.base_price) || 0
      reserved += stillNeeded * basePrice
    }

    return Math.max(0, purseLeft - reserved)
  }

  function handleSpinResult(playerCode) {
    const player = players.find(p => p.code === playerCode)
    if (player) {
      const basePrice = Number(player.base_price) || 0
      setSelectedPlayer(player)
      setCurrentBid(basePrice)
      setSelectedTeam(null)
      setBidHistory([{ amount: basePrice, label: `Base Price (${basePrice}L)` }])
      setShowBidding(true)

      if (liveSyncChannel && userRole === 'host') {
        liveSyncChannel.send({
          type: 'broadcast', event: 'bidding_update',
          payload: {
            playerId: player.id,
            playerCode: player.code,
            currentBid: basePrice,
            selectedTeamId: null,
            bidHistory: [{ amount: basePrice, label: `Base Price (${basePrice}L)` }]
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

  // Effect to sync audience selectedTeam from ID
  useEffect(() => {
    if (userRole !== 'host' && showBidding) {
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

  async function handleSold(playerId, teamId, soldPrice) {
    try {
      // Fetch the player to get their user_id for notification
      const { data: playerData } = await supabase.from('players').select('user_id, name').eq('id', playerId).single()

      await supabase.from('players').update({
        status: 'sold', team_id: teamId, sold_price: soldPrice
      }).eq('id', playerId)

      // Notify the linked player user
      if (playerData?.user_id) {
        const soldTeam = teams.find(t => t.id === teamId)
        await supabase.from('notifications').insert({
          user_id: playerData.user_id,
          auction_id: activeAuction.id,
          type: 'sold',
          title: '🔨 You\'ve been sold!',
          body: `Congratulations! You were sold for ₹${soldPrice}L${soldTeam ? ` to ${soldTeam.name}` : ''} in "${activeAuction.name}".`,
        })
      }

      showToast('Player sold! 🔨', 'success')
      handleCloseBidding()
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
      handleCloseBidding()
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

  if (!activeAuction) {
    return (
      <div className="page-content">
        <div className="empty-state">
          <div className="empty-state-icon" style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}><Zap size={64} color="var(--gold)" /></div>
          <div className="empty-state-title" style={{ fontFamily: 'Rajdhani', fontSize: 24 }}>No Auction Active</div>
          <div className="empty-state-desc">
            Create or select an auction from the menu to start bidding
          </div>
          <div style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Tap ☰ in the top right</div>
        </div>
      </div>
    )
  }

  if (showBannerSplash && activeAuction?.banner_url) {
    return (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 99999, background: '#000',
        display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}>
        <img src={activeAuction.banner_url} alt="Tournament Banner" style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#000' }} />
      </div>
    )
  }

  return (
    <div className="page-content" style={{ display: 'flex', flexDirection: 'column' }}>
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
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, gap: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#fff', textTransform: 'uppercase', letterSpacing: 0.8, whiteSpace: 'nowrap' }}>
                TEAMS & PURSE OVERVIEW
              </div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--blue)', textTransform: 'uppercase', letterSpacing: 0.5, whiteSpace: 'nowrap', flexShrink: 0 }}>
                {soldPlayers.length} SOLD
              </div>
            </div>
            <div className="auction-teams-grid">
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
                        width: '100%',
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
                        <div style={{ width: 44, height: 44, borderRadius: 8, background: team.color + '33', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                          <Shield size={22} color={team.color} />
                        </div>
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
            <div className="auction-wheel-section" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
              <SpinWheel
                players={availablePlayers}
                spinning={spinning}
                setSpinning={setSpinning}
                onResult={handleSpinResult}
                disabled={userRole !== 'host'}
                liveSyncChannel={liveSyncChannel}
                userRole={userRole}
                audienceSpinTarget={audienceSpinTarget}
              />
            </div>
          ) : (
            <div className="empty-state" style={{ minHeight: 300, position: 'relative', overflow: 'hidden' }}>
              <div style={{ fontSize: 64, position: 'relative', zIndex: 2 }}>🎉</div>
              {players.length > 0 && unsoldPlayers.length === 0 && <Firecrackers />}
              <div className="empty-state-title" style={{ position: 'relative', zIndex: 2 }}>
                {players.length > 0 && unsoldPlayers.length === 0 ? `${activeAuction?.name || 'Auction'} completed` : 'Auction Complete!'}
              </div>
              <div className="empty-state-desc" style={{ position: 'relative', zIndex: 2 }}>
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
                  <RefreshCw size={14} style={{ display: 'inline', marginRight: 6 }} /> RE-HOST {unsoldPlayers.length} UNSOLD PLAYERS
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Footer Sponsors & Ads — per-auction, stored in auctions.footer_sponsors */}
      {(() => {
        // footer_sponsors is a JSON array of { label, logo_url, logo_urls? } stored per auction
        let sponsorCols = []
        try {
          const raw = settings?.footer_sponsors
          if (raw) sponsorCols = typeof raw === 'string' ? JSON.parse(raw) : raw
        } catch {}

        const colCount = Math.max(sponsorCols.length, 1)

        return (
          <div className="auction-footer" style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${colCount}, 1fr)`,
            padding: '32px 20px 20px',
            borderTop: '1px solid var(--border)',
            position: 'relative',
            flexShrink: 0,
            marginTop: 'auto',
            minHeight: 90,
          }}>
            {userRole === 'host' && (
              <button onClick={() => setShowFooterModal(true)} style={{ position: 'absolute', right: 14, top: 12, background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center' }} title="Manage Footer Logos">
                <Settings size={16} />
              </button>
            )}
            {sponsorCols.length === 0 ? (
              <div style={{ gridColumn: '1/-1', textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
                {userRole === 'host' ? 'Click ⚙ to add footer sponsors' : ''}
              </div>
            ) : sponsorCols.map((sp, i) => (
              <div key={i} style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                padding: '0 16px',
                borderRight: i < colCount - 1 ? '1px solid var(--border)' : 'none',
              }}>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, textAlign: 'center', whiteSpace: 'nowrap' }}>{sp.label}</div>
                {sp.logo_urls && sp.logo_urls.length > 0 ? (
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
                    {sp.logo_urls.map((url, j) => (
                      <img key={j} src={url} alt={sp.label} style={{ height: 40, objectFit: 'contain', maxWidth: 90 }} />
                    ))}
                  </div>
                ) : sp.logo_url ? (
                  <img src={sp.logo_url} alt={sp.label} style={{ height: 40, objectFit: 'contain', maxWidth: 90 }} />
                ) : (
                  <div style={{ fontSize: 12, fontWeight: 800, fontFamily: 'Rajdhani', color: 'var(--gold)', letterSpacing: 1, textAlign: 'center' }}>[{sp.label.toUpperCase()}]</div>
                )}
              </div>
            ))}
          </div>
        )
      })()}

      {showFooterModal && (
        <FooterSettingsModal onClose={() => setShowFooterModal(false)} settings={settings} auctionId={activeAuction.id} onSaved={() => { setShowFooterModal(false); loadData(); }} />
      )}


      {/* Bidding Modal */}
      {showBidding && selectedPlayer && (
        <BiddingModal
          player={selectedPlayer}
          teams={teams}
          onSold={handleSold}
          onUnsold={handleUnsold}
          onClose={handleCloseBidding}
          getTeamSpent={getTeamSpent}
          getTeamMaxBid={(team) => getTeamMaxBid(team, selectedPlayer)}
          userRole={userRole}
          currentBid={currentBid}
          setCurrentBid={setCurrentBid}
          selectedTeam={selectedTeam}
          setSelectedTeam={setSelectedTeam}
          bidHistory={bidHistory}
          setBidHistory={setBidHistory}
          audienceSoldTrigger={audienceSoldTrigger}
          onSoldAnimationStart={() => {
            if (liveSyncChannel && userRole === 'host') {
              liveSyncChannel.send({ type: 'broadcast', event: 'bidding_sold_animation', payload: {} })
            }
          }}
        />
      )}
    </div>
  )
}

// ===================== SPIN WHEEL =====================
// Alternating black & gold — matching the reference luxury design
const SEG_BLACK = '#0a0a0a'
const SEG_GOLD  = '#c8950a'

function SpinWheel({ players, spinning, setSpinning, onResult, disabled, liveSyncChannel, userRole, audienceSpinTarget }) {
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
    const R = cx - 18 // main wheel radius

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // ── Outer ring: thick gold border ──────────────────────────
    // Outermost glow
    ctx.beginPath()
    ctx.arc(cx, cy, R + 14, 0, 2 * Math.PI)
    ctx.strokeStyle = 'rgba(200,149,10,0.25)'
    ctx.lineWidth = 8
    ctx.stroke()
    // Bright gold band
    ctx.beginPath()
    ctx.arc(cx, cy, R + 9, 0, 2 * Math.PI)
    const outerGrad = ctx.createLinearGradient(cx - R, cy - R, cx + R, cy + R)
    outerGrad.addColorStop(0, '#ffe066')
    outerGrad.addColorStop(0.4, '#c8950a')
    outerGrad.addColorStop(0.7, '#f5d060')
    outerGrad.addColorStop(1, '#a07008')
    ctx.strokeStyle = outerGrad
    ctx.lineWidth = 12
    ctx.stroke()
    // Inner shadow band
    ctx.beginPath()
    ctx.arc(cx, cy, R + 2, 0, 2 * Math.PI)
    ctx.strokeStyle = '#5a3c00'
    ctx.lineWidth = 3
    ctx.stroke()

    // ── Draw segments ──────────────────────────────────────────
    for (let i = 0; i < numSegments; i++) {
      const startAngle = angle + i * segAngle
      const endAngle = startAngle + segAngle
      const isGold = i % 2 === 0

      // Segment fill
      ctx.beginPath()
      ctx.moveTo(cx, cy)
      ctx.arc(cx, cy, R, startAngle, endAngle)
      ctx.closePath()
      if (isGold) {
        // Gold segment: brushed-metal gradient
        const gx1 = cx + Math.cos(startAngle + segAngle / 2) * R * 0.3
        const gy1 = cy + Math.sin(startAngle + segAngle / 2) * R * 0.3
        const gx2 = cx + Math.cos(startAngle + segAngle / 2) * R
        const gy2 = cy + Math.sin(startAngle + segAngle / 2) * R
        const segGrad = ctx.createLinearGradient(gx1, gy1, gx2, gy2)
        segGrad.addColorStop(0, '#e0b030')
        segGrad.addColorStop(0.4, '#c8950a')
        segGrad.addColorStop(0.8, '#b07a06')
        segGrad.addColorStop(1, '#d4a017')
        ctx.fillStyle = segGrad
      } else {
        // Black segment
        ctx.fillStyle = SEG_BLACK
      }
      ctx.fill()

      // Divider line
      ctx.strokeStyle = 'rgba(180,130,0,0.6)'
      ctx.lineWidth = 1.2
      ctx.stroke()

      // ── Number near the outer edge ──
      ctx.save()
      ctx.translate(cx, cy)
      ctx.rotate(startAngle + segAngle / 2)
      const numR = R * 0.90
      const fontSize = numSegments > 12 ? 10 : 12
      ctx.fillStyle = isGold ? '#1a0d00' : '#c8950a'
      ctx.font = `bold ${fontSize}px Inter`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(String(i + 1), numR, 0)
      ctx.restore()

      // ── Player name ──
      ctx.save()
      ctx.translate(cx, cy)
      ctx.rotate(startAngle + segAngle / 2)
      const nameR = R * 0.60
      const nameFontSize = numSegments > 12 ? 11 : 13
      ctx.font = `bold ${nameFontSize}px Inter`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillStyle = isGold ? '#0d0600' : '#d4a017'
      const firstName = wheelPlayers[i].name.split(' ')[0]
      const displayName = firstName.length > 12 ? firstName.substring(0, 11) + '.' : firstName
      ctx.fillText(displayName.toUpperCase(), nameR, 0)
      ctx.restore()
    }

    // ── Gold dot accents on the outer ring ─────────────────────
    const numDots = numSegments * 2
    for (let d = 0; d < numDots; d++) {
      const dotAngle = angle + (d / numDots) * 2 * Math.PI
      const dotR = R + 6
      const dx = cx + Math.cos(dotAngle) * dotR
      const dy = cy + Math.sin(dotAngle) * dotR
      ctx.beginPath()
      ctx.arc(dx, dy, 2.5, 0, 2 * Math.PI)
      ctx.fillStyle = '#ffe066'
      ctx.fill()
    }

    // ── Center Hub ─────────────────────────────────────────────
    const hubR = numSegments > 12 ? 52 : 60

    // Outer hub glow
    ctx.beginPath()
    ctx.arc(cx, cy, hubR + 8, 0, 2 * Math.PI)
    ctx.strokeStyle = 'rgba(200,149,10,0.3)'
    ctx.lineWidth = 6
    ctx.stroke()

    // Hub fill – dark radial
    ctx.beginPath()
    ctx.arc(cx, cy, hubR, 0, 2 * Math.PI)
    const hubGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, hubR)
    hubGrad.addColorStop(0, '#1a1206')
    hubGrad.addColorStop(0.6, '#0d0a04')
    hubGrad.addColorStop(1, '#050300')
    ctx.fillStyle = hubGrad
    ctx.fill()

    // Hub outer gold ring
    ctx.beginPath()
    ctx.arc(cx, cy, hubR, 0, 2 * Math.PI)
    const hubRingGrad = ctx.createLinearGradient(cx - hubR, cy, cx + hubR, cy)
    hubRingGrad.addColorStop(0, '#ffe066')
    hubRingGrad.addColorStop(0.5, '#c8950a')
    hubRingGrad.addColorStop(1, '#ffe066')
    ctx.strokeStyle = hubRingGrad
    ctx.lineWidth = 4
    ctx.stroke()

    // Hub inner decorative ring (small dots)
    const innerDots = 16
    for (let d = 0; d < innerDots; d++) {
      const da = (d / innerDots) * 2 * Math.PI
      const ddx = cx + Math.cos(da) * (hubR - 8)
      const ddy = cy + Math.sin(da) * (hubR - 8)
      ctx.beginPath()
      ctx.arc(ddx, ddy, 1.5, 0, 2 * Math.PI)
      ctx.fillStyle = 'rgba(255,210,80,0.7)'
      ctx.fill()
    }

    // Hub second inner ring line
    ctx.beginPath()
    ctx.arc(cx, cy, hubR - 14, 0, 2 * Math.PI)
    ctx.strokeStyle = 'rgba(200,149,10,0.4)'
    ctx.lineWidth = 1
    ctx.stroke()

    // Center text
    if (spinning) {
      ctx.fillStyle = '#f5d060'
      ctx.font = 'bold 13px Inter'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('SPINNING...', cx, cy)
    } else {
      ctx.fillStyle = '#c8c0a0'
      ctx.font = `bold ${numSegments > 12 ? 10 : 11}px Inter`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('TAP', cx, cy - 14)
      ctx.fillText('TO', cx, cy - 1)
      ctx.fillStyle = '#f5d060'
      ctx.font = `bold ${numSegments > 12 ? 14 : 16}px Inter`
      ctx.fillText('SPIN', cx, cy + 14)
    }
  }, [wheelPlayers, numSegments, segAngle, spinning])

  useEffect(() => {
    drawWheel(angleRef.current)
  }, [drawWheel])

  useEffect(() => {
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current)
    }
  }, [])

  function spin() {
    if (spinning || wheelPlayers.length === 0 || disabled) return
    const targetIdx = Math.floor(Math.random() * wheelPlayers.length)
    const targetCode = wheelPlayers[targetIdx].code

    if (liveSyncChannel && userRole === 'host') {
      liveSyncChannel.send({ type: 'broadcast', event: 'spin_start', payload: { targetCode } })
    }

    executeSpinAnimation(targetCode)
  }

  useEffect(() => {
    if (audienceSpinTarget && !spinning && disabled) {
      executeSpinAnimation(audienceSpinTarget)
    }
  }, [audienceSpinTarget])

  function executeSpinAnimation(targetCode) {
    setSpinning(true)
    setResultCode(null)

    const targetIdx = wheelPlayers.findIndex(p => p.code === targetCode)
    const validIdx = targetIdx >= 0 ? targetIdx : 0

    const fullRotations = (8 + Math.random() * 4) * 2 * Math.PI
    // Land on center of target segment
    const targetAngle = -(validIdx * segAngle + segAngle / 2) + (Math.PI / 2 * 3)
    const finalAngle = (Math.round(fullRotations / (2 * Math.PI)) * 2 * Math.PI) + targetAngle

    const duration = 5000
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
        setResultCode(targetCode)
        setTimeout(() => onResult(targetCode), 600)
      }
    }

    animRef.current = requestAnimationFrame(frame)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', padding: '0 20px' }}>
      {/* Draw Label */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20,
        color: 'var(--gold)', fontFamily: 'Rajdhani', fontSize: 16, fontWeight: 700, letterSpacing: 2
      }}>
        <span>→</span> NEXT PLAYER DRAW <span>←</span>
      </div>

      {/* Pointer + Canvas */}
      <div style={{ position: 'relative', width: '100%', maxWidth: 540, display: 'flex', justifyContent: 'center' }}>
        <div style={{
          position: 'absolute', top: -16, left: '50%', transform: 'translateX(-50%)',
          width: 0, height: 0, zIndex: 10,
          borderLeft: '16px solid transparent',
          borderRight: '16px solid transparent',
          borderTop: '36px solid var(--gold)',
          filter: 'drop-shadow(0 0 10px rgba(245,166,35,0.9))'
        }} />
        <canvas
          ref={canvasRef}
          width={540}
          height={540}
          style={{ 
            cursor: spinning || disabled ? 'default' : 'pointer', 
            width: '100%',
            height: 'auto',
            maxWidth: 540,
            filter: 'drop-shadow(0 0 28px rgba(74,158,255,0.1)) drop-shadow(0 0 14px rgba(245,166,35,0.1))', 
            opacity: disabled ? 0.7 : 1,
            borderRadius: '50%'
          }}
          onClick={spin}
        />
      </div>

      {resultCode && (
        <div style={{
          marginTop: 20,
          background: 'rgba(245,166,35,0.1)',
          border: '1px solid rgba(245,166,35,0.3)',
          borderRadius: 12,
          padding: '12px 24px',
          textAlign: 'center',
          animation: 'fadeIn 0.4s ease'
        }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 2 }}>Selected</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--gold)', fontFamily: 'Rajdhani' }}>{resultCode}</div>
        </div>
      )}

      <div style={{ marginTop: 16, color: 'var(--text-muted)', fontSize: 12, textAlign: 'center' }}>
        {wheelPlayers.length} players available{wheelPlayers.length < (players?.length || 0) ? ' — showing first 16' : ''}
      </div>
    </div>
  )
}

// ===================== BIDDING MODAL =====================
function BiddingModal({ 
  player, teams, onSold, onUnsold, onClose, getTeamSpent, getTeamMaxBid, userRole,
  currentBid, setCurrentBid, selectedTeam, setSelectedTeam, bidHistory, setBidHistory,
  audienceSoldTrigger, onSoldAnimationStart
}) {
  const [showSoldAnimation, setShowSoldAnimation] = useState(false)
  const [timeLeft, setTimeLeft] = useState(30)

  useEffect(() => {
    setTimeLeft(30)
  }, [bidHistory.length])

  useEffect(() => {
    const timerId = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 0) {
          clearInterval(timerId)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timerId)
  }, [])

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  useEffect(() => {
    if (audienceSoldTrigger) {
      setShowSoldAnimation(true)
    }
  }, [audienceSoldTrigger])
  const BID_INCREMENTS = [0, 0.10, 0.20, 0.30]

  function placeBid(team, increment) {
    const currentNumericBid = Math.round(Number(currentBid) * 100) / 100
    const newBid = Math.round((currentNumericBid + increment) * 100) / 100
    const maxBidRaw = getTeamMaxBid ? getTeamMaxBid(team) : (team.total_purse - getTeamSpent(team))
    const maxBid = Math.round(maxBidRaw * 100) / 100

    if (newBid > maxBid) {
      const teamSpent = getTeamSpent(team)
      const purseLeft = team.total_purse - teamSpent
      const reserved = Math.round((purseLeft - maxBid) * 100) / 100
      showToast(
        reserved > 0
          ? `${team.name} must keep ₹${reserved.toFixed(2)}L reserved for remaining squad slots!`
          : `${team.name} doesn't have enough purse!`,
        'error'
      )
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

  function executeSold() {
    if (!selectedTeam) return showToast('Select a team first by placing a bid', 'error')
    setShowSoldAnimation(true)
    if (onSoldAnimationStart) onSoldAnimationStart()
    setTimeout(() => {
      const finalPrice = Number(currentBid) || Number(player.base_price)
      onSold(player.id, selectedTeam.id, finalPrice)
    }, 2500)
  }

  const roleColors = {
    'Batter': 'var(--blue)', 'Bowler': 'var(--purple)',
    'All Rounder': 'var(--gold)', 'Wicket Keeper': 'var(--cyan)',
  }

  return (
    <div className="modal-overlay" style={{ 
      padding: 0, 
      background: 'rgba(12,14,20,0.95)', 
      backdropFilter: 'blur(32px)',
      WebkitBackdropFilter: 'blur(32px)',
      display: 'flex', 
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      {/* Container */}
      <div style={{
        width: '95vw', maxWidth: 1200, height: '85vh', maxHeight: 800,
        background: 'var(--bg-card)',
        borderRadius: 24, border: '1px solid var(--border)',
        boxShadow: '0 20px 60px rgba(0,0,0,0.8)',
        position: 'relative',
        display: 'flex', flexDirection: 'column', overflow: 'hidden'
      }}>
        {/* Top Right Controls */}
        <div style={{ 
          position: 'absolute', top: 16, right: 16, zIndex: 100, display: 'flex', gap: 8,
          background: 'rgba(15, 18, 25, 0.95)', padding: '6px', borderRadius: '30px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.4)', backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255,255,255,0.1)'
        }}>
          {userRole === 'host' && (
             <button onClick={undoBid} disabled={bidHistory.length <= 1} style={{
               width: 36, height: 36, borderRadius: '50%',
               background: 'transparent', border: 'none',
               color: bidHistory.length <= 1 ? 'rgba(255,255,255,0.2)' : '#fff', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center',
               cursor: bidHistory.length <= 1 ? 'default' : 'pointer', transition: 'all 0.2s',
             }} title="Undo Last Bid">↩</button>
          )}
          <button onClick={onClose} style={{
            width: 36, height: 36, borderRadius: '50%',
            background: 'transparent', border: 'none',
            color: '#fff', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', transition: 'all 0.2s'
          }}>✕</button>
        </div>

        {/* 3-Column Grid */}
        <div className="bidding-modal-grid" style={{ flex: 1, minHeight: 0 }}>
          
          {/* LEFT COLUMN: Player Photo & Identity */}
          <div className="bidding-player-col" style={{
            background: `radial-gradient(circle at center, ${roleColors[player.role] || 'var(--blue)'}22 0%, transparent 80%)`,
            justifyContent: 'flex-start', padding: '32px 20px', overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
              {player.photo_url ? (
                <img src={player.photo_url} alt={player.name} className="bidding-player-photo" style={{
                  objectFit: 'cover', borderRadius: '50%', border: `4px solid ${roleColors[player.role] || 'var(--blue)'}88`,
                  filter: `drop-shadow(0 10px 20px ${roleColors[player.role] || 'var(--blue)'}33)`
                }} />
              ) : (
                <div className="bidding-player-photo" style={{
                  borderRadius: '50%',
                  background: 'var(--bg-secondary)', border: `4px solid ${roleColors[player.role] || 'var(--blue)'}55`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: `0 10px 20px ${roleColors[player.role] || 'var(--blue)'}22`
                }}><User size={36} color="var(--text-muted)" /></div>
              )}
              <div style={{ marginTop: 20, textAlign: 'center' }}>
                <div style={{ fontFamily: 'Rajdhani', fontSize: 24, fontWeight: 900, textTransform: 'uppercase', lineHeight: 1.1, textShadow: '0 4px 12px rgba(0,0,0,0.5)' }}>
                  {player.name}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
                  <div style={{ color: roleColors[player.role] || 'var(--blue)', fontSize: 12, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase' }}>
                    {player.role}
                  </div>
                  <CategoryBadge category={player.category || 'Gold'} style={{ fontSize: 10 }} />
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Base Price: ₹ {player.base_price} L</div>
              </div>
            </div>

            <div style={{ width: '100%', marginTop: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: 8, borderRadius: 12, border: '1px solid var(--border)', textAlign: 'center' }}>
                <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>Age</div>
                <div style={{ fontSize: 14, fontWeight: 700, marginTop: 2 }}>{player.age || '-'}</div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: 8, borderRadius: 12, border: '1px solid var(--border)', textAlign: 'center' }}>
                <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>Matches</div>
                <div style={{ fontSize: 14, fontWeight: 700, marginTop: 2 }}>{player.matches || '0'}</div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: 8, borderRadius: 12, border: '1px solid var(--border)', textAlign: 'center' }}>
                <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>Runs</div>
                <div style={{ fontSize: 14, fontWeight: 700, marginTop: 2 }}>{player.runs || '0'}</div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: 8, borderRadius: 12, border: '1px solid var(--border)', textAlign: 'center' }}>
                <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>Wickets</div>
                <div style={{ fontSize: 14, fontWeight: 700, marginTop: 2 }}>{player.wickets || '0'}</div>
              </div>
            </div>
          </div>

          {/* CENTER COLUMN: Bid Circle */}
          <div className="bidding-center-col" style={{ display: 'flex', flexDirection: 'column', padding: '24px 20px', borderRight: '1px solid var(--border)', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              width: 220, height: 220, borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(245,166,35,0.15) 0%, rgba(245,166,35,0.02) 70%)',
              border: '4px solid rgba(245,166,35,0.5)',
              boxShadow: '0 0 40px rgba(245,166,35,0.15), inset 0 0 20px rgba(245,166,35,0.1)',
              flexShrink: 0
            }}>
              <div style={{ fontSize: 11, color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 8, fontWeight: 700 }}>Current Bid</div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <span style={{ fontSize: 40, fontWeight: 900, color: 'var(--gold)', fontFamily: 'Rajdhani' }}>₹</span>
                <input 
                  type="number" 
                  value={currentBid} 
                  onChange={(e) => {
                    const val = e.target.value;
                    setCurrentBid(val === '' ? '' : Number(val));
                  }} 
                  disabled={userRole !== 'host'}
                  style={{ 
                    fontSize: 56, fontWeight: 900, color: 'var(--gold)', fontFamily: 'Rajdhani', 
                    background: 'transparent', border: 'none', width: '3.5ch', textAlign: 'center', 
                    outline: 'none', textShadow: '0 4px 24px rgba(245,166,35,0.5)', padding: 0
                  }} 
                />
                <span style={{ fontSize: 40, fontWeight: 900, color: 'var(--gold)', fontFamily: 'Rajdhani' }}>L</span>
              </div>
              {selectedTeam ? (
                <div style={{ marginTop: 16, display: 'inline-flex', alignItems: 'center', gap: 8, background: `${selectedTeam.color}33`, border: `1px solid ${selectedTeam.color}88`, borderRadius: 20, padding: '4px 16px' }}>
                  <div style={{ width: 12, height: 12, borderRadius: '50%', background: selectedTeam.color, boxShadow: `0 0 10px ${selectedTeam.color}` }} />
                  <span style={{ fontWeight: 800, fontSize: 14, color: selectedTeam.color, letterSpacing: 1, textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>{selectedTeam.name.toUpperCase()}</span>
                </div>
              ) : (
                <div style={{ marginTop: 16, fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>No bids (Base: {player.base_price}L)</div>
              )}
            </div>

            {/* TIMER — center col, always visible */}
            <div style={{ marginTop: 28, textAlign: 'center', flexShrink: 0 }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 4, fontWeight: 700 }}>Time Remaining</div>
              <div style={{ 
                fontSize: 48, fontWeight: 900, fontFamily: 'Rajdhani', 
                color: timeLeft <= 5 ? 'var(--red)' : '#fff', 
                textShadow: timeLeft <= 5 ? '0 0 20px rgba(220,53,69,0.5)' : 'none',
                fontVariantNumeric: 'tabular-nums'
              }}>
                {formatTime(timeLeft)}
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Teams Options — fully scrollable */}
          <div className="bidding-teams-col" style={{ display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
            {/* Sticky timer strip — visible on mobile where center col is hidden */}
            <div className="bidding-timer-strip" style={{
              flexShrink: 0,
              padding: '10px 20px 6px',
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'var(--bg-card)',
            }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 2, fontWeight: 700 }}>Place Bids</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>⏱</div>
                <div style={{
                  fontSize: 20, fontWeight: 900, fontFamily: 'Rajdhani',
                  color: timeLeft <= 5 ? 'var(--red)' : 'var(--gold)',
                  fontVariantNumeric: 'tabular-nums',
                  textShadow: timeLeft <= 5 ? '0 0 12px rgba(220,53,69,0.6)' : '0 0 8px rgba(245,166,35,0.3)',
                }}>{formatTime(timeLeft)}</div>
              </div>
            </div>

            {/* Scrollable teams list */}
            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '12px 16px 16px', WebkitOverflowScrolling: 'touch' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {teams.map(team => {
                  const spent = getTeamSpent(team)
                  const purseLeft = team.total_purse - spent
                  const maxBidRaw = getTeamMaxBid ? getTeamMaxBid(team) : purseLeft
                  const maxBid = Math.round(maxBidRaw * 100) / 100
                  const reserved = Math.round((purseLeft - maxBid) * 100) / 100
                  const playerCount = (team.players || []).filter(p => p.status === 'sold').length
                  const isFull = playerCount >= team.max_players
                  // Use rounded comparison to avoid floating-point false negatives
                  const canBid = !isFull && maxBid >= Math.round(Number(currentBid) * 100) / 100

                  return (
                    <div key={team.id} style={{
                      background: selectedTeam?.id === team.id ? `${team.color}15` : 'rgba(255,255,255,0.02)',
                      border: selectedTeam?.id === team.id ? `2px solid ${team.color}88` : '1px solid var(--border)',
                      borderRadius: 12, padding: '10px', display: 'flex', flexDirection: 'column', gap: 6,
                      transition: 'all 0.2s', flexShrink: 0,
                      cursor: userRole === 'host' && canBid ? 'pointer' : 'default'
                    }} onClick={() => {
                      if (userRole === 'host' && canBid) placeBid(team, 0)
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                         <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                           <div style={{ width: 12, height: 12, borderRadius: '50%', background: team.color, flexShrink: 0 }} />
                           <span style={{ fontWeight: 800, fontSize: 13 }}>{team.name}</span>
                         </div>
                         <div style={{ textAlign: 'right' }}>
                           <div style={{ fontSize: 12, color: maxBid < 1 ? 'var(--red)' : 'var(--green)', fontWeight: 800 }}>
                             ₹{purseLeft.toFixed(1)}L
                           </div>
                         </div>
                      </div>

                      {/* Max bid indicator */}
                      {reserved > 0.01 && (
                        <div style={{ 
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          fontSize: 10, padding: '4px 8px', borderRadius: 6,
                          background: 'rgba(245,166,35,0.08)', border: '1px solid rgba(245,166,35,0.2)'
                        }}>
                          <span style={{ color: 'var(--gold)', fontWeight: 700 }}>MAX BID</span>
                          <span style={{ color: 'var(--gold)', fontWeight: 800 }}>₹{maxBid.toFixed(2)}L</span>
                        </div>
                      )}

                      {canBid ? (
                        <div style={{ display: 'flex', gap: 4 }}>
                          {BID_INCREMENTS.map(inc => (
                            (Math.round((Number(currentBid) + inc) * 100) / 100) <= Math.round(maxBid * 100) / 100 && (
                              <button key={inc} onClick={(e) => { e.stopPropagation(); placeBid(team, inc); }} disabled={userRole !== 'host'} style={{
                                flex: 1, padding: '6px 0', borderRadius: 8, background: userRole === 'host' ? `${team.color}22` : 'transparent',
                                border: `1px solid ${userRole === 'host' ? `${team.color}44` : 'var(--border)'}`, color: userRole === 'host' ? team.color : 'var(--text-muted)',
                                fontSize: 11, fontWeight: 800, cursor: userRole === 'host' ? 'pointer' : 'default', transition: 'all 0.15s'
                              }}>+{inc}L</button>
                            )
                          ))}
                        </div>
                      ) : (
                        <div style={{ fontSize: 10, color: 'var(--text-muted)', textAlign: 'center', fontWeight: 700, padding: '4px 0', letterSpacing: 1 }}>
                          {isFull ? 'SQUAD FULL' : maxBid < currentBid && reserved > 0.01 ? 'PURSE LOCKED 🔒' : 'INSUFFICIENT PURSE'}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        {/* BOTTOM ACTIONS: Sold/Unsold */}
        <div style={{ 
          padding: '16px 32px', borderTop: '1px solid var(--border)', display: 'flex', gap: 16, 
          background: 'rgba(12,14,20,0.6)', flexShrink: 0 
        }}>
           <button className="btn btn-ghost" style={{ flex: 1, padding: '12px 0', fontSize: 14, fontWeight: 800, letterSpacing: 1, opacity: userRole !== 'host' ? 0.5 : 1 }} onClick={() => onUnsold(player.id)} disabled={userRole !== 'host'}>UNSOLD</button>
           <button className="btn btn-gold" style={{ flex: 2, padding: '12px 0', fontSize: 20, fontFamily: 'Rajdhani', fontWeight: 900, letterSpacing: 1, opacity: userRole !== 'host' ? 0.5 : 1 }} onClick={executeSold} disabled={!selectedTeam || userRole !== 'host'}>
             🔨 SOLD! ₹{currentBid}L
           </button>
        </div>
      </div>

      {/* SOLD ANIMATION OVERLAY */}
      {showSoldAnimation && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999, background: '#000',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <div style={{
            position: 'absolute', width: '200vw', height: '200vw',
            background: 'radial-gradient(circle, rgba(245,166,35,0.4) 0%, transparent 60%)',
            animation: 'burst 1.5s ease-out forwards'
          }} />
          <div style={{
            fontFamily: 'Rajdhani', fontSize: '15vw', fontWeight: 900, color: 'var(--gold)',
            textTransform: 'uppercase', letterSpacing: '1vw',
            textShadow: '0 0 40px rgba(245,166,35,0.8), 0 0 80px rgba(245,166,35,0.4)',
            animation: 'zoomIn 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards',
            zIndex: 10
          }}>
            SOLD
          </div>
          <style>{`
            @keyframes burst { 0% { transform: scale(0); opacity: 1; } 100% { transform: scale(1); opacity: 0; } }
            @keyframes zoomIn { 0% { transform: scale(0.5); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
          `}</style>
        </div>
      )}
    </div>
  )
}

function Firecrackers() {
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 1 }}>
      {[...Array(20)].map((_, i) => (
        <div key={i} style={{
          position: 'absolute',
          left: `${Math.random() * 100}%`,
          top: `${50 + Math.random() * 50}%`,
          width: 6, height: 6, borderRadius: '50%',
          background: ['#f5a623', '#4a9eff', '#2ecc71', '#e74c3c', '#9b59b6'][Math.floor(Math.random() * 5)],
          boxShadow: '0 0 10px currentColor',
          animation: `firecracker 1.5s ease-out infinite`,
          animationDelay: `${Math.random() * 2}s`
        }} />
      ))}
      <style>{`
        @keyframes firecracker {
          0% { transform: translateY(0) scale(1); opacity: 1; }
          50% { opacity: 1; }
          100% { transform: translateY(-200px) scale(0); opacity: 0; }
        }
      `}</style>
    </div>
  )
}

function FooterSettingsModal({ onClose, settings, onSaved, auctionId }) {
  const [loading, setLoading] = useState(false)
  const [label, setLabel] = useState('')
  const [file, setFile] = useState(null)
  const [filePreview, setFilePreview] = useState(null)
  const fileRef = React.useRef()

  // Parse existing per-auction footer sponsors
  let footerSponsors = []
  try {
    const raw = settings?.footer_sponsors
    if (raw) footerSponsors = typeof raw === 'string' ? JSON.parse(raw) : raw
  } catch {}

  async function saveSponsors(updated) {
    const { error } = await supabase
      .from('auctions')
      .update({ footer_sponsors: JSON.stringify(updated) })
      .eq('id', auctionId)
    if (error) throw error
  }

  async function handleAdd() {
    if (!label.trim()) return showToast('Please enter a sponsor label', 'error')
    setLoading(true)
    try {
      let logo_url = null
      if (file) logo_url = await uploadFile(file, 'sponsors')
      const updated = [...footerSponsors, { label: label.trim(), logo_url }]
      await saveSponsors(updated)
      showToast('Sponsor added!', 'success')
      setLabel('')
      setFile(null)
      setFilePreview(null)
      onSaved()
    } catch(err) {
      showToast('Error: ' + err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  async function handleAddLogo(idx) {
    // Add another logo URL to an existing sponsor slot
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = async (e) => {
      const f = e.target.files[0]
      if (!f) return
      setLoading(true)
      try {
        const url = await uploadFile(f, 'sponsors')
        const updated = footerSponsors.map((sp, i) => {
          if (i !== idx) return sp
          const existing = sp.logo_urls || (sp.logo_url ? [sp.logo_url] : [])
          return { ...sp, logo_urls: [...existing, url], logo_url: null }
        })
        await saveSponsors(updated)
        showToast('Logo added!', 'success')
        onSaved()
      } catch(err) {
        showToast('Error: ' + err.message, 'error')
      } finally {
        setLoading(false)
      }
    }
    input.click()
  }

  async function handleRemoveLogo(sponsorIdx, logoUrl) {
    setLoading(true)
    try {
      const updated = footerSponsors.map((sp, i) => {
        if (i !== sponsorIdx) return sp
        const urls = sp.logo_urls || (sp.logo_url ? [sp.logo_url] : [])
        const remaining = urls.filter(u => u !== logoUrl)
        return { ...sp, logo_urls: remaining.length > 0 ? remaining : [], logo_url: null }
      })
      await saveSponsors(updated)
      onSaved()
    } catch(err) {
      showToast('Error: ' + err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  async function handleRemoveSponsor(idx) {
    setLoading(true)
    try {
      const updated = footerSponsors.filter((_, i) => i !== idx)
      await saveSponsors(updated)
      showToast('Sponsor removed', 'info')
      onSaved()
    } catch(err) {
      showToast('Error: ' + err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxHeight: '85vh', overflowY: 'auto' }}>
        <div className="modal-header">
          <div className="modal-title">Footer Sponsors</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {/* Existing sponsors list */}
        {footerSponsors.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>Current Footer Sponsors</div>
            {footerSponsors.map((sp, i) => {
              const logos = sp.logo_urls || (sp.logo_url ? [sp.logo_url] : [])
              return (
                <div key={i} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 10, border: '1px solid var(--border)', padding: '10px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: logos.length > 0 ? 10 : 0 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{sp.label}</span>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        type="button"
                        disabled={loading}
                        onClick={() => handleAddLogo(i)}
                        style={{ background: 'rgba(74,158,255,0.15)', border: '1px solid rgba(74,158,255,0.3)', color: 'var(--blue)', borderRadius: 6, padding: '3px 10px', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
                      >+ Logo</button>
                      <button
                        type="button"
                        disabled={loading}
                        onClick={() => handleRemoveSponsor(i)}
                        style={{ background: 'transparent', border: 'none', color: 'var(--red)', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}
                      >✕ Remove</button>
                    </div>
                  </div>
                  {logos.length > 0 && (
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      {logos.map((url, j) => (
                        <div key={j} style={{ position: 'relative', display: 'inline-block' }}>
                          <img src={url} alt={sp.label} style={{ height: 40, objectFit: 'contain', borderRadius: 6, border: '1px solid var(--border)', background: 'rgba(255,255,255,0.05)', padding: 4 }} />
                          <button
                            type="button"
                            disabled={loading}
                            onClick={() => handleRemoveLogo(i, url)}
                            style={{ position: 'absolute', top: -6, right: -6, width: 18, height: 18, borderRadius: '50%', background: 'var(--red)', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 11, lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          >×</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Add new sponsor */}
        <div style={{ borderTop: footerSponsors.length > 0 ? '1px solid var(--border)' : 'none', paddingTop: footerSponsors.length > 0 ? 16 : 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>➕ Add Sponsor Slot</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <input
              type="text"
              className="form-input"
              placeholder="Sponsor label (e.g. Title Sponsor, Kit Sponsor)"
              value={label}
              onChange={e => setLabel(e.target.value)}
            />
            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
              onChange={e => {
                const f = e.target.files[0]
                if (f) { setFile(f); setFilePreview(URL.createObjectURL(f)) }
              }}
            />
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => fileRef.current?.click()}
              style={{ justifyContent: 'flex-start' }}
            >
              {filePreview
                ? <><img src={filePreview} alt="preview" style={{ height: 28, objectFit: 'contain', marginRight: 8, borderRadius: 4 }} />Change Logo</>
                : '📷 Upload Logo (optional)'}
            </button>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                disabled={loading || !label.trim()}
                onClick={handleAdd}
                style={{ flex: 1 }}
              >
                {loading ? 'Saving...' : 'Add Sponsor'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
