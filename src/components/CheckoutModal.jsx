import { useState } from 'react'
import { useCart } from '../context/CartContext'
import { supabase, CONFIG } from '../lib/supabase'
import toast from 'react-hot-toast'

function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371, toR = d => d * Math.PI / 180
  const dLat = toR(lat2 - lat1), dLng = toR(lng2 - lng1)
  const a = Math.sin(dLat/2)**2 + Math.cos(toR(lat1))*Math.cos(toR(lat2))*Math.sin(dLng/2)**2
  return R * 2 * Math.asin(Math.sqrt(a))
}

export default function CheckoutModal({ onClose }) {
  const { items, subtotal, grandTotal, deliveryFree, clearCart, closeCart } = useCart()
  const [form, setForm] = useState({ name: '', phone: '', address: '', orderType: 'delivery', payment: 'COD' })
  const [loading, setLoading] = useState(false)

  const orderId = 'FW' + Date.now().toString().slice(-8)

  async function placeOrder(paymentId = '') {
    const orderData = {
      order_id: orderId,
      customer_name: form.name,
      phone: form.phone,
      address: form.address,
      order_type: form.orderType,
      items: items,
      subtotal,
      delivery_charge: deliveryFree ? 0 : 50,
      total: grandTotal,
      payment_mode: form.payment,
      payment_id: paymentId,
      status: 'pending',
      estimated_time: '30-45 mins'
    }

    // Save to Supabase
    const { error } = await supabase.from('orders').insert(orderData)
    if (error) console.error('Supabase insert error:', error)

    // Google Sheets
    if (CONFIG.sheetWebhook !== 'REPLACE_WITH_YOUR_APPS_SCRIPT_URL') {
      fetch(CONFIG.sheetWebhook, {
        method: 'POST', mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...orderData, items: items.map(i => `${i.name} x${i.qty}`).join(', ') })
      }).catch(() => {})
    }

    // WhatsApp message
    const itemList = items.map(i => `• ${i.name} x${i.qty} = ₹${i.price * i.qty}`).join('\n')
    const msg = `🍽️ *New Order — FeastWala*\n\n*Order ID:* ${orderId}\n*Name:* ${form.name}\n*Phone:* ${form.phone}\n*Address:* ${form.address || 'Pickup'}\n*Type:* ${form.orderType}\n\n*Items:*\n${itemList}\n\n*Subtotal:* ₹${subtotal}\n*Delivery:* ${deliveryFree ? 'FREE' : '₹50'}\n*Total:* ₹${grandTotal}\n*Payment:* ${form.payment}${paymentId ? ' ✅' : ''}`

    window.open(`https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(msg)}`, '_blank')

    toast.success('Order placed! Opening WhatsApp...', { icon: '🎉', duration: 4000 })
    clearCart()
    closeCart()
    onClose()
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name || !form.phone) return toast.error('Name and phone are required')
    if (form.orderType === 'delivery' && !form.address) return toast.error('Please enter delivery address')
    setLoading(true)

    try {
      if (form.payment === 'Online') {
        if (CONFIG.razorpayKey === 'rzp_test_REPLACE_WITH_YOUR_KEY') {
          toast.error('Razorpay not configured yet. Using COD.')
          await placeOrder()
        } else {
          const rzp = new window.Razorpay({
            key: CONFIG.razorpayKey, amount: grandTotal * 100, currency: 'INR',
            name: 'FeastWala', description: orderId,
            prefill: { name: form.name, contact: form.phone },
            theme: { color: '#c9a84c' },
            handler: async (response) => { await placeOrder(response.razorpay_payment_id) }
          })
          rzp.open()
        }
      } else {
        await placeOrder()
      }
    } catch (err) {
      toast.error('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const inputStyle = {
    background: 'rgba(201,168,76,0.05)', border: '1px solid rgba(201,168,76,0.2)',
    borderRadius: '8px', padding: '12px 16px', color: '#f5e6c8', fontSize: '14px',
    fontFamily: 'DM Sans', width: '100%', outline: 'none'
  }

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, backdropFilter: 'blur(4px)' }} />
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        background: '#1a0a00', border: '1px solid rgba(201,168,76,0.25)', borderRadius: '16px',
        padding: '2rem', zIndex: 1001, width: '440px', maxWidth: '95vw',
        maxHeight: '90vh', overflowY: 'auto', animation: 'fadeUp 0.3s ease'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h3 style={{ fontFamily: 'Cormorant Garamond', fontSize: '24px', color: '#f5e6c8' }}>Checkout</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#c8b89a', fontSize: '22px' }}>✕</button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <input placeholder="Your name *" style={inputStyle} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          <input placeholder="Phone number *" type="tel" style={inputStyle} value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />

          {/* Order type */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            {['delivery','pickup'].map(type => (
              <button type="button" key={type} onClick={() => setForm(f => ({ ...f, orderType: type }))} style={{
                padding: '10px', borderRadius: '8px', border: `1px solid ${form.orderType === type ? '#c9a84c' : 'rgba(201,168,76,0.2)'}`,
                background: form.orderType === type ? 'rgba(201,168,76,0.15)' : 'transparent',
                color: form.orderType === type ? '#c9a84c' : '#c8b89a', fontSize: '13px', fontFamily: 'DM Sans', textTransform: 'capitalize'
              }}>
                {type === 'delivery' ? '🛵 Delivery' : '🏪 Pickup'}
              </button>
            ))}
          </div>

          {form.orderType === 'delivery' && (
            <textarea placeholder="Delivery address *" rows={3} style={{ ...inputStyle, resize: 'vertical' }}
              value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
          )}

          {/* Payment */}
          <div>
            <p style={{ color: '#c8b89a', fontSize: '12px', marginBottom: '0.5rem', letterSpacing: '0.05em' }}>PAYMENT METHOD</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              {['COD','Online'].map(mode => (
                <button type="button" key={mode} onClick={() => setForm(f => ({ ...f, payment: mode }))} style={{
                  padding: '10px', borderRadius: '8px', border: `1px solid ${form.payment === mode ? '#c9a84c' : 'rgba(201,168,76,0.2)'}`,
                  background: form.payment === mode ? 'rgba(201,168,76,0.15)' : 'transparent',
                  color: form.payment === mode ? '#c9a84c' : '#c8b89a', fontSize: '13px', fontFamily: 'DM Sans'
                }}>
                  {mode === 'COD' ? '💵 Cash on Delivery' : '💳 Pay Online'}
                </button>
              ))}
            </div>
          </div>

          {/* Order summary */}
          <div style={{ background: 'rgba(201,168,76,0.05)', borderRadius: '10px', padding: '1rem', border: '1px solid rgba(201,168,76,0.1)' }}>
            {items.map(item => (
              <div key={item.cartKey} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#c8b89a', marginBottom: '4px' }}>
                <span>{item.name} × {item.qty}</span><span>₹{item.price * item.qty}</span>
              </div>
            ))}
            <div style={{ borderTop: '1px solid rgba(201,168,76,0.15)', marginTop: '0.75rem', paddingTop: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#c8b89a', marginBottom: '4px' }}>
                <span>Delivery</span><span style={{ color: deliveryFree ? '#27ae60' : '' }}>{deliveryFree ? 'FREE' : '₹50'}</span>
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
