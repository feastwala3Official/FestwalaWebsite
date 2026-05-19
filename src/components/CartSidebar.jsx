import { useCart } from '../context/CartContext'

export default function CartSidebar({ onCheckout }) {
  const { items, open, closeCart, subtotal, deliveryFree, grandTotal, updateQty, removeItem } = useCart()

  const threshold = 269
  const toFree = Math.max(threshold - subtotal, 0)
  const progress = Math.min((subtotal / threshold) * 100, 100)

  // Calculate total savings (original price vs discounted price)
  const totalSaved = items.reduce((sum, item) => {
    if (item.originalPrice && item.originalPrice > item.price) {
      return sum + (item.originalPrice - item.price) * item.qty
    }
    return sum
  }, 0)

  if (!open) return null

  return (
    <>
      <div onClick={closeCart} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 900, backdropFilter: 'blur(4px)' }} />
      <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: '390px', maxWidth: '95vw', background: '#1a0a00', borderLeft: '1px solid rgba(201,168,76,0.2)', zIndex: 901, display: 'flex', flexDirection: 'column', animation: 'slideInRight 0.28s cubic-bezier(0.22,1,0.36,1)' }}>

        {/* Header */}
        <div style={{ padding: '1.5rem', borderBottom: '1px solid rgba(201,168,76,0.15)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ fontFamily: 'Cormorant Garamond', fontSize: '22px', color: '#f5e6c8' }}>Your Cart</h3>
            {items.length > 0 && <p style={{ color: '#8a7a65', fontSize: '12px', marginTop: '2px' }}>{items.reduce((s,i) => s+i.qty, 0)} items</p>}
          </div>
          <button onClick={closeCart} style={{ background: 'none', border: 'none', color: '#c8b89a', fontSize: '22px' }}>✕</button>
        </div>

        {/* Savings banner */}
        {totalSaved > 0 && (
          <div style={{ padding: '0.75rem 1.5rem', background: 'rgba(39,174,96,0.1)', borderBottom: '1px solid rgba(39,174,96,0.15)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '16px' }}>🎉</span>
            <span style={{ color: '#27ae60', fontSize: '13px', fontWeight: 600 }}>You're saving ₹{totalSaved} on this order!</span>
          </div>
        )}

        {/* Free delivery progress */}
        <div style={{ padding: '0.9rem 1.5rem', background: 'rgba(201,168,76,0.04)', borderBottom: '1px solid rgba(201,168,76,0.08)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#c8b89a', marginBottom: '6px' }}>
            <span>{deliveryFree ? '🎉 Free delivery unlocked!' : `Add ₹${toFree} more for free delivery`}</span>
            <span style={{ color: '#c9a84c' }}>{Math.round(progress)}%</span>
          </div>
          <div style={{ background: 'rgba(201,168,76,0.15)', borderRadius: '4px', height: '4px' }}>
            <div style={{ background: deliveryFree ? '#27ae60' : '#c9a84c', height: '100%', borderRadius: '4px', width: `${progress}%`, transition: 'width 0.45s cubic-bezier(0.22,1,0.36,1)' }} />
          </div>
        </div>

        {/* Items */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem 1.5rem' }}>
          {items.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 0', color: '#c8b89a' }}>
              <div style={{ fontSize: '3.5rem', marginBottom: '1rem', animation: 'floatUp 3s ease-in-out infinite' }}>🍽️</div>
              <p style={{ fontSize: '16px' }}>Your cart is empty</p>
              <p style={{ fontSize: '13px', marginTop: '0.5rem', color: '#8a7a65' }}>Add items from the menu</p>
            </div>
          ) : items.map(item => (
            <div key={item.cartKey} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem 0', borderBottom: '1px solid rgba(201,168,76,0.07)' }}>
              <div style={{ flex: 1 }}>
                <p style={{ color: '#f5e6c8', fontSize: '14px', fontWeight: 500, lineHeight: 1.3 }}>{item.name}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '3px' }}>
                  {item.originalPrice && item.originalPrice > item.price && (
                    <span style={{ color: '#8a7a65', fontSize: '12px', textDecoration: 'line-through' }}>₹{item.originalPrice * item.qty}</span>
                  )}
                  <span style={{ color: '#c9a84c', fontSize: '13px', fontWeight: 600 }}>₹{item.price * item.qty}</span>
                  {item.originalPrice && item.originalPrice > item.price && (
                    <span style={{ background: 'rgba(39,174,96,0.15)', color: '#27ae60', fontSize: '10px', padding: '1px 6px', borderRadius: '4px', fontWeight: 600 }}>
                      SAVE ₹{(item.originalPrice - item.price) * item.qty}
                    </span>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button onClick={() => updateQty(item.cartKey, item.qty - 1)} style={{ width: '28px', height: '28px', borderRadius: '6px', background: 'rgba(201,168,76,0.12)', border: 'none', color: '#c9a84c', fontSize: '18px', lineHeight: 1 }}>−</button>
                <span style={{ color: '#f5e6c8', minWidth: '22px', textAlign: 'center', fontSize: '14px', fontWeight: 600 }}>{item.qty}</span>
                <button onClick={() => updateQty(item.cartKey, item.qty + 1)} style={{ width: '28px', height: '28px', borderRadius: '6px', background: 'rgba(201,168,76,0.12)', border: 'none', color: '#c9a84c', fontSize: '18px', lineHeight: 1 }}>+</button>
                <button onClick={() => removeItem(item.cartKey)} style={{ width: '28px', height: '28px', borderRadius: '6px', background: 'rgba(192,57,43,0.12)', border: 'none', color: '#c0392b', fontSize: '14px' }}>✕</button>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div style={{ padding: '1.2rem 1.5rem', borderTop: '1px solid rgba(201,168,76,0.15)' }}>
            {totalSaved > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', fontSize: '13px' }}>
                <span style={{ color: '#27ae60' }}>🎉 Total Discount</span>
                <span style={{ color: '#27ae60', fontWeight: 600 }}>−₹{totalSaved}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', color: '#c8b89a', fontSize: '13px' }}>
              <span>Subtotal</span><span>₹{subtotal}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', color: '#c8b89a', fontSize: '13px' }}>
              <span>Delivery</span>
              <span style={{ color: deliveryFree ? '#27ae60' : '#c8b89a' }}>{deliveryFree ? 'FREE' : '₹50'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.2rem', color: '#f5e6c8', fontWeight: 700, fontSize: '17px' }}>
              <span>Total</span><span style={{ color: '#c9a84c' }}>₹{grandTotal}</span>
            </div>
            <button onClick={onCheckout} style={{ width: '100%', background: '#c9a84c', color: '#0a0500', border: 'none', borderRadius: '10px', padding: '15px', fontWeight: 700, fontSize: '16px', transition: 'transform 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
              Proceed to Checkout →
            </button>
          </div>
        )}
      </div>
    </>
  )
}
