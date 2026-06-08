import React, { useEffect, useRef, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

/**
 * QRScannerModal — opens the device camera, scans a food coupon QR code,
 * and marks the corresponding coupon_recipient as redeemed.
 *
 * QR data format: JSON string { couponId, userId }
 */
export default function QRScannerModal({ onClose }) {
  const scannerInstanceRef = useRef(null)
  const [status, setStatus] = useState('scanning') // scanning | success | error | already
  const [resultMessage, setResultMessage] = useState('')
  const [recipientInfo, setRecipientInfo] = useState(null)
  const [scanKey, setScanKey] = useState(0) // bump to restart scanner

  const startScanner = useCallback(async () => {
    // Clean up previous instance
    if (scannerInstanceRef.current) {
      try { await scannerInstanceRef.current.stop() } catch {}
      scannerInstanceRef.current = null
    }

    const container = document.getElementById('qr-scanner-region')
    if (container) container.innerHTML = ''

    try {
      const { Html5Qrcode } = await import('html5-qrcode')
      const scanner = new Html5Qrcode('qr-scanner-region')
      scannerInstanceRef.current = scanner

      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        async (decodedText) => {
          await scanner.stop()
          await processQR(decodedText)
        },
        () => {}
      )
    } catch (err) {
      setStatus('error')
      setResultMessage('Camera access denied. Please allow camera permissions and try again.')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scanKey])

  useEffect(() => {
    startScanner()
    return () => {
      if (scannerInstanceRef.current) {
        scannerInstanceRef.current.stop().catch(() => {})
      }
    }
  }, [startScanner])

  async function processQR(rawText) {
    try {
      let parsed
      try {
        parsed = JSON.parse(rawText)
      } catch {
        setStatus('error')
        setResultMessage('Invalid QR code. Not a valid food coupon.')
        return
      }

      const { couponId, userId } = parsed
      if (!couponId || !userId) {
        setStatus('error')
        setResultMessage('Invalid QR code format.')
        return
      }

      const { data: recipient, error: fetchErr } = await supabase
        .from('coupon_recipients')
        .select('*, food_coupons(event_name, meal_type, coupon_date)')
        .eq('coupon_id', couponId)
        .eq('user_id', userId)
        .single()

      if (fetchErr || !recipient) {
        setStatus('error')
        setResultMessage('Coupon not found. Please verify the coupon belongs to this auction.')
        return
      }

      if (recipient.redeemed) {
        setStatus('already')
        setResultMessage(`Already redeemed on ${new Date(recipient.redeemed_at).toLocaleString('en-IN')}`)
        setRecipientInfo(recipient)
        return
      }

      const { error: updateErr } = await supabase
        .from('coupon_recipients')
        .update({ redeemed: true, redeemed_at: new Date().toISOString() })
        .eq('id', recipient.id)

      if (updateErr) throw updateErr

      setRecipientInfo({ ...recipient, redeemed: true, redeemed_at: new Date().toISOString() })
      setStatus('success')
      setResultMessage('Coupon successfully redeemed!')
    } catch (err) {
      setStatus('error')
      setResultMessage('Error: ' + err.message)
    }
  }

  function handleScanAgain() {
    setStatus('scanning')
    setResultMessage('')
    setRecipientInfo(null)
    setScanKey(k => k + 1)
  }

  const statusColors = {
    scanning: 'var(--blue)',
    success: 'var(--green)',
    error: 'var(--red)',
    already: 'var(--gold)',
  }

  const statusIcons = {
    scanning: '📷',
    success: '✅',
    error: '❌',
    already: '⚠️',
  }

  return (
    <div className="modal-overlay" style={{ zIndex: 9999 }}>
      <div className="modal" style={{ maxWidth: 420, width: '94vw' }}>
        <div className="modal-header">
          <div className="modal-title">🍽️ Scan Food Coupon</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {/* Camera viewport */}
        <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', background: '#000', marginBottom: 16, display: status === 'scanning' ? 'block' : 'none' }}>
          <div id="qr-scanner-region" style={{ width: '100%', minHeight: 280 }} />
          {/* Gold corner brackets overlay */}
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ position: 'relative', width: 250, height: 250 }}>
              {['tl', 'tr', 'bl', 'br'].map(corner => (
                <div key={corner} style={{
                  position: 'absolute',
                  width: 30, height: 30,
                  top: corner.startsWith('t') ? 0 : 'auto',
                  bottom: corner.startsWith('b') ? 0 : 'auto',
                  left: corner.endsWith('l') ? 0 : 'auto',
                  right: corner.endsWith('r') ? 0 : 'auto',
                  borderTop: corner.startsWith('t') ? '3px solid var(--gold)' : 'none',
                  borderBottom: corner.startsWith('b') ? '3px solid var(--gold)' : 'none',
                  borderLeft: corner.endsWith('l') ? '3px solid var(--gold)' : 'none',
                  borderRight: corner.endsWith('r') ? '3px solid var(--gold)' : 'none',
                  borderRadius: corner === 'tl' ? '4px 0 0 0' : corner === 'tr' ? '0 4px 0 0' : corner === 'bl' ? '0 0 0 4px' : '0 0 4px 0',
                }} />
              ))}
            </div>
          </div>
          <div style={{ position: 'absolute', bottom: 12, left: 0, right: 0, textAlign: 'center', color: 'rgba(255,255,255,0.6)', fontSize: 11 }}>
            Point camera at the QR code on the player's coupon
          </div>
        </div>

        {/* Result state */}
        {status !== 'scanning' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '24px 0', textAlign: 'center' }}>
            <div style={{ fontSize: 64 }}>{statusIcons[status]}</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: statusColors[status], fontFamily: 'Rajdhani', letterSpacing: 0.5 }}>
              {status === 'success' ? 'REDEEMED!' : status === 'already' ? 'ALREADY USED' : 'INVALID QR'}
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{resultMessage}</div>

            {recipientInfo && (
              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: 16, width: '100%', textAlign: 'left' }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Coupon Details</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>Player</span>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: 13 }}>{recipientInfo.player_name || 'Unknown'}</span>
                  </div>
                  {recipientInfo.food_coupons && (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>Event</span>
                        <span style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: 13 }}>{recipientInfo.food_coupons.event_name}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>Meal</span>
                        <span style={{ color: 'var(--gold)', fontWeight: 700, fontSize: 13 }}>{recipientInfo.food_coupons.meal_type}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10 }}>
          {(status === 'error' || status === 'already') && (
            <button className="btn btn-ghost" style={{ flex: 1 }} onClick={handleScanAgain}>
              Scan Again
            </button>
          )}
          <button className="btn btn-primary" style={{ flex: 1 }} onClick={onClose}>
            {status === 'success' ? 'Done ✓' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  )
}
