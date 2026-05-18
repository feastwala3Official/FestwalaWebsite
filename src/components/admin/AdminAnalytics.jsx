// AdminAnalytics.jsx
import { useMemo } from 'react'

export default function AdminAnalytics({ orders }) {
  const stats = useMemo(() => {
    const today = new Date(); today.setHours(0,0,0,0)
    const todayOrders = orders.filter(o => new Date(o.created_at) >= today)
    const revenue = orders.filter(o => o.status === 'delivered').reduce((s,o) => s + (o.total||0), 0)
    const todayRevenue = todayOrders.filter(o => o.status === 'delivered').reduce((s,o) => s + (o.total||0), 0)
    const avgOrder = orders.length ? Math.round(orders.reduce((s,o) => s + (o.total||0), 0) / orders.length) : 0

    // Items frequency
    const itemFreq = {}
    orders.forEach(o => {
      const items = Array.isArray(o.items) ? o.items : []
      items.forEach(i => { itemFreq[i.name] = (itemFreq[i.name] || 0) + i.qty })
    })
    const topItems = Object.entries(itemFreq).sort((a,b) => b[1]-a[1]).slice(0,8)

    // Status breakdown
    const statuses = ['pending','accepted','dispatched','delivered','cancelled']
    const statusCounts = statuses.map(s => ({ label: s, count: orders.filter(o => o.status === s).length }))

    return { todayOrders: todayOrders.length, todayRevenue, revenue, avgOrder, topItems, statusCounts }
  }, [orders])

  const card = (label, val, sub) => (
    <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(201,168,76,0.1)', borderRadius: '12px', padding: '1.5rem' }}>
      <p style={{ color: '#c8b89a', fontSize: '12px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{label}</p>
      <p style={{ fontFamily: 'Cormorant Garamond', fontSize: '32px', color: '#c9a84c', fontWeight: 700, marginTop: '4px' }}>{val}</p>
      {sub && <p style={{ color: '#8a7a65', fontSize: '12px', marginTop: '4px' }}>{sub}</p>}
    </div>
  )

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {card('Today Orders', stats.todayOrders)}
        {card('Today Revenue', `₹${stats.todayRevenue}`)}
        {card('Total Revenue', `₹${stats.revenue}`, 'Delivered orders only')}
        {card('Avg Order Value', `₹${stats.avgOrder}`)}
        {card('Total Orders', orders.length)}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        {/* Status breakdown */}
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(201,168,76,0.1)', borderRadius: '12px', padding: '1.5rem' }}>
          <h4 style={{ color: '#f5e6c8', fontFamily: 'Cormorant Garamond', fontSize: '20px', marginBottom: '1.2rem' }}>Order Status</h4>
          {stats.statusCounts.map(({ label, count }) => {
            const pct = orders.length ? Math.round(count/orders.length*100) : 0
            const colors = { pending: '#e67e22', accepted: '#3498db', dispatched: '#9b59b6', delivered: '#27ae60', cancelled: '#c0392b' }
            return (
              <div key={label} style={{ marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#c8b89a', marginBottom: '4px' }}>
                  <span style={{ textTransform: 'capitalize' }}>{label}</span><span>{count} ({pct}%)</span>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '4px', height: '6px' }}>
                  <div style={{ background: colors[label], height: '100%', borderRadius: '4px', width: `${pct}%`, transition: 'width 0.5s' }} />
                </div>
              </div>
            )
          })}
        </div>

        {/* Top items */}
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(201,168,76,0.1)', borderRadius: '12px', padding: '1.5rem' }}>
          <h4 style={{ color: '#f5e6c8', fontFamily: 'Cormorant Garamond', fontSize: '20px', marginBottom: '1.2rem' }}>Top Items</h4>
          {stats.topItems.length === 0 ? <p style={{ color: '#8a7a65', fontSize: '13px' }}>No orders yet</p> : stats.topItems.map(([name, count], i) => (
            <div key={name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid rgba(201,168,76,0.06)' }}>
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                <span style={{ color: '#c9a84c', fontSize: '12px', width: '20px' }}>#{i+1}</span>
                <span style={{ color: '#f5e6c8', fontSize: '13px' }}>{name}</span>
              </div>
              <span style={{ color: '#c9a84c', fontWeight: 600 }}>{count} sold</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
