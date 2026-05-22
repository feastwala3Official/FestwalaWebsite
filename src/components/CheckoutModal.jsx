import { useState, useEffect, useRef } from 'react'
import { useCart } from '../context/CartContext'
import { supabase, CONFIG, OUTLETS, getDistance } from '../lib/supabase'
import { emailOrderToRestaurant, emailOrderToCustomer } from '../lib/emails'
import toast from 'react-hot-toast'

// ── Load Google Maps with new async pattern + places library ──
let mapsLoadPromise = null
function loadGoogleMaps(apiKey) {
  if (mapsLoadPromise) return mapsLoadPromise
  mapsLoadPromise = new Promise((resolve, reject) => {
    if (window.google?.maps?.places) { resolve(); return }
    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&loading=async&v=weekly&callback=__feastwalaMapsReady`
    script.async = true
    script.defer = true
    window.__feastwalaMapsReady = () => resolve()
    script.onerror = reject
    document.head.appendChild(script)
  })
  return mapsLoadPromise
}

export default function CheckoutModal({ onClose }) {
  const { items, subtotal, grandTotal, deliveryFree, clearCart, closeCart } = useCart()
  const [step, setStep] = useState('form')
  const [placedOrder, setPlacedOrder] = useState(null)
  const [form, setForm] = useState({
    name: '', phone: '', email: '',
    address: '', pincode: '',
    orderType: 'delivery', payment: 'COD'
  })
  const [loading, setLoading] = useState(false)
  const [locData, setLocData] = useState(null)
  const [showPickupConfirm, setShowPickupConfirm] = useState(false)
  const [mapsReady, setMapsReady] = useState(false)
  const [searchInput, setSearchInput] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const sessionTokenRef = useRef(null)
  const debounceRef = useRef(null)
  const hasGoogleKey = CONFIG.googleMapsKey && CONFIG.googleMapsKey !== 'REPLACE_WITH_YOUR_GOOGLE_MAPS_KEY'

  // Load Google Maps when modal opens
  useEffect(() => {
    if (!hasGoogleKey) return
    loadGoogleMaps(CONFIG.googleMapsKey)
      .then(() => {
        setMapsReady(true)
        if (window.google?.maps?.places?.AutocompleteSessionToken) {
          sessionTokenRef.current = new window.google.maps.places.AutocompleteSessionToken()
        }
      })
      .catch(err => console.error('Maps failed:', err))
  }, [])

  // ── Use the NEW Place Autocomplete API (works for new customers) ──
  async function fetchSuggestions(query) {
    if (!query || query.length < 2 || !window.google?.maps?.places) {
      setSuggestions([])
      return
    }

    try {
      // New API: AutocompleteSuggestion.fetchAutocompleteSuggestions
      const { AutocompleteSuggestion, AutocompleteSessionToken } =
        await window.google.maps.importLibrary('places')

      if (!sessionTokenRef.current) {
        sessionTokenRef.current = new AutocompleteSessionToken()
      }

      const request = {
        input: query,
        sessionToken: sessionTokenRef.current,
        includedRegionCodes: ['in'],
        locationBias: {
          north: 28.90, south: 28.30, east: 77.60, west: 76.80
        }
      }

      const { suggestions: results } = await AutocompleteSuggestion.fetchAutocompleteSuggestions(request)
      const items = results.slice(0, 5).map(s => ({
        text: s.placePrediction?.text?.toString() || '',
        placeId: s.placePrediction?.placeId,
        mainText: s.placePrediction?.mainText?.toString() || '',
        secondaryText: s.placePrediction?.secondaryText?.toString() || ''
      })).filter(s => s.text)

      setSuggestions(items)
      setShowSuggestions(items.length > 0)
    } catch (err) {
      console.error('Autocomplete error:', err)
      setSuggestions([])
    }
  }

  // Debounced search as user types
  function onSearchChange(value) {
    setSearchInput(value)
    setForm(f => ({ ...f, address: value }))
    if (!value) setLocData(null)

    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      if (mapsReady) fetchSuggestions(value)
    }, 250)
  }

  // When user picks a suggestion
  async function selectSuggestion(item) {
    setSearchInput(item.text)
    setShowSuggestions(false)

    try {
      const { Place } = await window.google.maps.importLibrary('places')
      const place = new Place({ id: item.placeId })
      await place.fetchFields({ fields: ['location', 'formattedAddress', 'addressComponents'] })

      const lat = place.location.lat()
      const lng = place.location.lng()
      const addr = place.formattedAddress || item.text

      // Extract pincode
      let pincode = ''
      const postalComp = place.addressComponents?.find(c => c.types.includes('postal_code'))
      if (postalComp) pincode = postalComp.longText || postalComp.shortText || ''

      // Find nearest outlet
      let nearest = OUTLETS[0], minDist = Infinity
      for (const outlet of OUTLETS) {
        const d = getDistance(lat, lng, outlet.lat, outlet.lng)
        if (d < minDist) { minDist = d; nearest = outlet }
      }
      const distance = Math.round(minDist * 10) / 10
      const canDeliver = minDist <= nearest.maxDeliveryKm

      setForm(f => ({ ...f, address: addr, pincode: pincode || f.pincode }))

      // Get drive time
      let driveMin = Math.round(distance * 3)
      try {
        const svc = new window.google.maps.DistanceMatrixService()
        const resp = await new Promise((resolve, reject) => {
          svc.getDistanceMatrix({
            origins: [{ lat: nearest.lat, lng: nearest.lng }],
            destinations: [{ lat, lng }],
            travelMode: window.google.maps.TravelMode.DRIVING
          }, (r, s) => s === 'OK' ? resolve(r) : reject(s))
        })
        const secs = resp.rows[0]?.elements[0]?.duration?.value
        if (secs) driveMin = Math.ceil(secs / 60)
      } catch (e) { console.log('Distance matrix failed, using estimate') }

      const driveWithBuffer = driveMin + CONFIG.bufferMins
      const totalTime = CONFIG.prepTimeMins + driveWithBuffer
      const timeText = `~${totalTime} mins (${CONFIG.prepTimeMins} min prep + ${driveWithBuffer} min delivery)`
      setLocData({ lat, lng, distance, outlet: nearest, canDeliver, timeText })

      // Reset session token for next search
      const { AutocompleteSessionToken } = await window.google.maps.importLibrary('places')
      sessionTokenRef.current = new AutocompleteSessionToken()

      if (!canDeliver) {
        toast.error(`${distance}km away — outside our 10km delivery zone`, { duration: 5000 })
      } else {
        toast.success(`✅ ${distance}km · ${timeText}`, { duration: 4000 })
      }
    } catch (err) {
      console.error('Place details error:', err)
      toast.error('Could not get location details. Please try again.')
    }
  }

  function makeOrderId() { return 'FW' + Date.now().toString().slice(-8) }

  function makeToken() {
    return Array.from(crypto.getRandomValues(new Uint8Array(16))).map(b => b.toString(16).padStart(2, '0')).join('')
  }

  async function placeOrder(paymentId = '') {
    const orderId = makeOrderId()
    const trackToken = makeToken()
    const nearestOutlet = locData?.outlet || OUTLETS[0]
    const fullAddress = form.pincode ? `${form.address}, ${form.pincode}` : form.address

    const orderData = {
      track_token: trackToken,
      email: form.email.trim() || null,
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

    await supabase.from('orders').insert(orderData)

    // Send emails (non-blocking)
    const trackUrl = `${CONFIG.siteUrl}/order/${orderId}?token=${trackToken}`
    emailOrderToRestaurant(orderData).catch(() => {})
    if (form.email.trim()) emailOrderToCustomer(orderData, form.email.trim(), trackUrl).catch(() => {})

    if (CONFIG.sheetWebhook !== 'REPLACE_WITH_YOUR_APPS_SCRIPT_URL') {
      fetch(CONFIG.sheetWebhook, {
        method: 'POST', mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...orderData, items: items.map(i => `${i.name} x${i.qty}`).join(', ') })
      }).catch(() => {})
    }

    const itemList = items.map(i => `• ${i.name} x${i.qty} = ₹${i.price * i.qty}`).join('\n')
    const mapsLink = locData ? `\n📍 https://maps.google.com/?q=${locData.lat},${locData.lng} (${locData.distance}km)` : ''
    const msgToUs = `🍽️ *New Order — FeastWala*\n\n*ID:* ${orderId}\n*Name:* ${form.name}\n*Phone:* ${form.phone}\n*Address:* ${fullAddress}${mapsLink}\n*Type:* ${form.orderType}\n*Payment:* ${form.payment}${paymentId ? ' ✅ Paid' : ''}\n\n*Items:*\n${itemList}\n\n*Total:* ₹${grandTotal}\n*Est. Time:* ${locData?.timeText || '30-45 mins'}`

    const waWindow = window.open(`https://wa.me/${nearestOutlet.whatsapp}?text=${encodeURIComponent(msgToUs)}`, '_blank')
    if (waWindow) waWindow.blur()
    window.focus()

    setPlacedOrder({
      orderId, name: form.name, total: grandTotal,
      payment: form.payment, timeText: locData?.timeText || '30-45 mins',
      orderType: form.orderType, address: fullAddress, trackToken
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
          toast.error('Payment gateway not loaded. Please use COD.')
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
          handler: async res => { await placeOrder(res.razorpay_payment_id); setLoading(false) },
          modal: { ondismiss: () => setLoading(false) }
        })
        rzp.on('payment.failed', () => {
          toast.error('Payment failed. Try again or use COD.')
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

  // ── SUCCESS SCREEN ──
  if (step === 'success' && placedOrder) return (
    <>
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000, backdropFilter: 'blur(8px)' }} />
      <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', background: '#1a0a00', border: '1px solid rgba(201,168,76,0.3)', borderRadius: '20px', padding: '2.5rem', zIndex: 1001, width: '420px', maxWidth: '95vw', textAlign: 'center', animation: 'scaleIn 0.4s cubic-bezier(0.22,1,0.36,1)' }}>
        <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: 'rgba(39,174,96,0.15)', border: '2px solid #27ae60', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', fontSize: '32px' }}>✅</div>
        <h2 style={{ fontFamily: 'Cormorant Garamond', fontSize: '28px', color: '#f5e6c8', marginBottom: '0.5rem' }}>Order Placed!</h2>
        <p style={{ color: '#c8b89a', fontSize: '14px', marginBottom: '2rem' }}>Thank you, {placedOrder.name}! We've received your order.</p>
        <div style={{ background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.15)', borderRadius: '12px', padding: '1.2rem', marginBottom: '1.5rem', textAlign: 'left' }}>
          {[['Order ID', placedOrder.orderId], ['Total', `₹${placedOrder.total}`], ['Payment', placedOrder.payment], ['Est. Delivery', placedOrder.timeText], placedOrder.orderType === 'delivery' ? ['Address', placedOrder.address] : ['Type', 'Pickup']].map(([label, val]) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(201,168,76,0.08)' }}>
              <span style={{ color: '#8a7a65', fontSize: '12px', marginRight: '1rem' }}>{label}</span>
              <span style={{ color: '#f5e6c8', fontSize: '13px', fontWeight: 500, textAlign: 'right' }}>{val}</span>
            </div>
          ))}
        </div>
        <a href={`/order/${placedOrder.orderId}?token=${placedOrder.trackToken}`} style={{ display: 'block', width: '100%', background: '#c9a84c', border: 'none', borderRadius: '10px', padding: '13px', color: '#0a0500', fontWeight: 700, fontSize: '15px', fontFamily: 'DM Sans', textDecoration: 'none', textAlign: 'center', marginBottom: '0.75rem', boxSizing: 'border-box' }}>Track Your Order →</a>
        <button onClick={() => { closeCart(); onClose() }} style={{ width: '100%', background: 'transparent', border: '1px solid rgba(201,168,76,0.3)', borderRadius: '10px', padding: '13px', color: '#c8b89a', fontWeight: 600, fontSize: '14px', fontFamily: 'DM Sans' }}>Back to Menu 🍽️</button>
      </div>
    </>
  )

  if (showPickupConfirm) return (
    <>
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 1000, backdropFilter: 'blur(4px)' }} />
      <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', background: '#1a0a00', border: '1px solid rgba(201,168,76,0.3)', borderRadius: '16px', padding: '2rem', zIndex: 1001, width: '420px', maxWidth: '95vw', textAlign: 'center' }}>
        <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>📍</div>
        <h3 style={{ fontFamily: 'Cormorant Garamond', fontSize: '22px', color: '#f5e6c8', marginBottom: '0.75rem' }}>Outside Delivery Zone</h3>
        <p style={{ color: '#c8b89a', fontSize: '14px', lineHeight: 1.7, marginBottom: '1.5rem' }}>You're <strong style={{ color: '#c9a84c' }}>{locData?.distance}km</strong> away. We deliver within <strong style={{ color: '#c9a84c' }}>10km only</strong>.</p>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
          <button onClick={() => { setForm(f => ({ ...f, orderType: 'pickup' })); setShowPickupConfirm(false); toast.success('Switched to Pickup') }} style={{ background: '#c9a84c', border: 'none', borderRadius: '8px', padding: '11px 22px', color: '#0a0500', fontWeight: 700, fontSize: '14px', fontFamily: 'DM Sans' }}>Switch to Pickup</button>
          <button onClick={() => setShowPickupConfirm(false)} style={{ background: 'none', border: '1px solid rgba(201,168,76,0.2)', borderRadius: '8px', padding: '11px 22px', color: '#c8b89a', fontSize: '14px', fontFamily: 'DM Sans' }}>Go Back</button>
        </div>
      </div>
    </>
  )

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, backdropFilter: 'blur(4px)' }} />
      <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', background: '#1a0a00', border: '1px solid rgba(201,168,76,0.25)', borderRadius: '16px', padding: '2rem', zIndex: 1001, width: '460px', maxWidth: '95vw', maxHeight: '92vh', overflowY: 'auto', animation: 'fadeUp 0.3s ease' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h3 style={{ fontFamily: 'Cormorant Garamond', fontSize: '24px', color: '#f5e6c8' }}>Checkout</h3>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', color: '#c8b89a', fontSize: '22px' }}>✕</button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
          <input placeholder="Your name *" style={S} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          <input placeholder="Phone number * (10 digits)" type="tel" style={S} value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value.replace(/[^\d]/g, '').slice(0, 10) }))} />
          <input placeholder="Email (optional)" type="email" style={S} value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            {['delivery', 'pickup'].map(type => (
              <button type="button" key={type} onClick={() => { setForm(f => ({ ...f, orderType: type })); setLocData(null) }} style={{ padding: '10px', borderRadius: '8px', border: `1px solid ${form.orderType === type ? '#c9a84c' : 'rgba(201,168,76,0.2)'}`, background: form.orderType === type ? 'rgba(201,168,76,0.15)' : 'transparent', color: form.orderType === type ? '#c9a84c' : '#c8b89a', fontSize: '13px', fontFamily: 'DM Sans' }}>
                {type === 'delivery' ? '🛵 Delivery' : '🏪 Pickup'}
              </button>
            ))}
          </div>

          {form.orderType === 'delivery' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              <p style={{ color: '#c8b89a', fontSize: '11px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                Delivery Address * {mapsReady && <span style={{ color: '#27ae60', textTransform: 'none' }}>· search ready</span>}
              </p>

              {/* Custom address search with NEW API */}
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  placeholder="Type to search (e.g. Malviya Nagar, Delhi)"
                  style={{ ...S, paddingLeft: '36px', border: locData ? `1px solid ${locData.canDeliver ? '#27ae60' : '#c0392b'}` : '1px solid rgba(201,168,76,0.2)' }}
                  value={searchInput || form.address}
                  onChange={e => onSearchChange(e.target.value)}
                  onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  onKeyDown={e => { if (e.key === 'Enter') e.preventDefault() }}
                  autoComplete="off"
                />
                <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '16px', pointerEvents: 'none' }}>🔍</span>

                {/* Suggestions dropdown */}
                {showSuggestions && suggestions.length > 0 && (
                  <div style={{
                    position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '4px',
                    background: '#0f0500', border: '1px solid rgba(201,168,76,0.3)',
                    borderRadius: '8px', zIndex: 100, maxHeight: '240px', overflowY: 'auto',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.5)'
                  }}>
                    {suggestions.map((s, i) => (
                      <div key={i} onMouseDown={e => { e.preventDefault(); selectSuggestion(s) }}
                        style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: i < suggestions.length - 1 ? '1px solid rgba(201,168,76,0.08)' : 'none', transition: 'background 0.15s' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(201,168,76,0.1)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        <div style={{ color: '#f5e6c8', fontSize: '13px', fontWeight: 500 }}>{s.mainText || s.text}</div>
                        {s.secondaryText && <div style={{ color: '#8a7a65', fontSize: '11px', marginTop: '2px' }}>{s.secondaryText}</div>}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <input placeholder="Pincode *" type="tel" maxLength={6} style={S} value={form.pincode} onChange={e => setForm(f => ({ ...f, pincode: e.target.value.replace(/[^\d]/g, '').slice(0, 6) }))} />

              {locData && (
                <div style={{ padding: '10px 12px', borderRadius: '6px', background: locData.canDeliver ? 'rgba(39,174,96,0.1)' : 'rgba(192,57,43,0.1)', border: `1px solid ${locData.canDeliver ? 'rgba(39,174,96,0.3)' : 'rgba(192,57,43,0.3)'}` }}>
                  {locData.canDeliver ? (
                    <>
                      <p style={{ color: '#27ae60', fontSize: '12px', fontWeight: 600 }}>✅ {locData.distance}km from {locData.outlet.area}</p>
                      {locData.timeText && <p style={{ color: '#c9a84c', fontSize: '12px', marginTop: '3px' }}>⏱️ {locData.timeText}</p>}
                    </>
                  ) : (
                    <p style={{ color: '#c0392b', fontSize: '12px', fontWeight: 600 }}>❌ {locData.distance}km — outside our 10km zone</p>
                  )}
                </div>
              )}
            </div>
          )}

          {form.orderType === 'pickup' && (
            <div style={{ background: 'rgba(201,168,76,0.05)', border: '1px solid rgba(201,168,76,0.15)', borderRadius: '8px', padding: '12px' }}>
              <p style={{ color: '#c9a84c', fontSize: '11px', fontWeight: 600, marginBottom: '8px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Pickup From</p>
              {OUTLETS.map(o => (
                <div key={o.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', color: '#c8b89a', marginBottom: '6px' }}>
                  <span>📍 {o.name} — {o.address}</span>
                  <a href={`https://maps.google.com/?q=${o.lat},${o.lng}`} target="_blank" style={{ color: '#c9a84c', textDecoration: 'none', fontSize: '12px', marginLeft: '8px' }}>Maps ↗</a>
                </div>
              ))}
            </div>
          )}

          <div>
            <p style={{ color: '#c8b89a', fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Payment Method</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              {['COD', 'Online'].map(mode => (
                <button type="button" key={mode} onClick={() => setForm(f => ({ ...f, payment: mode }))} style={{ padding: '10px', borderRadius: '8px', border: `1px solid ${form.payment === mode ? '#c9a84c' : 'rgba(201,168,76,0.2)'}`, background: form.payment === mode ? 'rgba(201,168,76,0.15)' : 'transparent', color: form.payment === mode ? '#c9a84c' : '#c8b89a', fontSize: '13px', fontFamily: 'DM Sans' }}>
                  {mode === 'COD' ? '💵 Cash on Delivery' : '💳 Pay Online'}
                </button>
              ))}
            </div>
            {form.payment === 'Online' && <p style={{ color: '#8a7a65', fontSize: '11px', marginTop: '5px' }}>Test: 4111 1111 1111 1111 · any future date · CVV 123 · OTP 1234</p>}
          </div>

          <div style={{ background: 'rgba(201,168,76,0.04)', borderRadius: '10px', padding: '1rem', border: '1px solid rgba(201,168,76,0.1)' }}>
            {items.map(item => (
              <div key={item.cartKey} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#c8b89a', marginBottom: '4px' }}>
                <span>{item.name} × {item.qty}</span><span>₹{item.price * item.qty}</span>
              </div>
            ))}
            <div style={{ borderTop: '1px solid rgba(201,168,76,0.12)', marginTop: '0.75rem', paddingTop: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#c8b89a', marginBottom: '4px' }}>
                <span>Delivery</span><span style={{ color: deliveryFree ? '#27ae60' : '' }}>{deliveryFree ? 'FREE 🎉' : '₹50'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, color: '#f5e6c8', fontSize: '16px' }}>
                <span>Total</span><span style={{ color: '#c9a84c' }}>₹{grandTotal}</span>
              </div>
            </div>
          </div>

          <button type="submit" disabled={loading} style={{ background: loading ? 'rgba(201,168,76,0.5)' : '#c9a84c', color: '#0a0500', border: 'none', borderRadius: '10px', padding: '15px', fontWeight: 700, fontSize: '16px', fontFamily: 'DM Sans' }}>
            {loading ? 'Placing Order...' : `Place Order • ₹${grandTotal}`}
          </button>
        </form>
      </div>
    </>
  )
}
