import { useCart } from '../context/CartContext'

export default function CartSidebar({ onCheckout }) {
  const { items, open, closeCart, subtotal, deliveryFree, grandTotal, updateQty, removeItem } = useCart()

  const toFree = 269 - subtotal
  const progress = Math.min((subtotal / 269) * 100, 100)

  if (!open) return null

  return (
    <>
      <div onClick={closeCart} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 900, backdropFilter: 'blur(4px)' }} />
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: '380px', maxWidth: '95vw',
        background: '#1a0a00', borderLeft: '1px solid rgba(201,168,76,0.2)',
        zIndex: 901, display: 'flex', flexDirection: 'column', animation: 'fadeIn 0.25s ease'
      }}>
        {/* Header */}
        <div style={{ padding: '1.5rem', borderBottom: '1px solid rgba(201,168,76,0.15)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontFamily: 'Cormorant Garamond', fontSize: '22px', color: '#f5e6c8' }}>Your Cart</h3>
          <button onClick={closeCart} style={{ background: 'none', border: 'none', color: '#c8b89a', fontSize: '22px' }}>✕</button>
        </div>

        {/* Free delivery bar */}
        <div style={{ padding: '1rem 1.5rem', background: 'rgba(201,168,76,0.05)', borderBottom: '1px solid rgba(201,168,76,0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#c8b89a', marginBottom: '6px' }}>
            <span>{deliveryFree ? '🎉 Free delivery unlocked!' : `Add ₹${toFree} more for free delivery`}</span>
            <span style={{ color: '#c9a84c' }}>{Math.round(progress)}%</span>
          </div>
          <div style={{ background: 'rgba(201,168,76,0.15)', borderRadius: '4px', height: '4px' }}>
            <div style={{ background: '#c9a84c', height: '100%', borderRadius: '4px', width: `${progress}%`, transition: 'width 0.4s ease' }} />
          </div>
        </div>

        {/* Items */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem 1.5rem' }}>
          {items.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 0', color: '#c8b89a' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🍽️</div>
              <p>Your cart is empty</p>
              <p style={{ fontSize: '13px', marginTop: '0.5rem' }}>Add items from the menu</p>
            </div>
          ) : (
            items.map(item => (
              <div key={item.cartKey} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem 0', borderBottom: '1px solid rgba(201,168,76,0.08)' }}>
                <div style={{ flex: 1 }}>
                  <p style={{ color: '#f5e6c8', fontSize: '14px', fontWeight: 500 }}>{item.name}</p>
                  <p style={{ color: '#c9a84c', fontSize: '13px', marginTop: '2px' }}>₹{item.price * item.qty}</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button onClick={() => updateQty(item.cartKey, item.qty - 1)} style={{ width: '28px', height: '28px', borderRadius: '6px', background: 'rgba(201,168,76,0.15)', border: 'none', color: '#c9a84c', fontSize: '16px' }}>−</button>
                  <span style={{ color: '#f5e6c8', minWidth: '20px', textAlign: 'center' }}>{item.qty}</span>
                  <button onClick={() => updateQty(item.cartKey, item.qty + 1)} style={{ width: '28px', height: '28px', borderRadius: '6px', background: 'rgba(201,168,76,0.15)', border: 'none', color: '#c9a84c', fontSize: '16px' }}>+</button>
                  <button onClick={() => removeItem(item.cartKey)} style={{ width: '28px', height: '28px', borderRadius: '6px', background: 'rgba(192,57,43,0.15)', border: 'none', color: '#c0392b', fontSize: '14px' }}>✕</button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div style={{ padding: '1.5rem', borderTop: '1px solid rgba(201,168,76,0.15)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', color: '#c8b89a', fontSize: '14px' }}>
              <span>Subtotal</span><span>₹{subtotal}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', color: '#c8b89a', fontSize: '14px' }}>
              <span>Delivery</span>
              <span style={{ color: deliveryFree ? '#27ae60' : '#c8b89a' }}>{deliveryFree ? 'FREE' : '₹50'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', color: '#f5e6c8', fontWeight: 600, fontSize: '16px' }}>
              <span>Total</span><span style={{ color: '#c9a84c' }}>₹{grandTotal}</span>
            </div>
            <button onClick={onCheckout} style={{ width: '100%', background: '#c9a84c', color: '#0a0500', border: 'none', borderRadius: '10px', padding: '15px', fontWeight: 700, fontSize: '16px' }}>
              Proceed to Checkout →
            </button>
          </div>
        )}
      </div>
    </>
  )
}
