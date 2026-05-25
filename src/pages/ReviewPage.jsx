import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { emailReviewNotification } from '../lib/emails'
import toast from 'react-hot-toast'

function CursorFollower() {
  useEffect(() => {
    const dot = document.getElementById('rv-cursor-dot')
    const ring = document.getElementById('rv-cursor-ring')
    if (!dot || !ring) return
    const move = e => {
      dot.style.left = e.clientX + 'px'; dot.style.top = e.clientY + 'px'
      ring.style.left = e.clientX + 'px'; ring.style.top = e.clientY + 'px'
    }
    window.addEventListener('mousemove', move)
    return () => window.removeEventListener('mousemove', move)
  }, [])
  return (
    <>
      <div id="rv-cursor-dot" className="cursor-dot" />
      <div id="rv-cursor-ring" className="cursor-ring" />
    </>
  )
}

export default function ReviewPage() {
  const [params] = useSearchParams()

  // Pre-filled from WhatsApp link params (optional)
  const urlOrderId = params.get('order') || ''
  const urlPhone = params.get('phone') || ''
  const urlName = params.get('name') || ''

  const [form, setForm] = useState({
    name: urlName,
    phone: urlPhone,
    orderId: urlOrderId,
    rating: 0,
    text: ''
  })
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [hoverRating, setHoverRating] = useState(0)
  const [alreadyReviewed, setAlreadyReviewed] = useState(false)

  // If came from WhatsApp link, check if already reviewed
  useEffect(() => {
    if (urlOrderId) {
      supabase.from('reviews').select('id').eq('order_id', urlOrderId).single()
        .then(({ data }) => { if (data) setAlreadyReviewed(true) })
    }
  }, [urlOrderId])

  async function submit(e) {
    e.preventDefault()

    // Validations
    if (!form.name.trim()) return toast.error('Please enter your name')
    if (!form.rating) return toast.error('Please select a star rating')
    if (!form.text.trim()) return toast.error('Please write something about your experience')

    setLoading(true)

    // Insert review — order_id and phone optional (person may not have them)
    const reviewData = {
      order_id: form.orderId.trim() || `DIRECT-${Date.now()}`,
      customer_name: form.name.trim(),
      phone: form.phone.trim() || 'not provided',
      rating: form.rating,
      text: form.text.trim(),
      visible: true
    }

    const { error } = await supabase.from('reviews').insert(reviewData)
    setLoading(false)

    if (error) {
      console.error('Review error:', error)
      toast.error('Could not submit. Please try again.')
      return
    }

    setSubmitted(true)
    toast.success('Thank you for your review! 🎉')

    // Notify restaurant
    emailReviewNotification(reviewData).catch(() => {})
  }

  const starLabels = ['', 'Poor 😕', 'Fair 😐', 'Good 🙂', 'Great 😊', 'Excellent! 🤩']

  const inputStyle = {
    width: '100%', background: 'rgba(201,168,76,0.05)',
    border: '1px solid rgba(201,168,76,0.2)', borderRadius: '8px',
    padding: '12px 14px', color: '#f5e6c8', fontFamily: 'DM Sans',
    fontSize: '14px', outline: 'none'
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0500', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', fontFamily: 'DM Sans' }}>
      <CursorFollower />

      <div style={{ width: '100%', maxWidth: '460px' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ fontFamily: 'Cormorant Garamond', fontSize: '32px', color: '#c9a84c', fontWeight: 700 }}>FeastWala</div>
          <p style={{ color: '#c8b89a', fontSize: '14px', marginTop: '4px' }}>Share your experience</p>
        </div>

        <div style={{ background: '#1a0a00', border: '1px solid rgba(201,168,76,0.2)', borderRadius: '16px', padding: '2rem' }}>

          {/* Already reviewed */}
          {alreadyReviewed ? (
            <div style={{ textAlign: 'center', padding: '1rem 0' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
              <h3 style={{ fontFamily: 'Cormorant Garamond', fontSize: '22px', color: '#f5e6c8', marginBottom: '0.75rem' }}>Already Reviewed!</h3>
              <p style={{ color: '#c8b89a', fontSize: '14px', lineHeight: 1.7 }}>You've already left a review for this order. Thank you so much!</p>
              <a href="/" style={{ display: 'inline-block', marginTop: '1.5rem', background: '#c9a84c', color: '#0a0500', borderRadius: '8px', padding: '12px 28px', fontWeight: 700, textDecoration: 'none', fontSize: '14px' }}>Order Again 🍽️</a>
            </div>

          ) : submitted ? (
            <div style={{ textAlign: 'center', padding: '1rem 0' }}>
              <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🙏</div>
              <h3 style={{ fontFamily: 'Cormorant Garamond', fontSize: '24px', color: '#f5e6c8', marginBottom: '0.75rem' }}>Thank You, {form.name}!</h3>
              <p style={{ color: '#c8b89a', fontSize: '14px', lineHeight: 1.7 }}>Your review has been submitted and will appear on our website. We truly appreciate your feedback!</p>
              <a href="/" style={{ display: 'inline-block', marginTop: '1.5rem', background: '#c9a84c', color: '#0a0500', borderRadius: '8px', padding: '12px 28px', fontWeight: 700, textDecoration: 'none', fontSize: '14px' }}>Order Again 🍽️</a>
            </div>

          ) : (
            <>
              <h3 style={{ fontFamily: 'Cormorant Garamond', fontSize: '22px', color: '#f5e6c8', marginBottom: '1.5rem' }}>
                {urlOrderId ? `Rate Your Order #${urlOrderId}` : 'Rate Your Experience'}
              </h3>

              <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>

                {/* Name — always editable, pre-filled from URL if available */}
                <div>
                  <p style={{ color: '#c8b89a', fontSize: '11px', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '6px' }}>Your Name *</p>
                  <input
                    placeholder="Enter your name"
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    style={inputStyle}
                  />
                </div>

                {/* Phone — pre-filled if from link, but editable */}
                {!urlPhone && (
                  <div>
                    <p style={{ color: '#c8b89a', fontSize: '11px', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '6px' }}>Phone Number (optional)</p>
                    <input
                      placeholder="Your order phone number"
                      type="tel"
                      value={form.phone}
                      onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                      style={inputStyle}
                    />
                  </div>
                )}

                {/* Order ID — pre-filled if from link */}
                {!urlOrderId && (
                  <div>
                    <p style={{ color: '#c8b89a', fontSize: '11px', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '6px' }}>Order ID (optional)</p>
                    <input
                      placeholder="e.g. FW12345678 (from your WhatsApp receipt)"
                      value={form.orderId}
                      onChange={e => setForm(f => ({ ...f, orderId: e.target.value }))}
                      style={inputStyle}
                    />
                  </div>
                )}

                {/* Star rating */}
                <div>
                  <p style={{ color: '#c8b89a', fontSize: '11px', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '10px' }}>Your Rating *</p>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginBottom: '8px' }}>
                    {[1, 2, 3, 4, 5].map(star => (
                      <button key={star} type="button"
                        onClick={() => setForm(f => ({ ...f, rating: star }))}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        style={{
                          fontSize: '38px', background: 'none', border: 'none',
                          color: star <= (hoverRating || form.rating) ? '#c9a84c' : 'rgba(201,168,76,0.2)',
                          transition: 'color 0.15s, transform 0.15s',
                          transform: star <= (hoverRating || form.rating) ? 'scale(1.2)' : 'scale(1)'
                        }}>
                        ★
                      </button>
                    ))}
                  </div>
                  {(hoverRating || form.rating) > 0 && (
                    <p style={{ textAlign: 'center', color: '#c9a84c', fontSize: '14px', fontWeight: 600 }}>
                      {starLabels[hoverRating || form.rating]}
                    </p>
                  )}
                </div>

                {/* Review text */}
                <div>
                  <p style={{ color: '#c8b89a', fontSize: '11px', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '6px' }}>Your Review *</p>
                  <textarea
                    placeholder="Tell us about your experience — the food quality, delivery speed, packaging..."
                    rows={4}
                    value={form.text}
                    onChange={e => setForm(f => ({ ...f, text: e.target.value }))}
                    style={{ ...inputStyle, resize: 'vertical' }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || !form.rating}
                  style={{
                    background: form.rating ? '#c9a84c' : 'rgba(201,168,76,0.25)',
                    color: '#0a0500', border: 'none', borderRadius: '10px',
                    padding: '14px', fontWeight: 700, fontSize: '15px',
                    fontFamily: 'DM Sans', opacity: loading ? 0.7 : 1,
                    transition: 'background 0.2s'
                  }}>
                  {loading ? 'Submitting...' : 'Submit Review ⭐'}
                </button>

              </form>
            </>
          )}
        </div>

        <p style={{ textAlign: 'center', color: '#5a4a35', fontSize: '12px', marginTop: '1.5rem' }}>
          <a href="/" style={{ color: '#c9a84c', textDecoration: 'none' }}>← Back to FeastWala</a>
        </p>
      </div>
    </div>
  )
}
