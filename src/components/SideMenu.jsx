import React, { useState } from 'react'
import { useApp } from '../context/AppContext'
import { supabase } from '../lib/supabase'
import { exportAuctionPDF, exportAuctionCSV } from '../lib/exportUtils'
import { showToast } from './Toast'

export default function SideMenu({ onClose }) {
  const { leagueName, updateLeagueName, leagueLogo, updateLeagueLogo, activeAuction, auctions, createAuction, switchAuction, resetAuction, loadAuctions, userRole, clearActiveAuction } = useApp()
  const [view, setView] = useState('main') // main | rename | updatelogo | newauction | switchauction
  const [nameInput, setNameInput] = useState(leagueName)
  const [logoInput, setLogoInput] = useState(leagueLogo)
  const [auctionName, setAuctionName] = useState('')
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
      <div className="menu-backdrop" onClick={onClose} />
      <div className="menu-panel">
        <div style={{ marginBottom: 16 }}>
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
                  href={`https://wa.me/?text=${encodeURIComponent(`Join my Elite League Auction "${activeAuction.name}"!\n\nJoin Code: *${activeAuction.join_code}*`)}`}
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
            <span>➕</span> Create New Auction
          </div>
          <div className="menu-item" onClick={() => { setView('switchauction'); loadAuctions() }} id="menu-switch-auction">
            <span>🔄</span> Switch Auction
          </div>
          <div className="menu-divider" />
          {userRole === 'host' && (
            <>
              <div className="menu-item" onClick={() => { setView('rename'); setNameInput(leagueName) }} id="menu-rename-league">
                <span>✏️</span> Rename League
              </div>
              <div className="menu-item" onClick={() => { setView('updatelogo'); setLogoInput(leagueLogo) }} id="menu-update-logo">
                <span>🖼️</span> Update Logo
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
            <span>📄</span>
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
            <span>📊</span>
            {loading ? 'Exporting...' : 'Download CSV Files'}
          </div>

          {userRole === 'host' && (
            <>
              <div className="menu-divider" />
              <div className="menu-item danger" onClick={handleReset} id="menu-reset-auction">
                <span>🔁</span> Reset Auction Data
              </div>
              <div className="menu-item danger" onClick={handleDeleteAuction} id="menu-delete-auction">
                <span>🗑️</span> Delete Auction
              </div>
            </>
          )}
        </>}

        {view === 'rename' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Rename League</div>
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

        {view === 'updatelogo' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Update Logo URL</div>
            <input
              className="form-input"
              value={logoInput}
              onChange={e => setLogoInput(e.target.value)}
              placeholder="e.g. https://example.com/logo.png"
              id="update-logo-input"
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setView('main')}>Cancel</button>
              <button className="btn btn-primary btn-sm" onClick={handleUpdateLogo} id="update-logo-save">Save</button>
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
                <span>{activeAuction?.id === a.id ? '✓' : '○'}</span>
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

        <div style={{ marginTop: 40, display: 'flex', flexDirection: 'column', alignItems: 'center', opacity: 0.8 }}>
          <img src="/cricauction-logo.jpeg" alt="Powered by BRICX" style={{ width: 100, borderRadius: 12, marginBottom: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }} />
        </div>
      </div>
    </div>
  )
}
