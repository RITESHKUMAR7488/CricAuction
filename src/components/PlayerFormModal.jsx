import React, { useState, useEffect } from 'react'
import { supabase, uploadFile } from '../lib/supabase'
import { showToast } from './Toast'
import { ROLES, STYLES } from '../constants'

export default function PlayerFormModal({ auctionId, auctionName, existingCodes, editPlayer, onClose, onSaved }) {
  const CATEGORIES = [
    { value: 'Retained', label: '🔒 Retained', color: '#9b59b6' },
    { value: 'Platinum', label: '💎 Platinum', color: '#4a9eff' },
    { value: 'Diamond', label: '💠 Diamond', color: '#00d4aa' },
    { value: 'Gold',     label: '🥇 Gold',     color: '#f5a623' },
  ]

  const [form, setForm] = useState({
    name: editPlayer?.name || '', 
    role: editPlayer?.role || 'Batter', 
    age: editPlayer?.age?.toString() || '', 
    style: editPlayer?.style || 'RHB',
    matches: editPlayer?.matches?.toString() || '', 
    runs: editPlayer?.runs?.toString() || '', 
    wickets: editPlayer?.wickets?.toString() || '', 
    strike_rate: editPlayer?.strike_rate?.toString() || '', 
    economy: editPlayer?.economy?.toString() || '', 
    base_price: editPlayer?.base_price?.toString() || '1',
    category: editPlayer?.category || 'Gold',
  })
  const [photo, setPhoto] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(editPlayer?.photo_url || null)
  const [loading, setLoading] = useState(false)
  const fileRef = React.useRef()

  // Phone search state (only for new players)
  const [phoneSearch, setPhoneSearch] = useState('')
  const [searching, setSearching] = useState(false)
  const [linkedUser, setLinkedUser] = useState(null) // { id, full_name, avatar_url, phone }
  const [searchDone, setSearchDone] = useState(false)

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

  async function handlePhoneSearch() {
    const phone = phoneSearch.trim()
    if (!phone) return showToast('Enter a phone number to search', 'error')
    setSearching(true)
    setLinkedUser(null)
    setSearchDone(false)
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, phone')
        .eq('phone', phone)
        .maybeSingle()

      if (error) throw error

      if (data) {
        setLinkedUser(data)
        // Auto-fill name and photo from their profile
        setForm(f => ({ ...f, name: data.full_name || f.name }))
        if (data.avatar_url && !photo) {
          setPhotoPreview(data.avatar_url)
        }
        showToast(`Found: ${data.full_name}`, 'success')
      } else {
        showToast('No registered user found with this phone number. You can still add them manually.', 'info')
      }
    } catch (err) {
      showToast('Search error: ' + err.message, 'error')
    }
    setSearchDone(true)
    setSearching(false)
  }

  function clearLinkedUser() {
    setLinkedUser(null)
    setPhoneSearch('')
    setSearchDone(false)
    setForm(f => ({ ...f, name: '' }))
    setPhotoPreview(null)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim()) return showToast('Player name is required', 'error')
    const basePrice = parseFloat(form.base_price)
    if (!basePrice || basePrice <= 0) return showToast('Base price must be greater than 0', 'error')

    setLoading(true)
    try {
      let photo_url = editPlayer?.photo_url || null
      if (photo) {
        photo_url = await uploadFile(photo, 'players')
      } else if (linkedUser?.avatar_url && !editPlayer) {
        photo_url = linkedUser.avatar_url
      }
      
      const payload = {
        auction_id: auctionId,
        code: nextCode(),
        name: form.name.trim(),
        role: form.role,
        age: form.age ? parseInt(form.age) : null,
        style: form.style || null,
        matches: form.matches ? parseInt(form.matches) : 0,
        runs: form.runs ? parseInt(form.runs) : 0,
        wickets: form.wickets ? parseInt(form.wickets) : 0,
        strike_rate: form.strike_rate ? parseFloat(form.strike_rate) : null,
        economy: form.economy ? parseFloat(form.economy) : null,
        base_price: basePrice,
        photo_url,
        user_id: linkedUser?.id || null,
        category: form.category || 'Gold',
      }

      let error, insertedId
      if (editPlayer) {
        const res = await supabase.from('players').update(payload).eq('id', editPlayer.id)
        error = res.error
        insertedId = editPlayer.id
      } else {
        payload.status = 'available'
        const res = await supabase.from('players').insert(payload).select('id').single()
        error = res.error
        insertedId = res.data?.id
      }
      
      if (error) throw error

      // Send in-app notification to the linked user
      if (linkedUser?.id && !editPlayer && insertedId && auctionName) {
        await supabase.from('notifications').insert({
          user_id: linkedUser.id,
          auction_id: auctionId,
          type: 'added_to_auction',
          title: 'You\'ve been added to an auction!',
          body: `You have been added as a player in "${auctionName}". Check your My Tournaments section to view details.`,
        })
      }

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

          {/* ── Phone Search (new players only) ── */}
          {!editPlayer && (
            <div className="form-group" style={{ marginBottom: 20 }}>
              <label className="form-label">🔍 Search Registered Player by Phone</label>
              {linkedUser ? (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  background: 'rgba(46,204,113,0.08)', border: '1px solid rgba(46,204,113,0.3)',
                  borderRadius: 10, padding: '12px 14px',
                }}>
                  {linkedUser.avatar_url && (
                    <img src={linkedUser.avatar_url} alt="" style={{ width: 44, height: 44, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
                  )}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{linkedUser.full_name}</div>
                    <div style={{ fontSize: 11, color: 'var(--green)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span>✓</span> Linked to registered account
                    </div>
                  </div>
                  <button type="button" onClick={clearLinkedUser} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 18 }}>✕</button>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    className="form-input"
                    type="tel"
                    value={phoneSearch}
                    onChange={e => setPhoneSearch(e.target.value)}
                    placeholder="Enter phone number (e.g. 9876543210)"
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handlePhoneSearch())}
                    style={{ flex: 1 }}
                  />
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={handlePhoneSearch}
                    disabled={searching}
                    style={{ flexShrink: 0 }}
                  >
                    {searching ? '...' : 'Search'}
                  </button>
                </div>
              )}
              {searchDone && !linkedUser && (
                <div style={{
                  marginTop: 8, padding: '10px 12px',
                  background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)',
                  borderRadius: 8, fontSize: 12, color: '#ef4444', lineHeight: 1.5,
                }}>
                  ❌ No registered account found for this number. Ask the player to sign up in the app first, then search again.
                </div>
              )}
              {!searchDone && !linkedUser && (
                <div style={{ marginTop: 8, fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  ⚠️ Phone verification is required before registering a player.
                </div>
              )}
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Player Photo</label>
            <div className="photo-upload" onClick={() => fileRef.current.click()}>
              <input ref={fileRef} type="file" accept="image/*" onChange={handlePhotoChange} style={{ display: 'none' }} />
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

          {/* Category Selection */}
          <div className="form-group">
            <label className="form-label">Player Category *</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {CATEGORIES.map(cat => (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, category: cat.value }))}
                  style={{
                    flex: '1 1 calc(50% - 4px)',
                    padding: '10px 8px',
                    borderRadius: 10,
                    border: `2px solid ${form.category === cat.value ? cat.color : 'var(--border)'}`,
                    background: form.category === cat.value ? `${cat.color}22` : 'var(--bg-secondary)',
                    color: form.category === cat.value ? cat.color : 'var(--text-secondary)',
                    fontSize: 13, fontWeight: 700, cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  {cat.label}
                </button>
              ))}
            </div>
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
              <label className="form-label">Runs</label>
              <input
                className="form-input"
                type="number"
                value={form.runs}
                onChange={e => setForm(f => ({ ...f, runs: e.target.value }))}
                placeholder="0"
                id="player-runs-input"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Wickets</label>
              <input
                className="form-input"
                type="number"
                value={form.wickets}
                onChange={e => setForm(f => ({ ...f, wickets: e.target.value }))}
                placeholder="0"
                id="player-wickets-input"
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

          {/* Registration gate — only for new players */}
          {!editPlayer && !linkedUser && (
            <div style={{
              padding: '12px 14px', marginBottom: 4,
              background: 'rgba(245,166,35,0.08)', border: '1px solid rgba(245,166,35,0.25)',
              borderRadius: 10, fontSize: 12, color: 'var(--gold)', lineHeight: 1.6, textAlign: 'center',
            }}>
              🔒 Search and verify the player's phone number above to enable registration
            </div>
          )}

          <div className="form-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button
              type="submit"
              className="btn btn-primary"
              style={{
                flex: 1,
                opacity: (!editPlayer && !linkedUser) ? 0.4 : 1,
                cursor: (!editPlayer && !linkedUser) ? 'not-allowed' : 'pointer',
                transition: 'opacity 0.2s',
              }}
              disabled={loading || (!editPlayer && !linkedUser)}
              id="register-player-submit"
            >
              {loading
                ? (editPlayer ? 'Saving...' : 'Registering...')
                : (editPlayer ? 'Save Changes' : '✅ Register Player')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
