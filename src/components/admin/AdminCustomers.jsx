import { useMemo } from 'react'

export default function AdminCustomers({ orders }) {
  const customers = useMemo(() => {
    const map = {}
    orders.forEach(o => {
      if (!o.phone) return
      if (!map[o.phone]) map[o.phone] = { name: o.customer_name, phone: o.phone, orders: 0, spent: 0, last: o.created_at }
      map[o.phone].orders++
      map[o.phone].spent += o.total || 0
      if (new Date(o.created_at) > new Date(map[o.phone].last)) map[o.phone].last = o.created_at
    })
    return Object.values(map).sort((a,b) => b.spent - a.spent)
  }, [orders])

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
        {[['Total Customers', customers.length], ['VIP (5+ orders)', customers.filter(c => c.orders >= 5).length], ['Repeat (2+)', customers.filter(c => c.orders >= 2).length]].map(([label, val]) => (
          <div key={label} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(201,168,76,0.1)', borderRadius: '12px', padding: '1.2rem', textAlign: 'center' }}>
            <p style={{ fontFamily: 'Cormorant Garamond', fontSize: '32px', color: '#c9a84c', fontWeight: 700 }}>{val}</p>
            <p style={{ color: '#c8b89a', fontSize: '12px', marginTop: '4px' }}>{label}</p>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' }}>
        {customers.map(c => (
          <div key={c.phone} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(201,168,76,0.1)', borderRadius: '12px', padding: '1.2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
              <div>
                <p style={{ color: '#f5e6c8', fontWeight: 600 }}>{c.name}</p>
                <p style={{ color: '#8a7a65', fontSize: '12px' }}>{c.phone}</p>
              </div>
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                {c.orders >= 5 && <span style={{ background: 'rgba(201,168,76,0.2)', color: '#c9a84c', fontSize: '10px', padding: '2px 8px', borderRadius: '10px', fontWeight: 600 }}>VIP</span>}
                {c.orders >= 2 && c.orders < 5 && <span style={{ background: 'rgba(52,152,219,0.2)', color: '#3498db', fontSize: '10px', padding: '2px 8px', borderRadius: '10px', fontWeight: 600 }}>Repeat</span>}
                {c.orders < 2 && <span style={{ background: 'rgba(39,174,96,0.15)', color: '#27ae60', fontSize: '10px', padding: '2px 8px', borderRadius: '10px', fontWeight: 600 }}>New</span>}
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', marginBottom: '0.75rem' }}>
              {[['Orders', c.orders], ['Spent', `₹${c.spent}`], ['Avg', `₹${Math.round(c.spent/c.orders)}`]].map(([label, val]) => (
                <div key={label} style={{ textAlign: 'center', background: 'rgba(0,0,0,0.2)', borderRadius: '6px', padding: '6px' }}>
                  <p style={{ color: '#c9a84c', fontSize: '14px', fontWeight: 600 }}>{val}</p>
                  <p style={{ color: '#8a7a65', fontSize: '10px' }}>{label}</p>
                </div>
              ))}
            </div>
            <button onClick={() => window.open(`https://wa.me/91${c.phone}?text=${encodeURIComponent(`Hi ${c.name}! Thanks for ordering from FeastWala 🍽️`)}`, '_blank')}
              style={{ width: '100%', background: 'rgba(37,211,102,0.1)', border: '1px solid rgba(37,211,102,0.3)', borderRadius: '6px', padding: '8px', color: '#25d366', fontSize: '12px', fontFamily: 'DM Sans' }}>
              📱 WhatsApp
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
