import React, { useState, useEffect } from 'react'
import { supabase, uploadFile } from '../lib/supabase'
import { showToast } from './Toast'
import { ROLES, STYLES } from '../constants'

export default function PlayerFormModal({ auctionId, existingCodes, editPlayer, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: editPlayer?.name || '', 
    role: editPlayer?.role || 'Batter', 
    age: editPlayer?.age?.toString() || '', 
    style: editPlayer?.style || 'RHB',
    matches: editPlayer?.matches?.toString() || '', 
    strike_rate: editPlayer?.strike_rate?.toString() || '', 
    economy: editPlayer?.economy?.toString() || '', 
    base_price: editPlayer?.base_price?.toString() || '1',
  })
  const [photo, setPhoto] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(editPlayer?.photo_url || null)
  const [loading, setLoading] = useState(false)
  const fileRef = React.useRef()

  useEffect(() => {
    return () => { if (photoPreview && !photoPreview.startsWith('http')) URL.revokeObjectURL(photoPreview) }
  }, [photoPreview])

  function handlePhotoChange(e) {
    const file = e.target.files[0]
    if (!file) return
    setPhoto(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  function nextCode() {
    if (editPlayer) return editPlayer.code
    if (!existingCodes || existingCodes.length === 0) return 'P-001'
    const nums = existingCodes
      .map(c => parseInt(c.replace('P-', ''), 10))
      .filter(n => !isNaN(n))
    const maxNum = nums.length > 0 ? Math.max(...nums) : 0
    return `P-${String(maxNum + 1).padStart(3, '0')}`
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim()) return showToast('Player name is required', 'error')
    const basePrice = parseFloat(form.base_price)
    if (!basePrice || basePrice <= 0) return showToast('Base price must be greater than 0', 'error')

    setLoading(true)
    try {
      let photo_url = editPlayer?.photo_url || null
      if (photo) photo_url = await uploadFile(photo, 'players')
      
      const payload = {
        auction_id: auctionId,
        code: nextCode(),
        name: form.name.trim(),
        role: form.role,
        age: form.age ? parseInt(form.age) : null,
        style: form.style || null,
        matches: form.matches ? parseInt(form.matches) : 0,
        strike_rate: form.strike_rate ? parseFloat(form.strike_rate) : null,
        economy: form.economy ? parseFloat(form.economy) : null,
        base_price: basePrice,
        photo_url,
      }

      let error;
      if (editPlayer) {
        const res = await supabase.from('players').update(payload).eq('id', editPlayer.id)
        error = res.error
      } else {
        payload.status = 'available'
        const res = await supabase.from('players').insert(payload)
        error = res.error
      }
      
      if (error) throw error
      showToast(editPlayer ? 'Player updated successfully!' : 'Player registered successfully!', 'success')
      onSaved()
    } catch (err) {
      showToast('Error: ' + err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  const isBowler = form.role === 'Bowler'

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <div className="modal-title">{editPlayer ? 'Edit Player' : 'Register Player'}</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Player Photo</label>
            <div className="photo-upload" onClick={() => fileRef.current.click()}>
              <input ref={fileRef} type="file" accept="image/*" onChange={handlePhotoChange} />
              {photoPreview ? (
                <img src={photoPreview} alt="preview" className="photo-upload-preview" />
              ) : (
                <div className="photo-upload-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                </div>
              )}
              <div className="photo-upload-text">
                {photoPreview ? 'Tap to change photo' : 'Tap to upload photo'}
              </div>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Player Name *</label>
            <input
              className="form-input"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Full Name"
              id="player-name-input"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Role *</label>
              <select
                className="form-select"
                value={form.role}
                onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                id="player-role-select"
              >
                {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Style</label>
              <select
                className="form-select"
                value={form.style}
                onChange={e => setForm(f => ({ ...f, style: e.target.value }))}
                id="player-style-select"
              >
                {STYLES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Age</label>
              <input
                className="form-input"
                type="number"
                value={form.age}
                onChange={e => setForm(f => ({ ...f, age: e.target.value }))}
                placeholder="25"
                id="player-age-input"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Matches</label>
              <input
                className="form-input"
                type="number"
                value={form.matches}
                onChange={e => setForm(f => ({ ...f, matches: e.target.value }))}
                placeholder="0"
                id="player-matches-input"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">{isBowler ? 'Economy' : 'Strike Rate'}</label>
              <input
                className="form-input"
                type="number"
                step="0.1"
                value={isBowler ? form.economy : form.strike_rate}
                onChange={e => setForm(f => isBowler
                  ? { ...f, economy: e.target.value }
                  : { ...f, strike_rate: e.target.value }
                )}
                placeholder={isBowler ? '7.5' : '135.0'}
                id="player-stat-input"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Base Price (L)</label>
              <input
                className="form-input"
                type="number"
                step="0.25"
                min="0.25"
                value={form.base_price}
                onChange={e => setForm(f => ({ ...f, base_price: e.target.value }))}
                placeholder="1.00"
                id="player-base-price-input"
              />
            </div>
          </div>

          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
            Player code will be: <strong style={{ color: 'var(--blue)' }}>{nextCode()}</strong>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" className="btn btn-ghost" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" style={{ flex: 2 }} disabled={loading} id="register-player-submit">
              {loading ? (editPlayer ? 'Saving...' : 'Registering...') : (editPlayer ? 'Save Changes' : 'Register Player')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
