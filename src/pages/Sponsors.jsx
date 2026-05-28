import React, { useState, useEffect } from 'react'
import { supabase, uploadFile } from '../lib/supabase'
import { showToast } from '../components/Toast'

const SPONSOR_CATEGORIES = [
  'Title Sponsor', 'Co-Sponsor', 'Trophy Sponsor',
  'Official Partner', 'Broadcast Partner', 'Digital Partner',
  'Associate Sponsor', 'Kit Sponsor'
]

const categoryIcons = {
  'Title Sponsor': '🏆',
  'Co-Sponsor': '🛡️',
  'Trophy Sponsor': '🏅',
  'Official Partner': '🤝',
  'Broadcast Partner': '📺',
  'Digital Partner': '💻',
  'Associate Sponsor': '⭐',
  'Kit Sponsor': '👕',
}

const categoryColors = {
  'Title Sponsor': 'var(--gold)',
  'Co-Sponsor': 'var(--blue)',
  'Trophy Sponsor': 'var(--purple)',
  'Official Partner': 'var(--green)',
  'Broadcast Partner': 'var(--red)',
  'Digital Partner': 'var(--cyan)',
  'Associate Sponsor': 'var(--orange)',
  'Kit Sponsor': 'var(--blue)',
}

export default function Sponsors() {
  const [sponsors, setSponsors] = useState([])
  const [owners, setOwners] = useState([])
  const [loading, setLoading] = useState(true)
  const [showSponsorModal, setShowSponsorModal] = useState(false)
  const [showOwnerModal, setShowOwnerModal] = useState(false)
  const [activeTab, setActiveTab] = useState('sponsors')

  useEffect(() => {
    loadSponsors()
    loadOwners()
  }, [])

  async function loadSponsors() {
    setLoading(true)
    const { data } = await supabase.from('sponsors').select('*').order('category').order('created_at')
    setSponsors(data || [])
    setLoading(false)
  }

  async function loadOwners() {
    const { data } = await supabase.from('owners').select('*').order('name')
    setOwners(data || [])
  }

  async function deleteSponsor(id) {
    if (!window.confirm('Remove this sponsor?')) return
    await supabase.from('sponsors').delete().eq('id', id)
    showToast('Sponsor removed', 'info')
    loadSponsors()
  }

  async function deleteOwner(id) {
    if (!window.confirm('Remove this owner?')) return
    await supabase.from('owners').delete().eq('id', id)
    showToast('Owner removed', 'info')
    loadOwners()
  }

  const totalSponsorValue = sponsors.reduce((s, sp) => s + (sp.deal_value || 0), 0)
  const categories = [...new Set(sponsors.map(s => s.category))]

  // Group sponsors by category
  const grouped = {}
  sponsors.forEach(s => {
    if (!grouped[s.category]) grouped[s.category] = []
    grouped[s.category].push(s)
  })

  return (
    <div className="page-content">
      <div className="page-header">
        <h1 className="page-title">SPONSORS</h1>
        <button
          className="btn btn-primary btn-sm"
          onClick={() => activeTab === 'owners' ? setShowOwnerModal(true) : setShowSponsorModal(true)}
          id="add-sponsor-btn"
        >
          + {activeTab === 'owners' ? 'ADD OWNER' : 'ADD SPONSOR'}
        </button>
      </div>

      {/* Stats */}
      <div className="stats-row">
        <div className="stat-item">
          <span className="stat-icon" style={{ color: 'var(--blue)' }}>👥</span>
          <div className="stat-value">{sponsors.length}</div>
          <div className="stat-label">Total Sponsors</div>
        </div>
        <div className="stat-item">
          <span className="stat-icon" style={{ color: 'var(--gold)' }}>⭐</span>
          <div className="stat-value">{categories.length}</div>
          <div className="stat-label">Categories</div>
        </div>
        <div className="stat-item">
          <span className="stat-icon" style={{ color: 'var(--green)' }}>💰</span>
          <div className="stat-value">₹{totalSponsorValue.toFixed(2)}L</div>
          <div className="stat-label">Total Value</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="filter-tabs" style={{ marginBottom: 20 }}>
        <button className={`filter-tab${activeTab === 'sponsors' ? ' active' : ''}`} onClick={() => setActiveTab('sponsors')} id="tab-sponsors">SPONSORS</button>
        <button className={`filter-tab${activeTab === 'owners' ? ' active' : ''}`} onClick={() => setActiveTab('owners')} id="tab-owners">OWNERS</button>
      </div>

      {/* Sponsors Tab */}
      {activeTab === 'sponsors' && (
        loading ? (
          <div className="loading-spinner"><div className="spinner" /></div>
        ) : sponsors.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">⭐</div>
            <div className="empty-state-title">No Sponsors Yet</div>
            <div className="empty-state-desc">Add sponsors using the button above.</div>
          </div>
        ) : (
          Object.keys(grouped).map(category => (
            <div key={category} style={{ marginBottom: 20 }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                marginBottom: 12, paddingBottom: 8,
                borderBottom: `1px solid ${categoryColors[category] || 'var(--border)'}44`
              }}>
                <span style={{ fontSize: 18 }}>{categoryIcons[category] || '⭐'}</span>
                <span style={{
                  fontFamily: 'Rajdhani', fontSize: 14, fontWeight: 700,
                  color: categoryColors[category] || 'var(--gold)',
                  textTransform: 'uppercase', letterSpacing: 1
                }}>{category}</span>
              </div>

              {grouped[category].map(sponsor => (
                <SponsorCard key={sponsor.id} sponsor={sponsor} onDelete={() => deleteSponsor(sponsor.id)} categoryColors={categoryColors} />
              ))}
            </div>
          ))
        )
      )}

      {/* Owners Tab */}
      {activeTab === 'owners' && (
        owners.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">👔</div>
            <div className="empty-state-title">No Owners Yet</div>
            <div className="empty-state-desc">Add team owners here. They can then be assigned to teams.</div>
          </div>
        ) : (
          owners.map(owner => (
            <OwnerCard key={owner.id} owner={owner} onDelete={() => deleteOwner(owner.id)} />
          ))
        )
      )}

      {showSponsorModal && (
        <AddSponsorModal
          onClose={() => setShowSponsorModal(false)}
          onSaved={() => { setShowSponsorModal(false); loadSponsors() }}
        />
      )}

      {showOwnerModal && (
        <AddOwnerModal
          onClose={() => setShowOwnerModal(false)}
          onSaved={() => { setShowOwnerModal(false); loadOwners() }}
        />
      )}
    </div>
  )
}

function SponsorCard({ sponsor, onDelete, categoryColors }) {
  const color = categoryColors[sponsor.category] || 'var(--gold)'
  return (
    <div className="card" style={{ marginBottom: 10, position: 'relative' }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        {/* Logo */}
        <div style={{
          width: 72, height: 72, borderRadius: 12,
          background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', flexShrink: 0, overflow: 'hidden',
          border: '1px solid var(--border)'
        }}>
          {sponsor.logo_url ? (
            <img src={sponsor.logo_url} alt={sponsor.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <span style={{ fontSize: 32 }}>🏢</span>
          )}
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
            <div style={{ fontWeight: 700, fontSize: 15, fontFamily: 'Rajdhani' }}>{sponsor.name}</div>
            <span className="badge" style={{ background: `${color}22`, color, borderColor: `${color}44`, fontSize: 9 }}>
              {sponsor.category}
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
            {sponsor.sponsor_since && (
              <div>
                <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Since</div>
                <div style={{ fontSize: 12, fontWeight: 600 }}>{sponsor.sponsor_since}</div>
              </div>
            )}
            {sponsor.deal_value > 0 && (
              <div>
                <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Deal Value</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--gold)' }}>₹ {sponsor.deal_value} L</div>
              </div>
            )}
          </div>
        </div>

        {/* Contact person */}
        {(sponsor.contact_person || sponsor.contact_photo_url) && (
          <div style={{ textAlign: 'center', flexShrink: 0 }}>
            {sponsor.contact_photo_url ? (
              <img src={sponsor.contact_photo_url} alt={sponsor.contact_person} style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover', display: 'block', margin: '0 auto 4px' }} />
            ) : (
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, margin: '0 auto 4px' }}>👤</div>
            )}
            {sponsor.contact_person && <div style={{ fontSize: 10, fontWeight: 600, whiteSpace: 'nowrap', maxWidth: 72, overflow: 'hidden', textOverflow: 'ellipsis' }}>{sponsor.contact_person}</div>}
            {sponsor.contact_role && <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>{sponsor.contact_role}</div>}
          </div>
        )}
      </div>

      <button
        onClick={onDelete}
        style={{
          position: 'absolute', top: 8, right: 8,
          background: 'none', border: 'none', color: 'var(--text-muted)',
          cursor: 'pointer', fontSize: 14, padding: 4, borderRadius: 4,
          transition: 'color 0.2s'
        }}
        onMouseEnter={e => e.currentTarget.style.color = 'var(--red)'}
        onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
      >✕</button>
    </div>
  )
}

function OwnerCard({ owner, onDelete }) {
  return (
    <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10, position: 'relative' }}>
      {owner.photo_url ? (
        <img src={owner.photo_url} alt={owner.name} style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover' }} />
      ) : (
        <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>👔</div>
      )}
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700, fontSize: 16, fontFamily: 'Rajdhani' }}>{owner.name}</div>
        {owner.company && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{owner.company}</div>}
      </div>
      <button
        onClick={onDelete}
        style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 14, padding: 4 }}
        onMouseEnter={e => e.currentTarget.style.color = 'var(--red)'}
        onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
      >✕</button>
    </div>
  )
}

function AddSponsorModal({ onClose, onSaved }) {
  const [form, setForm] = useState({
    category: 'Title Sponsor', name: '', contact_person: '', contact_role: '',
    deal_value: '', sponsor_since: new Date().getFullYear().toString(), custom_category: ''
  })
  const [logo, setLogo] = useState(null)
  const [logoPreview, setLogoPreview] = useState(null)
  const [contactPhoto, setContactPhoto] = useState(null)
  const [contactPhotoPreview, setContactPhotoPreview] = useState(null)
  const [loading, setLoading] = useState(false)
  const [useCustom, setUseCustom] = useState(false)
  const logoRef = React.useRef()
  const contactRef = React.useRef()

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim()) return showToast('Sponsor name required', 'error')
    setLoading(true)
    try {
      let logo_url = null, contact_photo_url = null
      if (logo) logo_url = await uploadFile(logo, 'sponsors')
      if (contactPhoto) contact_photo_url = await uploadFile(contactPhoto, 'sponsors')
      const { error } = await supabase.from('sponsors').insert({
        category: useCustom ? form.custom_category : form.category,
        name: form.name.trim(),
        logo_url,
        contact_person: form.contact_person || null,
        contact_role: form.contact_role || null,
        contact_photo_url,
        deal_value: parseFloat(form.deal_value) || 0,
        sponsor_since: parseInt(form.sponsor_since) || new Date().getFullYear()
      })
      if (error) throw error
      showToast('Sponsor added!', 'success')
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
          <div className="modal-title">Add Sponsor</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Category</label>
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <button type="button" className={`btn btn-sm ${!useCustom ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setUseCustom(false)}>Preset</button>
              <button type="button" className={`btn btn-sm ${useCustom ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setUseCustom(true)}>Custom</button>
            </div>
            {useCustom ? (
              <input className="form-input" value={form.custom_category} onChange={e => setForm(f => ({ ...f, custom_category: e.target.value }))} placeholder="e.g. Presenting Sponsor" id="custom-category-input" />
            ) : (
              <select className="form-select" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} id="sponsor-category-select">
                {SPONSOR_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Company / Sponsor Name *</label>
            <input className="form-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Company name" id="sponsor-name-input" />
          </div>

          <div className="form-group">
            <label className="form-label">Company Logo</label>
            <div className="photo-upload" onClick={() => logoRef.current.click()}>
              <input ref={logoRef} type="file" accept="image/*" onChange={e => { const f = e.target.files[0]; if(f){ setLogo(f); setLogoPreview(URL.createObjectURL(f)) }}} />
              {logoPreview ? (
                <img src={logoPreview} alt="logo" style={{ width: 64, height: 64, objectFit: 'contain', margin: '0 auto 8px', display: 'block' }} />
              ) : (
                <div className="photo-upload-icon">🏢</div>
              )}
              <div className="photo-upload-text">{logoPreview ? 'Tap to change' : 'Upload logo'}</div>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Deal Value (Lakhs)</label>
              <input className="form-input" type="number" step="0.25" value={form.deal_value} onChange={e => setForm(f => ({ ...f, deal_value: e.target.value }))} placeholder="1.00" id="sponsor-value-input" />
            </div>
            <div className="form-group">
              <label className="form-label">Since (Year)</label>
              <input className="form-input" type="number" value={form.sponsor_since} onChange={e => setForm(f => ({ ...f, sponsor_since: e.target.value }))} placeholder="2024" id="sponsor-since-input" />
            </div>
          </div>

          <div className="divider" />
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 12 }}>Contact Person (Optional)</div>

          <div className="form-group">
            <label className="form-label">Contact Photo</label>
            <div className="photo-upload" onClick={() => contactRef.current.click()} style={{ padding: 12 }}>
              <input ref={contactRef} type="file" accept="image/*" onChange={e => { const f = e.target.files[0]; if(f){ setContactPhoto(f); setContactPhotoPreview(URL.createObjectURL(f)) }}} />
              {contactPhotoPreview ? (
                <img src={contactPhotoPreview} alt="contact" className="photo-upload-preview" style={{ width: 56, height: 56 }} />
              ) : (
                <div className="photo-upload-icon" style={{ fontSize: 24 }}>👤</div>
              )}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Name</label>
              <input className="form-input" value={form.contact_person} onChange={e => setForm(f => ({ ...f, contact_person: e.target.value }))} placeholder="John Doe" id="contact-name-input" />
            </div>
            <div className="form-group">
              <label className="form-label">Role/Title</label>
              <input className="form-input" value={form.contact_role} onChange={e => setForm(f => ({ ...f, contact_role: e.target.value }))} placeholder="CEO" id="contact-role-input" />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <button type="button" className="btn btn-ghost" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" style={{ flex: 2 }} disabled={loading} id="add-sponsor-submit">
              {loading ? 'Adding...' : 'Add Sponsor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function AddOwnerModal({ onClose, onSaved }) {
  const [form, setForm] = useState({ name: '', company: '' })
  const [photo, setPhoto] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [loading, setLoading] = useState(false)
  const fileRef = React.useRef()

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim()) return showToast('Owner name required', 'error')
    setLoading(true)
    try {
      let photo_url = null
      if (photo) photo_url = await uploadFile(photo, 'owners')
      const { error } = await supabase.from('owners').insert({
        name: form.name.trim(), company: form.company || null, photo_url
      })
      if (error) throw error
      showToast('Owner added!', 'success')
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
          <div className="modal-title">Add Owner</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Owner Photo</label>
            <div className="photo-upload" onClick={() => fileRef.current.click()}>
              <input ref={fileRef} type="file" accept="image/*" onChange={e => { const f = e.target.files[0]; if(f){ setPhoto(f); setPhotoPreview(URL.createObjectURL(f)) }}} />
              {photoPreview ? (
                <img src={photoPreview} alt="preview" className="photo-upload-preview" />
              ) : (
                <div className="photo-upload-icon">👔</div>
              )}
              <div className="photo-upload-text">{photoPreview ? 'Tap to change' : 'Upload photo'}</div>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Owner Name *</label>
            <input className="form-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Full Name" id="owner-name-input" />
          </div>
          <div className="form-group">
            <label className="form-label">Company / Team Name</label>
            <input className="form-input" value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} placeholder="Company name" id="owner-company-input" />
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" className="btn btn-ghost" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" style={{ flex: 2 }} disabled={loading} id="add-owner-submit">
              {loading ? 'Adding...' : 'Add Owner'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
