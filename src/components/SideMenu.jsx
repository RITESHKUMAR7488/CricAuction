import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { useApp } from '../context/AppContext'
import { supabase } from '../lib/supabase'
import { exportAuctionPDF, exportAuctionCSV } from '../lib/exportUtils'
import { showToast } from './Toast'
import {
  Plus, RefreshCw, Pencil, Image, ImagePlay, Crown,
  FileText, BarChart2, RotateCcw, Trash2, LogOut,
  Camera, Check, Circle, LayoutDashboard, User
} from 'lucide-react'

export default function SideMenu({ onClose }) {
  const navigate = useNavigate()
  const { leagueName, updateLeagueName, leagueLogo, updateLeagueLogo, updateBannerLogo, activeAuction, auctions, createAuction, switchAuction, resetAuction, loadAuctions, userRole, clearActiveAuction } = useApp()
  const [view, setView] = useState('main') // main | rename | updatelogo | newauction | switchauction
  const [nameInput, setNameInput] = useState(activeAuction?.name || leagueName)
  const [logoInput, setLogoInput] = useState(activeAuction?.logo_url || leagueLogo)
  const [auctionName, setAuctionName] = useState('')
  const [hostEmail, setHostEmail] = useState('')
  const [loading, setLoading] = useState(false)

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

      <div className="menu-panel" style={{ zIndex: 3 }}>
        <button 
          onClick={onClose} 
          style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', fontSize: 28, cursor: 'pointer', color: 'var(--text-muted)', lineHeight: 1 }}
        >
          &times;
        </button>
        <div style={{ marginBottom: 16, paddingRight: 24 }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Active Auction</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
            {activeAuction ? activeAuction.name : 'None selected'}
          </div>
          {activeAuction && userRole === 'host' && (
            <div style={{ marginTop: 12, padding: '10px 12px', background: 'rgba(74,158,255,0.08)', borderRadius: 8, border: '1px dashed rgba(74,158,255,0.3)' }}>
              <div style={{ fontSize: 10, color: 'var(--blue)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Join Code</div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: 2 }}>{activeAuction.join_code}</span>
                <a 
                  href={`https://wa.me/?text=${encodeURIComponent(`Join my Elite League Auction "${activeAuction.name}"!\n\nJoin Code: *${activeAuction.join_code}*\n\nLink: ${window.location.origin}/dashboard?join=${activeAuction.join_code}`)}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{ background: '#25D366', color: 'white', padding: '6px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6, boxShadow: '0 2px 8px rgba(37,211,102,0.3)' }}
                >
                  SHARE <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.888-.788-1.489-1.761-1.663-2.06-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                </a>
              </div>
            </div>
          )}
        </div>

        <div className="menu-divider" />

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
              <div className="menu-item" onClick={() => { setView('addhost'); setHostEmail('') }} id="menu-add-host">
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
          <div
            className={`menu-item${!activeAuction || loading ? ' disabled' : ''}`}
            style={{ opacity: !activeAuction ? 0.4 : 1, cursor: !activeAuction ? 'not-allowed' : 'pointer' }}
            onClick={async () => {
              if (!activeAuction || loading) return
              setLoading(true)
              try { await exportAuctionCSV(activeAuction.id, leagueName) }
              catch(e) { showToast('Export error: ' + e.message, 'error') }
              finally { setLoading(false) }
            }}
            id="menu-download-csv"
          >
            <BarChart2 size={16} />
            {loading ? 'Exporting...' : 'Download CSV Files'}
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
            await supabase.auth.signOut()
            onClose()
          }} id="menu-logout">
            <LogOut size={16} /> Log Out
          </div>
        </>}

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
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Enter the email address of the person you want to make a co-host.</div>
            <input
              type="email"
              className="form-input"
              value={hostEmail}
              onChange={e => setHostEmail(e.target.value)}
              placeholder="e.g. host2@example.com"
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setView('main')}>Cancel</button>
              <button className="btn btn-primary btn-sm" onClick={async () => {
                if (!hostEmail) return;
                setLoading(true);
                try {
                  // Fetch current co_hosts
                  const { data } = await supabase.from('auctions').select('co_hosts').eq('id', activeAuction.id).single();
                  const currentHosts = data?.co_hosts || [];
                  if (!currentHosts.includes(hostEmail.toLowerCase())) {
                    const newHosts = [...currentHosts, hostEmail.toLowerCase()];
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>Select Auction</div>
            {auctions.map(a => (
              <div
                key={a.id}
                className={`menu-item${activeAuction?.id === a.id ? ' active' : ''}`}
                style={activeAuction?.id === a.id ? { background: 'rgba(74,158,255,0.1)', borderColor: 'rgba(74,158,255,0.3)', color: 'var(--blue)' } : {}}
                onClick={() => { switchAuction(a); setView('main'); onClose(); }}
                id={`switch-auction-${a.id}`}
              >
                {activeAuction?.id === a.id
                  ? <Check size={14} style={{ color: 'var(--blue)', flexShrink: 0 }} />
                  : <Circle size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                }
                <div>
                  <div style={{ fontWeight: 600 }}>{a.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    {new Date(a.created_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
            <button className="btn btn-ghost btn-sm" style={{ marginTop: 8 }} onClick={() => setView('main')}>Back</button>
          </div>
        )}

        <div style={{ marginTop: 'auto', paddingTop: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', opacity: 0.8 }}>
          <img src="/bricx-logo.png" alt="Powered by BRICX" style={{ width: 140, objectFit: 'contain', marginBottom: 12 }} />
        </div>
      </div>
    </div>
  )
}
