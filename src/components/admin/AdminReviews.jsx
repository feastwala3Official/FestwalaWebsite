import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'

const STARS = [1,2,3,4,5]

export default function AdminReviews() {
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    load()
    const sub = supabase.channel('reviews-admin')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'reviews' }, payload => {
        setReviews(prev => [payload.new, ...prev])
        toast.success('New review received! ⭐')
      })
      .subscribe()
    return () => supabase.removeChannel(sub)
  }, [])

  async function load() {
    const { data } = await supabase.from('reviews').select('*').order('created_at', { ascending: false })
    if (data) setReviews(data)
    setLoading(false)
  }

  async function toggleVisible(review) {
    const { error } = await supabase.from('reviews').update({ visible: !review.visible }).eq('id', review.id)
    if (!error) setReviews(prev => prev.map(r => r.id === review.id ? { ...r, visible: !r.visible } : r))
  }

  async function deleteReview(id) {
    if (!confirm('Delete this review permanently?')) return
    const { error } = await supabase.from('reviews').delete().eq('id', id)
    if (!error) { setReviews(prev => prev.filter(r => r.id !== id)); toast.success('Review deleted') }
  }

  const avg = reviews.length ? (reviews.reduce((s,r) => s + r.rating, 0) / reviews.length).toFixed(1) : '—'
  const visible = reviews.filter(r => r.visible).length

  if (loading) return <div style={{ color: '#c8b89a', padding: '2rem' }}>Loading...</div>

  return (
    <div>
      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
        {[['Total', reviews.length], ['Visible', visible], ['Hidden', reviews.length - visible], ['Avg Rating', avg + ' ⭐']].map(([label, val]) => (
          <div key={label} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(201,168,76,0.1)', borderRadius: '12px', padding: '1.2rem', textAlign: 'center' }}>
            <p style={{ fontFamily: 'Cormorant Garamond', fontSize: '28px', color: '#c9a84c', fontWeight: 700 }}>{val}</p>
            <p style={{ color: '#c8b89a', fontSize: '12px', marginTop: '4px' }}>{label}</p>
          </div>
        ))}
      </div>

      {reviews.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: '#8a7a65' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⭐</div>
          <p>No reviews yet. When orders are delivered, customers can leave reviews.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {reviews.map(r => (
            <div key={r.id} style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${r.visible ? 'rgba(201,168,76,0.1)' : 'rgba(192,57,43,0.2)'}`, borderRadius: '12px', padding: '1.2rem', opacity: r.visible ? 1 : 0.6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.3rem' }}>
                    <p style={{ color: '#f5e6c8', fontWeight: 600 }}>{r.customer_name}</p>
                    <span style={{ color: '#c9a84c', fontSize: '16px' }}>{'★'.repeat(r.rating)}{'☆'.repeat(5-r.rating)}</span>
                    {!r.visible && <span style={{ background: 'rgba(192,57,43,0.2)', color: '#c0392b', fontSize: '10px', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>HIDDEN</span>}
                  </div>
                  <p style={{ color: '#8a7a65', fontSize: '12px' }}>Order: {r.order_id} · {r.phone} · {new Date(r.created_at).toLocaleDateString('en-IN')}</p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button onClick={() => toggleVisible(r)} style={{ padding: '6px 12px', borderRadius: '6px', border: `1px solid ${r.visible ? 'rgba(192,57,43,0.3)' : 'rgba(39,174,96,0.3)'}`, background: 'transparent', color: r.visible ? '#c0392b' : '#27ae60', fontSize: '12px', fontFamily: 'DM Sans' }}>
                    {r.visible ? 'Hide' : 'Show'}
                  </button>
                  <button onClick={() => deleteReview(r.id)} style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid rgba(192,57,43,0.3)', background: 'transparent', color: '#c0392b', fontSize: '12px' }}>🗑 Delete</button>
                </div>
              </div>
              <p style={{ color: '#c8b89a', fontSize: '14px', lineHeight: 1.6, marginTop: '0.75rem', fontStyle: 'italic' }}>"{r.text}"</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
