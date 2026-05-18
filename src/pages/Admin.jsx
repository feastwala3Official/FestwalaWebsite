import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

const ADMIN_PASS = 'feastwala2026'

// ── Tab components (lazy) ──────────────────────────────
import AdminOrders from '../components/admin/AdminOrders'
import AdminMenu from '../components/admin/AdminMenu'
import AdminAnalytics from '../components/admin/AdminAnalytics'
import AdminCustomers from '../components/admin/AdminCustomers'
import AdminDelivery from '../components/admin/AdminDelivery'
import AdminBroadcast from '../components/admin/AdminBroadcast'
import AdminSettings from '../components/admin/AdminSettings'

const TABS = [
  { id: 'orders', label: '📋 Orders' },
  { id: 'analytics', label: '📊 Analytics' },
  { id: 'customers', label: '👥 Customers' },
  { id: 'menu', label: '🍽️ Menu' },
  { id: 'delivery', label: '🛵 Delivery' },
  { id: 'broadcast', label: '📣 Broadcast' },
  { id: 'settings', label: '⚙️ Settings' },
]

export default function Admin() {
  const [authed, setAuthed] = useState(false)
  const [pass, setPass] = useState('')
  const [tab, setTab] = useState('orders')
  const [orders, setOrders] = useState([])
  const [liveCount, setLiveCount] = useState(0)

  function login(e) {
    e.preventDefault()
    if (pass === ADMIN_PASS) { setAuthed(true); toast.success('Welcome back!') }
    else toast.error('Wrong password')
  }

  // Fetch orders + realtime
  useEffect(() => {
    if (!authed) return
    async function loadOrders() {
      const { data } = await supabase.from('orders').select('*').order('created_at', { ascending: false })
      if (data) setOrders(data)
    }
    loadOrders()

    const sub = supabase.channel('admin-orders')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, payload => {
        setOrders(prev => [payload.new, ...prev])
        setLiveCount(c => c + 1)
        toast.success('New order received! 🍽️', { duration: 5000 })
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, payload => {
        setOrders(prev => prev.map(o => o.id === payload.new.id ? payload.new : o))
      })
      .subscribe()
    return () => supabase.removeChannel(sub)
  }, [authed])

  if (!authed) return <LoginScreen pass={pass} setPass={setPass} onLogin={login} />

  return (
    <div style={{ minHeight: '100vh', background: '#0a0500', fontFamily: 'DM Sans' }}>
      <CursorFollower />
      {/* Admin Header */}
      <div style={{ background: '#1a0a00', borderBottom: '1px solid rgba(201,168,76,0.2)', padding: '0 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '60px', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ fontFamily: 'Cormorant Garamond', fontSize: '20px', color: '#c9a84c', fontWeight: 700 }}>FeastWala Admin</span>
          {liveCount > 0 && <span style={{ background: '#c0392b', color: 'white', borderRadius: '50px', padding: '2px 10px', fontSize: '12px', fontWeight: 600 }}>{liveCount} new</span>}
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <span style={{ color: '#27ae60', fontSize: '12px' }}>● Live</span>
          <a href="/" style={{ color: '#c8b89a', fontSize: '13px', textDecoration: 'none' }}>View Site →</a>
          <button onClick={() => setAuthed(false)} style={{ background: 'none', border: '1px solid rgba(201,168,76,0.3)', color: '#c8b89a', borderRadius: '6px', padding: '6px 12px', fontSize: '12px' }}>Logout</button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ background: '#110800', borderBottom: '1px solid rgba(201,168,76,0.1)', padding: '0 2rem', display: 'flex', gap: '0', overflowX: 'auto' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => { setTab(t.id); if (t.id === 'orders') setLiveCount(0) }} style={{
            padding: '14px 20px', background: 'none', border: 'none', borderBottom: tab === t.id ? '2px solid #c9a84c' : '2px solid transparent',
            color: tab === t.id ? '#c9a84c' : '#c8b89a', fontSize: '13px', fontWeight: tab === t.id ? 600 : 400,
            whiteSpace: 'nowrap', fontFamily: 'DM Sans', transition: 'color 0.2s'
          }}>{t.label}</button>
        ))}
      </div>

      {/* Tab content */}
      <div style={{ padding: '2rem' }}>
        {tab === 'orders' && <AdminOrders orders={orders} setOrders={setOrders} />}
        {tab === 'analytics' && <AdminAnalytics orders={orders} />}
        {tab === 'customers' && <AdminCustomers orders={orders} />}
        {tab === 'menu' && <AdminMenu />}
        {tab === 'delivery' && <AdminDelivery orders={orders} />}
        {tab === 'broadcast' && <AdminBroadcast orders={orders} />}
        {tab === 'settings' && <AdminSettings />}
      </div>
    </div>
  )
}

function CursorFollower() {
  useEffect(() => {
    const dot = document.getElementById('adm-cursor-dot')
    const ring = document.getElementById('adm-cursor-ring')
    if (!dot || !ring) return
    const move = e => {
      dot.style.left = e.clientX + 'px'
      dot.style.top = e.clientY + 'px'
      ring.style.left = e.clientX + 'px'
      ring.style.top = e.clientY + 'px'
    }
    window.addEventListener('mousemove', move)
    return () => window.removeEventListener('mousemove', move)
  }, [])
  return (
    <>
      <div id="adm-cursor-dot" className="cursor-dot" />
      <div id="adm-cursor-ring" className="cursor-ring" />
    </>
  )
}

function LoginScreen({ pass, setPass, onLogin }) {
  return (
    <div style={{ minHeight: '100vh', background: '#0a0500', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'DM Sans' }}>
      <CursorFollower />
      <div style={{ background: '#1a0a00', border: '1px solid rgba(201,168,76,0.2)', borderRadius: '16px', padding: '3rem', width: '360px', textAlign: 'center' }}>
        <div style={{ fontFamily: 'Cormorant Garamond', fontSize: '28px', color: '#c9a84c', fontWeight: 700, marginBottom: '0.5rem' }}>FeastWala</div>
        <p style={{ color: '#c8b89a', fontSize: '13px', marginBottom: '2rem' }}>Admin Dashboard</p>
        <form onSubmit={onLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <input type="password" placeholder="Enter password" value={pass} onChange={e => setPass(e.target.value)} autoFocus
            style={{ background: 'rgba(201,168,76,0.05)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: '8px', padding: '12px 16px', color: '#f5e6c8', fontSize: '14px', fontFamily: 'DM Sans', textAlign: 'center', outline: 'none' }} />
          <button type="submit" style={{ background: '#c9a84c', color: '#0a0500', border: 'none', borderRadius: '8px', padding: '13px', fontWeight: 700, fontSize: '15px' }}>Login</button>
        </form>
      </div>
    </div>
  )
}
