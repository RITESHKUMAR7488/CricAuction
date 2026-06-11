import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

import { useApp } from '../context/AppContext'
import { supabase } from '../lib/supabase'
import { exportAuctionPDF, exportAuctionCSV } from '../lib/exportUtils'
import { showToast } from './Toast'
import {
  Plus, RefreshCw, Pencil, Image, ImagePlay, Crown,
  FileText, BarChart2, RotateCcw, Trash2, LogOut,
  Camera, Check, Circle, LayoutDashboard, User,
  Trophy, Ticket, Video, Bell, ChevronRight, Lock
} from 'lucide-react'

export default function SideMenu({ onClose }) {
  const navigate = useNavigate()
  const { leagueName, updateLeagueName, leagueLogo, updateLeagueLogo, updateBannerLogo, activeAuction, auctions, createAuction, switchAuction, resetAuction, loadAuctions, userRole, clearActiveAuction, user, logout, joinedAuctionIds } = useApp()
  const [view, setView] = useState('main') // main | rename | updatelogo | newauction | switchauction
  const [nameInput, setNameInput] = useState(activeAuction?.name || leagueName)
  const [logoInput, setLogoInput] = useState(activeAuction?.logo_url || leagueLogo)
  const [auctionName, setAuctionName] = useState('')
  const [hostPhone, setHostPhone] = useState('')
  const [loading, setLoading] = useState(false)

  // Profile data
  const [profile, setProfile] = useState(null)
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    if (!user) return
    supabase.from('profiles').select('*').eq('id', user.id).single().then(({ data }) => {
      if (data) setProfile(data)
    })
    supabase.from('notifications').select('*', { count: 'exact', head: true })
      .eq('user_id', user.id).eq('read', false)
      .then(({ count }) => setUnreadCount(count || 0))
  }, [user])

  const displayName = profile?.full_name || user?.email?.split('@')[0] || 'Player'
  const avatarUrl = profile?.avatar_url || null

  async function handleRename() {
    if (!nameInput.trim()) return
    await updateLeagueName(nameInput.trim())
    setView('main')
  }

  async function handleUpdateLogo() {
    if (!logoInput.trim()) return
    await updateLeagueLogo(logoInput.trim())
    setView('main')
  }

  async function handleCreateAuction() {
    if (!auctionName.trim()) return
    setLoading(true)
    try {
      await createAuction(auctionName.trim())
      setAuctionName('')
      setView('main')
      onClose()
    } catch(e) {
      showToast('Error: ' + e.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  async function handleReset() {
    if (!activeAuction) return
    if (!window.confirm(`Reset all auction data for "${activeAuction.name}"? This will mark all players as available and remove team assignments.`)) return
    setLoading(true)
    await resetAuction()
    setLoading(false)
    onClose()
  }

  async function handleDeleteAuction() {
    if (!activeAuction) return
    if (!window.confirm(`DELETE auction "${activeAuction.name}"? This will permanently delete all players and teams in this auction.`)) return
    setLoading(true)
    const { error } = await supabase.from('auctions').delete().eq('id', activeAuction.id)
    if (error) {
      showToast('Error deleting auction: ' + error.message, 'error')
      setLoading(false)
      return
    }
    clearActiveAuction()   // clears state + localStorage for this user
    await loadAuctions()
    setLoading(false)
    onClose()
    showToast('Auction deleted', 'info')
  }

  return (
    <div className="menu-overlay">
      <div className="menu-backdrop" onClick={onClose} style={{ zIndex: 1 }} />

      <div className="menu-panel" style={{ zIndex: 3, padding: 0, display: 'flex', flexDirection: 'column' }}>

        {/* ── Profile Header ── */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(74,158,255,0.12) 0%, rgba(74,158,255,0.04) 100%)',
          borderBottom: '1px solid var(--border)',
          padding: '20px 20px 16px',
          position: 'relative',
        }}>
          {/* Close button */}
          <button
            onClick={onClose}
            style={{ position: 'absolute', top: 14, right: 14, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '50%', width: 28, height: 28, cursor: 'pointer', color: 'var(--text-muted)', lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}
          >
            &times;
          </button>


          {/* Avatar + Name */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 52, height: 52, borderRadius: '50%', overflow: 'hidden', flexShrink: 0,
              border: '2.5px solid var(--blue)', boxShadow: '0 0 14px rgba(74,158,255,0.3)',
            }}>
              {avatarUrl
                ? <img src={avatarUrl} alt="me" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <div style={{ width: '100%', height: '100%', background: 'var(--bg-card)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><User size={22} color="var(--blue)" /></div>
              }
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'Rajdhani', letterSpacing: 0.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {displayName}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 1 }}>
                {user?.email}
              </div>
              {userRole === 'host' && (
                <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--gold)', background: 'rgba(245,166,35,0.15)', border: '1px solid rgba(245,166,35,0.3)', borderRadius: 20, padding: '2px 7px', textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 4, display: 'inline-block' }}>Host</span>
              )}
            </div>
          </div>

          {/* Active Auction pill */}
          {activeAuction && (
            <div style={{ marginTop: 14, padding: '8px 12px', background: 'rgba(74,158,255,0.08)', borderRadius: 8, border: '1px dashed rgba(74,158,255,0.3)' }}>
              <div style={{ fontSize: 9, color: 'var(--blue)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 3 }}>Active Auction</div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{activeAuction.name}</span>
                {userRole === 'host' && (
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(`Join my Elite League Auction "${activeAuction.name}"!\n\nJoin Code: *${activeAuction.join_code}*\n\nLink: ${window.location.origin}/dashboard?join=${activeAuction.join_code}`)}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{ background: '#25D366', color: 'white', padding: '4px 8px', borderRadius: 5, fontSize: 10, fontWeight: 700, textDecoration: 'none', flexShrink: 0 }}
                    onClick={e => e.stopPropagation()}
                  >
                    SHARE · <b>{activeAuction.join_code}</b>
                  </a>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Scrollable Body ── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>

          {/* ── Profile Section ── */}
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, padding: '10px 16px 4px' }}>My Profile</div>

          {[
            { label: 'Edit Profile', icon: <Pencil size={15} color="var(--text-muted)" />, tab: null, action: () => { onClose(); navigate('/profile', { state: { tab: 'Profile' } }) } },
            { label: 'Profile & Stats', icon: <User size={15} color="var(--text-muted)" />, tab: 'Profile' },
            { label: 'My Tournaments', icon: <Trophy size={15} color="var(--text-muted)" />, tab: 'My Tournaments' },
            { label: 'Food Coupons', icon: <Ticket size={15} color="var(--text-muted)" />, tab: 'Food Coupons' },
            { label: 'My Library', icon: <Video size={15} color="var(--text-muted)" />, tab: 'My Library' },
          ].map(item => (
            <button
              key={item.label}
              onClick={item.action || (() => { onClose(); navigate('/profile', { state: { tab: item.tab } }) })}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '11px 20px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-primary)', fontSize: 13, fontWeight: 500 }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-card)'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}
            >
              {item.icon}
              <span style={{ flex: 1, textAlign: 'left' }}>{item.label}</span>
              <ChevronRight size={13} color="var(--text-muted)" />
            </button>
          ))}
          <button
            onClick={() => { onClose(); navigate('/profile', { state: { tab: 'Notifications' } }) }}
            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '11px 20px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-primary)', fontSize: 13, fontWeight: 500, position: 'relative' }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-card)'}
            onMouseLeave={e => e.currentTarget.style.background = 'none'}
          >
            <Bell size={15} color="var(--text-muted)" />
            <span style={{ flex: 1, textAlign: 'left' }}>Notifications</span>
            {unreadCount > 0 && (
              <span style={{ background: 'var(--red)', color: '#fff', borderRadius: '50%', width: 18, height: 18, fontSize: 10, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
            <ChevronRight size={13} color="var(--text-muted)" />
          </button>

          <div className="menu-divider" />

          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, padding: '10px 16px 4px' }}>Auction</div>

          {view === 'main' && <>
          <div className="menu-item" onClick={() => { setView('newauction'); setAuctionName('') }} id="menu-create-auction">
            <Plus size={16} /> Create New Auction
          </div>
          <div className="menu-item" onClick={() => { setView('switchauction'); loadAuctions() }} id="menu-switch-auction">
            <RefreshCw size={16} /> Switch Auction
          </div>
          <div className="menu-divider" />
          {userRole === 'host' && (
            <>
              <div className="menu-item" onClick={() => { setView('rename'); setNameInput(activeAuction?.name || leagueName) }} id="menu-rename-league">
                <Pencil size={16} /> Rename {activeAuction ? 'Auction' : 'League'}
              </div>
              <div className="menu-item" onClick={() => { setView('updatelogo'); setLogoInput(activeAuction?.logo_url || leagueLogo) }} id="menu-update-logo">
                <Image size={16} /> Update Logo
              </div>
              <div className="menu-item" onClick={() => { setView('updatebanner'); }} id="menu-update-banner">
                <ImagePlay size={16} /> Update Banner
              </div>
              <div className="menu-item" onClick={() => { setView('addhost'); setHostPhone('') }} id="menu-add-host">
                <Crown size={16} /> Add Co-Host
              </div>
              <div className="menu-divider" />
            </>
          )}

          {/* ── Download Section ── */}
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, padding: '4px 16px', marginBottom: 2 }}>
            Download Auction Data
          </div>
          <div
            className={`menu-item${!activeAuction || loading ? ' disabled' : ''}`}
            style={{ opacity: !activeAuction ? 0.4 : 1, cursor: !activeAuction ? 'not-allowed' : 'pointer' }}
            onClick={async () => {
              if (!activeAuction || loading) return
              setLoading(true)
              try { await exportAuctionPDF(activeAuction.id, leagueName) }
              catch(e) { showToast('Export error: ' + e.message, 'error') }
              finally { setLoading(false) }
            }}
            id="menu-download-pdf"
          >
            <FileText size={16} />
            {loading ? 'Generating...' : 'Download PDF Report'}
          </div>
          {userRole === 'host' && (
            <>
              <div className="menu-divider" />
              <div className="menu-item danger" onClick={handleReset} id="menu-reset-auction">
                <RotateCcw size={16} /> Reset Auction Data
              </div>
              <div className="menu-item danger" onClick={handleDeleteAuction} id="menu-delete-auction">
                <Trash2 size={16} /> Delete Auction
              </div>
            </>
          )}

          <div className="menu-divider" />
          <div className="menu-item" onClick={() => { onClose(); navigate('/dashboard') }} id="menu-go-dashboard">
            <LayoutDashboard size={16} /> Go to Dashboard
          </div>
          <div className="menu-item" onClick={() => { onClose(); navigate('/about-founder') }} id="menu-about-founder">
            <User size={16} /> About Founder
          </div>
          <div className="menu-item" onClick={async () => {
            await logout()
            onClose()
          }} id="menu-logout">
            <LogOut size={16} /> Log Out
          </div>
          </>}

          {/* Sub-views — shown inside scrollable body */}
          {view !== 'main' && (
            <div style={{ padding: '0 16px 16px' }}>

          {view === 'rename' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Rename {activeAuction ? 'Auction' : 'League'}</div>
            <input
              className="form-input"
              value={nameInput}
              onChange={e => setNameInput(e.target.value)}
              placeholder="e.g. ELITE LEAGUE"
              id="rename-league-input"
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setView('main')}>Cancel</button>
              <button className="btn btn-primary btn-sm" onClick={handleRename} id="rename-league-save">Save</button>
            </div>
          </div>
          )}

          {view === 'updatelogo' && (() => {
          const fileRef2 = React.createRef()
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Update Tournament Logo</div>
              <input ref={fileRef2} type="file" accept="image/*" style={{ display: 'none' }}
                onChange={async (e) => {
                  const file = e.target.files[0]
                  if (!file) return
                  try {
                    const { uploadFile } = await import('../lib/supabase')
                    setLoading(true)
                    const url = await uploadFile(file, 'logos')
                    await updateLeagueLogo(url)
                    setView('main')
                    showToast('Logo updated!', 'success')
                  } catch(err) {
                    showToast('Upload error: ' + err.message, 'error')
                  } finally { setLoading(false) }
                }}
              />
              {(activeAuction?.logo_url || leagueLogo) && (
                <img src={activeAuction?.logo_url || leagueLogo} alt="current logo" style={{ width: 80, height: 80, borderRadius: 12, objectFit: 'cover', margin: '0 auto', display: 'block', border: '2px solid var(--border)' }} />
              )}
              <button className="btn btn-primary btn-sm" onClick={() => fileRef2.current?.click()} disabled={loading}>
                {loading ? 'Uploading...' : <><Camera size={14} style={{ marginRight: 6 }} />Choose Photo</>}
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => setView('main')}>Cancel</button>
            </div>
          )
        })()}

          {view === 'updatebanner' && (() => {
          const fileRef3 = React.createRef()
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Update Tournament Banner</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Upload any image as a full-screen banner. It will be shown as-is when someone enters the auction.</div>

              <input ref={fileRef3} type="file" accept="image/*" style={{ display: 'none' }}
                onChange={async (e) => {
                  const file = e.target.files[0]
                  if (!file) return
                  try {
                    const { uploadFile } = await import('../lib/supabase')
                    setLoading(true)
                    const url = await uploadFile(file, 'logos')
                    await updateBannerLogo(url)
                    setView('main')
                    showToast('Banner updated!', 'success')
                  } catch(err) {
                    showToast('Upload error: ' + err.message, 'error')
                  } finally { setLoading(false) }
                }}
              />
              {activeAuction?.banner_url && (
                <img src={activeAuction?.banner_url} alt="current banner" style={{ width: '100%', borderRadius: 12, objectFit: 'contain', maxHeight: 120, background: '#111', margin: '0 auto', display: 'block', border: '2px solid var(--border)' }} />
              )}
              <button className="btn btn-primary btn-sm" onClick={() => fileRef3.current?.click()} disabled={loading}>
                {loading ? 'Uploading...' : <><Camera size={14} style={{ marginRight: 6 }} />Choose Banner Image</>}
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => setView('main')}>Cancel</button>
            </div>
          )
        })()}

          {view === 'addhost' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Add Co-Host</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Enter the mobile number of the person you want to make a co-host.</div>
            <input
              type="tel"
              className="form-input"
              value={hostPhone}
              onChange={e => setHostPhone(e.target.value)}
              placeholder="e.g. 9876543210"
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setView('main')}>Cancel</button>
              <button className="btn btn-primary btn-sm" onClick={async () => {
                if (!hostPhone) return;
                setLoading(true);
                try {
                  // Convert phone to deterministic email used by Auth
                  const digits = hostPhone.replace(/\D/g, '');
                  if (digits.length < 5) throw new Error('Please enter a valid mobile number');
                  const hostEmailToSave = `${digits}@cricauction.app`;

                  // Fetch current co_hosts
                  const { data } = await supabase.from('auctions').select('co_hosts').eq('id', activeAuction.id).single();
                  const currentHosts = data?.co_hosts || [];
                  if (!currentHosts.includes(hostEmailToSave)) {
                    const newHosts = [...currentHosts, hostEmailToSave];
                    const { error } = await supabase.from('auctions').update({ co_hosts: newHosts }).eq('id', activeAuction.id);
                    if (error) {
                      if (error.message.includes('co_hosts')) {
                        throw new Error('Database column "co_hosts" is missing. Please run the SQL migration to add it.');
                      }
                      throw error;
                    }
                  }
                  showToast('Co-host added successfully!', 'success');
                  setView('main');
                } catch(err) {
                  showToast('Error: ' + err.message, 'error');
                } finally {
                  setLoading(false);
                }
              }} disabled={loading}>
                {loading ? 'Adding...' : 'Add Host'}
              </button>
            </div>
          </div>
        )}

          {view === 'newauction' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>New Auction</div>
            <input
              className="form-input"
              value={auctionName}
              onChange={e => setAuctionName(e.target.value)}
              placeholder="e.g. IPL Auction 2025"
              id="new-auction-name-input"
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setView('main')}>Cancel</button>
              <button className="btn btn-primary btn-sm" onClick={handleCreateAuction} disabled={loading} id="create-auction-btn">
                {loading ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        )}

          {view === 'switchauction' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>Switch Auction</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>Select an auction you've joined or hosted.</div>
            {auctions.filter(a => {
              const isHost   = a.host_id === user?.id
              const isCoHost = a.co_hosts && a.co_hosts.includes(user?.email)
              return isHost || isCoHost || joinedAuctionIds.has(a.id)
            }).map(a => {
              const isActive = activeAuction?.id === a.id
              return (
              <div
                key={a.id}
                className={`menu-item${isActive ? ' active' : ''}`}
                style={{
                  ...(isActive ? { background: 'rgba(74,158,255,0.1)', borderColor: 'rgba(74,158,255,0.3)', color: 'var(--blue)' } : {}),
                  cursor: 'pointer'
                }}
                onClick={() => {
                  switchAuction(a).catch(() => {})
                  setView('main')
                  onClose()
                }}
                id={`switch-auction-${a.id}`}
              >
                {isActive
                  ? <Check size={14} style={{ color: 'var(--blue)', flexShrink: 0 }} />
                  : <Circle size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                }
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.name}</div>
                  <div style={{ fontSize: 11, color: isActive ? 'var(--blue)' : 'var(--text-muted)' }}>
                    {new Date(a.created_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
              )
            })}
            {auctions.filter(a => a.host_id === user?.id || (a.co_hosts && a.co_hosts.includes(user?.email)) || joinedAuctionIds.has(a.id)).length === 0 && (
              <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: '12px 0' }}>
                No accessible auctions.
              </div>
            )}
            <button className="btn btn-ghost btn-sm" style={{ marginTop: 8 }} onClick={() => setView('main')}>Back</button>
          </div>
          )}
            </div>
          )}

          {/* BricX logo at the bottom */}
          <div style={{ marginTop: 'auto', paddingTop: 24, paddingBottom: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', opacity: 0.8 }}>
            <img src="/bricx-logo.png" alt="Powered by BRICX" style={{ width: 140, objectFit: 'contain' }} />
          </div>

        </div>
      </div>
    </div>
  )
}
