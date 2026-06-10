import React, { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import { supabase, uploadFile } from '../lib/supabase'
import { useApp } from '../context/AppContext'
import { showToast } from '../components/Toast'
import { User, Trophy, Ticket, Video, Bell, Camera, Pencil, LogOut, Phone, Film, Target, Building2, Utensils, CheckCircle, Gavel, Hash, BarChart3 } from 'lucide-react'

// ─── helpers ──────────────────────────────────────────────────────────────────

function getYouTubeId(url) {
  try {
    const u = new URL(url)
    if (u.hostname === 'youtu.be') return u.pathname.slice(1)
    return u.searchParams.get('v') || null
  } catch { return null }
}

function YouTubeCard({ video, onDelete, canDelete }) {
  const vid = getYouTubeId(video.youtube_url)
  const thumb = vid ? `https://img.youtube.com/vi/${vid}/mqdefault.jpg` : null

  return (
    <div style={{
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderRadius: 14, overflow: 'hidden', position: 'relative',
      transition: 'transform 0.2s, box-shadow 0.2s',
    }}
      onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
      onMouseLeave={e => e.currentTarget.style.transform = ''}
    >
      {/* Thumbnail / embed */}
      {vid ? (
        <div style={{ position: 'relative', paddingTop: '56.25%', background: '#000' }}>
          <iframe
            src={`https://www.youtube.com/embed/${vid}`}
            title={video.title}
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
          />
        </div>
      ) : (
        <div style={{ height: 160, background: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Film size={40} color="var(--text-muted)" />
        </div>
      )}

      <div style={{ padding: '12px 14px' }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4, lineHeight: 1.3 }}>
          {video.title}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          {new Date(video.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
        </div>
      </div>

      {canDelete && (
        <button onClick={() => onDelete(video.id)} style={{
          position: 'absolute', top: 8, right: 8,
          background: 'rgba(0,0,0,0.7)', border: 'none', borderRadius: '50%',
          width: 28, height: 28, cursor: 'pointer', color: 'var(--red)', fontSize: 14,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>✕</button>
      )}
    </div>
  )
}

// ─── FoodCouponCard ───────────────────────────────────────────────────────────

function FoodCouponCard({ coupon, recipientId, playerName, onDelete }) {
  const [showLargeQR, setShowLargeQR] = useState(false)
  const qrData = JSON.stringify({ couponId: coupon.coupon_id, userId: coupon.user_id })
  const isRedeemed = coupon.redeemed
  const fc = Array.isArray(coupon.food_coupons) ? coupon.food_coupons[0] : coupon.food_coupons;
  const auc = fc?.auctions ? (Array.isArray(fc.auctions) ? fc.auctions[0] : fc.auctions) : null;

  return (
    <>
      <div 
        onClick={() => !isRedeemed && setShowLargeQR(true)}
        style={{
        background: isRedeemed
          ? 'linear-gradient(135deg, rgba(30,30,40,0.95) 0%, rgba(20,20,30,0.95) 100%)'
          : 'linear-gradient(135deg, rgba(20,40,80,0.95) 0%, rgba(10,20,50,0.95) 100%)',
        border: `2px solid ${isRedeemed ? 'rgba(100,100,120,0.3)' : 'rgba(74,158,255,0.35)'}`,
        borderRadius: 18,
        overflow: 'hidden',
        position: 'relative',
        opacity: isRedeemed ? 0.75 : 1,
        cursor: isRedeemed ? 'default' : 'pointer',
      }}>
        {/* Dashed divider line (INOX ticket style) */}
        <div style={{
          position: 'absolute', left: 0, right: 0, top: '50%',
          borderTop: '2px dashed rgba(255,255,255,0.08)',
          zIndex: 1,
        }} />
        {/* Left cutout */}
        <div style={{
          position: 'absolute', left: -10, top: '50%', transform: 'translateY(-50%)',
          width: 20, height: 20, borderRadius: '50%',
          background: 'var(--bg-elevated)', border: '1px solid var(--border)',
        }} />
        {/* Right cutout */}
        <div style={{
          position: 'absolute', right: -10, top: '50%', transform: 'translateY(-50%)',
          width: 20, height: 20, borderRadius: '50%',
          background: 'var(--bg-elevated)', border: '1px solid var(--border)',
        }} />

        {/* Top section — event info */}
        <div style={{ padding: '18px 20px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            <div style={{
              fontSize: 10, fontWeight: 700, color: 'var(--blue)', textTransform: 'uppercase',
              letterSpacing: 1.5, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4,
            }}><Utensils size={10} /> Food Coupon</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--text-primary)', fontFamily: 'Rajdhani', letterSpacing: 0.5, marginBottom: 4 }}>
              {fc?.event_name || 'Event'}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              {auc?.logo_url ? (
                <img src={auc.logo_url} alt="Auction Logo" style={{ width: 16, height: 16, borderRadius: '50%', objectFit: 'cover' }} />
              ) : (
                <Gavel size={12} color="var(--text-muted)" />
              )}
              <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>
                {auc?.name || 'Auction'}
              </span>
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 700, marginBottom: 8 }}>
              Issued to: {playerName}
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{
                background: 'rgba(245,166,35,0.15)', border: '1px solid rgba(245,166,35,0.3)',
                borderRadius: 6, padding: '3px 8px', fontSize: 12, fontWeight: 700, color: 'var(--gold)',
              }}>
                {fc?.meal_type || 'Food'}
              </span>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {fc?.coupon_date
                  ? new Date(fc.coupon_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                  : ''}
              </span>
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 8 }}>
              Issued: {new Date(coupon.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
            </div>
          </div>

          {/* QR Code */}
          <div style={{
            background: '#fff', borderRadius: 10, padding: 8,
            flexShrink: 0, marginLeft: 12,
            opacity: isRedeemed ? 0.4 : 1,
            filter: isRedeemed ? 'grayscale(1)' : 'none',
          }}>
            <QRCodeSVG value={qrData} size={80} level="M" />
          </div>
        </div>

        {/* Bottom section — status */}
        <div style={{
          padding: '12px 20px 16px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderTop: '1px dashed rgba(255,255,255,0.06)',
        }}>
          {isRedeemed ? (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#6b7280', letterSpacing: 1, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 5 }}>
                <CheckCircle size={14} /> REDEEMED
              </div>
              {coupon.redeemed_at && (
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                  {new Date(coupon.redeemed_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </div>
              )}
            </div>
          ) : (
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontStyle: 'italic' }}>
              Tap anywhere to enlarge QR
            </div>
          )}

          <button
            onClick={(e) => { e.stopPropagation(); onDelete(recipientId); }}
            style={{
              background: 'transparent', border: '1px solid rgba(255,80,80,0.3)',
              borderRadius: 6, padding: '4px 10px', cursor: 'pointer',
              color: 'var(--red)', fontSize: 11, fontWeight: 600,
            }}
          >
            Delete
          </button>
        </div>
      </div>

      {/* Large QR Modal */}
      {showLargeQR && (
        <div 
          onClick={() => setShowLargeQR(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 20, flexDirection: 'column'
          }}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#fff', borderRadius: 24, padding: 32,
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              boxShadow: '0 20px 40px rgba(0,0,0,0.5)', width: '100%', maxWidth: 360
            }}
          >
            <div style={{ fontSize: 22, fontWeight: 900, color: '#111', fontFamily: 'Rajdhani', marginBottom: 4, textAlign: 'center' }}>
              {fc?.event_name || 'Event'}
            </div>
            {auc && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                {auc.logo_url && (
                  <img src={auc.logo_url} alt="Logo" style={{ width: 16, height: 16, borderRadius: '50%', objectFit: 'cover' }} />
                )}
                <span style={{ fontSize: 13, color: '#444', fontWeight: 600 }}>{auc.name}</span>
              </div>
            )}
            <div style={{ fontSize: 14, fontWeight: 700, color: '#666', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>
              {fc?.meal_type || 'FOOD'} COUPON
            </div>
            <div style={{ fontSize: 14, color: '#222', fontWeight: 800, marginBottom: 8, textAlign: 'center' }}>
              {playerName}
            </div>
            <div style={{ fontSize: 11, color: '#666', marginBottom: 24, textAlign: 'center' }}>
              Issued: {new Date(coupon.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
            </div>
            
            <QRCodeSVG value={qrData} size={240} level="M" />
            
            <div style={{ marginTop: 24, fontSize: 14, color: '#888', textAlign: 'center' }}>
              Show this QR code to the host<br/>for scanning
            </div>
          </div>
          
          <button 
            onClick={() => setShowLargeQR(false)}
            style={{
              marginTop: 24, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: 50, padding: '12px 32px', color: '#fff', fontSize: 16, fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Close
          </button>
        </div>
      )}
    </>
  )
}

// ─── NotificationItem ─────────────────────────────────────────────────────────

function NotificationItem({ notif, onMarkRead }) {
  const iconMap = {
    added_to_auction: <Gavel size={20} color="var(--blue)" />,
    sold:             <CheckCircle size={20} color="var(--green)" />,
    coupon_issued:    <Ticket size={20} color="var(--gold)" />,
    match_result:     <BarChart3 size={20} color="var(--blue)" />,
    announcement:     <Bell size={20} color="var(--gold)" />,
  }
  return (
    <div
      onClick={() => !notif.read && onMarkRead(notif.id)}
      style={{
        display: 'flex', gap: 14, padding: '14px 16px',
        background: notif.read ? 'transparent' : 'rgba(74,158,255,0.06)',
        borderRadius: 12, cursor: notif.read ? 'default' : 'pointer',
        border: `1px solid ${notif.read ? 'var(--border)' : 'rgba(74,158,255,0.2)'}`,
        transition: 'background 0.2s',
      }}
    >
      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>{iconMap[notif.type] || <Bell size={20} color="var(--text-muted)" />}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
          <div style={{ fontSize: 14, fontWeight: notif.read ? 500 : 700, color: 'var(--text-primary)', lineHeight: 1.3 }}>
            {notif.title}
          </div>
          {!notif.read && (
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--blue)', flexShrink: 0, marginTop: 4 }} />
          )}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 3, lineHeight: 1.4 }}>
          {notif.body}
        </div>
        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 6 }}>
          {new Date(notif.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </div>
  )
}

// ─── Main Profile Page ────────────────────────────────────────────────────────

const TABS = ['Profile', 'My Tournaments', 'Food Coupons', 'My Library', 'Notifications']
const TAB_ICON_COMPONENTS = [User, Trophy, Ticket, Video, Bell]

export default function Profile() {
  const { user, logout } = useApp()
  const navigate = useNavigate()
  const location = useLocation()
  const fileRef = useRef()

  const [activeTab, setActiveTab] = useState(location.state?.tab || 'Profile')

  useEffect(() => {
    if (location.state?.tab) {
      setActiveTab(location.state.tab)
    }
  }, [location.state?.tab])
  const [profile, setProfile] = useState(null)
  const [editMode, setEditMode] = useState(false)
  const [editName, setEditName] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [photoFile, setPhotoFile] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [saving, setSaving] = useState(false)

  // My Tournaments
  const [myAuctions, setMyAuctions] = useState([])
  const [loadingTournaments, setLoadingTournaments] = useState(false)

  // Food Coupons
  const [myCoupons, setMyCoupons] = useState([])
  const [loadingCoupons, setLoadingCoupons] = useState(false)

  // My Library
  const [libraryTab, setLibraryTab] = useState('match') // match | my
  const [matchVideos, setMatchVideos] = useState([])
  const [myVideos, setMyVideos] = useState([])
  const [loadingVideos, setLoadingVideos] = useState(false)
  const [showAddVideo, setShowAddVideo] = useState(false)
  const [videoTitle, setVideoTitle] = useState('')
  const [videoUrl, setVideoUrl] = useState('')
  const [savingVideo, setSavingVideo] = useState(false)

  // Notifications
  const [notifications, setNotifications] = useState([])
  const [loadingNotifs, setLoadingNotifs] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

  // Auction detail modal
  const [selectedAuction, setSelectedAuction] = useState(null)
  const [auctionPlayers, setAuctionPlayers] = useState([])
  const [auctionTeams, setAuctionTeams] = useState([])
  const [myPlayerCard, setMyPlayerCard] = useState(null)
  const [auctionVideosForModal, setAuctionVideosForModal] = useState([])
  const [loadingAuctionDetail, setLoadingAuctionDetail] = useState(false)

  useEffect(() => {
    if (!user) return
    loadProfile()
    loadNotifCount()
  }, [user])

  useEffect(() => {
    if (activeTab === 'My Tournaments') loadMyTournaments()
    if (activeTab === 'Food Coupons') {
      loadMyCoupons()
      const channel = supabase.channel('my_coupons_changes')
        .on('postgres', { event: '*', schema: 'public', table: 'coupon_recipients', filter: `user_id=eq.${user.id}` }, () => {
          loadMyCoupons(true)
        })
        .subscribe()
      return () => { supabase.removeChannel(channel) }
    }
    if (activeTab === 'My Library') loadVideos()
    if (activeTab === 'Notifications') loadNotifications()
  }, [activeTab])

  // ── Data loaders ──────────────────────────────────────────────────────────

  async function loadProfile() {
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    if (data) {
      setProfile(data)
      setEditName(data.full_name || '')
      setEditPhone(data.phone || '')
      setPhotoPreview(data.avatar_url || null)
    }
  }

  async function loadNotifCount() {
    const { count } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('read', false)
    setUnreadCount(count || 0)
  }

  async function loadMyTournaments() {
    setLoadingTournaments(true)
    try {
      // Auctions where user is a player (linked by user_id)
      const { data: playerRows } = await supabase
        .from('players')
        .select('auction_id')
        .eq('user_id', user.id)

      const playerAuctionIds = (playerRows || []).map(r => r.auction_id)

      // Auctions where user is a member
      const { data: memberRows } = await supabase
        .from('auction_members')
        .select('auction_id')
        .eq('user_id', user.id)

      const memberAuctionIds = (memberRows || []).map(r => r.auction_id)

      // Also auctions they host
      const { data: hostedRows } = await supabase
        .from('auctions')
        .select('id')
        .eq('host_id', user.id)
      const hostedIds = (hostedRows || []).map(r => r.id)

      const allIds = [...new Set([...playerAuctionIds, ...memberAuctionIds, ...hostedIds])]

      if (allIds.length === 0) {
        setMyAuctions([])
        setLoadingTournaments(false)
        return
      }

      const { data: auctionsData } = await supabase
        .from('auctions')
        .select('*')
        .in('id', allIds)
        .order('created_at', { ascending: false })

      setMyAuctions(auctionsData || [])
    } catch (err) {
      showToast('Error loading tournaments: ' + err.message, 'error')
    }
    setLoadingTournaments(false)
  }

  async function loadMyCoupons(background = false) {
    if (!background) setLoadingCoupons(true)
    const { data } = await supabase
      .from('coupon_recipients')
      .select('*, food_coupons(event_name, meal_type, coupon_date, auction_id, auctions(name, logo_url))')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    setMyCoupons(data || [])
    if (!background) setLoadingCoupons(false)
  }

  async function loadVideos() {
    setLoadingVideos(true)
    try {
      // Match videos from auctions the user is in
      const { data: playerRows } = await supabase.from('players').select('auction_id').eq('user_id', user.id)
      const { data: memberRows } = await supabase.from('auction_members').select('auction_id').eq('user_id', user.id)
      const allAuctionIds = [...new Set([...(playerRows || []).map(r => r.auction_id), ...(memberRows || []).map(r => r.auction_id)])]

      let matchVids = []
      if (allAuctionIds.length > 0) {
        const { data } = await supabase
          .from('auction_videos')
          .select('*')
          .in('auction_id', allAuctionIds)
          .eq('is_match_video', true)
          .order('created_at', { ascending: false })
        matchVids = data || []
      }
      setMatchVideos(matchVids)

      // My own personal videos
      const { data: myVids } = await supabase
        .from('auction_videos')
        .select('*')
        .eq('added_by', user.id)
        .eq('is_match_video', false)
        .order('created_at', { ascending: false })
      setMyVideos(myVids || [])
    } catch (err) {
      showToast('Error loading videos: ' + err.message, 'error')
    }
    setLoadingVideos(false)
  }

  async function loadNotifications() {
    setLoadingNotifs(true)
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50)
    setNotifications(data || [])
    setUnreadCount((data || []).filter(n => !n.read).length)
    setLoadingNotifs(false)
  }

  async function loadAuctionDetail(auction) {
    setSelectedAuction(auction)
    setLoadingAuctionDetail(true)
    const [{ data: playersData }, { data: teamsData }, { data: videosData }] = await Promise.all([
      supabase.from('players').select('*').eq('auction_id', auction.id).order('code'),
      supabase.from('teams').select('*').eq('auction_id', auction.id),
      supabase.from('auction_videos').select('*').eq('auction_id', auction.id).order('created_at', { ascending: false }),
    ])
    setAuctionPlayers(playersData || [])
    setAuctionTeams(teamsData || [])
    setAuctionVideosForModal(videosData || [])
    const myCard = (playersData || []).find(p => p.user_id === user.id)
    setMyPlayerCard(myCard || null)
    setLoadingAuctionDetail(false)
  }

  // ── Actions ───────────────────────────────────────────────────────────────

  async function handleSaveProfile() {
    if (!editName.trim()) return showToast('Name is required', 'error')
    setSaving(true)
    try {
      let avatar_url = profile?.avatar_url || null
      if (photoFile) avatar_url = await uploadFile(photoFile, 'avatars')
      await supabase.from('profiles').update({ full_name: editName.trim(), phone: editPhone.trim(), avatar_url }).eq('id', user.id)
      await loadProfile()
      setEditMode(false)
      showToast('Profile updated!', 'success')
    } catch (err) {
      showToast('Error: ' + err.message, 'error')
    }
    setSaving(false)
  }

  async function handleDeleteCoupon(recipientId) {
    if (!window.confirm('Delete this coupon from your profile?')) return
    const { error } = await supabase.from('coupon_recipients').delete().eq('id', recipientId)
    if (error) return showToast('Error: ' + error.message, 'error')
    setMyCoupons(prev => prev.filter(c => c.id !== recipientId))
    showToast('Coupon deleted', 'info')
  }

  async function handleMarkRead(notifId) {
    await supabase.from('notifications').update({ read: true }).eq('id', notifId)
    setNotifications(prev => prev.map(n => n.id === notifId ? { ...n, read: true } : n))
    setUnreadCount(prev => Math.max(0, prev - 1))
  }

  async function handleMarkAllRead() {
    await supabase.from('notifications').update({ read: true }).eq('user_id', user.id).eq('read', false)
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    setUnreadCount(0)
  }

  async function handleAddVideo(e) {
    e.preventDefault()
    if (!videoTitle.trim() || !videoUrl.trim()) return showToast('Title and URL are required', 'error')
    if (!getYouTubeId(videoUrl)) return showToast('Please enter a valid YouTube URL', 'error')
    setSavingVideo(true)
    try {
      const { error } = await supabase.from('auction_videos').insert({
        auction_id: null,
        added_by: user.id,
        title: videoTitle.trim(),
        youtube_url: videoUrl.trim(),
        is_match_video: false,
      })
      if (error) throw error
      setVideoTitle('')
      setVideoUrl('')
      setShowAddVideo(false)
      loadVideos()
      showToast('Video added to your library!', 'success')
    } catch (err) {
      showToast('Error: ' + err.message, 'error')
    }
    setSavingVideo(false)
  }

  async function handleDeleteVideo(videoId) {
    if (!window.confirm('Remove this video?')) return
    const { error } = await supabase.from('auction_videos').delete().eq('id', videoId).eq('added_by', user.id)
    if (error) return showToast('Error: ' + error.message, 'error')
    setMyVideos(prev => prev.filter(v => v.id !== videoId))
    showToast('Video removed', 'info')
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={{ minHeight: '100vh', width: '100%', flex: 1, background: 'var(--bg-base)', display: 'flex', flexDirection: 'column' }}>
      {/* Top bar */}
      <div style={{
        background: 'var(--bg-elevated)',
        borderBottom: '1px solid var(--border)', flexShrink: 0,
        position: 'sticky', top: 0, zIndex: 100,
      }}>
        <div style={{ maxWidth: 700, width: '100%', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px' }}>
          <button onClick={() => navigate(-1)} style={{
            background: 'none', border: 'none', color: 'var(--text-secondary)',
            cursor: 'pointer', fontSize: 22, padding: '4px 8px',
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            ← <span style={{ fontSize: 14, fontWeight: 600 }}>Back</span>
          </button>
          <div style={{ fontFamily: 'Rajdhani', fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: 1 }}>
            MY PROFILE
          </div>
          <div style={{ width: 72 }} />
        </div>
      </div>

      {/* Tab bar */}
      <div style={{
        background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border)',
        flexShrink: 0, position: 'sticky', top: 57, zIndex: 99,
      }}>
        <div style={{ maxWidth: 700, width: '100%', margin: '0 auto', display: 'flex', overflowX: 'auto', gap: 4, padding: '12px 16px', scrollbarWidth: 'none' }}>
          {TABS.map((tab, i) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                background: activeTab === tab ? 'var(--blue)' : 'var(--bg-card)',
                border: `1px solid ${activeTab === tab ? 'var(--blue)' : 'var(--border)'}`,
                borderRadius: 20, padding: '7px 14px',
                color: activeTab === tab ? '#fff' : 'var(--text-secondary)',
                fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
                transition: 'all 0.2s', position: 'relative', flexShrink: 0,
              }}
            >
              {React.createElement(TAB_ICON_COMPONENTS[i], { size: 13, style: { display: 'inline', verticalAlign: 'middle', marginRight: 4 } })} {tab}
              {tab === 'Notifications' && unreadCount > 0 && (
                <span style={{
                  position: 'absolute', top: -4, right: -4,
                  background: 'var(--red)', color: '#fff',
                  borderRadius: '50%', width: 16, height: 16,
                  fontSize: 9, fontWeight: 800,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>{unreadCount > 9 ? '9+' : unreadCount}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, padding: '20px 16px', maxWidth: 700, width: '100%', margin: '0 auto' }}>

        {/* ── PROFILE TAB ── */}
        {activeTab === 'Profile' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Avatar & name */}
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
              padding: 28, background: 'var(--bg-card)', borderRadius: 20,
              border: '1px solid var(--border)', textAlign: 'center',
            }}>
              {/* Avatar */}
              <div style={{ position: 'relative' }}>
                <div style={{
                  width: 100, height: 100, borderRadius: '50%', overflow: 'hidden',
                  border: '3px solid var(--blue)', boxShadow: '0 0 20px rgba(74,158,255,0.25)',
                }}>
                  {(photoPreview || profile?.avatar_url) ? (
                    <img src={photoPreview || profile?.avatar_url} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', background: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <User size={40} color="var(--text-muted)" />
                    </div>
                  )}
                </div>
                {editMode && (
                  <>
                    <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => {
                      const f = e.target.files[0]
                      if (f) { setPhotoFile(f); setPhotoPreview(URL.createObjectURL(f)) }
                    }} />
                    <button onClick={() => fileRef.current?.click()} style={{
                      position: 'absolute', bottom: 0, right: 0,
                      background: 'var(--blue)', border: 'none', borderRadius: '50%',
                      width: 28, height: 28, cursor: 'pointer', color: '#fff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}><Camera size={14} /></button>
                  </>
                )}
              </div>

              {editMode ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%', maxWidth: 320 }}>
                  <input className="form-input" value={editName} onChange={e => setEditName(e.target.value)} placeholder="Full Name" />
                  <input className="form-input" value={editPhone} onChange={e => setEditPhone(e.target.value)} placeholder="Phone Number" type="tel" />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-ghost" onClick={() => { setEditMode(false); setPhotoPreview(profile?.avatar_url || null); setPhotoFile(null) }}>Cancel</button>
                    <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleSaveProfile} disabled={saving}>
                      {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'Rajdhani', letterSpacing: 0.5 }}>
                      {profile?.full_name || user?.email?.split('@')[0] || 'Player'}
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>{user?.email}</div>
                    {profile?.phone && (
                      <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 5 }}><Phone size={12} /> {profile.phone}</div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => setEditMode(true)} style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Pencil size={13} /> Edit Profile</button>
                    <button className="btn btn-danger btn-sm" onClick={logout} style={{ display: 'flex', alignItems: 'center', gap: 5 }}><LogOut size={13} /> Logout</button>
                  </div>
                </>
              )}
            </div>

            {/* Stats summary */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              {[
                { label: 'Tournaments', value: myAuctions.length || '—', Icon: Trophy, color: 'var(--gold)' },
                { label: 'Coupons', value: myCoupons.length || '—', Icon: Ticket, color: 'var(--blue)' },
                { label: 'Alerts', value: unreadCount, Icon: Bell, color: 'var(--red)', highlight: unreadCount > 0 },
              ].map(stat => (
                <div key={stat.label} style={{
                  background: 'var(--bg-card)', border: '1px solid var(--border)',
                  borderRadius: 14, padding: '16px 12px', textAlign: 'center',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 6 }}><stat.Icon size={24} color={stat.color} /></div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: stat.highlight ? 'var(--red)' : 'var(--blue)', fontFamily: 'Rajdhani' }}>
                    {stat.value}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 2 }}>
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── MY TOURNAMENTS TAB ── */}
        {activeTab === 'My Tournaments' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>
              Auctions you've participated in or joined
            </div>
            {loadingTournaments ? (
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Loading...</div>
            ) : myAuctions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}><Building2 size={56} color="var(--text-muted)" /></div>
                <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-secondary)' }}>No tournaments yet</div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 6 }}>Join an auction or get added by a host</div>
              </div>
            ) : (
              myAuctions.map(auction => (
                <div
                  key={auction.id}
                  onClick={() => loadAuctionDetail(auction)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 14, padding: '16px',
                    background: 'var(--bg-card)', border: '1px solid var(--border)',
                    borderRadius: 14, cursor: 'pointer', transition: 'border-color 0.2s, transform 0.15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--blue)'; e.currentTarget.style.transform = 'translateY(-1px)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = '' }}
                >
                  {auction.logo_url ? (
                    <img src={auction.logo_url} alt={auction.name} style={{ width: 48, height: 48, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }} />
                  ) : (
                    <div style={{ width: 48, height: 48, borderRadius: 10, background: 'rgba(74,158,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Gavel size={24} color="var(--blue)" />
                    </div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {auction.name}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                      {new Date(auction.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                    <div style={{ marginTop: 4 }}>
                      <span style={{
                        fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
                        background: auction.status === 'completed' ? 'rgba(46,204,113,0.15)' : 'rgba(74,158,255,0.15)',
                        color: auction.status === 'completed' ? 'var(--green)' : 'var(--blue)',
                        border: `1px solid ${auction.status === 'completed' ? 'rgba(46,204,113,0.3)' : 'rgba(74,158,255,0.3)'}`,
                        textTransform: 'uppercase', letterSpacing: 0.8,
                      }}>
                        {auction.status === 'completed' ? '✓ Completed' : '● Active'}
                      </span>
                    </div>
                  </div>
                  <div style={{ color: 'var(--text-muted)', fontSize: 18 }}>›</div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ── FOOD COUPONS TAB ── */}
        {activeTab === 'Food Coupons' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>
              Food coupons issued by your auction hosts
            </div>
            {loadingCoupons ? (
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Loading...</div>
            ) : myCoupons.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}><Utensils size={56} color="var(--text-muted)" /></div>
                <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-secondary)' }}>No food coupons yet</div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 6 }}>Your host will issue coupons for events</div>
              </div>
            ) : (
              myCoupons.map(coupon => (
                <FoodCouponCard
                  key={coupon.id}
                  coupon={coupon}
                  recipientId={coupon.id}
                  playerName={profile?.full_name || user?.email?.split('@')[0] || 'Player'}
                  onDelete={handleDeleteCoupon}
                />
              ))
            )}
          </div>
        )}

        {/* ── MY LIBRARY TAB ── */}
        {activeTab === 'My Library' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Sub-tabs */}
            <div style={{ display: 'flex', gap: 8 }}>
              {[['match', 'Match Videos', Film], ['my', 'My Videos', Target]].map(([key, label, Icon]) => (
                <button
                  key={key}
                  onClick={() => setLibraryTab(key)}
                  style={{
                    flex: 1, padding: '10px', borderRadius: 10,
                    background: libraryTab === key ? 'var(--blue)' : 'var(--bg-card)',
                    border: `1px solid ${libraryTab === key ? 'var(--blue)' : 'var(--border)'}`,
                    color: libraryTab === key ? '#fff' : 'var(--text-secondary)',
                    fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}><Icon size={14} />{label}</span>
                </button>
              ))}
            </div>

            {/* Add my video button */}
            {libraryTab === 'my' && !showAddVideo && (
              <button className="btn btn-primary" onClick={() => setShowAddVideo(true)}>
                + Add YouTube Video
              </button>
            )}

            {/* Add video form */}
            {libraryTab === 'my' && showAddVideo && (
              <form onSubmit={handleAddVideo} style={{
                background: 'var(--bg-card)', border: '1px solid var(--border)',
                borderRadius: 14, padding: 16, display: 'flex', flexDirection: 'column', gap: 10,
              }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>Add a YouTube Video</div>
                <input className="form-input" placeholder="Video title (e.g. My match highlights)" value={videoTitle} onChange={e => setVideoTitle(e.target.value)} />
                <input className="form-input" placeholder="YouTube URL (e.g. https://youtu.be/...)" value={videoUrl} onChange={e => setVideoUrl(e.target.value)} type="url" />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="button" className="btn btn-ghost" onClick={() => setShowAddVideo(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={savingVideo}>
                    {savingVideo ? 'Adding...' : 'Add Video'}
                  </button>
                </div>
              </form>
            )}

            {loadingVideos ? (
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Loading...</div>
            ) : (
              <>
                {libraryTab === 'match' && (
                  matchVideos.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}><Film size={56} color="var(--text-muted)" /></div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-secondary)' }}>No match recordings yet</div>
                      <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 6 }}>Your host will add match recordings here</div>
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gap: 14 }}>
                      {matchVideos.map(v => <YouTubeCard key={v.id} video={v} canDelete={false} />)}
                    </div>
                  )
                )}
                {libraryTab === 'my' && (
                  myVideos.length === 0 && !showAddVideo ? (
                    <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}><Target size={56} color="var(--text-muted)" /></div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-secondary)' }}>No personal videos yet</div>
                      <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 6 }}>Add your YouTube highlights above</div>
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gap: 14 }}>
                      {myVideos.map(v => <YouTubeCard key={v.id} video={v} canDelete={true} onDelete={handleDeleteVideo} />)}
                    </div>
                  )
                )}
              </>
            )}
          </div>
        )}

        {/* ── NOTIFICATIONS TAB ── */}
        {activeTab === 'Notifications' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {unreadCount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button className="btn btn-ghost btn-sm" onClick={handleMarkAllRead}>
                  ✓ Mark all as read
                </button>
              </div>
            )}
            {loadingNotifs ? (
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Loading...</div>
            ) : notifications.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}><Bell size={56} color="var(--text-muted)" /></div>
                <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-secondary)' }}>No notifications yet</div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 6 }}>You'll be notified when added to auctions, sold, and more</div>
              </div>
            ) : (
              notifications.map(notif => (
                <NotificationItem key={notif.id} notif={notif} onMarkRead={handleMarkRead} />
              ))
            )}
          </div>
        )}
      </div>

      {/* ── Auction Detail Modal ── */}
      {selectedAuction && (
        <div className="modal-overlay" style={{ zIndex: 200 }}>
          <div className="modal" style={{ maxWidth: 600, width: '96vw', maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div className="modal-header">
              <div className="modal-title">
                {selectedAuction.logo_url && <img src={selectedAuction.logo_url} alt="" style={{ width: 28, height: 28, borderRadius: 6, objectFit: 'cover', marginRight: 8 }} />}
                {selectedAuction.name}
              </div>
              <button className="modal-close" onClick={() => setSelectedAuction(null)}>✕</button>
            </div>

            {loadingAuctionDetail ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading auction details...</div>
            ) : (
              <div style={{ overflowY: 'auto', flex: 1, padding: '0 20px 20px' }}>

                {/* My player card */}
                {myPlayerCard && (
                  <div style={{
                    background: 'linear-gradient(135deg, rgba(74,158,255,0.12), rgba(74,158,255,0.04))',
                    border: '1px solid rgba(74,158,255,0.35)',
                    borderRadius: 14, padding: 16, marginBottom: 20, marginTop: 16,
                  }}>
                    <div style={{ fontSize: 10, color: 'var(--blue)', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 10, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5 }}>
                      <Hash size={10} /> My Player Card
                    </div>
                    <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                      {myPlayerCard.photo_url ? (
                        <img src={myPlayerCard.photo_url} alt={myPlayerCard.name} style={{ width: 56, height: 56, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }} />
                      ) : (
                        <div style={{ width: 56, height: 56, borderRadius: 10, background: 'rgba(74,158,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <User size={28} color="var(--blue)" />
                        </div>
                      )}
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'Rajdhani' }}>{myPlayerCard.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{myPlayerCard.role} · {myPlayerCard.code}</div>
                        {myPlayerCard.status === 'sold' ? (
                          <div style={{ marginTop: 6, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--green)', background: 'rgba(46,204,113,0.12)', border: '1px solid rgba(46,204,113,0.3)', borderRadius: 6, padding: '2px 8px', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                              <Gavel size={11} /> SOLD — ₹{myPlayerCard.sold_price}L
                            </span>
                            {auctionTeams.find(t => t.id === myPlayerCard.team_id) && (
                              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 6, padding: '2px 8px' }}>
                                {auctionTeams.find(t => t.id === myPlayerCard.team_id)?.name}
                              </span>
                            )}
                          </div>
                        ) : myPlayerCard.status === 'unsold' ? (
                          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--red)', marginTop: 6, display: 'inline-block' }}>Unsold</span>
                        ) : (
                          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginTop: 6, display: 'inline-block' }}>Available / Upcoming</span>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Auction status actions */}
                {selectedAuction.status !== 'completed' && (
                  <button
                    className="btn btn-primary"
                    style={{ width: '100%', marginBottom: 20 }}
                    onClick={() => { setSelectedAuction(null); navigate('/auction') }}
                  >
                    👁️ Watch Live Auction
                  </button>
                )}

                {/* All teams & results */}
                {auctionTeams.length > 0 && (
                  <div style={{ marginBottom: 20 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
                      Teams & Results
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {auctionTeams.map(team => {
                        const teamPlayers = auctionPlayers.filter(p => p.team_id === team.id && p.status === 'sold')
                        return (
                          <div key={team.id} style={{
                            background: `${team.color}12`,
                            border: `1px solid ${team.color}44`,
                            borderRadius: 12, padding: '12px 14px',
                          }}>
                            <div style={{ fontSize: 14, fontWeight: 800, color: '#fff', fontFamily: 'Rajdhani', marginBottom: 6 }}>
                              {team.logo_url && <img src={team.logo_url} alt="" style={{ width: 20, height: 20, borderRadius: 4, objectFit: 'cover', marginRight: 6, verticalAlign: 'middle' }} />}
                              {team.name}
                            </div>
                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                              {teamPlayers.map(p => (
                                <span key={p.id} style={{
                                  fontSize: 11, padding: '3px 8px', borderRadius: 6,
                                  background: p.user_id === user.id ? 'rgba(74,158,255,0.2)' : 'var(--bg-elevated)',
                                  border: `1px solid ${p.user_id === user.id ? 'rgba(74,158,255,0.4)' : 'var(--border)'}`,
                                  color: p.user_id === user.id ? 'var(--blue)' : 'var(--text-secondary)',
                                  fontWeight: p.user_id === user.id ? 700 : 400,
                                }}>
                                  {p.name} ({p.sold_price}L)
                                </span>
                              ))}
                              {teamPlayers.length === 0 && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>No players yet</span>}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Video links for this auction */}
                {auctionVideosForModal.length > 0 && (
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
                      Match Videos
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {auctionVideosForModal.map(v => (
                        <YouTubeCard key={v.id} video={v} canDelete={false} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
