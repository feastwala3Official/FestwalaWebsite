import { useEffect, useState } from 'react'
import { supabase, CLOUDINARY, CONFIG, applyDiscount } from '../lib/supabase'
import { useCart } from '../context/CartContext'
import toast from 'react-hot-toast'
import CartSidebar from '../components/CartSidebar'
import HalfFullModal from '../components/HalfFullModal'
import CheckoutModal from '../components/CheckoutModal'

// ── helpers ──────────────────────────────────────────────
function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371, toR = d => d * Math.PI / 180
  const dLat = toR(lat2 - lat1), dLng = toR(lng2 - lng1)
  const a = Math.sin(dLat/2)**2 + Math.cos(toR(lat1))*Math.cos(toR(lat2))*Math.sin(dLng/2)**2
  return R * 2 * Math.asin(Math.sqrt(a))
}

export default function Website() {
  const { addItem, openCart, itemCount } = useCart()
  const [thaliMenu, setThaliMenu] = useState([])
  const [chineseMenu, setChineseMenu] = useState([])
  const [settings, setSettings] = useState(null)
  const [halfFullItem, setHalfFullItem] = useState(null)
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [heroVideo, setHeroVideo] = useState(0)
  const [thaliVideo, setThaliVideo] = useState(0)
  const videos = [CLOUDINARY.video1, CLOUDINARY.video2]

  // cursor
  useEffect(() => {
    const dot = document.querySelector('.cursor-dot')
    const ring = document.querySelector('.cursor-ring')
    if (!dot || !ring) return
    const move = e => {
      dot.style.left = e.clientX + 'px'
      dot.style.top = e.clientY + 'px'
      ring.style.left = e.clientX + 'px'
      ring.style.top = e.clientY + 'px'
    }
    window.addEventListener('mousemove', move)
    return () => window.removeEventListener('mousemove', move)
  }, [])

  // scroll reveal
  useEffect(() => {
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible') })
    }, { threshold: 0.1 })
    document.querySelectorAll('.reveal').forEach(el => obs.observe(el))
    return () => obs.disconnect()
  }, [thaliMenu, chineseMenu])

  // fetch menu + settings from Supabase
  useEffect(() => {
    async function load() {
      const [{ data: items }, { data: cfg }] = await Promise.all([
        supabase.from('menu_items').select('*').order('sort_order'),
        supabase.from('settings').select('*').single()
      ])
      if (items) {
        setThaliMenu(groupBy(items.filter(i => i.brand === 'thali'), 'category'))
        setChineseMenu(groupBy(items.filter(i => i.brand === 'chinese'), 'category'))
      }
      if (cfg) setSettings(cfg)
    }
    load()

    // realtime menu updates
    const sub = supabase.channel('menu-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'menu_items' }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'settings' }, () => load())
      .subscribe()
    return () => supabase.removeChannel(sub)
  }, [])

  // hero video rotation
  useEffect(() => {
    const t = setInterval(() => setHeroVideo(v => (v + 1) % 2), 7000)
    return () => clearInterval(t)
  }, [])
  useEffect(() => {
    const t = setInterval(() => setThaliVideo(v => (v + 1) % 2), 7000)
    return () => clearInterval(t)
  }, [])

  function groupBy(arr, key) {
    return arr.reduce((acc, item) => {
      ;(acc[item[key]] = acc[item[key]] || []).push(item)
      return acc
    }, {})
  }

  function getDiscountedItem(item) {
    const brand = item.brand
    const globalPct = settings?.global_discount_pct || 0
    const brandPct = brand === 'thali' ? (settings?.thali_discount_pct || 0) : (settings?.chinese_discount_pct || 0)
    const pct = Math.max(globalPct, brandPct)
    if (!pct) return item
    return {
      ...item,
      price: item.price ? applyDiscount(item.price, pct) : null,
      half_price: item.half_price ? applyDiscount(item.half_price, pct) : null,
      full_price: item.full_price ? applyDiscount(item.full_price, pct) : null,
      originalPrice: item.price || null,
      originalHalfPrice: item.half_price || null,
      originalFullPrice: item.full_price || null,
      discountPct: pct
    }
  }

  function handleAddItem(item) {
    if (!item.in_stock) return toast.error('This item is currently out of stock')
    const discounted = getDiscountedItem(item)
    if (discounted.half_price && discounted.full_price) {
      setHalfFullItem(discounted)
    } else {
      addItem({ id: discounted.id, name: discounted.name, price: discounted.price, brand: discounted.brand, originalPrice: discounted.originalPrice })
      toast.success(`${discounted.name} added!`, { icon: '🍽️' })
      openCart()
    }
  }

  function handleHalfFull(item, variant) {
    const price = variant === 'Half' ? item.half_price : item.full_price
    const originalPrice = variant === 'Half' ? item.originalHalfPrice : item.originalFullPrice
    addItem({ id: item.id, name: `${item.name} (${variant})`, price, brand: item.brand, variant, originalPrice })
    toast.success(`${item.name} (${variant}) added!`, { icon: '🍽️' })
    setHalfFullItem(null)
    openCart()
  }

  return (
    <div style={{ minHeight: '100vh' }}>
      <div className="cursor-dot" />
      <div className="cursor-ring" />

      {/* ANIMATED BANNER from admin settings */}
      {settings?.banner_active && settings?.banner_text && (
        <div style={{ background: 'linear-gradient(90deg, #c9a84c, #e8c97a, #c9a84c)', padding: '10px 0', overflow: 'hidden', position: 'relative', zIndex: 101 }}>
          <div className="marquee-inner" style={{ gap: '4rem' }}>
            {Array(8).fill(null).map((_, i) => (
              <span key={i} style={{ color: '#0a0500', fontSize: '14px', fontWeight: 700, fontFamily: 'DM Sans', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
                🎉 {settings.banner_text} &nbsp;&nbsp;&nbsp;
              </span>
            ))}
          </div>
        </div>
      )}

      {/* MARQUEE STRIP */}
      <div style={{ background: '#5C1A1A', padding: '8px 0', overflow: 'hidden', position: 'relative', zIndex: 100 }}>
        <div className="marquee-inner" style={{ gap: '3rem' }}>
          {Array(6).fill(null).map((_, i) => (
            <span key={i} style={{ color: '#f5e6c8', fontSize: '13px', fontFamily: 'DM Sans', letterSpacing: '0.05em' }}>
              {settings?.announcement
                ? `🍽️ ${settings.announcement} &nbsp;&nbsp;&nbsp;`
                : `🍽️ Free Delivery on orders above ₹269 &nbsp;·&nbsp; 📞 9711386962 | 9217291488 &nbsp;·&nbsp; ⏰ 11 AM – 11 PM Daily &nbsp;&nbsp;&nbsp;`}
            </span>
          ))}
        </div>
      </div>

      {/* HEADER */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 200,
        background: 'rgba(10,5,0,0.92)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(201,168,76,0.15)',
        padding: '0 5%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        height: '64px'
      }}>
        <div style={{ fontFamily: 'Cormorant Garamond', fontSize: '24px', fontWeight: 700, color: '#c9a84c', letterSpacing: '0.05em' }}>
          FeastWala
        </div>
        <nav style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
          {[['#thali', 'Maa Ki Thali'], ['#chinese', 'Chinese & More'], ['#reviews', 'Reviews'], ['#contact', 'Contact']].map(([href, label]) => (
            <a key={href} href={href} style={{ color: '#c8b89a', fontSize: '14px', textDecoration: 'none', transition: 'color 0.2s', letterSpacing: '0.03em' }}
              onMouseEnter={e => e.target.style.color = '#c9a84c'} onMouseLeave={e => e.target.style.color = '#c8b89a'}>
              {label}
            </a>
          ))}
          <button onClick={openCart} style={{
            background: '#c9a84c', color: '#0a0500', border: 'none', borderRadius: '8px',
            padding: '8px 16px', fontSize: '14px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px',
            position: 'relative'
          }}>
            🛒 Cart {itemCount > 0 && (
              <span style={{ background: '#5C1A1A', color: '#f5e6c8', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px' }}>{itemCount}</span>
            )}
          </button>
        </nav>
      </header>

      {/* HERO VIDEO BANNER */}
      <section style={{ position: 'relative', height: '100vh', overflow: 'hidden', display: 'flex', alignItems: 'center' }}>
        {videos.map((v, i) => (
          <video key={i} src={v} autoPlay loop muted playsInline
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: heroVideo === i ? 1 : 0, transition: 'opacity 1s ease' }} />
        ))}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, rgba(10,5,0,0.85) 40%, rgba(10,5,0,0.3))' }} />

        {/* Video arrows */}
        {[[-1,'◀'],[1,'▶']].map(([dir, sym]) => (
          <button key={dir} onClick={() => setHeroVideo(v => (v + dir + 2) % 2)} style={{
            position: 'absolute', [dir === -1 ? 'left' : 'right']: '2rem',
            background: 'rgba(201,168,76,0.2)', border: '1px solid rgba(201,168,76,0.4)',
            color: '#c9a84c', borderRadius: '50%', width: '48px', height: '48px',
            fontSize: '18px', zIndex: 10, backdropFilter: 'blur(4px)'
          }}>{sym}</button>
        ))}

        <div style={{ position: 'relative', zIndex: 5, padding: '0 8%', maxWidth: '680px' }} className="fade-up">
          <p style={{ fontFamily: 'DM Sans', fontSize: '13px', letterSpacing: '0.2em', color: '#c9a84c', marginBottom: '1rem', textTransform: 'uppercase' }}>
            Cloud Kitchen · Malviya Nagar, Delhi
          </p>
          <h1 style={{ fontFamily: 'Cormorant Garamond', fontSize: 'clamp(3rem,7vw,5.5rem)', lineHeight: 1.05, fontWeight: 700, color: '#f5e6c8', marginBottom: '1.5rem' }}>
            Feast More.<br />
            <span style={{ background: 'linear-gradient(90deg, #c9a84c, #e8c97a, #c9a84c)', backgroundSize: '200% auto', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', animation: 'shimmer 3s linear infinite' }}>
              Spend Less.
            </span>
          </h1>
          <p style={{ color: '#c8b89a', fontSize: '16px', marginBottom: '2rem', lineHeight: 1.7 }}>
            Home-cooked thalis starting ₹139 · Authentic Chinese & Momos<br />
            Free delivery above ₹269 · Open 11 AM – 11 PM
          </p>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <a href="#thali" style={{ background: '#c9a84c', color: '#0a0500', padding: '14px 32px', borderRadius: '8px', textDecoration: 'none', fontWeight: 600, fontSize: '15px' }}>
              Order Now
            </a>
            <a href="https://wa.me/919711386962" target="_blank" style={{ background: 'transparent', color: '#c9a84c', border: '1px solid #c9a84c', padding: '14px 32px', borderRadius: '8px', textDecoration: 'none', fontWeight: 600, fontSize: '15px' }}>
              WhatsApp Us
            </a>
          </div>
        </div>

        {/* Dot indicators */}
        <div style={{ position: 'absolute', bottom: '2rem', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '8px', zIndex: 10 }}>
          {[0,1].map(i => (
            <button key={i} onClick={() => setHeroVideo(i)} style={{ width: heroVideo === i ? '24px' : '8px', height: '8px', borderRadius: '4px', background: heroVideo === i ? '#c9a84c' : 'rgba(201,168,76,0.4)', border: 'none', transition: 'all 0.3s', padding: 0 }} />
          ))}
        </div>
      </section>

      {/* THALI FEATURE CARDS */}
      <section style={{ padding: '6rem 5%', background: 'var(--deep)' }} className="reveal">
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <p style={{ color: '#c9a84c', fontSize: '12px', letterSpacing: '0.3em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Value Meals</p>
          <h2 style={{ fontFamily: 'Cormorant Garamond', fontSize: 'clamp(2rem,4vw,3rem)', color: '#f5e6c8' }}>Today's Thali</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', maxWidth: '900px', margin: '0 auto' }}>
          {[
            { label: 'Meal 1', price: 299, items: '4 Roti · Dal · Rice · Sabzi · Salad · Water Bottle', cta: 'Order Now' },
            { label: 'Meal 2', price: 311, items: '6 Roti · Dal · Rice · Paneer Sabzi · Sweet · Salad+Raita · Water Bottle', cta: 'Order Now' },
            { label: 'Monthly Plan', price: 120, unit: '/thali', items: '30 Days · Daily home-cooked thali · Free Masala Chai · Within 10km delivery', cta: 'Call for Details' }
          ].map((meal, i) => (
            <div key={i} style={{
              background: 'rgba(201,168,76,0.05)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: '16px',
              padding: '2rem', textAlign: 'center', animation: 'breathe 3s ease-in-out infinite',
              animationDelay: `${i * 0.5}s`, transition: 'transform 0.3s, border-color 0.3s'
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.borderColor = '#c9a84c' }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.borderColor = 'rgba(201,168,76,0.2)' }}>
              <p style={{ color: '#c9a84c', fontSize: '12px', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>{meal.label}</p>
              <p style={{ fontFamily: 'Cormorant Garamond', fontSize: '3rem', fontWeight: 700, color: '#f5e6c8' }}>₹{meal.price}<span style={{ fontSize: '1rem', color: '#c8b89a' }}>{meal.unit || ''}</span></p>
              <p style={{ color: '#c8b89a', fontSize: '13px', lineHeight: 1.8, margin: '1rem 0' }}>{meal.items}</p>
              <button onClick={() => {
                if (meal.cta === 'Call for Details') {
                  window.open(`https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent('Hi! I want to know more about the Monthly Thali Plan.')}`, '_blank')
                } else {
                  window.open(`https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(`Hi, I want to order ${meal.label} (₹${meal.price})`)}`, '_blank')
                }
              }}
                style={{ background: meal.cta === 'Call for Details' ? 'transparent' : '#c9a84c', color: meal.cta === 'Call for Details' ? '#c9a84c' : '#0a0500', border: meal.cta === 'Call for Details' ? '1px solid #c9a84c' : 'none', borderRadius: '8px', padding: '10px 24px', fontWeight: 600, fontSize: '14px', width: '100%' }}>
                {meal.cta === 'Call for Details' ? '📞 Call for Details & Timing' : '🛵 Order on WhatsApp'}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* MAA KI THALI MENU SECTION */}
      {settings?.show_thali_menu !== false && (
        <section id="thali" style={{ padding: '5rem 5%', background: '#f5f0e8' }}>
          {/* Thali Video */}
          <div style={{ position: 'relative', height: '40vh', borderRadius: '16px', overflow: 'hidden', marginBottom: '3rem' }}>
            {videos.map((v, i) => (
              <video key={i} src={v} autoPlay loop muted playsInline
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: thaliVideo === i ? 1 : 0, transition: 'opacity 1s' }} />
            ))}
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(90,40,0,0.6)', display: 'flex', alignItems: 'center', padding: '0 5%' }}>
              <div>
                <p style={{ color: '#e8c97a', fontSize: '12px', letterSpacing: '0.3em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Maa Ki Thali & Combos</p>
                <h2 style={{ fontFamily: 'Cormorant Garamond', fontSize: 'clamp(2rem,4vw,3.5rem)', color: '#fff8f0', fontWeight: 700 }}>Ghar Jaisa Khana</h2>
                <p style={{ color: '#f5e6c8', marginTop: '0.5rem', fontSize: '14px' }}>Delivery within 10km · Fresh daily · Value pricing</p>
              </div>
              {[[-1,'◀'],[1,'▶']].map(([dir, sym]) => (
                <button key={dir} onClick={() => setThaliVideo(v => (v + dir + 2) % 2)} style={{
                  position: 'absolute', [dir === -1 ? 'left' : 'right']: '1.5rem',
                  background: 'rgba(201,168,76,0.3)', border: '1px solid rgba(201,168,76,0.5)',
                  color: '#e8c97a', borderRadius: '50%', width: '40px', height: '40px', fontSize: '16px'
                }}>{sym}</button>
              ))}
            </div>
          </div>

          <MenuSection items={thaliMenu} theme="light" onAdd={handleAddItem} settings={settings} />
        </section>
      )}

      {/* CHINESE MENU SECTION */}
      {settings?.show_chinese_menu !== false && (
        <section id="chinese" style={{ padding: '5rem 5%', background: 'var(--brown)' }}>
          <div style={{ textAlign: 'center', marginBottom: '3rem' }} className="reveal">
            <p style={{ color: '#c9a84c', fontSize: '12px', letterSpacing: '0.3em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Chinese & More By Feastwala</p>
            <h2 style={{ fontFamily: 'Cormorant Garamond', fontSize: 'clamp(2rem,4vw,3rem)', color: '#f5e6c8' }}>Indo-Chinese Excellence</h2>
            <p style={{ color: '#c8b89a', marginTop: '0.5rem', fontSize: '14px' }}>Authentic flavours · Delivery within 10km · Fast preparation</p>
          </div>
          <MenuSection items={chineseMenu} theme="dark" onAdd={handleAddItem} settings={settings} />
        </section>
      )}

      {/* REVIEWS SECTION */}
      <ReviewsSection />

      {/* CONTACT SECTION */}
      <section id="contact" style={{ padding: '5rem 5%', background: 'var(--deep)' }} className="reveal">
        <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
          <p style={{ color: '#c9a84c', fontSize: '12px', letterSpacing: '0.3em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Get in Touch</p>
          <h2 style={{ fontFamily: 'Cormorant Garamond', fontSize: 'clamp(2rem,4vw,3rem)', color: '#f5e6c8', marginBottom: '2rem' }}>Contact Us</h2>
          <ContactForm />
          <div style={{ marginTop: '3rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', textAlign: 'left' }}>
            {[
              ['📍', 'Address', 'Malviya Nagar, New Delhi'],
              ['⏰', 'Hours', '11 AM – 11 PM Daily'],
              ['📱', 'Phone', '9711386962 | 9217291488'],
              ['📧', 'Email', 'feastwala3@gmail.com'],
              ['📸', 'Instagram', '@feastwala.2026']
            ].map(([icon, label, val]) => (
              <div key={label} style={{ background: 'rgba(201,168,76,0.05)', border: '1px solid rgba(201,168,76,0.15)', borderRadius: '12px', padding: '1.2rem' }}>
                <p style={{ fontSize: '20px', marginBottom: '0.3rem' }}>{icon}</p>
                <p style={{ color: '#c9a84c', fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{label}</p>
                <p style={{ color: '#f5e6c8', fontSize: '14px', marginTop: '0.2rem' }}>{val}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ background: '#050300', padding: '3rem 5%', borderTop: '1px solid rgba(201,168,76,0.15)', textAlign: 'center' }}>
        <div style={{ fontFamily: 'Cormorant Garamond', fontSize: '28px', fontWeight: 700, color: '#c9a84c', marginBottom: '0.5rem' }}>FeastWala</div>
        <p style={{ color: '#c8b89a', fontSize: '13px', marginBottom: '1rem' }}>Feast More. Spend Less. · Malviya Nagar, New Delhi</p>
        <div style={{ display: 'flex', gap: '1.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <a href="https://wa.me/919711386962" target="_blank" style={{ color: '#c9a84c', textDecoration: 'none', fontSize: '13px' }}>WhatsApp</a>
          <a href="https://instagram.com/feastwala.2026" target="_blank" style={{ color: '#c9a84c', textDecoration: 'none', fontSize: '13px' }}>Instagram</a>
          <a href="/admin" style={{ color: '#c9a84c', textDecoration: 'none', fontSize: '13px' }}>Admin</a>
        </div>
        <p style={{ color: '#5a4a35', fontSize: '12px', marginTop: '1.5rem' }}>© 2026 FeastWala. All rights reserved.</p>
      </footer>

      {/* FLOATING CART */}
      <button onClick={openCart} style={{
        position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 500,
        background: '#c9a84c', color: '#0a0500', border: 'none', borderRadius: '50px',
        padding: '14px 20px', fontWeight: 700, fontSize: '15px', boxShadow: '0 8px 24px rgba(201,168,76,0.4)',
        display: 'flex', alignItems: 'center', gap: '8px', transition: 'transform 0.2s'
      }}
      onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
      onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
        🛒 {itemCount > 0 ? `${itemCount} items` : 'Cart'}
      </button>

      <CartSidebar onCheckout={() => setCheckoutOpen(true)} />
      {halfFullItem && <HalfFullModal item={halfFullItem} onSelect={handleHalfFull} onClose={() => setHalfFullItem(null)} />}
      {checkoutOpen && <CheckoutModal onClose={() => setCheckoutOpen(false)} />}
    </div>
  )
}

// ── Menu Section Component ──────────────────────────────
function MenuSection({ items, theme, onAdd, settings }) {
  const dark = theme === 'dark'
  const categories = Object.keys(items)
  const [active, setActive] = useState(categories[0] || '')
  const [gridKey, setGridKey] = useState(0)

  useEffect(() => { if (categories.length && !active) setActive(categories[0]) }, [categories])

  function switchCategory(cat) {
    setActive(cat)
    setGridKey(k => k + 1)
  }

  // get active discount for this brand
  const brand = theme === 'light' ? 'thali' : 'chinese'
  const globalPct = settings?.global_discount_pct || 0
  const brandPct = brand === 'thali' ? (settings?.thali_discount_pct || 0) : (settings?.chinese_discount_pct || 0)
  const discountPct = Math.max(globalPct, brandPct)
  const discountLabel = discountPct > 0
    ? (brand === 'thali' ? settings?.thali_discount_label : settings?.chinese_discount_label) || settings?.global_discount_label || `${discountPct}% OFF`
    : null

  if (!categories.length) return (
    <div style={{ textAlign: 'center', color: '#c8b89a', padding: '3rem' }}>
      <div style={{ fontSize: '2rem', marginBottom: '0.5rem', animation: 'pulse 1.5s ease infinite' }}>🍽️</div>
      Loading menu...
    </div>
  )

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
      {/* Discount badge */}
      {discountLabel && (
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <span style={{ background: 'linear-gradient(90deg, #c0392b, #e74c3c)', color: 'white', padding: '6px 20px', borderRadius: '20px', fontSize: '13px', fontWeight: 700, letterSpacing: '0.05em', boxShadow: '0 4px 16px rgba(192,57,43,0.4)', animation: 'goldPulse 2s ease-in-out infinite' }}>
            🔥 {discountLabel} — {discountPct}% OFF
          </span>
        </div>
      )}

      {/* Category pills */}
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '2.5rem', justifyContent: 'center' }}>
        {categories.map((cat, i) => (
          <button key={cat} onClick={() => switchCategory(cat)} style={{
            padding: '9px 22px', borderRadius: '50px', fontSize: '13px', fontWeight: 500,
            border: active === cat ? 'none' : `1px solid ${dark ? 'rgba(201,168,76,0.3)' : 'rgba(90,40,0,0.3)'}`,
            background: active === cat ? '#c9a84c' : 'transparent',
            color: active === cat ? '#0a0500' : (dark ? '#c8b89a' : '#5a3010'),
            transition: 'all 0.22s ease', fontFamily: 'DM Sans',
            boxShadow: active === cat ? '0 0 16px rgba(201,168,76,0.35)' : 'none',
            transform: active === cat ? 'scale(1.04)' : 'scale(1)'
          }}>
            {cat}
          </button>
        ))}
      </div>

      {/* Items grid */}
      <div key={gridKey} className="menu-grid">
        {(items[active] || []).map((item, i) => (
          <ItemCard key={item.id} item={item} theme={theme} onAdd={onAdd} delay={i * 55} discountPct={discountPct} />
        ))}
      </div>
    </div>
  )
}

// ── Item Card — shows discount strikethrough when applicable ──
function ItemCard({ item, theme, onAdd, delay, discountPct }) {
  const dark = theme === 'dark'
  const hasHalfFull = item.half_price && item.full_price
  const [hovered, setHovered] = useState(false)

  // Calculate discounted prices for display
  const discountedPrice = discountPct > 0 && item.price ? Math.round(item.price * (1 - discountPct / 100)) : null
  const discountedHalf = discountPct > 0 && item.half_price ? Math.round(item.half_price * (1 - discountPct / 100)) : null
  const discountedFull = discountPct > 0 && item.full_price ? Math.round(item.full_price * (1 - discountPct / 100)) : null
  const showDiscount = discountPct > 0

  return (
    <div
      className="menu-card"
      style={{
        animationDelay: `${delay}ms`,
        background: dark ? 'rgba(255,255,255,0.035)' : 'white',
        border: hovered ? '1px solid #c9a84c' : (dark ? '1px solid rgba(201,168,76,0.12)' : '1px solid rgba(90,40,0,0.1)'),
        borderRadius: '14px', padding: '1.2rem',
        display: 'flex', flexDirection: 'column', gap: '0.5rem',
        opacity: item.in_stock ? undefined : 0.5,
        transition: 'border-color 0.2s, box-shadow 0.2s',
        boxShadow: hovered ? (dark ? '0 6px 24px rgba(201,168,76,0.12)' : '0 6px 20px rgba(90,40,0,0.1)') : 'none',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Discount badge — below title, not overlapping */}
      {showDiscount && item.in_stock && (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(192,57,43,0.12)', border: '1px solid rgba(192,57,43,0.3)', borderRadius: '6px', padding: '2px 8px', width: 'fit-content', marginTop: '-2px' }}>
          <span style={{ color: '#e74c3c', fontSize: '11px', fontWeight: 700 }}>🔥 {discountPct}% OFF</span>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <p style={{ fontFamily: 'Cormorant Garamond', fontWeight: 600, fontSize: '17px', color: dark ? '#f5e6c8' : '#2a1200', lineHeight: 1.3 }}>{item.name}</p>
          {item.description && (
            <p style={{ color: dark ? '#8a7a65' : '#8a7060', fontSize: '12px', marginTop: '4px', lineHeight: 1.6 }}>{item.description}</p>
          )}
        </div>
        <button
          onClick={() => onAdd(item)}
          disabled={!item.in_stock}
          style={{
            background: item.in_stock ? '#c9a84c' : '#444', color: item.in_stock ? '#0a0500' : '#888',
            border: 'none', borderRadius: '8px', width: '34px', height: '34px', fontSize: '20px', lineHeight: 1,
            flexShrink: 0, marginLeft: '10px', transition: 'transform 0.2s, background 0.2s',
            transform: hovered && item.in_stock ? 'rotate(90deg) scale(1.1)' : 'none', fontWeight: 700,
          }}
        >
          {item.in_stock ? '+' : '✕'}
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px' }}>
        <div>
          {hasHalfFull ? (
            <div>
              {showDiscount ? (
                <div>
                  <span style={{ color: '#8a7a65', fontSize: '11px', textDecoration: 'line-through', marginRight: '4px' }}>H: ₹{item.half_price} · F: ₹{item.full_price}</span>
                  <span style={{ fontFamily: 'Cormorant Garamond', fontSize: '15px', fontWeight: 700, color: '#c9a84c' }}>H: ₹{discountedHalf} · F: ₹{discountedFull}</span>
                </div>
              ) : (
                <span style={{ fontFamily: 'Cormorant Garamond', fontSize: '15px', fontWeight: 700, color: '#c9a84c' }}>H: ₹{item.half_price} · F: ₹{item.full_price}</span>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {showDiscount && <span style={{ color: '#8a7a65', fontSize: '13px', textDecoration: 'line-through' }}>₹{item.price}</span>}
              <span style={{ fontFamily: 'Cormorant Garamond', fontSize: '20px', fontWeight: 700, color: '#c9a84c' }}>₹{showDiscount ? discountedPrice : item.price}</span>
            </div>
          )}
        </div>
        {!item.in_stock && (
          <span style={{ background: '#c0392b', color: 'white', fontSize: '10px', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>OUT OF STOCK</span>
        )}
      </div>
    </div>
  )
}

// ── Reviews Section on Website ─────────────────────────
function ReviewsSection() {
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('reviews').select('*').eq('visible', true).order('created_at', { ascending: false }).limit(12)
      .then(({ data }) => { if (data) setReviews(data); setLoading(false) })

    const sub = supabase.channel('public-reviews')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reviews' }, () => {
        supabase.from('reviews').select('*').eq('visible', true).order('created_at', { ascending: false }).limit(12)
          .then(({ data }) => { if (data) setReviews(data) })
      })
      .subscribe()
    return () => supabase.removeChannel(sub)
  }, [])

  if (loading || reviews.length === 0) return null

  const avg = (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)

  return (
    <section id="reviews" style={{ padding: '5rem 5%', background: 'var(--black)' }} className="reveal">
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <p style={{ color: '#c9a84c', fontSize: '12px', letterSpacing: '0.3em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>What Our Customers Say</p>
          <h2 style={{ fontFamily: 'Cormorant Garamond', fontSize: 'clamp(2rem,4vw,3rem)', color: '#f5e6c8' }}>Customer Reviews</h2>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', marginTop: '0.75rem' }}>
            <span style={{ color: '#c9a84c', fontSize: '24px' }}>{'★'.repeat(Math.round(parseFloat(avg)))}{'☆'.repeat(5 - Math.round(parseFloat(avg)))}</span>
            <span style={{ fontFamily: 'Cormorant Garamond', fontSize: '28px', color: '#c9a84c', fontWeight: 700 }}>{avg}</span>
            <span style={{ color: '#c8b89a', fontSize: '14px' }}>({reviews.length} reviews)</span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.2rem' }}>
          {reviews.map((r, i) => (
            <div key={r.id} className="menu-card" style={{ animationDelay: `${i * 80}ms`, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(201,168,76,0.12)', borderRadius: '14px', padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                <div>
                  <p style={{ color: '#f5e6c8', fontWeight: 600, fontSize: '15px' }}>{r.customer_name}</p>
                  <p style={{ color: '#8a7a65', fontSize: '11px', marginTop: '2px' }}>{new Date(r.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                </div>
                <span style={{ color: '#c9a84c', fontSize: '16px', letterSpacing: '1px' }}>{'★'.repeat(r.rating)}{'☆'.repeat(5-r.rating)}</span>
              </div>
              <p style={{ color: '#c8b89a', fontSize: '14px', lineHeight: 1.7, fontStyle: 'italic' }}>"{r.text}"</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── Contact Form ───────────────────────────────────────
function ContactForm() {
  const [form, setForm] = useState({ name: '', phone: '', message: '' })

  function submit(e) {
    e.preventDefault()
    if (!form.name || !form.phone) return toast.error('Name and phone required')
    const msg = `Hi FeastWala! My name is ${form.name} (${form.phone}). ${form.message}`
    window.open(`https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(msg)}`, '_blank')
  }

  return (
    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {['name','phone','message'].map(field => (
        field === 'message'
          ? <textarea key={field} placeholder="Your message" rows={4} value={form[field]}
              onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
              style={{ background: 'rgba(201,168,76,0.05)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: '8px', padding: '12px 16px', color: '#f5e6c8', fontSize: '14px', fontFamily: 'DM Sans', resize: 'vertical' }} />
          : <input key={field} type={field === 'phone' ? 'tel' : 'text'} placeholder={field.charAt(0).toUpperCase() + field.slice(1)} value={form[field]}
              onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
              style={{ background: 'rgba(201,168,76,0.05)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: '8px', padding: '12px 16px', color: '#f5e6c8', fontSize: '14px', fontFamily: 'DM Sans' }} />
      ))}
      <button type="submit" style={{ background: '#c9a84c', color: '#0a0500', border: 'none', borderRadius: '8px', padding: '14px', fontWeight: 600, fontSize: '15px' }}>
        Send via WhatsApp
      </button>
    </form>
  )
}
