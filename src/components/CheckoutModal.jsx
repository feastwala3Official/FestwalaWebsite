import { useState, useEffect, useRef, useCallback } from 'react'
import { useCart } from '../context/CartContext'
import { supabase, CONFIG, OUTLETS, getDistance } from '../lib/supabase'
import toast from 'react-hot-toast'

function loadGoogleMaps(apiKey) {
  return new Promise((resolve, reject) => {
    if (window.google?.maps?.places) { resolve(); return }
    if (document.getElementById('gmap-script')) {
      const check = setInterval(() => {
        if (window.google?.maps?.places) { clearInterval(check); resolve() }
      }, 100)
      return
    }
    const script = document.createElement('script')
    script.id = 'gmap-script'
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`
    script.async = true
    script.onload = resolve
    script.onerror = reject
    document.head.appendChild(script)
  })
}

export default function CheckoutModal({ onClose }) {
  const { items, subtotal, grandTotal, deliveryFree, clearCart, closeCart } = useCart()
  const [step, setStep] = useState('form') // 'form' | 'success'
  const [placedOrder, setPlacedOrder] = useState(null)
  const [form, setForm] = useState({
    name: '', phone: '', email: '',
    address: '', pincode: '',
    orderType: 'delivery', payment: 'COD'
  })
  const [loading, setLoading] = useState(false)
  const [locData, setLocData] = useState(null)
  const [showPickupConfirm, setShowPickupConfirm] = useState(false)
  const [mapsLoaded, setMapsLoaded] = useState(false)
  const addressRef = useRef(null)
  const autocompleteRef = useRef(null)
  const hasGoogleKey = CONFIG.googleMapsKey !== 'REPLACE_WITH_YOUR_GOOGLE_MAPS_KEY'

  // Load Google Maps script
  useEffect(() => {
    if (!hasGoogleKey) return
    loadGoogleMaps(CONFIG.googleMapsKey)
      .then(() => setMapsLoaded(true))
      .catch(() => {})
  }, [hasGoogleKey])

  // Callback ref — just stores the input ref, actual autocomplete setup in useEffect
  const attachAutocomplete = useCallback((inputEl) => {
    addressRef.current = inputEl || null
  }, [])

  // This does the actual autocomplete setup — called from useEffect when both ready
  function setupAutocomplete(inputEl) {
    if (!inputEl || !window.google?.maps?.places || autocompleteRef.current) return

    const autocomplete = new window.google.maps.places.Autocomplete(inputEl, {
      componentRestrictions: { country: 'in' },
      fields: ['formatted_address', 'geometry', 'name', 'address_components'],
      types: ['geocode', 'establishment'],
      bounds: new window.google.maps.LatLngBounds(
        { lat: 28.40, lng: 77.00 },
        { lat: 28.75, lng: 77.40 }
      )
    })

    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace()
      if (!place.geometry) return

      const lat = place.geometry.location.lat()
      const lng = place.geometry.location.lng()
      const addr = place.formatted_address || place.name || ''

      // Extract pincode from address components
      let pincode = ''
      if (place.address_components) {
        const postalComp = place.address_components.find(c => c.types.includes('postal_code'))
        if (postalComp) pincode = postalComp.long_name
      }

      // Find nearest outlet
      let nearest = null, minDist = Infinity
      for (const outlet of OUTLETS) {
        const dist = getDistance(lat, lng, outlet.lat, outlet.lng)
        if (dist < minDist) { minDist = dist; nearest = outlet }
      }
      const distance = Math.round(minDist * 10) / 10
      const canDeliver = minDist <= nearest.maxDeliveryKm

      setForm(f => ({ ...f, address: addr, pincode: pincode || f.pincode }))

      // Distance Matrix for drive time
      const service = new window.google.maps.DistanceMatrixService()
      service.getDistanceMatrix({
        origins: [{ lat: nearest.lat, lng: nearest.lng }],
        destinations: [{ lat, lng }],
        travelMode: window.google.maps.TravelMode.DRIVING,
        unitSystem: window.google.maps.UnitSystem.METRIC
      }, (response, status) => {
        let driveMinutes = Math.round(distance * 3)
        if (status === 'OK') {
          const secs = response.rows[0]?.elements[0]?.duration?.value
          if (secs) driveMinutes = Math.ceil(secs / 60)
        }
        const totalTime = 20 + driveMinutes
        const timeText = `~${totalTime} mins (20 min prep + ${driveMinutes} min delivery)`
        setLocData({ lat, lng, distance, outlet: nearest, canDeliver, timeText })

        if (!canDeliver) {
          toast.error(`${distance}km away — outside our 10km delivery zone`, { duration: 5000 })
        } else {
          toast.success(`✅ ${distance}km · Est: ${timeText}`, { duration: 4000 })
        }
      })
    })

    autocompleteRef.current = autocomplete
  }

  // Run setup when maps loads (covers: input already mounted, waiting for maps)
  // AND when component mounts if maps already loaded (covers: maps ready, input just mounted)
  useEffect(() => {
    if (mapsLoaded && addressRef.current && !autocompleteRef.current) {
      setupAutocomplete(addressRef.current)
    }
  }, [mapsLoaded])

  function makeOrderId() { return 'FW' + Date.now().toString().slice(-8) }

  async function placeOrder(paymentId = '') {
    const orderId = makeOrderId()
    const nearestOutlet = locData?.outlet || OUTLETS[0]
    const fullAddress = form.pincode ? `${form.address}, ${form.pincode}` : form.address

    const orderData = {
      order_id: orderId,
      customer_name: form.name.trim(),
      phone: form.phone.trim(),
      address: fullAddress || 'Pickup',
      order_type: form.orderType,
      items, subtotal,
      delivery_charge: deliveryFree ? 0 : 50,
      total: grandTotal,
      payment_mode: form.payment,
      payment_id: paymentId,
      status: 'pending',
      estimated_time: locData?.timeText || '30-45 mins',
      customer_lat: locData?.lat || null,
      customer_lng: locData?.lng || null,
      distance_from_outlet: locData?.distance || null,
      nearest_outlet: nearestOutlet.name
    }

    // Save to Supabase
    await supabase.from('orders').insert(orderData)

    // Google Sheets
    if (CONFIG.sheetWebhook !== 'REPLACE_WITH_YOUR_APPS_SCRIPT_URL') {
      fetch(CONFIG.sheetWebhook, {
        method: 'POST', mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...orderData, items: items.map(i => `${i.name} x${i.qty}`).join(', ') })
      }).catch(() => {})
    }

    // WhatsApp notification to YOU (the restaurant) only
    // Opens in a NEW TAB in background — customer stays on the success screen
    const itemList = items.map(i => `• ${i.name} x${i.qty} = ₹${i.price * i.qty}`).join('\n')
    const mapsLink = locData ? `\n📍 https://maps.google.com/?q=${locData.lat},${locData.lng} (${locData.distance}km)` : ''
    const msgToUs = `🍽️ *New Order — FeastWala*\n\n*ID:* ${orderId}\n*Name:* ${form.name}\n*Phone:* ${form.phone}\n*Address:* ${fullAddress}${mapsLink}\n*Type:* ${form.orderType}\n*Payment:* ${form.payment}${paymentId ? ' ✅ Paid' : ''}\n\n*Items:*\n${itemList}\n\n*Total:* ₹${grandTotal}\n*Est. Time:* ${locData?.timeText || '30-45 mins'}`

    // Open WhatsApp for restaurant — in background tab
    const waWindow = window.open(`https://wa.me/${nearestOutlet.whatsapp}?text=${encodeURIComponent(msgToUs)}`, '_blank')
    if (waWindow) waWindow.blur() // keep focus on current page
    window.focus()

    // Show success screen — customer never leaves the site
    setPlacedOrder({
      orderId,
      name: form.name,
      total: grandTotal,
      payment: form.payment,
      timeText: locData?.timeText || '30-45 mins',
      orderType: form.orderType,
      address: fullAddress
    })

    clearCart()
    setStep('success')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim()) return toast.error('Please enter your name')
    if (!form.phone.trim()) return toast.error('Please enter your phone number')
    if (form.phone.replace(/\D/g, '').length < 10) return toast.error('Enter a valid 10-digit phone number')
    if (form.orderType === 'delivery') {
      if (!form.address.trim()) return toast.error('Please enter your delivery address')
      if (!form.pincode.trim()) return toast.error('Please enter your pincode')
      if (locData && !locData.canDeliver) { setShowPickupConfirm(true); return }
    }

    setLoading(true)
    try {
      if (form.payment === 'Online') {
        if (!window.Razorpay) {
          toast.error('Payment gateway not loaded. Please use Cash on Delivery.')
          setLoading(false); return
        }
        const rzp = new window.Razorpay({
          key: CONFIG.razorpayKey,
          amount: grandTotal * 100,
          currency: 'INR',
          name: 'FeastWala',
          description: 'Food Order',
          prefill: { name: form.name, contact: form.phone, email: form.email },
          theme: { color: '#c9a84c' },
          handler: async res => {
            await placeOrder(res.razorpay_payment_id)
            setLoading(false)
          },
          modal: { ondismiss: () => setLoading(false) }
        })
        rzp.on('payment.failed', () => {
          toast.error('Payment failed. Try again or use Cash on Delivery.')
          setLoading(false)
        })
        rzp.open()
        return
      } else {
        await placeOrder()
        setLoading(false)
      }
    } catch {
      toast.error('Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  const S = {
    background: 'rgba(201,168,76,0.05)', border: '1px solid rgba(201,168,76,0.2)',
    borderRadius: '8px', padding: '11px 14px', color: '#f5e6c8',
    fontSize: '14px', fontFamily: 'DM Sans', width: '100%', outline: 'none'
  }

  // ── SUCCESS SCREEN ─────────────────────────────────────
  if (step === 'success' && placedOrder) return (
    <>
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000, backdropFilter: 'blur(8px)' }} />
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        background: '#1a0a00', border: '1px solid rgba(201,168,76,0.3)', borderRadius: '20px',
        padding: '2.5rem', zIndex: 1001, width: '420px', maxWidth: '95vw', textAlign: 'center',
        animation: 'scaleIn 0.4s cubic-bezier(0.22,1,0.36,1)'
      }}>
        {/* Animated checkmark */}
        <div style={{
          width: '72px', height: '72px', borderRadius: '50%',
          background: 'rgba(39,174,96,0.15)', border: '2px solid #27ae60',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 1.5rem', fontSize: '32px',
          animation: 'scaleIn 0.5s cubic-bezier(0.22,1,0.36,1) 0.1s both'
        }}>✅</div>

        <h2 style={{ fontFamily: 'Cormorant Garamond', fontSize: '28px', color: '#f5e6c8', marginBottom: '0.5rem' }}>
          Order Placed!
        </h2>
        <p style={{ color: '#c8b89a', fontSize: '14px', marginBottom: '2rem' }}>
          Thank you, {placedOrder.name}! We've received your order.
        </p>

        {/* Order details */}
        <div style={{ background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.15)', borderRadius: '12px', padding: '1.2rem', marginBottom: '1.5rem', textAlign: 'left' }}>
          {[
            ['Order ID', placedOrder.orderId],
            ['Total', `₹${placedOrder.total}`],
            ['Payment', placedOrder.payment],
            ['Est. Delivery', placedOrder.timeText],
            placedOrder.orderType === 'delivery' ? ['Address', placedOrder.address] : ['Type', 'Pickup — collect from outlet']
          ].map(([label, val]) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '6px 0', borderBottom: '1px solid rgba(201,168,76,0.08)' }}>
              <span style={{ color: '#8a7a65', fontSize: '12px', flexShrink: 0, marginRight: '1rem' }}>{label}</span>
              <span style={{ color: '#f5e6c8', fontSize: '13px', fontWeight: 500, textAlign: 'right' }}>{val}</span>
            </div>
          ))}
        </div>

        <p style={{ color: '#c8b89a', fontSize: '13px', lineHeight: 1.7, marginBottom: '1.5rem' }}>
          Our team will confirm your order shortly.<br />
          Questions? Call us on{' '}
          <a href={`tel:+91${CONFIG.whatsapp.replace('91','')}`} style={{ color: '#c9a84c', textDecoration: 'none' }}>
            +91 {CONFIG.whatsapp.replace('91','')}
          </a>
        </p>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={() => { closeCart(); onClose() }} style={{
            flex: 1, background: '#c9a84c', border: 'none', borderRadius: '10px',
            padding: '13px', color: '#0a0500', fontWeight: 700, fontSize: '15px', fontFamily: 'DM Sans'
          }}>
            Back to Menu 🍽️
          </button>
          <a href={`https://wa.me/${CONFIG.whatsapp}`} target="_blank" style={{
            flex: 1, background: 'rgba(37,211,102,0.1)', border: '1px solid rgba(37,211,102,0.3)',
            borderRadius: '10px', padding: '13px', color: '#25d366', fontWeight: 600,
            fontSize: '14px', fontFamily: 'DM Sans', textDecoration: 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
          }}>
            💬 Chat with Us
          </a>
        </div>
      </div>
    </>
  )

  // ── OUTSIDE ZONE PROMPT ────────────────────────────────
  if (showPickupConfirm) return (
    <>
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 1000, backdropFilter: 'blur(4px)' }} />
      <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', background: '#1a0a00', border: '1px solid rgba(201,168,76,0.3)', borderRadius: '16px', padding: '2rem', zIndex: 1001, width: '420px', maxWidth: '95vw', textAlign: 'center' }}>
        <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>📍</div>
        <h3 style={{ fontFamily: 'Cormorant Garamond', fontSize: '22px', color: '#f5e6c8', marginBottom: '0.75rem' }}>Outside Delivery Zone</h3>
        <p style={{ color: '#c8b89a', fontSize: '14px', lineHeight: 1.7, marginBottom: '1.5rem' }}>
          Your address is <strong style={{ color: '#c9a84c' }}>{locData?.distance}km</strong> from our nearest outlet.<br />
          We deliver within <strong style={{ color: '#c9a84c' }}>10km only</strong>.<br /><br />
          Switch to <strong style={{ color: '#c9a84c' }}>Pickup</strong> or chat with us!
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
          <a href={`https://maps.google.com/?q=${OUTLETS[0].lat},${OUTLETS[0].lng}`} target="_blank"
            style={{ background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.3)', borderRadius: '8px', padding: '9px 14px', color: '#c9a84c', fontSize: '12px', textDecoration: 'none' }}>
            📍 View Outlet
          </a>
          <a href={`https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(`Hi! I'm outside 10km but want to order. Can you help?`)}`} target="_blank"
            style={{ background: 'rgba(37,211,102,0.08)', border: '1px solid rgba(37,211,102,0.3)', borderRadius: '8px', padding: '9px 14px', color: '#25d366', fontSize: '12px', textDecoration: 'none' }}>
            💬 Chat with Us
          </a>
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

  // ── CHECKOUT FORM ──────────────────────────────────────
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
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', color: '#c8b89a', fontSize: '22px' }}>✕</button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
          <input placeholder="Your name *" style={S} value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          <input placeholder="Phone number * (10 digits)" type="tel" style={S} value={form.phone}
            onChange={e => setForm(f => ({ ...f, phone: e.target.value.replace(/[^\d]/g, '').slice(0, 10) }))} />
          <input placeholder="Email (optional — for order updates)" type="email" style={S} value={form.email}
            onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />

          {/* Order type */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            {['delivery', 'pickup'].map(type => (
              <button type="button" key={type}
                onClick={() => { setForm(f => ({ ...f, orderType: type })); setLocData(null); autocompleteRef.current = null }}
                style={{
                  padding: '10px', borderRadius: '8px',
                  border: `1px solid ${form.orderType === type ? '#c9a84c' : 'rgba(201,168,76,0.2)'}`,
                  background: form.orderType === type ? 'rgba(201,168,76,0.15)' : 'transparent',
                  color: form.orderType === type ? '#c9a84c' : '#c8b89a', fontSize: '13px', fontFamily: 'DM Sans'
                }}>
                {type === 'delivery' ? '🛵 Delivery' : '🏪 Pickup'}
              </button>
            ))}
          </div>

          {/* Delivery address */}
          {form.orderType === 'delivery' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              <p style={{ color: '#c8b89a', fontSize: '11px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                Delivery Address *
                {hasGoogleKey && <span style={{ color: '#c9a84c', marginLeft: '6px', textTransform: 'none', letterSpacing: 0 }}>— start typing to search</span>}
              </p>

              {/* Google Maps search box */}
              <div style={{ position: 'relative' }}>
                <input
                  ref={attachAutocomplete}
                  placeholder="Search your address (e.g. Malviya Nagar, Delhi)"
                  style={{
                    ...S,
                    paddingLeft: hasGoogleKey ? '36px' : '14px',
                    border: locData
                      ? `1px solid ${locData.canDeliver ? '#27ae60' : '#c0392b'}`
                      : '1px solid rgba(201,168,76,0.2)'
                  }}
                  value={form.address}
                  onChange={e => { setForm(f => ({ ...f, address: e.target.value })); if (!e.target.value) setLocData(null) }}
                  onKeyDown={e => { if (e.key === 'Enter') e.preventDefault() }}
                />
                {hasGoogleKey && (
                  <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '16px', pointerEvents: 'none' }}>🔍</span>
                )}
              </div>

              {/* Pincode — separate field */}
              <input
                placeholder="Pincode *"
                type="tel"
                maxLength={6}
                style={S}
                value={form.pincode}
                onChange={e => setForm(f => ({ ...f, pincode: e.target.value.replace(/[^\d]/g, '').slice(0, 6) }))}
              />

              {/* Zone + time feedback */}
              {locData && (
                <div style={{
                  padding: '10px 12px', borderRadius: '6px',
                  background: locData.canDeliver ? 'rgba(39,174,96,0.1)' : 'rgba(192,57,43,0.1)',
                  border: `1px solid ${locData.canDeliver ? 'rgba(39,174,96,0.3)' : 'rgba(192,57,43,0.3)'}`
                }}>
                  {locData.canDeliver ? (
                    <>
                      <p style={{ color: '#27ae60', fontSize: '12px', fontWeight: 600 }}>✅ {locData.distance}km from {locData.outlet.area} — we deliver here!</p>
                      {locData.timeText && <p style={{ color: '#c9a84c', fontSize: '12px', marginTop: '3px' }}>⏱️ {locData.timeText}</p>}
                    </>
                  ) : (
                    <p style={{ color: '#c0392b', fontSize: '12px', fontWeight: 600 }}>❌ {locData.distance}km — outside our 10km delivery zone</p>
                  )}
                </div>
              )}

              {hasGoogleKey && !locData && form.address.length > 3 && (
                <p style={{ color: '#8a7a65', fontSize: '11px' }}>👆 Select from the dropdown to check delivery zone & time</p>
              )}
            </div>
          )}

          {/* Pickup */}
          {form.orderType === 'pickup' && (
            <div style={{ background: 'rgba(201,168,76,0.05)', border: '1px solid rgba(201,168,76,0.15)', borderRadius: '8px', padding: '12px' }}>
              <p style={{ color: '#c9a84c', fontSize: '11px', fontWeight: 600, marginBottom: '8px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Pickup From</p>
              {OUTLETS.map(o => (
                <div key={o.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', color: '#c8b89a', marginBottom: '6px' }}>
                  <span>📍 {o.name} — {o.address}</span>
                  <a href={`https://maps.google.com/?q=${o.lat},${o.lng}`} target="_blank"
                    style={{ color: '#c9a84c', textDecoration: 'none', fontSize: '12px', marginLeft: '8px' }}>Maps ↗</a>
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
            {form.payment === 'Online' && (
              <p style={{ color: '#8a7a65', fontSize: '11px', marginTop: '5px' }}>
                Test card: 4111 1111 1111 1111 · Any future date · CVV 123 · OTP 1234
              </p>
            )}
          </div>

          {/* Order summary */}
          <div style={{ background: 'rgba(201,168,76,0.04)', borderRadius: '10px', padding: '1rem', border: '1px solid rgba(201,168,76,0.1)' }}>
            {items.map(item => (
              <div key={item.cartKey} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#c8b89a', marginBottom: '4px' }}>
                <span>{item.name} × {item.qty}</span>
                <div style={{ textAlign: 'right' }}>
                  {item.originalPrice && item.originalPrice > item.price && (
                    <span style={{ color: '#8a7a65', fontSize: '11px', textDecoration: 'line-through', marginRight: '6px' }}>₹{item.originalPrice * item.qty}</span>
                  )}
                  <span>₹{item.price * item.qty}</span>
                </div>
              </div>
            ))}
            <div style={{ borderTop: '1px solid rgba(201,168,76,0.12)', marginTop: '0.75rem', paddingTop: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#c8b89a', marginBottom: '4px' }}>
                <span>Delivery</span>
                <span style={{ color: deliveryFree ? '#27ae60' : '' }}>{deliveryFree ? 'FREE 🎉' : '₹50'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, color: '#f5e6c8', fontSize: '16px' }}>
                <span>Total</span><span style={{ color: '#c9a84c' }}>₹{grandTotal}</span>
              </div>
            </div>
          </div>

          <button type="submit" disabled={loading} style={{
            background: loading ? 'rgba(201,168,76,0.5)' : '#c9a84c',
            color: '#0a0500', border: 'none', borderRadius: '10px',
            padding: '15px', fontWeight: 700, fontSize: '16px', fontFamily: 'DM Sans'
          }}>
            {loading ? 'Placing Order...' : `Place Order • ₹${grandTotal}`}
          </button>
        </form>
      </div>
    </>
  )
}
