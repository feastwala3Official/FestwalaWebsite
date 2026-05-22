import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

function CursorFollower() {
  useEffect(() => {
    const dot = document.getElementById('tk-cursor-dot')
    const ring = document.getElementById('tk-cursor-ring')
    if (!dot || !ring) return
    const move = e => {
      dot.style.left = e.clientX + 'px'; dot.style.top = e.clientY + 'px'
      ring.style.left = e.clientX + 'px'; ring.style.top = e.clientY + 'px'
    }
    window.addEventListener('mousemove', move)
    return () => window.removeEventListener('mousemove', move)
  }, [])
  return (<><div id="tk-cursor-dot" className="cursor-dot" /><div id="tk-cursor-ring" className="cursor-ring" /></>)
}

const STATUS_LABELS = {
  pending: { label: 'Order Received', color: '#e67e22', icon: '📝' },
  accepted: { label: 'Preparing', color: '#c9a84c', icon: '🍳' },
  dispatched: { label: 'Out for Delivery', color: '#3498db', icon: '🛵' },
  delivered: { label: 'Delivered', color: '#27ae60', icon: '✅' },
  cancelled: { label: 'Cancelled', color: '#c0392b', icon: '❌' }
}

export default function TrackPage() {
  const [phone, setPhone] = useState('')
  const [orders, setOrders] = useState(null)
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)

  async function search(e) {
    e?.preventDefault()
    const clean = phone.replace(/\D/g, '')
    if (clean.length < 10) return
    setLoading(true)
    const { data } = await supabase.from('orders').select('*').eq('phone', clean).order('created_at', { ascending: false })
    // Sort: ongoing first (not delivered/cancelled), then by date
    const sorted = (data || []).sort((a, b) => {
      const aOngoing = !['delivered', 'cancelled'].includes(a.status)
      const bOngoing = !['delivered', 'cancelled'].includes(b.status)
      if (aOngoing && !bOngoing) return -1
      if (!aOngoing && bOngoing) return 1
      return new Date(b.created_at) - new Date(a.created_at)
    })
    setOrders(sorted)
    setSearched(true)
    setLoading(false)
  }

  const inputStyle = {
    background: 'rgba(201,168,76,0.05)', border: '1px solid rgba(201,168,76,0.2)',
    borderRadius: '8px', padding: '13px 16px', color: '#f5e6c8', fontSize: '15px',
    fontFamily: 'DM Sans', width: '100%', outline: 'none'
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0500', fontFamily: 'DM Sans', padding: '2rem 1rem' }}>
      <CursorFollower />
      <div style={{ maxWidth: '520px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <a href="/" style={{ fontFamily: 'Cormorant Garamond', fontSize: '30px', color: '#c9a84c', fontWeight: 700, textDecoration: 'none' }}>FeastWala</a>
          <p style={{ color: '#c8b89a', fontSize: '14px', marginTop: '4px' }}>Track Your Orders</p>
        </div>

        <form onSubmit={search} style={{ display: 'flex', gap: '0.75rem', marginBottom: '2rem' }}>
          <input type="tel" placeholder="Enter your phone number" value={phone}
            onChange={e => setPhone(e.target.value.replace(/[^\d]/g, '').slice(0, 10))}
            style={inputStyle} autoFocus />
          <button type="submit" disabled={loading || phone.length < 10} style={{
            background: phone.length >= 10 ? '#c9a84c' : 'rgba(201,168,76,0.3)',
            color: '#0a0500', border: 'none', borderRadius: '8px', padding: '0 24px',
            fontWeight: 700, fontSize: '14px', fontFamily: 'DM Sans', whiteSpace: 'nowrap'
          }}>{loading ? '...' : 'Track'}</button>
        </form>

        {searched && orders && orders.length === 0 && (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#c8b89a' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🔍</div>
            <p>No orders found for this number.</p>
          </div>
        )}

        {orders && orders.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {orders.map(order => {
              const st = STATUS_LABELS[order.status] || STATUS_LABELS.pending
              const ongoing = !['delivered', 'cancelled'].includes(order.status)
              return (
                <a key={order.id} href={`/order/${order.order_id}${order.track_token ? `?token=${order.track_token}` : ''}`}
                  style={{ textDecoration: 'none', display: 'block' }}>
                  <div style={{
                    background: ongoing ? 'rgba(201,168,76,0.06)' : 'rgba(255,255,255,0.02)',
                    border: `1px solid ${ongoing ? 'rgba(201,168,76,0.3)' : 'rgba(201,168,76,0.1)'}`,
                    borderRadius: '12px', padding: '1.2rem', transition: 'border-color 0.2s'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                      <span style={{ color: '#f5e6c8', fontSize: '14px', fontWeight: 600 }}>#{order.order_id}</span>
                      <span style={{ background: `${st.color}22`, color: st.color, padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 600 }}>
                        {st.icon} {st.label}
                      </span>
                    </div>
                    <div style={{ fontSize: '13px', color: '#c8b89a' }}>
                      {(order.items || []).map(i => `${i.name} ×${i.qty}`).join(', ')}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.75rem' }}>
                      <span style={{ color: '#8a7a65', fontSize: '12px' }}>
                        {new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span style={{ color: '#c9a84c', fontSize: '14px', fontWeight: 700 }}>₹{order.total}</span>
                    </div>
                    {ongoing && <p style={{ color: '#c9a84c', fontSize: '12px', marginTop: '0.5rem' }}>Tap to see live status →</p>}
                  </div>
                </a>
              )
            })}
          </div>
        )}

        <p style={{ textAlign: 'center', marginTop: '2rem' }}>
          <a href="/" style={{ color: '#c9a84c', fontSize: '13px', textDecoration: 'none' }}>← Back to FeastWala</a>
        </p>
      </div>
    </div>
  )
}
