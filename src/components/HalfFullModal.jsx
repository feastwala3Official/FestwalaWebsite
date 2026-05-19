export default function HalfFullModal({ item, onSelect, onClose }) {
  // item already has discounted prices applied from getDiscountedItem()
  // originalHalfPrice / originalFullPrice are the pre-discount prices
  const hasDiscount = item.discountPct > 0

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, backdropFilter: 'blur(4px)' }} />
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        background: '#1a0a00', border: '1px solid rgba(201,168,76,0.3)', borderRadius: '16px',
        padding: '2rem', zIndex: 1001, width: '340px', maxWidth: '90vw', textAlign: 'center',
        animation: 'fadeUp 0.3s ease'
      }}>
        {hasDiscount && (
          <div style={{ marginBottom: '0.75rem' }}>
            <span style={{ background: '#c0392b', color: 'white', fontSize: '11px', padding: '3px 10px', borderRadius: '10px', fontWeight: 700 }}>
              🔥 {item.discountPct}% OFF Applied
            </span>
          </div>
        )}
        <h3 style={{ fontFamily: 'Cormorant Garamond', fontSize: '22px', color: '#f5e6c8', marginBottom: '0.5rem' }}>{item.name}</h3>
        <p style={{ color: '#c8b89a', fontSize: '13px', marginBottom: '1.5rem' }}>Choose your portion size</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          {[['Half', item.half_price, item.originalHalfPrice], ['Full', item.full_price, item.originalFullPrice]].map(([variant, price, origPrice]) => (
            <button key={variant} onClick={() => onSelect(item, variant)} style={{
              background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.3)',
              borderRadius: '12px', padding: '1.2rem', color: '#f5e6c8', transition: 'all 0.2s'
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#c9a84c'; e.currentTarget.style.color = '#0a0500' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(201,168,76,0.08)'; e.currentTarget.style.color = '#f5e6c8' }}>
              <div style={{ fontFamily: 'Cormorant Garamond', fontSize: '18px', fontWeight: 600 }}>{variant}</div>
              {hasDiscount && origPrice && (
                <div style={{ fontSize: '13px', textDecoration: 'line-through', color: '#8a7a65', marginTop: '4px' }}>₹{origPrice}</div>
              )}
              <div style={{ fontSize: '22px', fontWeight: 700, marginTop: hasDiscount ? '2px' : '4px', color: hasDiscount ? '#c9a84c' : 'inherit' }}>₹{price}</div>
            </button>
          ))}
        </div>
        <button onClick={onClose} style={{ marginTop: '1.2rem', background: 'none', border: 'none', color: '#c8b89a', fontSize: '13px', textDecoration: 'underline' }}>Cancel</button>
      </div>
    </>
  )
}
