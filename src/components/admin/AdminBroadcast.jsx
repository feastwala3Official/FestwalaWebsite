import { useState, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'

const TEMPLATES = {
  custom: '',
  offer: 'Hi {name}! 🍽️ Special offer at FeastWala today — get 20% off on all thalis! Order now and save. Valid today only.',
  newitem: 'Hi {name}! We just added something delicious to our menu at FeastWala 🎉 Come try it!',
  festive: 'Hi {name}! Wishing you a wonderful celebration from the FeastWala family 🎊 Enjoy a special festive meal with us!',
  winback: 'Hi {name}! We miss you at FeastWala 😊 It\'s been a while — come back and enjoy your favourite meal!'
}

export default function AdminBroadcast({ orders }) {
  const [segment, setSegment] = useState('all')
  const [template, setTemplate] = useState('custom')
  const [message, setMessage] = useState('')
  const [history, setHistory] = useState([])

  const customers = useMemo(() => {
    const map = {}
    orders.forEach(o => {
      if (!o.phone) return
      if (!map[o.phone]) map[o.phone] = { name: o.customer_name, phone: o.phone, orders: 0, last: o.created_at }
      map[o.phone].orders++
      if (new Date(o.created_at) > new Date(map[o.phone].last)) map[o.phone].last = o.created_at
    })
    return Object.values(map)
  }, [orders])

  const segmented = useMemo(() => {
    const now = new Date()
    if (segment === 'all') return customers
    if (segment === 'repeat') return customers.filter(c => c.orders >= 2)
    if (segment === 'vip') return customers.filter(c => c.orders >= 5)
    if (segment === 'recent') return customers.filter(c => (now - new Date(c.last)) < 7*24*60*60*1000)
    if (segment === 'lapsed') return customers.filter(c => (now - new Date(c.last)) > 14*24*60*60*1000)
    return customers
  }, [customers, segment])

  function applyTemplate(t) {
    setTemplate(t)
    setMessage(TEMPLATES[t])
  }

  async function send() {
    if (!message) return toast.error('Write a message first')
    if (!segmented.length) return toast.error('No customers in this segment')
    if (!confirm(`Send to ${segmented.length} customers?`)) return

    segmented.forEach((c, i) => {
      setTimeout(() => {
        const msg = message.replace('{name}', c.name)
        window.open(`https://wa.me/91${c.phone}?text=${encodeURIComponent(msg)}`, '_blank')
      }, i * 800)
    })

    await supabase.from('broadcast_history').insert({ segment, message, recipient_count: segmented.length })
    setHistory(h => [{ segment, message, recipient_count: segmented.length, sent_at: new Date().toISOString() }, ...h])
    toast.success(`Broadcast started for ${segmented.length} customers`)
  }

  return (
    <div style={{ maxWidth: '700px' }}>
      <h3 style={{ fontFamily: 'Cormorant Garamond', fontSize: '24px', color: '#f5e6c8', marginBottom: '2rem' }}>Broadcast Messages</h3>

      {/* Segment */}
      <div style={{ marginBottom: '1.5rem' }}>
        <p style={{ color: '#c8b89a', fontSize: '12px', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>Customer Segment</p>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {[['all','All Customers'],['repeat','Repeat (2+)'],['vip','VIP (5+)'],['recent','Recent (7d)'],['lapsed','Lapsed (14d+)']].map(([val, label]) => (
            <button key={val} onClick={() => setSegment(val)} style={{
              padding: '8px 16px', borderRadius: '20px', fontSize: '13px', fontFamily: 'DM Sans',
              border: segment === val ? 'none' : '1px solid rgba(201,168,76,0.2)',
              background: segment === val ? '#c9a84c' : 'transparent',
              color: segment === val ? '#0a0500' : '#c8b89a'
            }}>{label}</button>
          ))}
        </div>
        <p style={{ color: '#c9a84c', fontSize: '13px', marginTop: '0.5rem' }}>{segmented.length} customers selected</p>
      </div>

      {/* Templates */}
      <div style={{ marginBottom: '1.5rem' }}>
        <p style={{ color: '#c8b89a', fontSize: '12px', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>Template</p>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {Object.keys(TEMPLATES).map(t => (
            <button key={t} onClick={() => applyTemplate(t)} style={{
              padding: '7px 14px', borderRadius: '6px', fontSize: '12px', fontFamily: 'DM Sans', textTransform: 'capitalize',
              border: template === t ? 'none' : '1px solid rgba(201,168,76,0.2)',
              background: template === t ? 'rgba(201,168,76,0.2)' : 'transparent',
              color: template === t ? '#c9a84c' : '#c8b89a'
            }}>{t}</button>
          ))}
        </div>
      </div>

      {/* Message */}
      <textarea value={message} onChange={e => setMessage(e.target.value)} rows={5} placeholder="Write your message... Use {name} to personalise"
        style={{ width: '100%', background: 'rgba(201,168,76,0.05)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: '10px', padding: '14px', color: '#f5e6c8', fontFamily: 'DM Sans', fontSize: '14px', resize: 'vertical', marginBottom: '1rem' }} />

      <button onClick={send} style={{ background: '#c9a84c', border: 'none', borderRadius: '8px', padding: '13px 32px', color: '#0a0500', fontWeight: 700, fontSize: '15px', fontFamily: 'DM Sans', marginBottom: '3rem' }}>
        📱 Send to {segmented.length} customers
      </button>

      {/* History */}
      {history.length > 0 && (
        <div>
          <h4 style={{ color: '#f5e6c8', fontFamily: 'Cormorant Garamond', fontSize: '20px', marginBottom: '1rem' }}>Sent History</h4>
          {history.map((h, i) => (
            <div key={i} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(201,168,76,0.08)', borderRadius: '8px', padding: '1rem', marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                <span style={{ color: '#c9a84c', fontSize: '12px', textTransform: 'capitalize' }}>{h.segment} · {h.recipient_count} sent</span>
                <span style={{ color: '#8a7a65', fontSize: '12px' }}>{new Date(h.sent_at).toLocaleString('en-IN')}</span>
              </div>
              <p style={{ color: '#c8b89a', fontSize: '13px' }}>{h.message.slice(0, 80)}...</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
