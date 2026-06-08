import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import { supabase } from '../lib/supabase'
import { useApp } from '../context/AppContext'
import { showToast } from '../components/Toast'
import QRScannerModal from '../components/QRScannerModal'
import { Camera, Ticket, Clapperboard, Wrench, Lock, ScanLine, User, AlertTriangle } from 'lucide-react'

// ─── helpers ──────────────────────────────────────────────────────────────────
const MEAL_TYPES = ['Lunch', 'Dinner', 'Breakfast', 'Snacks']

function getYouTubeId(url) {
  try {
    const u = new URL(url)
    if (u.hostname === 'youtu.be') return u.pathname.slice(1)
    return u.searchParams.get('v') || null
  } catch { return null }
}

// ─── HostTools Main Page ──────────────────────────────────────────────────────
export default function HostTools() {
  const { activeAuction, userRole } = useApp()
  const navigate = useNavigate()
  const [activeSection, setActiveSection] = useState(null) // null | 'scan' | 'coupon' | 'video'
  const [players, setPlayers] = useState([])
  const [loadingPlayers, setLoadingPlayers] = useState(false)

  useEffect(() => {
    if (activeAuction) loadPlayers()
  }, [activeAuction])

  async function loadPlayers() {
    setLoadingPlayers(true)
    const { data } = await supabase
      .from('players')
      .select('id, name, code, role, photo_url, user_id')
      .eq('auction_id', activeAuction.id)
      .order('code')
    setPlayers(data || [])
    setLoadingPlayers(false)
  }

  // Only hosts/co-hosts can access this page
  if (!activeAuction) {
    return (
      <div className="page-content">
        <div className="empty-state">
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}><Wrench size={56} color="var(--text-muted)" /></div>
          <div className="empty-state-title">No Auction Selected</div>
          <div className="empty-state-desc">Select an auction from the menu to access Host Tools.</div>
          <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => navigate('/dashboard')}>
            Go to Dashboard
          </button>
        </div>
      </div>
    )
  }

  if (userRole !== 'host') {
    return (
      <div className="page-content">
        <div className="empty-state">
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}><Lock size={56} color="var(--text-muted)" /></div>
          <div className="empty-state-title">Host Access Only</div>
          <div className="empty-state-desc">Only the host and co-hosts can use Host Tools.</div>
        </div>
      </div>
    )
  }

  return (
    <div className="page-content">
      {/* Header */}
      <div className="page-header" style={{ marginBottom: 20 }}>
        <h1 className="page-title">HOST TOOLS</h1>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'right', lineHeight: 1.4, maxWidth: 160 }}>
          {activeAuction.name}
        </div>
      </div>

      {/* When no section selected — show tool cards */}
      {!activeSection && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>
            Select a tool to manage your auction
          </div>

          {/* Scan Coupon */}
          <ToolCard
            icon={<Camera size={26} />}
            title="Scan Food Coupon"
            desc="Open camera to scan a player's QR code and mark their coupon as redeemed"
            color="var(--green)"
            onClick={() => setActiveSection('scan')}
          />

          {/* Create Food Coupon */}
          <ToolCard
            icon={<Ticket size={26} />}
            title="Create Food Coupon"
            desc="Issue food coupons to selected players for a specific event and meal"
            color="var(--gold)"
            onClick={() => setActiveSection('coupon')}
          />

          {/* Add Match Video */}
          <ToolCard
            icon={<Clapperboard size={26} />}
            title="Add Match Video"
            desc="Upload a YouTube match recording visible in all linked players' libraries"
            color="var(--blue)"
            onClick={() => setActiveSection('video')}
          />
        </div>
      )}

      {/* Scan Coupon Screen */}
      {activeSection === 'scan' && (
        <ScanCouponScreen onBack={() => setActiveSection(null)} />
      )}

      {/* Create Food Coupon Screen */}
      {activeSection === 'coupon' && (
        <CreateCouponScreen
          auction={activeAuction}
          players={players}
          loadingPlayers={loadingPlayers}
          onBack={() => setActiveSection(null)}
        />
      )}

      {/* Add Match Video Screen */}
      {activeSection === 'video' && (
        <AddVideoScreen
          auction={activeAuction}
          players={players}
          onBack={() => setActiveSection(null)}
        />
      )}
    </div>
  )
}

// ─── ToolCard ─────────────────────────────────────────────────────────────────
function ToolCard({ icon, title, desc, color, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 16,
        padding: '18px 20px',
        background: 'var(--bg-card)',
        border: `1px solid ${color}33`,
        borderRadius: 16, cursor: 'pointer',
        textAlign: 'left', width: '100%',
        transition: 'all 0.2s',
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = color; e.currentTarget.style.background = `${color}0a` }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = `${color}33`; e.currentTarget.style.background = 'var(--bg-card)' }}
    >
      <div style={{
        width: 52, height: 52, borderRadius: 14, flexShrink: 0,
        background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center',
        color,
      }}>
        {icon}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'Rajdhani', letterSpacing: 0.4, marginBottom: 4 }}>
          {title}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.4 }}>
          {desc}
        </div>
      </div>
      <div style={{ color, fontSize: 20, flexShrink: 0 }}>›</div>
    </button>
  )
}

// ─── ScanCouponScreen ─────────────────────────────────────────────────────────
function ScanCouponScreen({ onBack }) {
  const [showScanner, setShowScanner] = useState(false)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Back */}
      <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, padding: 0, alignSelf: 'flex-start' }}>
        ← Back to Tools
      </button>

      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 18, padding: '32px 24px', textAlign: 'center',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
      }}>
        <div style={{ display: 'flex', justifyContent: 'center' }}><Camera size={72} color="var(--green)" /></div>
        <div style={{ fontFamily: 'Rajdhani', fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: 0.5 }}>
          SCAN FOOD COUPON
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, maxWidth: 300 }}>
          Ask the player to open their Food Coupon in the app, then scan their QR code here to mark it as redeemed.
        </div>

        <div style={{
          background: 'rgba(46,204,113,0.08)', border: '1px solid rgba(46,204,113,0.2)',
          borderRadius: 10, padding: '12px 16px', fontSize: 12, color: 'var(--text-secondary)',
          lineHeight: 1.6, width: '100%', textAlign: 'left',
        }}>
          <div style={{ fontWeight: 700, color: 'var(--green)', marginBottom: 4 }}>How it works:</div>
          <ol style={{ margin: 0, paddingLeft: 16, lineHeight: 2 }}>
            <li>Player opens app → Profile → Food Coupons</li>
            <li>Player shows their QR code</li>
            <li>You scan it below</li>
            <li>Coupon is marked redeemed ✓</li>
          </ol>
        </div>

        <button
          className="btn btn-primary"
          style={{ width: '100%', padding: '14px', fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
          onClick={() => setShowScanner(true)}
        >
          <ScanLine size={18} /> Open Camera & Scan
        </button>
      </div>

      {showScanner && (
        <QRScannerModal onClose={() => setShowScanner(false)} />
      )}
    </div>
  )
}

// ─── CreateCouponScreen ───────────────────────────────────────────────────────
function CreateCouponScreen({ auction, players, loadingPlayers, onBack }) {
  const { user } = useApp()
  const [eventName, setEventName] = useState('')
  const [mealType, setMealType] = useState('Lunch')
  const [couponDate, setCouponDate] = useState(new Date().toISOString().split('T')[0])
  const [selectedPlayerIds, setSelectedPlayerIds] = useState([])
  const [loading, setLoading] = useState(false)
  const [created, setCreated] = useState(false)
  const [createdCount, setCreatedCount] = useState(0)

  const eligiblePlayers = players.filter(p => p.user_id)

  function togglePlayer(id) {
    setSelectedPlayerIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])
  }

  function selectAll() {
    setSelectedPlayerIds(eligiblePlayers.map(p => p.id))
  }

  function clearAll() {
    setSelectedPlayerIds([])
  }

  async function handleCreate(e) {
    e.preventDefault()
    if (!eventName.trim()) return showToast('Event name is required', 'error')
    if (selectedPlayerIds.length === 0) return showToast('Select at least one player', 'error')

    setLoading(true)
    try {
      const { data: coupon, error: couponErr } = await supabase
        .from('food_coupons')
        .insert({ auction_id: auction.id, created_by: user.id, event_name: eventName.trim(), meal_type: mealType, coupon_date: couponDate })
        .select().single()
      if (couponErr) throw couponErr

      const selectedPlayers = players.filter(p => selectedPlayerIds.includes(p.id) && p.user_id)
      const recipients = selectedPlayers.map(p => ({ coupon_id: coupon.id, user_id: p.user_id, player_id: p.id, player_name: p.name }))
      const { error: recipErr } = await supabase.from('coupon_recipients').insert(recipients)
      if (recipErr) throw recipErr

      const notifs = selectedPlayers.map(p => ({
        user_id: p.user_id, auction_id: auction.id, type: 'coupon_issued',
        title: '🎟️ Food Coupon Received!',
        body: `You've received a food coupon for "${eventName.trim()}" (${mealType}) on ${new Date(couponDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}. Check your Profile → Food Coupons.`,
      }))
      await supabase.from('notifications').insert(notifs)

      setCreatedCount(selectedPlayers.length)
      setCreated(true)
    } catch (err) {
      showToast('Error: ' + err.message, 'error')
    }
    setLoading(false)
  }

  if (created) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, padding: 0, alignSelf: 'flex-start' }}>
          ← Back to Tools
        </button>
        <div style={{ background: 'var(--bg-card)', border: '1px solid rgba(46,204,113,0.3)', borderRadius: 18, padding: '40px 24px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <div style={{ fontSize: 72 }}>✅</div>
          <div style={{ fontFamily: 'Rajdhani', fontSize: 22, fontWeight: 800, color: 'var(--green)' }}>COUPONS ISSUED!</div>
          <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
            Food coupons sent to <strong style={{ color: 'var(--text-primary)' }}>{createdCount} player{createdCount !== 1 ? 's' : ''}</strong> for <strong style={{ color: 'var(--gold)' }}>{eventName}</strong>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Players have been notified in-app.</div>
          <div style={{ display: 'flex', gap: 10, width: '100%' }}>
            <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => { setCreated(false); setEventName(''); setSelectedPlayerIds([]) }}>
              Create Another
            </button>
            <button className="btn btn-primary" style={{ flex: 1 }} onClick={onBack}>
              Done
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, padding: 0, alignSelf: 'flex-start' }}>
        ← Back to Tools
      </button>

      <div style={{ fontFamily: 'Rajdhani', fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: 0.4 }}>
        🎟️ Create Food Coupon
      </div>

      <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div className="form-group">
          <label className="form-label">Event Name *</label>
          <input className="form-input" value={eventName} onChange={e => setEventName(e.target.value)} placeholder="e.g. Season Opener, Auction Day, Match 1" />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Meal Type *</label>
            <select className="form-select" value={mealType} onChange={e => setMealType(e.target.value)}>
              {MEAL_TYPES.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Date *</label>
            <input className="form-input" type="date" value={couponDate} onChange={e => setCouponDate(e.target.value)} />
          </div>
        </div>

        {/* Player selection */}
        <div className="form-group">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <label className="form-label" style={{ marginBottom: 0 }}>
              Select Players * <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>({selectedPlayerIds.length} selected)</span>
            </label>
            {eligiblePlayers.length > 0 && (
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" onClick={selectAll} style={{ background: 'none', border: 'none', color: 'var(--blue)', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>All</button>
                {selectedPlayerIds.length > 0 && (
                  <button type="button" onClick={clearAll} style={{ background: 'none', border: 'none', color: 'var(--red)', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>Clear</button>
                )}
              </div>
            )}
          </div>

          {loadingPlayers ? (
            <div style={{ padding: 16, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Loading players...</div>
          ) : eligiblePlayers.length === 0 ? (
            <div style={{ padding: '14px', background: 'rgba(245,166,35,0.08)', borderRadius: 10, border: '1px solid rgba(245,166,35,0.2)', fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6, display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <AlertTriangle size={14} color="var(--gold)" style={{ flexShrink: 0, marginTop: 1 }} />
              No linked players found. Players must be registered via phone number search to receive coupons.
            </div>
          ) : (
            <div style={{ border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', maxHeight: 260, overflowY: 'auto' }}>
              {eligiblePlayers.map((player, idx) => {
                const selected = selectedPlayerIds.includes(player.id)
                return (
                  <div
                    key={player.id}
                    onClick={() => togglePlayer(player.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', cursor: 'pointer',
                      borderBottom: idx < eligiblePlayers.length - 1 ? '1px solid var(--border)' : 'none',
                      background: selected ? 'rgba(74,158,255,0.08)' : 'transparent',
                      transition: 'background 0.15s',
                    }}
                  >
                    <div style={{
                      width: 20, height: 20, borderRadius: 5,
                      border: `2px solid ${selected ? 'var(--blue)' : 'var(--border)'}`,
                      background: selected ? 'var(--blue)' : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      {selected && <span style={{ color: '#fff', fontSize: 12, lineHeight: 1 }}>✓</span>}
                    </div>
                    {player.photo_url ? (
                      <img src={player.photo_url} alt={player.name} style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                    ) : (
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <User size={16} color="var(--text-muted)" />
                      </div>
                    )}
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{player.name}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{player.code} · {player.role}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <button
          type="submit"
          className="btn btn-primary"
          style={{ padding: '14px', fontSize: 15, fontWeight: 700 }}
          disabled={loading || eligiblePlayers.length === 0 || selectedPlayerIds.length === 0}
        >
          {loading ? 'Creating...' : `🎟️ Issue Coupons to ${selectedPlayerIds.length} Player${selectedPlayerIds.length !== 1 ? 's' : ''}`}
        </button>
      </form>
    </div>
  )
}

// ─── AddVideoScreen ───────────────────────────────────────────────────────────
function AddVideoScreen({ auction, players, onBack }) {
  const { user } = useApp()
  const [title, setTitle] = useState('')
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [added, setAdded] = useState(false)

  const vid = getYouTubeId(youtubeUrl)
  const isValidUrl = youtubeUrl.trim().length > 0 && vid !== null

  async function handleSubmit(e) {
    e.preventDefault()
    if (!title.trim()) return showToast('Title is required', 'error')
    if (!vid) return showToast('Please enter a valid YouTube URL', 'error')

    setLoading(true)
    try {
      const { error } = await supabase.from('auction_videos').insert({
        auction_id: auction.id, added_by: user.id,
        title: title.trim(), youtube_url: youtubeUrl.trim(), is_match_video: true,
      })
      if (error) throw error

      const linkedPlayers = players.filter(p => p.user_id)
      if (linkedPlayers.length > 0) {
        await supabase.from('notifications').insert(linkedPlayers.map(p => ({
          user_id: p.user_id, auction_id: auction.id, type: 'match_result',
          title: '🎬 New match video added!',
          body: `"${title.trim()}" has been added to ${auction.name}'s library. Check Profile → My Library.`,
        })))
      }
      setAdded(true)
    } catch (err) {
      showToast('Error: ' + err.message, 'error')
    }
    setLoading(false)
  }

  if (added) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, padding: 0, alignSelf: 'flex-start' }}>
          ← Back to Tools
        </button>
        <div style={{ background: 'var(--bg-card)', border: '1px solid rgba(74,158,255,0.3)', borderRadius: 18, padding: '40px 24px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <div style={{ fontSize: 72 }}>🎬</div>
          <div style={{ fontFamily: 'Rajdhani', fontSize: 22, fontWeight: 800, color: 'var(--blue)' }}>VIDEO ADDED!</div>
          <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
            <strong style={{ color: 'var(--text-primary)' }}>"{title}"</strong> is now in the match library.
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {players.filter(p => p.user_id).length} linked player{players.filter(p => p.user_id).length !== 1 ? 's have' : ' has'} been notified.
          </div>
          <div style={{ display: 'flex', gap: 10, width: '100%' }}>
            <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => { setAdded(false); setTitle(''); setYoutubeUrl('') }}>
              Add Another
            </button>
            <button className="btn btn-primary" style={{ flex: 1 }} onClick={onBack}>Done</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, padding: 0, alignSelf: 'flex-start' }}>
        ← Back to Tools
      </button>

      <div style={{ fontFamily: 'Rajdhani', fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: 0.4 }}>
        🎬 Add Match Video
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div className="form-group">
          <label className="form-label">Video Title *</label>
          <input className="form-input" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Match 1 Highlights – Team A vs Team B" />
        </div>

        <div className="form-group">
          <label className="form-label">YouTube URL *</label>
          <input
            className="form-input"
            type="url"
            value={youtubeUrl}
            onChange={e => setYoutubeUrl(e.target.value)}
            placeholder="https://youtu.be/... or https://youtube.com/watch?v=..."
          />
          {youtubeUrl.trim() && (
            <div style={{ marginTop: 6, fontSize: 12, color: isValidUrl ? 'var(--green)' : 'var(--red)' }}>
              {isValidUrl ? '✓ Valid YouTube URL' : '✗ Invalid YouTube URL'}
            </div>
          )}
        </div>

        {/* Live preview */}
        {isValidUrl && (
          <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', padding: '8px 12px', background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border)', fontWeight: 600 }}>
              📺 Preview
            </div>
            <div style={{ position: 'relative', paddingTop: '56.25%', background: '#000' }}>
              <iframe
                src={`https://www.youtube.com/embed/${vid}`}
                title="Preview"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
              />
            </div>
          </div>
        )}

        <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
          This video will appear in the <strong>Match Videos</strong> section for all {players.filter(p => p.user_id).length} linked player{players.filter(p => p.user_id).length !== 1 ? 's' : ''}.
        </div>

        <button
          type="submit"
          className="btn btn-primary"
          style={{ padding: '14px', fontSize: 15, fontWeight: 700 }}
          disabled={loading || !isValidUrl}
        >
          {loading ? 'Adding...' : '🎬 Add to Library'}
        </button>
      </form>
    </div>
  )
}
