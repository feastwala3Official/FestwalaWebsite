import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { emailDeliveredToCustomer } from '../lib/emails'
import toast from 'react-hot-toast'
import AdminOrders from '../components/admin/AdminOrders'
import AdminMenu from '../components/admin/AdminMenu'
import AdminAnalytics from '../components/admin/AdminAnalytics'
import AdminCustomers from '../components/admin/AdminCustomers'
import AdminDelivery from '../components/admin/AdminDelivery'
import AdminBroadcast from '../components/admin/AdminBroadcast'
import AdminSettings from '../components/admin/AdminSettings'
import AdminReviews from '../components/admin/AdminReviews'
import AdminUsers from '../components/admin/AdminUsers'

// Tabs with role requirement. manager sees only orders, analytics, customers, menu
const ALL_TABS = [
  { id: 'orders',    label: '📋 Orders',    roles: ['super_admin', 'manager'] },
  { id: 'analytics', label: '📊 Analytics', roles: ['super_admin', 'manager'] },
  { id: 'customers', label: '👥 Customers', roles: ['super_admin', 'manager'] },
  { id: 'menu',      label: '🍽️ Menu',      roles: ['super_admin', 'manager'] },
  { id: 'reviews',   label: '⭐ Reviews',   roles: ['super_admin'] },
  { id: 'delivery',  label: '🛵 Delivery',  roles: ['super_admin'] },
  { id: 'broadcast', label: '📣 Broadcast', roles: ['super_admin'] },
  { id: 'settings',  label: '⚙️ Settings',  roles: ['super_admin'] },
  { id: 'users',     label: '🔐 Staff',     roles: ['super_admin'] },
]

// WhatsApp to customer on status change (single number, opens background)
function sendStatusWhatsApp(order, newStatus) {
  const reviewUrl = `https://feastwala-website.vercel.app/review?order=${order.order_id}&phone=${order.phone}&name=${encodeURIComponent(order.customer_name)}`
  const messages = {
    accepted: `Hi ${order.customer_name}! ✅ Your FeastWala order *${order.order_id}* is being prepared fresh now.\n\nWe'll let you know when it's on the way!`,
    dispatched: `Hi ${order.customer_name}! 🛵 Your FeastWala order *${order.order_id}* is *on the way*!\n\nPlease keep your phone reachable.`,
    delivered: `Hi ${order.customer_name}! 🎉 Your order *${order.order_id}* is *delivered*!\n\n⭐ Tell us how it was: ${reviewUrl}\n\nThank you for choosing FeastWala! 🙏`,
    cancelled: `Hi ${order.customer_name}. Your order *${order.order_id}* has been cancelled.\n\nPlease call +91 9711386962 for help.`
  }
  const msg = messages[newStatus]
  if (msg && order.phone) {
    const w = window.open(`https://wa.me/91${order.phone}?text=${encodeURIComponent(msg)}`, '_blank')
    if (w) w.blur()
    window.focus()
  }
  // Email on delivered
  if (newStatus === 'delivered' && order.email) {
    emailDeliveredToCustomer(order, order.email, reviewUrl)
  }
}

function CursorFollower() {
  useEffect(() => {
    const dot = document.getElementById('adm-cursor-dot')
    const ring = document.getElementById('adm-cursor-ring')
    if (!dot || !ring) return
    const move = e => {
      dot.style.left = e.clientX + 'px'; dot.style.top = e.clientY + 'px'
      ring.style.left = e.clientX + 'px'; ring.style.top = e.clientY + 'px'
    }
    window.addEventListener('mousemove', move)
    return () => window.removeEventListener('mousemove', move)
  }, [])
  return (<><div id="adm-cursor-dot" className="cursor-dot" /><div id="adm-cursor-ring" className="cursor-ring" /></>)
}

// Play alert sound for new orders (Web Audio — no file needed)
function playAlertSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const notes = [880, 1100, 1320] // ascending chime
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain); gain.connect(ctx.destination)
      osc.frequency.value = freq
      osc.type = 'sine'
      const start = ctx.currentTime + i * 0.15
      gain.gain.setValueAtTime(0, start)
      gain.gain.linearRampToValueAtTime(0.3, start + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.01, start + 0.3)
      osc.start(start)
      osc.stop(start + 0.3)
    })
  } catch (e) { /* audio not available */ }
}

export default function Admin() {
  const [session, setSession] = useState(null)
  const [role, setRole] = useState(null)
  const [checking, setChecking] = useState(true)
  const [email, setEmail] = useState('')
  const [pass, setPass] = useState('')
  const [loggingIn, setLoggingIn] = useState(false)
  const [tab, setTab] = useState('orders')
  const [orders, setOrders] = useState([])
  const [newCount, setNewCount] = useState(0)
  const [soundOn, setSoundOn] = useState(true)
  const soundOnRef = useRef(true)
  soundOnRef.current = soundOn

  // Check session on mount
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      if (data.session) loadRole(data.session.user.id)
      else setChecking(false)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_e, sess) => {
      setSession(sess)
      if (sess) loadRole(sess.user.id)
      else { setRole(null); setChecking(false) }
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  async function loadRole(userId) {
    const { data } = await supabase.from('staff_roles').select('*').eq('user_id', userId).maybeSingle()
    if (data) {
      setRole(data.role)
      // Set initial tab to first allowed
      const firstTab = ALL_TABS.find(t => t.roles.includes(data.role))
      if (firstTab) setTab(firstTab.id)
    } else {
      setRole(null)
      toast.error('No admin access for this account')
      await supabase.auth.signOut()
    }
    setChecking(false)
  }

  // Load orders + realtime (only when authed)
  useEffect(() => {
    if (!session || !role) return
    async function loadOrders() {
      const { data } = await supabase.from('orders').select('*').order('created_at', { ascending: false })
      if (data) setOrders(data)
    }
    loadOrders()
    const sub = supabase.channel('admin-orders')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, payload => {
        setOrders(prev => [payload.new, ...prev])
        setNewCount(c => c + 1)
        if (soundOnRef.current) playAlertSound()
        toast.success(`🔔 New order from ${payload.new.customer_name}!`, { duration: 8000 })
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, payload => {
        setOrders(prev => prev.map(o => o.id === payload.new.id ? { ...o, ...payload.new } : o))
      })
      .subscribe()
    return () => supabase.removeChannel(sub)
  }, [session, role])

  async function login(e) {
    e.preventDefault()
    setLoggingIn(true)
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: pass })
    setLoggingIn(false)
    if (error) toast.error(error.message || 'Login failed')
    else toast.success('Welcome back!')
  }

  async function logout() {
    await supabase.auth.signOut()
    setRole(null); setSession(null)
    toast.success('Logged out')
  }

  if (checking) return (
    <div style={{ minHeight: '100vh', background: '#0a0500', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c9a84c' }}>
      <div style={{ fontSize: '2rem', animation: 'pulse 1.5s ease infinite' }}>🍽️</div>
    </div>
  )

  if (!session || !role) return <LoginScreen email={email} setEmail={setEmail} pass={pass} setPass={setPass} onLogin={login} loggingIn={loggingIn} />

  const visibleTabs = ALL_TABS.filter(t => t.roles.includes(role))

  return (
    <div style={{ minHeight: '100vh', background: '#0a0500', fontFamily: 'DM Sans' }}>
      <CursorFollower />
      <div style={{ background: '#1a0a00', borderBottom: '1px solid rgba(201,168,76,0.2)', padding: '0 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '60px', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ fontFamily: 'Cormorant Garamond', fontSize: '20px', color: '#c9a84c', fontWeight: 700 }}>FeastWala Admin</span>
          <span style={{ background: role === 'super_admin' ? 'rgba(201,168,76,0.15)' : 'rgba(52,152,219,0.15)', color: role === 'super_admin' ? '#c9a84c' : '#3498db', padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 600 }}>
            {role === 'super_admin' ? '👑 Super Admin' : '👤 Manager'}
          </span>
          {newCount > 0 && <span style={{ background: '#c0392b', color: 'white', borderRadius: '50px', padding: '2px 10px', fontSize: '12px', fontWeight: 600, animation: 'goldPulse 1.5s ease-in-out infinite' }}>{newCount} new</span>}
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <button onClick={() => setSoundOn(s => !s)} title="Toggle alert sound" style={{ background: 'none', border: '1px solid rgba(201,168,76,0.3)', color: soundOn ? '#c9a84c' : '#8a7a65', borderRadius: '6px', padding: '6px 10px', fontSize: '13px', fontFamily: 'DM Sans' }}>
            {soundOn ? '🔔 Sound On' : '🔕 Muted'}
          </button>
          <span style={{ color: '#27ae60', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#27ae60', display: 'inline-block', animation: 'pulse 2s ease-in-out infinite' }} />Live
          </span>
          <a href="/" style={{ color: '#c8b89a', fontSize: '13px', textDecoration: 'none' }}>View Site ↗</a>
          <button onClick={logout} style={{ background: 'none', border: '1px solid rgba(201,168,76,0.3)', color: '#c8b89a', borderRadius: '6px', padding: '6px 12px', fontSize: '12px', fontFamily: 'DM Sans' }}>Logout</button>
        </div>
      </div>

      <div style={{ background: '#110800', borderBottom: '1px solid rgba(201,168,76,0.1)', padding: '0 2rem', display: 'flex', overflowX: 'auto' }}>
        {visibleTabs.map(t => (
          <button key={t.id} onClick={() => { setTab(t.id); if (t.id === 'orders') setNewCount(0) }} style={{ padding: '14px 18px', background: 'none', border: 'none', borderBottom: tab === t.id ? '2px solid #c9a84c' : '2px solid transparent', color: tab === t.id ? '#c9a84c' : '#c8b89a', fontSize: '13px', fontWeight: tab === t.id ? 600 : 400, whiteSpace: 'nowrap', fontFamily: 'DM Sans' }}>{t.label}</button>
        ))}
      </div>

      <div style={{ padding: '2rem' }}>
        {tab === 'orders'    && <AdminOrders orders={orders} setOrders={setOrders} onStatusChange={sendStatusWhatsApp} />}
        {tab === 'analytics' && <AdminAnalytics orders={orders} />}
        {tab === 'customers' && <AdminCustomers orders={orders} />}
        {tab === 'menu'      && <AdminMenu role={role} />}
        {tab === 'reviews'   && role === 'super_admin' && <AdminReviews />}
        {tab === 'delivery'  && role === 'super_admin' && <AdminDelivery orders={orders} />}
        {tab === 'broadcast' && role === 'super_admin' && <AdminBroadcast orders={orders} />}
        {tab === 'settings'  && role === 'super_admin' && <AdminSettings />}
        {tab === 'users'     && role === 'super_admin' && <AdminUsers />}
      </div>
    </div>
  )
}

function LoginScreen({ email, setEmail, pass, setPass, onLogin, loggingIn }) {
  const iStyle = { background: 'rgba(201,168,76,0.05)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: '8px', padding: '12px 16px', color: '#f5e6c8', fontSize: '14px', fontFamily: 'DM Sans', outline: 'none', width: '100%' }
  return (
    <div style={{ minHeight: '100vh', background: '#0a0500', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'DM Sans', padding: '1rem' }}>
      <CursorFollower />
      <div style={{ background: '#1a0a00', border: '1px solid rgba(201,168,76,0.2)', borderRadius: '16px', padding: '3rem', width: '380px', maxWidth: '95vw', textAlign: 'center', animation: 'scaleIn 0.4s cubic-bezier(0.22,1,0.36,1)' }}>
        <div style={{ fontFamily: 'Cormorant Garamond', fontSize: '28px', color: '#c9a84c', fontWeight: 700, marginBottom: '0.5rem' }}>FeastWala</div>
        <p style={{ color: '#c8b89a', fontSize: '13px', marginBottom: '2rem' }}>Admin Login</p>
        <form onSubmit={onLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} autoFocus style={iStyle} />
          <input type="password" placeholder="Password" value={pass} onChange={e => setPass(e.target.value)} style={iStyle} />
          <button type="submit" disabled={loggingIn} style={{ background: '#c9a84c', color: '#0a0500', border: 'none', borderRadius: '8px', padding: '13px', fontWeight: 700, fontSize: '15px', fontFamily: 'DM Sans' }}>
            {loggingIn ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  )
}
