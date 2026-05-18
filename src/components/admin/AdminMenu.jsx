import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'

export default function AdminMenu() {
  const [items, setItems] = useState([])
  const [activeBrand, setActiveBrand] = useState('thali')
  const [activeCategory, setActiveCategory] = useState('')
  const [editItem, setEditItem] = useState(null)
  const [showAdd, setShowAdd] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadItems() }, [])

  async function loadItems() {
    const { data } = await supabase.from('menu_items').select('*').order('sort_order')
    if (data) setItems(data)
    setLoading(false)
  }

  const brandItems = items.filter(i => i.brand === activeBrand)
  const categories = [...new Set(brandItems.map(i => i.category))]

  useEffect(() => { if (categories.length && !activeCategory) setActiveCategory(categories[0]) }, [activeBrand, items])

  const catItems = brandItems.filter(i => i.category === activeCategory)

  async function toggleStock(item) {
    const { error } = await supabase.from('menu_items').update({ in_stock: !item.in_stock }).eq('id', item.id)
    if (!error) { setItems(prev => prev.map(i => i.id === item.id ? { ...i, in_stock: !i.in_stock } : i)); toast.success(item.in_stock ? 'Marked out of stock' : 'Marked in stock') }
  }

  async function deleteItem(id) {
    if (!confirm('Delete this item?')) return
    const { error } = await supabase.from('menu_items').delete().eq('id', id)
    if (!error) { setItems(prev => prev.filter(i => i.id !== id)); toast.success('Item deleted') }
  }

  async function saveEdit(form) {
    const { error } = await supabase.from('menu_items').update(form).eq('id', editItem.id)
    if (!error) { setItems(prev => prev.map(i => i.id === editItem.id ? { ...i, ...form } : i)); setEditItem(null); toast.success('Item updated') }
    else toast.error('Failed to update')
  }

  async function addItem(form) {
    const { data, error } = await supabase.from('menu_items').insert({ ...form, brand: activeBrand, category: activeCategory }).select().single()
    if (!error && data) { setItems(prev => [...prev, data]); setShowAdd(false); toast.success('Item added') }
    else toast.error('Failed to add item')
  }

  if (loading) return <div style={{ color: '#c8b89a', padding: '3rem', textAlign: 'center' }}>Loading menu...</div>

  return (
    <div>
      {/* Brand switch */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
        {[['thali','🍛 Maa Ki Thali'],['chinese','🥡 Chinese & More']].map(([brand, label]) => (
          <button key={brand} onClick={() => { setActiveBrand(brand); setActiveCategory('') }} style={{
            padding: '10px 24px', borderRadius: '8px', border: `1px solid ${activeBrand === brand ? '#c9a84c' : 'rgba(201,168,76,0.2)'}`,
            background: activeBrand === brand ? 'rgba(201,168,76,0.15)' : 'transparent',
            color: activeBrand === brand ? '#c9a84c' : '#c8b89a', fontSize: '14px', fontFamily: 'DM Sans', fontWeight: activeBrand === brand ? 600 : 400
          }}>{label}</button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: '2rem' }}>
        {/* Category sidebar */}
        <div>
          {categories.map(cat => {
            const count = brandItems.filter(i => i.category === cat).length
            return (
              <button key={cat} onClick={() => setActiveCategory(cat)} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                width: '100%', padding: '10px 14px', borderRadius: '8px', marginBottom: '4px',
                background: activeCategory === cat ? 'rgba(201,168,76,0.15)' : 'transparent',
                border: activeCategory === cat ? '1px solid rgba(201,168,76,0.3)' : '1px solid transparent',
                color: activeCategory === cat ? '#c9a84c' : '#c8b89a', fontSize: '13px', textAlign: 'left', fontFamily: 'DM Sans'
              }}>
                <span>{cat}</span>
                <span style={{ background: 'rgba(201,168,76,0.15)', borderRadius: '10px', padding: '1px 8px', fontSize: '11px' }}>{count}</span>
              </button>
            )
          })}
        </div>

        {/* Items */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 style={{ fontFamily: 'Cormorant Garamond', fontSize: '22px', color: '#f5e6c8' }}>{activeCategory}</h3>
            <button onClick={() => setShowAdd(true)} style={{ background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.3)', borderRadius: '8px', padding: '8px 16px', color: '#c9a84c', fontSize: '13px', fontFamily: 'DM Sans' }}>+ Add Item</button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {catItems.map(item => (
              <div key={item.id} style={{
                background: 'rgba(255,255,255,0.03)', border: `1px solid ${item.in_stock ? 'rgba(201,168,76,0.1)' : 'rgba(192,57,43,0.2)'}`,
                borderRadius: '10px', padding: '1rem 1.2rem', display: 'flex', alignItems: 'center', gap: '1rem',
                opacity: item.in_stock ? 1 : 0.65
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <p style={{ color: '#f5e6c8', fontWeight: 500, fontSize: '15px' }}>{item.name}</p>
                    {!item.in_stock && <span style={{ background: '#c0392b', color: 'white', fontSize: '10px', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>OUT OF STOCK</span>}
                  </div>
                  {item.description && <p style={{ color: '#8a7a65', fontSize: '12px', marginTop: '2px' }}>{item.description}</p>}
                  <p style={{ color: '#c9a84c', fontSize: '13px', marginTop: '4px', fontWeight: 600 }}>
                    {item.half_price ? `H: ₹${item.half_price} · F: ₹${item.full_price}` : `₹${item.price}`}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button onClick={() => toggleStock(item)} style={{ padding: '6px 12px', borderRadius: '6px', border: `1px solid ${item.in_stock ? 'rgba(192,57,43,0.4)' : 'rgba(39,174,96,0.4)'}`, background: 'transparent', color: item.in_stock ? '#c0392b' : '#27ae60', fontSize: '12px', fontFamily: 'DM Sans' }}>
                    {item.in_stock ? '✕ Stock Out' : '✓ In Stock'}
                  </button>
                  <button onClick={() => setEditItem(item)} style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid rgba(201,168,76,0.3)', background: 'transparent', color: '#c9a84c', fontSize: '12px' }}>✏️ Edit</button>
                  <button onClick={() => deleteItem(item.id)} style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid rgba(192,57,43,0.3)', background: 'transparent', color: '#c0392b', fontSize: '12px' }}>🗑</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {editItem && <ItemModal title="Edit Item" item={editItem} onSave={saveEdit} onClose={() => setEditItem(null)} />}
      {showAdd && <ItemModal title="Add Item" item={null} onSave={addItem} onClose={() => setShowAdd(false)} />}
    </div>
  )
}

function ItemModal({ title, item, onSave, onClose }) {
  const [form, setForm] = useState({
    name: item?.name || '', description: item?.description || '',
    price: item?.price || '', half_price: item?.half_price || '', full_price: item?.full_price || '',
    in_stock: item?.in_stock !== false
  })
  const [hasHalfFull, setHasHalfFull] = useState(!!(item?.half_price))

  function submit(e) {
    e.preventDefault()
    const data = { name: form.name, description: form.description, in_stock: form.in_stock }
    if (hasHalfFull) { data.half_price = parseInt(form.half_price) || null; data.full_price = parseInt(form.full_price) || null; data.price = null }
    else { data.price = parseInt(form.price) || null; data.half_price = null; data.full_price = null }
    onSave(data)
  }

  const inputStyle = { background: 'rgba(201,168,76,0.05)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: '8px', padding: '10px 14px', color: '#f5e6c8', fontFamily: 'DM Sans', fontSize: '14px', width: '100%' }

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000 }} />
      <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', background: '#1a0a00', border: '1px solid rgba(201,168,76,0.25)', borderRadius: '16px', padding: '2rem', zIndex: 1001, width: '400px', maxWidth: '95vw' }}>
        <h3 style={{ fontFamily: 'Cormorant Garamond', fontSize: '22px', color: '#f5e6c8', marginBottom: '1.5rem' }}>{title}</h3>
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <input placeholder="Item name *" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} style={inputStyle} />
          <input placeholder="Description" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} style={inputStyle} />
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#c8b89a', fontSize: '13px' }}>
            <input type="checkbox" checked={hasHalfFull} onChange={e => setHasHalfFull(e.target.checked)} />
            Has Half / Full pricing
          </label>
          {hasHalfFull ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              <input placeholder="Half price ₹" value={form.half_price} onChange={e => setForm(f => ({ ...f, half_price: e.target.value }))} style={inputStyle} type="number" />
              <input placeholder="Full price ₹" value={form.full_price} onChange={e => setForm(f => ({ ...f, full_price: e.target.value }))} style={inputStyle} type="number" />
            </div>
          ) : (
            <input placeholder="Price ₹" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} style={inputStyle} type="number" />
          )}
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button type="button" onClick={onClose} style={{ flex: 1, background: 'none', border: '1px solid rgba(201,168,76,0.2)', borderRadius: '8px', padding: '11px', color: '#c8b89a', fontFamily: 'DM Sans' }}>Cancel</button>
            <button type="submit" style={{ flex: 1, background: '#c9a84c', border: 'none', borderRadius: '8px', padding: '11px', color: '#0a0500', fontWeight: 600, fontFamily: 'DM Sans' }}>Save</button>
          </div>
        </form>
      </div>
    </>
  )
}
