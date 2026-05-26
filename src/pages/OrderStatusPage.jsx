import { useState, useEffect } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

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

    // Parse total minutes from estimated_time e.g. "~45 mins (30 min prep + 15 min delivery)"
    let totalMins = 45
    const m = String(order.estimated_time || '').match(/~?(\d+)\s*mins/)
    if (m) totalMins = parseInt(m[1], 10)
    if (order.accepted_eta_mins) totalMins = order.accepted_eta_mins

    // pending/accepted: count from order creation with full time (prep still happening)
    // dispatched: count from when dispatched with delivery portion only (food is on the way)
    const baseTime = order.status === 'dispatched'
      ? new Date(order.status_updated_at || order.created_at).getTime()
      : new Date(order.created_at).getTime()

    const remainingMins = order.status === 'dispatched'
      ? Math.max(10, totalMins - 30) // delivery time only once out for delivery
      : totalMins // full time for pending and accepted

    const target = baseTime + remainingMins * 60 * 1000

    const tick = () => {
      const now = Date.now()
      const diff = Math.max(0, target - now)
      setRemaining(Math.ceil(diff / 60000))
    }
    tick()
    const interval = setInterval(tick, 30000)
    return () => clearInterval(interval)
  }, [order])

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

  // Calculate how long since order was placed and since dispatched
  const minSinceOrder = Math.floor((Date.now() - new Date(order.created_at).getTime()) / 60000)
  const minSinceDispatched = order.status_updated_at && order.status === 'dispatched'
    ? Math.floor((Date.now() - new Date(order.status_updated_at).getTime()) / 60000)
    : null

  // Dynamic message based on status and timing
  function getStatusMessage() {
    if (order.status === 'pending') return { text: 'We have received your order and will start preparing shortly!', color: '#e67e22', emoji: '📝' }
    if (order.status === 'accepted') return { text: 'Your food is being freshly prepared right now. We never use frozen food. That is why it tastes better!', color: '#c9a84c', emoji: '🍳' }
    if (order.status === 'dispatched') {
      if (minSinceOrder < 28) return { text: 'Dispatched early! Your order is on its way faster than expected.', color: '#27ae60', emoji: '🚀' }
      if (minSinceOrder <= 40) return { text: 'Your order is on the way! Our delivery partner is heading to you.', color: '#3498db', emoji: '🛵' }
      return { text: 'We are sorry for the wait — your order is on the way now! Thank you for your patience.', color: '#e67e22', emoji: '⏳' }
    }
    if (order.status === 'delivered') return { text: 'Delivered! We hope you enjoy your meal.', color: '#27ae60', emoji: '🎉' }
    return null
  }

  const statusMsg = getStatusMessage()

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
            {/* Status message */}
            {statusMsg && (
              <div style={{ background: `${statusMsg.color}18`, border: `1px solid ${statusMsg.color}44`, borderRadius: '12px', padding: '1rem 1.2rem', marginBottom: '1rem', display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '20px', flexShrink: 0 }}>{statusMsg.emoji}</span>
                <p style={{ color: statusMsg.color, fontSize: '14px', lineHeight: 1.6, fontWeight: 500 }}>{statusMsg.text}</p>
              </div>
            )}

            {/* Countdown */}
            {!isDelivered && remaining !== null && (
              <div style={{ background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.25)', borderRadius: '16px', padding: '1.5rem', textAlign: 'center', marginBottom: '1.5rem' }}>
                <p style={{ color: '#c8b89a', fontSize: '12px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                  {order.status === 'dispatched' ? 'Arriving in' : 'Estimated delivery in'}
                </p>
                <p style={{ fontFamily: 'Cormorant Garamond', fontSize: '48px', fontWeight: 700, color: '#c9a84c', lineHeight: 1.1, margin: '0.3rem 0' }}>
                  {remaining > 0 ? `${remaining} min` : 'Any moment now'}
                </p>
                <p style={{ color: '#8a7a65', fontSize: '12px' }}>
                  {order.status === 'accepted' ? 'Freshly prepared — never frozen' : 'On the way to you'}
                </p>
                {order.status === 'dispatched' && minSinceOrder < 28 && (
                  <p style={{ color: '#27ae60', fontSize: '11px', marginTop: '6px', fontWeight: 600 }}>Dispatched ahead of schedule!</p>
                )}
                {order.status === 'dispatched' && minSinceOrder > 40 && (
                  <p style={{ color: '#e67e22', fontSize: '11px', marginTop: '6px' }}>Running a bit late — thank you for your patience</p>
                )}
              </div>
            )}

            {isDelivered && (
              <div style={{ background: 'rgba(39,174,96,0.1)', border: '1px solid rgba(39,174,96,0.3)', borderRadius: '16px', padding: '1.5rem', textAlign: 'center', marginBottom: '1.5rem' }}>
                <div style={{ fontSize: '2.5rem' }}>🎉</div>
                <h2 style={{ color: '#27ae60', fontFamily: 'Cormorant Garamond', fontSize: '24px', margin: '0.5rem 0' }}>Delivered!</h2>
                <p style={{ color: '#c8b89a', fontSize: '14px' }}>We hope you enjoy your meal</p>
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

          {/* Cancel button — only when pending AND within 2 minutes */}
          {order.status === 'pending' && minSinceOrder < 2 && (
            <div style={{ marginTop: '1.5rem' }}>
              <button onClick={async () => {
                if (!confirm('Are you sure you want to cancel this order?')) return
                const { error } = await supabase.from('orders')
                  .update({ status: 'cancelled', status_updated_at: new Date().toISOString() })
                  .eq('order_id', order.order_id)
                if (!error) toast.success('Order cancelled')
                else toast.error('Could not cancel. Please call us.')
              }} style={{
                background: 'rgba(192,57,43,0.1)', border: '1px solid rgba(192,57,43,0.3)',
                borderRadius: '8px', padding: '10px 24px', color: '#c0392b',
                fontSize: '13px', fontFamily: 'DM Sans', cursor: 'pointer'
              }}>
                Cancel Order
              </button>
              <p style={{ color: '#8a7a65', fontSize: '11px', marginTop: '6px' }}>
                You can cancel within 2 minutes of placing the order
              </p>
            </div>
          )}

          {order.status === 'pending' && minSinceOrder >= 2 && (
            <p style={{ color: '#8a7a65', fontSize: '12px', marginTop: '1.5rem' }}>
              Order is being prepared — cancellation window has passed. Call us if you need help.
            </p>
          )}

          <p style={{ marginTop: '1rem' }}>
            <a href="/" style={{ color: '#c9a84c', fontSize: '13px', textDecoration: 'none' }}>← Back to FeastWala</a>
          </p>
        </div>
      </div>
    </div>
  )
}
