import React, { useState } from 'react'
import { useApp } from '../context/AppContext'
import { supabase } from '../lib/supabase'
import { exportAuctionPDF, exportAuctionCSV } from '../lib/exportUtils'

export default function SideMenu({ onClose }) {
  const { leagueName, updateLeagueName, activeAuction, auctions, createAuction, switchAuction, resetAuction, loadAuctions, userRole } = useApp()
  const [view, setView] = useState('main') // main | rename | newauction | switchauction
  const [nameInput, setNameInput] = useState(leagueName)
  const [auctionName, setAuctionName] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleRename() {
    if (!nameInput.trim()) return
    await updateLeagueName(nameInput.trim())
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
      alert('Error: ' + e.message)
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
    await supabase.from('auctions').delete().eq('id', activeAuction.id)
    await loadAuctions()
    setLoading(false)
    onClose()
    window.location.reload()
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
              catch(e) { alert('Export error: ' + e.message) }
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
              catch(e) { alert('Export error: ' + e.message) }
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
      </div>
    </div>
  )
}
