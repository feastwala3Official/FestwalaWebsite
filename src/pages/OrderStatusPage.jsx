import { useState, useEffect } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'

function CursorFollower() {
  useEffect(() => {
    const dot = document.getElementById('os-cursor-dot')
    const ring = document.getElementById('os-cursor-ring')
    if (!dot || !ring) return
    const move = e => {
      dot.style.left = e.clientX + 'px'; dot.style.top = e.clientY + 'px'
      ring.style.left = e.clientX + 'px'; ring.style.top = e.clientY + 'px'
    }
    window.addEventListener('mousemove', move)
    return () => window.removeEventListener('mousemove', move)
  }, [])
  return (<><div id="os-cursor-dot" className="cursor-dot" /><div id="os-cursor-ring" className="cursor-ring" /></>)
}

const STATUS_STEPS = [
  { key: 'pending', label: 'Order Received', icon: '📝', desc: 'We have your order' },
  { key: 'accepted', label: 'Preparing', icon: '🍳', desc: 'Cooking fresh for you' },
  { key: 'dispatched', label: 'Out for Delivery', icon: '🛵', desc: 'On the way to you' },
  { key: 'delivered', label: 'Delivered', icon: '✅', desc: 'Enjoy your meal!' }
]

export default function OrderStatusPage() {
  const { orderId } = useParams()
  const [params] = useSearchParams()
  const token = params.get('token')
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [remaining, setRemaining] = useState(null)
  const [canCancel, setCanCancel] = useState(false)
  const [cancelling, setCancelling] = useState(false)

  useEffect(() => {
    async function load() {
      let q = supabase.from('orders').select('*').eq('order_id', orderId)
      const { data, error: err } = await q.maybeSingle()
      if (err || !data) { setError('Order not found'); setLoading(false); return }
      // Token check (if token present, must match)
      if (token && data.track_token && data.track_token !== token) {
        setError('Invalid tracking link'); setLoading(false); return
      }
      setOrder(data)
      setLoading(false)
    }
    load()

    const sub = supabase.channel(`order-${orderId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders', filter: `order_id=eq.${orderId}` },
        payload => setOrder(payload.new))
      .subscribe()
    return () => supabase.removeChannel(sub)
  }, [orderId, token])

  // Countdown timer
  useEffect(() => {
    if (!order || order.status === 'delivered' || order.status === 'cancelled') return

    let target

    if (order.status === 'dispatched' && order.dispatched_at) {
      // Once dispatched: show only drive time + 5 min buffer from dispatch moment
      // drive time stored in distance_from_outlet (km), ~3 min/km + 5 min buffer
      const driveKm = order.distance_from_outlet || 3
      const driveMins = Math.round(driveKm * 3) + 5
      target = new Date(order.dispatched_at).getTime() + driveMins * 60 * 1000
    } else {
      // Pending/accepted: use full estimated time from order creation
      let totalMins = 45
      const m = String(order.estimated_time || '').match(/~?(\d+)\s*mins/)
      if (m) totalMins = parseInt(m[1], 10)
      if (order.accepted_eta_mins) totalMins = order.accepted_eta_mins
      target = new Date(order.created_at).getTime() + totalMins * 60 * 1000
    }

    const tick = () => {
      const diff = Math.max(0, target - Date.now())
      setRemaining(Math.ceil(diff / 60000))
    }
    tick()
    const interval = setInterval(tick, 60000) // tick every minute
    return () => clearInterval(interval)
  }, [order?.status, order?.dispatched_at])

  // Cancel window: only allow within 3 minutes of order creation
  useEffect(() => {
    if (!order || order.status !== 'pending') return
    const created = new Date(order.created_at).getTime()
    const checkWindow = () => {
      const elapsed = Date.now() - created
      setCanCancel(elapsed < 3 * 60 * 1000)
    }
    checkWindow()
    const interval = setInterval(checkWindow, 5000)
    return () => clearInterval(interval)
  }, [order])

  async function handleCancel() {
    if (!canCancel || cancelling) return
    setCancelling(true)
    const { error } = await supabase.from('orders').update({ status: 'cancelled' }).eq('order_id', order.order_id)
    if (error) {
      console.error('Cancel failed:', error)
      alert('Could not cancel. Please call +91 9711386962.')
    }
    setCancelling(false)
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#0a0500', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c9a84c', fontFamily: 'DM Sans' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '2rem', animation: 'pulse 1.5s ease infinite' }}>🍽️</div>
        <p style={{ marginTop: '1rem' }}>Loading your order...</p>
      </div>
    </div>
  )

  if (error) return (
    <div style={{ minHeight: '100vh', background: '#0a0500', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'DM Sans', padding: '2rem' }}>
      <CursorFollower />
      <div style={{ textAlign: 'center', maxWidth: '400px' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>😕</div>
        <h2 style={{ fontFamily: 'Cormorant Garamond', fontSize: '24px', color: '#f5e6c8', marginBottom: '0.5rem' }}>{error}</h2>
        <p style={{ color: '#c8b89a', fontSize: '14px', marginBottom: '1.5rem' }}>Please check your link or contact us.</p>
        <a href="/" style={{ background: '#c9a84c', color: '#0a0500', borderRadius: '8px', padding: '12px 28px', textDecoration: 'none', fontWeight: 700, fontSize: '14px' }}>Back to FeastWala</a>
      </div>
    </div>
  )

  const currentStepIndex = STATUS_STEPS.findIndex(s => s.key === order.status)
  const isCancelled = order.status === 'cancelled'
  const isDelivered = order.status === 'delivered'

  return (
    <div style={{ minHeight: '100vh', background: '#0a0500', fontFamily: 'DM Sans', padding: '2rem 1rem' }}>
      <CursorFollower />
      <div style={{ maxWidth: '480px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <a href="/" style={{ fontFamily: 'Cormorant Garamond', fontSize: '28px', color: '#c9a84c', fontWeight: 700, textDecoration: 'none' }}>FeastWala</a>
          <p style={{ color: '#c8b89a', fontSize: '13px', marginTop: '4px' }}>Order #{order.order_id}</p>
        </div>

        {isCancelled ? (
          <div style={{ background: 'rgba(192,57,43,0.1)', border: '1px solid rgba(192,57,43,0.3)', borderRadius: '16px', padding: '2rem', textAlign: 'center', marginBottom: '1.5rem' }}>
            <div style={{ fontSize: '3rem' }}>❌</div>
            <h2 style={{ color: '#f5e6c8', fontFamily: 'Cormorant Garamond', fontSize: '24px', margin: '0.5rem 0' }}>Order Cancelled</h2>
            <p style={{ color: '#c8b89a', fontSize: '14px' }}>Please contact us at +91 9711386962 for any help.</p>
          </div>
        ) : (
          <>
            {/* Countdown */}
            {!isDelivered && remaining !== null && (
              <div style={{ background: order.status === 'dispatched' ? 'rgba(155,89,182,0.1)' : 'rgba(201,168,76,0.08)', border: `1px solid ${order.status === 'dispatched' ? 'rgba(155,89,182,0.4)' : 'rgba(201,168,76,0.25)'}`, borderRadius: '16px', padding: '1.5rem', textAlign: 'center', marginBottom: '1.5rem' }}>
                <p style={{ color: '#c8b89a', fontSize: '12px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                  {order.status === 'dispatched' ? '🛵 Arriving in' : 'Estimated arrival in'}
                </p>
                <p style={{ fontFamily: 'Cormorant Garamond', fontSize: '48px', fontWeight: 700, color: order.status === 'dispatched' ? '#9b59b6' : '#c9a84c', lineHeight: 1.1, margin: '0.3rem 0' }}>
                  {remaining <= 1 ? 'Any moment now' : `${remaining} min`}
                </p>
                <p style={{ color: '#8a7a65', fontSize: '12px' }}>
                  {order.status === 'dispatched' ? 'Your order is on the way!' : 'We prepare everything fresh — never frozen'}
                </p>
              </div>
            )}

            {isDelivered && (
              <div style={{ background: 'rgba(39,174,96,0.1)', border: '1px solid rgba(39,174,96,0.3)', borderRadius: '16px', padding: '1.5rem', textAlign: 'center', marginBottom: '1.5rem' }}>
                <div style={{ fontSize: '2.5rem' }}>🎉</div>
                <h2 style={{ color: '#27ae60', fontFamily: 'Cormorant Garamond', fontSize: '24px', margin: '0.5rem 0' }}>Delivered!</h2>
                <p style={{ color: '#c8b89a', fontSize: '14px' }}>We hope you enjoy your meal</p>
              </div>
            )}

            {/* Cancel button — only within 3 mins of pending */}
            {order.status === 'pending' && canCancel && (
              <div style={{ background: 'rgba(192,57,43,0.08)', border: '1px solid rgba(192,57,43,0.25)', borderRadius: '12px', padding: '1rem', marginBottom: '1.5rem', textAlign: 'center' }}>
                <p style={{ color: '#c8b89a', fontSize: '13px', marginBottom: '0.75rem' }}>
                  Changed your mind? You can cancel within <strong style={{ color: '#c9a84c' }}>3 minutes</strong> of placing the order.
                </p>
                <button
                  onClick={handleCancel}
                  disabled={cancelling}
                  style={{ background: cancelling ? 'rgba(192,57,43,0.4)' : '#c0392b', color: 'white', border: 'none', borderRadius: '8px', padding: '10px 24px', fontWeight: 700, fontSize: '14px', fontFamily: 'DM Sans' }}
                >
                  {cancelling ? 'Cancelling...' : 'Cancel Order'}
                </button>
              </div>
            )}

            {order.status === 'pending' && !canCancel && (
              <div style={{ background: 'rgba(201,168,76,0.04)', border: '1px solid rgba(201,168,76,0.1)', borderRadius: '12px', padding: '0.75rem 1rem', marginBottom: '1.5rem', textAlign: 'center' }}>
                <p style={{ color: '#8a7a65', fontSize: '12px' }}>
                  Cancellation window has passed. Call <strong style={{ color: '#c9a84c' }}>+91 9711386962</strong> for help.
                </p>
              </div>
            )}

            {/* Status steps */}
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(201,168,76,0.12)', borderRadius: '16px', padding: '1.5rem', marginBottom: '1.5rem' }}>
              {STATUS_STEPS.map((step, i) => {
                const done = i <= currentStepIndex
                const active = i === currentStepIndex
                return (
                  <div key={step.key} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem 0', opacity: done ? 1 : 0.4 }}>
                    <div style={{
                      width: '44px', height: '44px', borderRadius: '50%', flexShrink: 0,
                      background: done ? 'rgba(201,168,76,0.15)' : 'rgba(255,255,255,0.04)',
                      border: `2px solid ${active ? '#c9a84c' : done ? 'rgba(201,168,76,0.4)' : 'rgba(255,255,255,0.1)'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px',
                      animation: active ? 'goldPulse 1.5s ease-in-out infinite' : 'none'
                    }}>{step.icon}</div>
                    <div style={{ flex: 1 }}>
                      <p style={{ color: done ? '#f5e6c8' : '#8a7a65', fontSize: '15px', fontWeight: active ? 700 : 500 }}>{step.label}</p>
                      <p style={{ color: '#8a7a65', fontSize: '12px' }}>{step.desc}</p>
                    </div>
                    {active && <span style={{ color: '#c9a84c', fontSize: '11px', fontWeight: 600 }}>NOW</span>}
                    {done && !active && <span style={{ color: '#27ae60', fontSize: '16px' }}>✓</span>}
                  </div>
                )
              })}
            </div>
          </>
        )}

        {/* Order details */}
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(201,168,76,0.12)', borderRadius: '16px', padding: '1.5rem', marginBottom: '1.5rem' }}>
          <h3 style={{ color: '#c9a84c', fontSize: '12px', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '1rem' }}>Order Details</h3>
          {(order.items || []).map((item, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: '#c8b89a', marginBottom: '6px' }}>
              <span>{item.name} × {item.qty}</span>
              <span>₹{item.price * item.qty}</span>
            </div>
          ))}
          <div style={{ borderTop: '1px solid rgba(201,168,76,0.12)', marginTop: '0.75rem', paddingTop: '0.75rem', display: 'flex', justifyContent: 'space-between', fontWeight: 700, color: '#f5e6c8' }}>
            <span>Total</span><span style={{ color: '#c9a84c' }}>₹{order.total}</span>
          </div>
          {order.order_type === 'delivery' && (
            <p style={{ color: '#8a7a65', fontSize: '12px', marginTop: '0.75rem' }}>📍 {order.address}</p>
          )}
          <p style={{ color: '#8a7a65', fontSize: '12px', marginTop: '4px' }}>💳 {order.payment_mode}{order.payment_id ? ' · Paid' : ''}</p>
        </div>

        <div style={{ textAlign: 'center' }}>
          <a href={`https://wa.me/919711386962?text=${encodeURIComponent(`Hi, regarding my order ${order.order_id}`)}`} target="_blank"
            style={{ color: '#25d366', fontSize: '13px', textDecoration: 'none' }}>Need help? Chat with us 💬</a>
          <p style={{ marginTop: '1rem' }}>
            <a href="/" style={{ color: '#c9a84c', fontSize: '13px', textDecoration: 'none' }}>← Back to FeastWala</a>
          </p>
        </div>
      </div>
    </div>
  )
}
