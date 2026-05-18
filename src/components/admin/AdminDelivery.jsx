import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'

export default function AdminDelivery({ orders }) {
  const [partners, setPartners] = useState([])
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ name: '', phone: '', vehicle: 'bike', zone: 'all' })

  useEffect(() => { loadPartners() }, [])

  async function loadPartners() {
    const { data } = await supabase.from('delivery_partners').select('*').order('created_at')
    if (data) setPartners(data)
  }

  async function addPartner(e) {
    e.preventDefault()
    const { data, error } = await supabase.from('delivery_partners').insert(form).select().single()
    if (!error) { setPartners(p => [...p, data]); setShowAdd(false); setForm({ name: '', phone: '', vehicle: 'bike', zone: 'all' }); toast.success('Partner added') }
  }

  async function toggleStatus(p) {
    const next = p.status === 'available' ? 'busy' : p.status === 'busy' ? 'off_duty' : 'available'
    const { error } = await supabase.from('delivery_partners').update({ status: next }).eq('id', p.id)
    if (!error) setPartners(prev => prev.map(x => x.id === p.id ? { ...x, status: next } : x))
  }

  const pending = orders.filter(o => o.status === 'accepted')
  const statusColors = { available: '#27ae60', busy: '#e67e22', off_duty: '#c0392b' }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h3 style={{ fontFamily: 'Cormorant Garamond', fontSize: '24px', color: '#f5e6c8' }}>Delivery Partners</h3>
        <button onClick={() => setShowAdd(true)} style={{ background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.3)', borderRadius: '8px', padding: '8px 16px', color: '#c9a84c', fontSize: '13px', fontFamily: 'DM Sans' }}>+ Add Partner</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {partners.map(p => (
          <div key={p.id} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(201,168,76,0.1)', borderRadius: '12px', padding: '1.2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <div>
                <p style={{ color: '#f5e6c8', fontWeight: 600 }}>{p.name}</p>
                <p style={{ color: '#8a7a65', fontSize: '12px' }}>{p.phone} · {p.vehicle}</p>
              </div>
              <button onClick={() => toggleStatus(p)} style={{ background: statusColors[p.status] + '22', color: statusColors[p.status], border: `1px solid ${statusColors[p.status]}44`, borderRadius: '20px', padding: '4px 12px', fontSize: '11px', fontWeight: 600, textTransform: 'capitalize', fontFamily: 'DM Sans' }}>
                {p.status.replace('_', ' ')}
              </button>
            </div>
            {pending.length > 0 && p.status === 'available' && (
              <select onChange={e => {
                if (!e.target.value) return
                const order = pending.find(o => o.id === e.target.value)
                window.open(`https://wa.me/91${p.phone}?text=${encodeURIComponent(`Hi ${p.name}! Please pick up order ${order?.order_id} for ${order?.customer_name} at ${order?.address}`)}`, '_blank')
              }} style={{ width: '100%', background: '#110800', border: '1px solid rgba(201,168,76,0.2)', borderRadius: '6px', padding: '8px', color: '#c8b89a', fontFamily: 'DM Sans', fontSize: '12px' }}>
                <option value="">Assign order...</option>
                {pending.map(o => <option key={o.id} value={o.id}>{o.order_id} — {o.customer_name}</option>)}
              </select>
            )}
          </div>
        ))}
        {partners.length === 0 && <p style={{ color: '#8a7a65', fontSize: '14px' }}>No partners added yet</p>}
      </div>

      {showAdd && (
        <>
          <div onClick={() => setShowAdd(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000 }} />
          <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', background: '#1a0a00', border: '1px solid rgba(201,168,76,0.25)', borderRadius: '16px', padding: '2rem', zIndex: 1001, width: '360px', maxWidth: '95vw' }}>
            <h3 style={{ fontFamily: 'Cormorant Garamond', fontSize: '22px', color: '#f5e6c8', marginBottom: '1.5rem' }}>Add Partner</h3>
            <form onSubmit={addPartner} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {[['name','Name *'],['phone','Phone *']].map(([field, label]) => (
                <input key={field} placeholder={label} value={form[field]} onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
                  style={{ background: 'rgba(201,168,76,0.05)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: '8px', padding: '10px 14px', color: '#f5e6c8', fontFamily: 'DM Sans', fontSize: '14px' }} />
              ))}
              <select value={form.vehicle} onChange={e => setForm(f => ({ ...f, vehicle: e.target.value }))}
                style={{ background: '#1a0a00', border: '1px solid rgba(201,168,76,0.2)', borderRadius: '8px', padding: '10px 14px', color: '#c8b89a', fontFamily: 'DM Sans', fontSize: '14px' }}>
                <option value="bike">Bike</option><option value="cycle">Cycle</option><option value="walk">Walk</option>
              </select>
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setShowAdd(false)} style={{ flex: 1, background: 'none', border: '1px solid rgba(201,168,76,0.2)', borderRadius: '8px', padding: '11px', color: '#c8b89a', fontFamily: 'DM Sans' }}>Cancel</button>
                <button type="submit" style={{ flex: 1, background: '#c9a84c', border: 'none', borderRadius: '8px', padding: '11px', color: '#0a0500', fontWeight: 600, fontFamily: 'DM Sans' }}>Add</button>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  )
}
