import React, { useState, useEffect } from 'react'
import { supabase, uploadFile } from '../lib/supabase'
import { showToast } from '../components/Toast'

const CARD_COLORS = ['var(--gold)', 'var(--blue)', 'var(--purple)', 'var(--green)', 'var(--orange)', 'var(--cyan)']

export default function Sponsors() {
  const [sponsors, setSponsors] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)

  useEffect(() => {
    loadSponsors()
  }, [])

  async function loadSponsors() {
    setLoading(true)
    const { data } = await supabase
      .from('sponsors')
      .select('*')
      .order('deal_value', { ascending: true })
    setSponsors(data || [])
    setLoading(false)
  }

  async function deleteSponsor(id) {
    if (!window.confirm('Remove this sponsor picture?')) return
    await supabase.from('sponsors').delete().eq('id', id)
    showToast('Sponsor removed', 'info')
    loadSponsors()
  }

  async function updateOrder(id, newOrder) {
    const orderNum = parseInt(newOrder)
    if (isNaN(orderNum)) return
    
    // Optimistic update
    setSponsors(prev => {
      const updated = prev.map(s => s.id === id ? { ...s, deal_value: orderNum } : s)
      return updated.sort((a, b) => (a.deal_value || 0) - (b.deal_value || 0))
    })

    const { error } = await supabase
      .from('sponsors')
      .update({ deal_value: orderNum })
      .eq('id', id)
    
    if (error) {
      showToast('Error updating order', 'error')
      loadSponsors() // Revert
    }
  }

  return (
    <div className="page-content" style={{ padding: '20px 16px' }}>
      {/* Header */}
      <div className="page-header" style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 className="page-title" style={{ fontSize: 22 }}>SPONSORS</h1>
        <button
          className="btn btn-primary btn-sm"
          onClick={() => setShowAddModal(true)}
          id="add-sponsor-btn"
          style={{ padding: '8px 16px' }}
        >
          + ADD PICTURE
        </button>
      </div>

      {loading ? (
        <div className="loading-spinner"><div className="spinner" /></div>
      ) : sponsors.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 4H5v8l7 9 7-9V4z"></path><polygon points="12 7.5 13.5 10.5 16.5 11 14.5 13.5 15 16.5 12 15 9 16.5 9.5 13.5 7.5 11 10.5 10.5"></polygon></svg>
          </div>
          <div className="empty-state-title">No Sponsors Yet</div>
          <div className="empty-state-desc">Upload full-screen sponsor pictures to get started.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {sponsors.map((sponsor, index) => {
            const color = CARD_COLORS[index % CARD_COLORS.length]
            return (
              <div 
                key={sponsor.id} 
                style={{ 
                  background: color + '15', 
                  borderColor: color + '33', 
                  borderWidth: 1, 
                  borderStyle: 'solid', 
                  borderRadius: 'var(--radius-lg)', 
                  overflow: 'hidden',
                  position: 'relative' 
                }}
              >
                {/* Controls Bar */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: `1px solid ${color}33`, background: color + '10' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)' }}>ORDER NO:</span>
                    <input 
                      type="number" 
                      defaultValue={sponsor.deal_value || 0}
                      onBlur={(e) => updateOrder(sponsor.id, e.target.value)}
                      style={{ 
                        width: 60, background: 'var(--bg-secondary)', border: '1px solid var(--border)', 
                        color: 'white', padding: '4px 8px', borderRadius: 6, fontSize: 14, textAlign: 'center' 
                      }}
                    />
                  </div>
                  
                  <button
                    onClick={() => deleteSponsor(sponsor.id)}
                    style={{ background: 'transparent', border: 'none', color: 'var(--red)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600 }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                    REMOVE
                  </button>
                </div>

                {/* Image */}
                <div style={{ width: '100%', display: 'block' }}>
                  {sponsor.logo_url ? (
                    <img 
                      src={sponsor.logo_url} 
                      alt={`Sponsor ${sponsor.deal_value}`} 
                      style={{ width: '100%', height: 'auto', display: 'block' }} 
                    />
                  ) : (
                    <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>No image uploaded</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showAddModal && (
        <AddPictureModal
          onClose={() => setShowAddModal(false)}
          onSaved={() => { setShowAddModal(false); loadSponsors() }}
          nextOrder={sponsors.length > 0 ? Math.max(...sponsors.map(s => s.deal_value || 0)) + 1 : 1}
        />
      )}
    </div>
  )
}

function AddPictureModal({ onClose, onSaved, nextOrder }) {
  const [photo, setPhoto] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [order, setOrder] = useState(nextOrder.toString())
  const [loading, setLoading] = useState(false)
  const fileRef = React.useRef()

  useEffect(() => {
    return () => { if (photoPreview) URL.revokeObjectURL(photoPreview) }
  }, [photoPreview])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!photo) return showToast('Please select a picture to upload', 'error')
    
    setLoading(true)
    try {
      const logo_url = await uploadFile(photo, 'sponsors')
      
      const { error } = await supabase.from('sponsors').insert({
        name: `Sponsor Image ${order}`,
        logo_url,
        deal_value: parseInt(order) || 1, // Using deal_value to store the order
        category: 'Custom'
      })
      
      if (error) throw error
      showToast('Picture attached successfully!', 'success')
      onSaved()
    } catch(err) {
      showToast('Error: ' + err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <div className="modal-title">Attach Sponsor Picture</div>
          <button className="modal-close" onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Full Screen Picture</label>
            <div 
              className="photo-upload" 
              onClick={() => fileRef.current.click()}
              style={{ padding: photoPreview ? 0 : 40, height: photoPreview ? 'auto' : 160, borderRadius: 12, border: '2px dashed var(--border)', background: 'var(--bg-secondary)', cursor: 'pointer', overflow: 'hidden' }}
            >
              <input ref={fileRef} type="file" accept="image/*" onChange={e => { const f = e.target.files[0]; if(f){ setPhoto(f); setPhotoPreview(URL.createObjectURL(f)) }}} style={{ display: 'none' }} />
              {photoPreview ? (
                <img src={photoPreview} alt="preview" style={{ width: '100%', height: 'auto', display: 'block' }} />
              ) : (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 8, margin: '0 auto' }}><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                  <div>Tap to select picture</div>
                </div>
              )}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Order Number</label>
            <input 
              className="form-input" 
              type="number" 
              value={order} 
              onChange={e => setOrder(e.target.value)} 
              placeholder="1" 
            />
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>This number determines the display sequence.</div>
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
            <button type="button" className="btn btn-ghost" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" style={{ flex: 2 }} disabled={loading}>
              {loading ? 'Attaching...' : 'Attach Picture'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
