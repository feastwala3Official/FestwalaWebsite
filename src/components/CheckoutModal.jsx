import { useState } from 'react'
import { useCart } from '../context/CartContext'
import { supabase, CONFIG, OUTLETS, checkDeliveryZone } from '../lib/supabase'
import toast from 'react-hot-toast'

export default function CheckoutModal({ onClose }) {
  const { items, subtotal, grandTotal, deliveryFree, clearCart, closeCart } = useCart()
  const [form, setForm] = useState({
    name: '', phone: '', email: '',
    flat: '', area: '', city: 'New Delhi', pincode: '',
    orderType: 'delivery', payment: 'COD'
  })
  const [loading, setLoading] = useState(false)
  const [locStatus, setLocStatus] = useState(null) // null | 'checking' | 'ok' | 'outside' | 'denied'
  const [locData, setLocData] = useState(null)
  const [showPickupConfirm, setShowPickupConfirm] = useState(false)

  function makeOrderId() { return 'FW' + Date.now().toString().slice(-8) }

  // Full address string from structured fields
  const fullAddress = [form.flat, form.area, form.city, form.pincode].filter(Boolean).join(', ')

  async function checkLocation() {
    // Works on both HTTP and HTTPS — browser geolocation works on localhost and deployed
    if (!navigator.geolocation) {
      toast.error('Your browser doesn\'t support location. Enter address manually.')
      setLocStatus('denied')
      return
    }
    setLocStatus('checking')

    const options = {
      enableHighAccuracy: false, // false = faster, uses network/IP location
      timeout: 15000,
      maximumAge: 60000
    }

    navigator.geolocation.getCurrentPosition(
      pos => {
        const { latitude: lat, longitude: lng } = pos.coords
        const zone = checkDeliveryZone(lat, lng)
        setLocData({ lat, lng, ...zone })
        setLocStatus(zone.canDeliver ? 'ok' : 'outside')
        if (!zone.canDeliver) {
          toast.error(`You're ${zone.distance}km away — outside our 7km delivery zone`, { duration: 5000 })
        } else {
          toast.success(`✅ ${zone.distance}km from ${zone.outlet.area} — we deliver here!`, { duration: 4000 })
        }
      },
      err => {
        // err.code: 1=denied, 2=unavailable, 3=timeout
        if (err.code === 1) {
          setLocStatus('denied')
          toast('Location access denied. Enter your address manually — we\'ll verify before confirming.', { icon: '📍', duration: 4000 })
        } else {
          setLocStatus('denied')
          toast('Could not get location. Please enter your address manually.', { icon: '📍' })
        }
      },
      options
    )
  }

  async function placeOrder(paymentId = '') {
    const orderId = makeOrderId()
    const nearestOutlet = locData?.outlet || OUTLETS[0]
    const orderData = {
      order_id: orderId,
      customer_name: form.name,
      phone: form.phone,
      address: fullAddress || 'Pickup',
      order_type: form.orderType,
      items,
      subtotal,
      delivery_charge: deliveryFree ? 0 : 50,
      total: grandTotal,
      payment_mode: form.payment,
      payment_id: paymentId,
      status: 'pending',
      estimated_time: '30-45 mins',
      customer_lat: locData?.lat || null,
      customer_lng: locData?.lng || null,
      distance_from_outlet: locData?.distance || null,
      nearest_outlet: nearestOutlet.name
    }

    await supabase.from('orders').insert(orderData)

    if (CONFIG.sheetWebhook !== 'REPLACE_WITH_YOUR_APPS_SCRIPT_URL') {
      fetch(CONFIG.sheetWebhook, {
        method: 'POST', mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...orderData, items: items.map(i => `${i.name} x${i.qty}`).join(', ') })
      }).catch(() => {})
    }

    const itemList = items.map(i => `• ${i.name} x${i.qty} = ₹${i.price * i.qty}`).join('\n')
    const mapsLink = locData ? `\n📍 *Location:* https://maps.google.com/?q=${locData.lat},${locData.lng} (${locData.distance}km from ${locData.outlet?.area})` : ''
    const msgToUs = `🍽️ *New Order — FeastWala*\n\n*ID:* ${orderId}\n*Name:* ${form.name}\n*Phone:* ${form.phone}\n*Email:* ${form.email || '—'}\n*Address:* ${fullAddress || 'Pickup'}${mapsLink}\n*Type:* ${form.orderType}\n\n*Items:*\n${itemList}\n\n*Subtotal:* ₹${subtotal}\n*Delivery:* ${deliveryFree ? 'FREE' : '₹50'}\n*Total:* ₹${grandTotal}\n*Payment:* ${form.payment}${paymentId ? ' ✅' : ''}`

    window.open(`https://wa.me/${nearestOutlet.whatsapp}?text=${encodeURIComponent(msgToUs)}`, '_blank')

    setTimeout(() => {
      const msgToCustomer = `Hi ${form.name}! 🍽️ Your FeastWala order *${orderId}* is placed!\n\nTotal: ₹${grandTotal} | Payment: ${form.payment}\nEstimated time: 30-45 mins\n\nQueries? Call: +91 ${nearestOutlet.whatsapp.replace('91', '')}`
      window.open(`https://wa.me/91${form.phone}?text=${encodeURIComponent(msgToCustomer)}`, '_blank')
    }, 1500)

    toast.success('Order placed! 🎉 Check WhatsApp.', { duration: 5000 })
    clearCart(); closeCart(); onClose()
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name || !form.phone) return toast.error('Name and phone are required')
    if (form.phone.replace(/\D/g, '').length < 10) return toast.error('Enter a valid 10-digit phone number')

    if (form.orderType === 'delivery') {
      if (!form.area || !form.pincode) return toast.error('Please enter your area and pincode')
      // Location is OPTIONAL — if outside zone, show pickup confirm
      if (locStatus === 'outside') { setShowPickupConfirm(true); return }
    }

    setLoading(true)
    try {
      if (form.payment === 'Online' && CONFIG.razorpayKey !== 'rzp_test_REPLACE_WITH_YOUR_KEY') {
        const rzp = new window.Razorpay({
          key: CONFIG.razorpayKey, amount: grandTotal * 100, currency: 'INR',
          name: 'FeastWala', description: makeOrderId(),
          prefill: { name: form.name, contact: form.phone, email: form.email },
          theme: { color: '#c9a84c' },
          handler: async res => { await placeOrder(res.razorpay_payment_id) }
        })
        rzp.open()
      } else {
        if (form.payment === 'Online') toast('Razorpay not configured yet — using COD', { icon: 'ℹ️' })
        await placeOrder()
      }
    } catch { toast.error('Something went wrong. Please try again.') }
    finally { setLoading(false) }
  }

  const S = {
    background: 'rgba(201,168,76,0.05)', border: '1px solid rgba(201,168,76,0.2)',
    borderRadius: '8px', padding: '11px 14px', color: '#f5e6c8', fontSize: '14px',
    fontFamily: 'DM Sans', width: '100%', outline: 'none'
  }

  // Outside zone — show pickup prompt
  if (showPickupConfirm) return (
    <>
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 1000, backdropFilter: 'blur(4px)' }} />
      <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', background: '#1a0a00', border: '1px solid rgba(201,168,76,0.3)', borderRadius: '16px', padding: '2rem', zIndex: 1001, width: '420px', maxWidth: '95vw', textAlign: 'center' }}>
        <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>📍</div>
        <h3 style={{ fontFamily: 'Cormorant Garamond', fontSize: '22px', color: '#f5e6c8', marginBottom: '0.75rem' }}>Outside Delivery Zone</h3>
        <p style={{ color: '#c8b89a', fontSize: '14px', lineHeight: 1.7, marginBottom: '1.5rem' }}>
          You're <strong style={{ color: '#c9a84c' }}>{locData?.distance}km</strong> away — we deliver within <strong style={{ color: '#c9a84c' }}>7km only</strong>.<br /><br />
          You can <strong style={{ color: '#c9a84c' }}>pick up</strong> from our outlet or chat with us — we'll try to help!
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
          <a href={`https://maps.google.com/?q=${OUTLETS[0].lat},${OUTLETS[0].lng}`} target="_blank" style={{ background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.3)', borderRadius: '8px', padding: '9px 14px', color: '#c9a84c', fontSize: '12px', textDecoration: 'none' }}>📍 View Outlet</a>
          <a href={`https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(`Hi! I'm ${form.name}, I'm ${locData?.distance}km away but want to order. Can you help?`)}`} target="_blank" style={{ background: 'rgba(37,211,102,0.08)', border: '1px solid rgba(37,211,102,0.3)', borderRadius: '8px', padding: '9px 14px', color: '#25d366', fontSize: '12px', textDecoration: 'none' }}>💬 Chat with Us</a>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
          <button onClick={() => { setForm(f => ({ ...f, orderType: 'pickup' })); setShowPickupConfirm(false); toast.success('Switched to Pickup') }}
            style={{ background: '#c9a84c', border: 'none', borderRadius: '8px', padding: '11px 22px', color: '#0a0500', fontWeight: 700, fontSize: '14px', fontFamily: 'DM Sans' }}>
            Yes, I'll Pick Up
          </button>
          <button onClick={() => setShowPickupConfirm(false)}
            style={{ background: 'none', border: '1px solid rgba(201,168,76,0.2)', borderRadius: '8px', padding: '11px 22px', color: '#c8b89a', fontSize: '14px', fontFamily: 'DM Sans' }}>
            Go Back
          </button>
        </div>
      </div>
    </>
  )

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, backdropFilter: 'blur(4px)' }} />
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        background: '#1a0a00', border: '1px solid rgba(201,168,76,0.25)', borderRadius: '16px',
        padding: '2rem', zIndex: 1001, width: '460px', maxWidth: '95vw',
        maxHeight: '92vh', overflowY: 'auto', animation: 'fadeUp 0.3s ease'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h3 style={{ fontFamily: 'Cormorant Garamond', fontSize: '24px', color: '#f5e6c8' }}>Checkout</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#c8b89a', fontSize: '22px' }}>✕</button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>

          {/* Personal details */}
          <input placeholder="Your name *" style={S} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          <input placeholder="Phone number *" type="tel" style={S} value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
          <input placeholder="Email (optional — for order confirmation)" type="email" style={S} value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />

          {/* Order type */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            {['delivery', 'pickup'].map(type => (
              <button type="button" key={type} onClick={() => setForm(f => ({ ...f, orderType: type }))} style={{
                padding: '10px', borderRadius: '8px',
                border: `1px solid ${form.orderType === type ? '#c9a84c' : 'rgba(201,168,76,0.2)'}`,
                background: form.orderType === type ? 'rgba(201,168,76,0.15)' : 'transparent',
                color: form.orderType === type ? '#c9a84c' : '#c8b89a', fontSize: '13px', fontFamily: 'DM Sans'
              }}>
                {type === 'delivery' ? '🛵 Delivery' : '🏪 Pickup'}
              </button>
            ))}
          </div>

          {/* Delivery address — structured fields */}
          {form.orderType === 'delivery' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              <p style={{ color: '#c8b89a', fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Delivery Address</p>
              <input placeholder="Flat / House No. / Building" style={S} value={form.flat} onChange={e => setForm(f => ({ ...f, flat: e.target.value }))} />
              <input placeholder="Area / Street / Colony *" style={S} value={form.area} onChange={e => setForm(f => ({ ...f, area: e.target.value }))} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
                <input placeholder="City" style={S} value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} />
                <input placeholder="Pincode *" type="tel" maxLength={6} style={S} value={form.pincode} onChange={e => setForm(f => ({ ...f, pincode: e.target.value }))} />
              </div>

              {/* Location button — optional, improves order accuracy */}
              <button type="button" onClick={checkLocation} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                padding: '10px', borderRadius: '8px', fontSize: '12px', fontFamily: 'DM Sans',
                border: `1px solid ${locStatus === 'ok' ? '#27ae60' : locStatus === 'outside' ? '#c0392b' : locStatus === 'denied' ? 'rgba(201,168,76,0.15)' : 'rgba(201,168,76,0.3)'}`,
                background: locStatus === 'ok' ? 'rgba(39,174,96,0.08)' : locStatus === 'outside' ? 'rgba(192,57,43,0.08)' : 'rgba(201,168,76,0.04)',
                color: locStatus === 'ok' ? '#27ae60' : locStatus === 'outside' ? '#c0392b' : locStatus === 'denied' ? '#8a7a65' : '#c9a84c'
              }}>
                {locStatus === 'checking'
                  ? '⏳ Getting your location...'
                  : locStatus === 'ok'
                  ? `✅ In delivery zone — ${locData?.distance}km from ${locData?.outlet?.area}`
                  : locStatus === 'outside'
                  ? `❌ ${locData?.distance}km — Outside 7km delivery zone`
                  : locStatus === 'denied'
                  ? '📍 Location denied — we\'ll verify your address'
                  : '📍 Share Location (optional — helps us confirm delivery)'}
              </button>
            </div>
          )}

          {/* Pickup info */}
          {form.orderType === 'pickup' && (
            <div style={{ background: 'rgba(201,168,76,0.05)', border: '1px solid rgba(201,168,76,0.15)', borderRadius: '8px', padding: '12px' }}>
              <p style={{ color: '#c9a84c', fontSize: '11px', fontWeight: 600, marginBottom: '8px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Pickup From</p>
              {OUTLETS.map(o => (
                <div key={o.name} style={{ fontSize: '13px', color: '#c8b89a', marginBottom: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>📍 {o.name} — {o.address}</span>
                  <a href={`https://maps.google.com/?q=${o.lat},${o.lng}`} target="_blank" style={{ color: '#c9a84c', textDecoration: 'none', fontSize: '12px', marginLeft: '8px', flexShrink: 0 }}>Maps ↗</a>
                </div>
              ))}
            </div>
          )}

          {/* Payment */}
          <div>
            <p style={{ color: '#c8b89a', fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Payment Method</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              {['COD', 'Online'].map(mode => (
                <button type="button" key={mode} onClick={() => setForm(f => ({ ...f, payment: mode }))} style={{
                  padding: '10px', borderRadius: '8px',
                  border: `1px solid ${form.payment === mode ? '#c9a84c' : 'rgba(201,168,76,0.2)'}`,
                  background: form.payment === mode ? 'rgba(201,168,76,0.15)' : 'transparent',
                  color: form.payment === mode ? '#c9a84c' : '#c8b89a', fontSize: '13px', fontFamily: 'DM Sans'
                }}>
                  {mode === 'COD' ? '💵 Cash on Delivery' : '💳 Pay Online'}
                </button>
              ))}
            </div>
          </div>

          {/* Order summary */}
          <div style={{ background: 'rgba(201,168,76,0.04)', borderRadius: '10px', padding: '1rem', border: '1px solid rgba(201,168,76,0.1)' }}>
            {items.map(item => (
              <div key={item.cartKey} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#c8b89a', marginBottom: '4px' }}>
                <span>{item.name} × {item.qty}</span><span>₹{item.price * item.qty}</span>
              </div>
            ))}
            <div style={{ borderTop: '1px solid rgba(201,168,76,0.12)', marginTop: '0.75rem', paddingTop: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#c8b89a', marginBottom: '4px' }}>
                <span>Delivery</span>
                <span style={{ color: deliveryFree ? '#27ae60' : '' }}>{deliveryFree ? 'FREE' : '₹50'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, color: '#f5e6c8' }}>
                <span>Total</span><span style={{ color: '#c9a84c' }}>₹{grandTotal}</span>
              </div>
            </div>
          </div>

          <button type="submit" disabled={loading} style={{
            background: '#c9a84c', color: '#0a0500', border: 'none', borderRadius: '10px',
            padding: '15px', fontWeight: 700, fontSize: '16px', opacity: loading ? 0.7 : 1
          }}>
            {loading ? 'Placing Order...' : `Place Order • ₹${grandTotal}`}
          </button>
        </form>
      </div>
    </>
  )
}
