import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'

const STATUS_COLORS = { pending: '#e67e22', accepted: '#3498db', dispatched: '#9b59b6', delivered: '#27ae60', cancelled: '#c0392b' }

export default function AdminOrders({ orders, setOrders, onStatusChange }) {
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [showManual, setShowManual] = useState(false)

  const filtered = orders.filter(o => {
    const matchFilter = filter === 'all' || o.status === filter
    const matchSearch = !search || o.customer_name?.toLowerCase().includes(search.toLowerCase()) || o.phone?.includes(search)
    return matchFilter && matchSearch
  })

  async function updateStatus(id, status) {
    const now = new Date().toISOString()
    const extra = status === 'dispatched'
      ? { dispatched_at: now }
      : status === 'accepted'
      ? { accepted_at: now }
      : {}
    const { error } = await supabase.from('orders').update({ status, updated_at: new Date().toISOString(), ...extra }).eq('id', id)
    if (!error) { setOrders(prev => prev.map(o => o.id === id ? { ...o, status, ...extra } : o)); toast.success('Status updated') }
  }

  function exportCSV() {
    const headers = ['Order ID', 'Name', 'Phone', 'Address', 'Items', 'Total', 'Payment', 'Status', 'Date']
    const rows = orders.map(o => [o.order_id, o.customer_name, o.phone, o.address, JSON.stringify(o.items), o.total, o.payment_mode, o.status, new Date(o.created_at).toLocaleString('en-IN')])
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv])); a.download = 'feastwala-orders.csv'; a.click()
  }

  return (
    <div>
      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
        {['all','pending','accepted','dispatched','delivered'].map(s => {
          const count = s === 'all' ? orders.length : orders.filter(o => o.status === s).length
          return (
            <button key={s} onClick={() => setFilter(s)} style={{
              background: filter === s ? 'rgba(201,168,76,0.15)' : 'rgba(255,255,255,0.03)', border: `1px solid ${filter === s ? '#c9a84c' : 'rgba(201,168,76,0.1)'}`,
              borderRadius: '10px', padding: '1rem', textAlign: 'center', color: filter === s ? '#c9a84c' : '#c8b89a', fontFamily: 'DM Sans'
            }}>
              <div style={{ fontSize: '24px', fontWeight: 700 }}>{count}</div>
              <div style={{ fontSize: '11px', textTransform: 'capitalize', marginTop: '2px' }}>{s}</div>
            </button>
          )
        })}
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <input placeholder="Search by name or phone..." value={search} onChange={e => setSearch(e.target.value)}
          style={{ flex: 1, minWidth: '200px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: '8px', padding: '10px 16px', color: '#f5e6c8', fontFamily: 'DM Sans', fontSize: '14px' }} />
        <button onClick={() => setShowManual(true)} style={{ background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.3)', borderRadius: '8px', padding: '10px 16px', color: '#c9a84c', fontSize: '13px' }}>+ Manual Order</button>
        <button onClick={exportCSV} style={{ background: 'rgba(39,174,96,0.1)', border: '1px solid rgba(39,174,96,0.3)', borderRadius: '8px', padding: '10px 16px', color: '#27ae60', fontSize: '13px' }}>↓ Export CSV</button>
      </div>

      {/* Orders list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#c8b89a' }}>No orders found</div>
        ) : filtered.map(order => (
          <OrderCard key={order.id} order={order} onStatusChange={updateStatus} onWhatsApp={onStatusChange} />
        ))}
      </div>

      {showManual && <ManualOrderModal onClose={() => setShowManual(false)} />}
    </div>
  )
}

function OrderCard({ order, onStatusChange, onWhatsApp }) {
  const [open, setOpen] = useState(false)
  const items = Array.isArray(order.items) ? order.items : []

  return (
    <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(201,168,76,0.1)', borderRadius: '12px', overflow: 'hidden' }}>
      <div style={{ padding: '1.2rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }} onClick={() => setOpen(o => !o)}>
        <div style={{ flex: 1, minWidth: '150px' }}>
          <p style={{ color: '#f5e6c8', fontWeight: 600 }}>{order.customer_name}</p>
          <p style={{ color: '#c8b89a', fontSize: '12px' }}>{order.phone} · {order.order_id}</p>
        </div>
        <div style={{ color: '#c9a84c', fontWeight: 700 }}>₹{order.total}</div>
        <span style={{ background: STATUS_COLORS[order.status] + '22', color: STATUS_COLORS[order.status], padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 600, textTransform: 'capitalize' }}>
          {order.status}
        </span>
        <div style={{ color: '#8a7a65', fontSize: '12px' }}>{new Date(order.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</div>
        <span style={{ color: '#c8b89a', fontSize: '16px' }}>{open ? '▲' : '▼'}</span>
      </div>

      {open && (
        <div style={{ padding: '1rem 1.2rem', borderTop: '1px solid rgba(201,168,76,0.08)', background: 'rgba(0,0,0,0.2)' }}>
          <div style={{ marginBottom: '1rem' }}>
            {items.map((item, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#c8b89a', padding: '3px 0' }}>
                <span>{item.name} × {item.qty}</span><span>₹{item.price * item.qty}</span>
              </div>
            ))}
          </div>
          {order.address && <p style={{ color: '#c8b89a', fontSize: '13px', marginBottom: '1rem' }}>📍 {order.address}</p>}
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <select value={order.status} onChange={e => { onStatusChange(order.id, e.target.value); if (onWhatsApp) onWhatsApp(order, e.target.value) }}
              style={{ background: '#1a0a00', border: '1px solid rgba(201,168,76,0.3)', borderRadius: '6px', padding: '8px 12px', color: '#c9a84c', fontFamily: 'DM Sans', fontSize: '13px' }}>
              {['pending','accepted','dispatched','delivered','cancelled'].map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
            </select>
            <button onClick={() => window.open(`https://wa.me/91${order.phone}?text=${encodeURIComponent(`Hi ${order.customer_name}! Your FeastWala order ${order.order_id} status: ${order.status}`)}`, '_blank')}
              style={{ background: 'rgba(37,211,102,0.1)', border: '1px solid rgba(37,211,102,0.3)', borderRadius: '6px', padding: '8px 14px', color: '#25d366', fontSize: '13px' }}>
              📱 WhatsApp
            </button>
            <button onClick={() => window.open(`tel:${order.phone}`)}
              style={{ background: 'rgba(52,152,219,0.1)', border: '1px solid rgba(52,152,219,0.3)', borderRadius: '6px', padding: '8px 14px', color: '#3498db', fontSize: '13px' }}>
              📞 Call
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function ManualOrderModal({ onClose }) {
  const [form, setForm] = useState({ customer_name: '', phone: '', address: '', items: '', total: '', payment_mode: 'COD' })

  async function submit(e) {
    e.preventDefault()
    const { error } = await supabase.from('orders').insert({
      order_id: 'FW' + Date.now().toString().slice(-8),
      ...form, total: parseInt(form.total) || 0,
      items: [{ name: form.items, qty: 1, price: parseInt(form.total) || 0 }],
      status: 'accepted'
    })
    if (!error) { toast.success('Manual order added'); onClose() }
    else toast.error('Failed to add order')
  }

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000 }} />
      <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', background: '#1a0a00', border: '1px solid rgba(201,168,76,0.25)', borderRadius: '16px', padding: '2rem', zIndex: 1001, width: '400px', maxWidth: '95vw' }}>
        <h3 style={{ fontFamily: 'Cormorant Garamond', fontSize: '22px', color: '#f5e6c8', marginBottom: '1.5rem' }}>Add Manual Order</h3>
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {[['customer_name','Name *'],['phone','Phone *'],['address','Address'],['items','Items (description)'],['total','Total Amount']].map(([field, label]) => (
            <input key={field} placeholder={label} value={form[field]} onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
              style={{ background: 'rgba(201,168,76,0.05)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: '8px', padding: '10px 14px', color: '#f5e6c8', fontFamily: 'DM Sans', fontSize: '14px' }} />
          ))}
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button type="button" onClick={onClose} style={{ flex: 1, background: 'none', border: '1px solid rgba(201,168,76,0.2)', borderRadius: '8px', padding: '11px', color: '#c8b89a', fontFamily: 'DM Sans' }}>Cancel</button>
            <button type="submit" style={{ flex: 1, background: '#c9a84c', border: 'none', borderRadius: '8px', padding: '11px', color: '#0a0500', fontWeight: 600, fontFamily: 'DM Sans' }}>Add Order</button>
          </div>
        </form>
      </div>
    </>
  )
}
