import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'

export default function AdminSettings() {
  const [settings, setSettings] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    supabase.from('settings').select('*').single().then(({ data }) => { if (data) setSettings(data) })
  }, [])

  async function save() {
    setSaving(true)
    const { error } = await supabase.from('settings').update(settings).eq('id', 1)
    setSaving(false)
    if (!error) toast.success('Settings saved — changes live immediately!') 
    else toast.error('Failed to save')
  }

  if (!settings) return <div style={{ color: '#c8b89a', padding: '2rem' }}>Loading...</div>

  const toggle = k => setSettings(s => ({ ...s, [k]: !s[k] }))
  const set = (k, v) => setSettings(s => ({ ...s, [k]: v }))

  const Toggle = ({ label, k, desc }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 0', borderBottom: '1px solid rgba(201,168,76,0.08)' }}>
      <div>
        <p style={{ color: '#f5e6c8', fontSize: '14px' }}>{label}</p>
        {desc && <p style={{ color: '#8a7a65', fontSize: '12px', marginTop: '2px' }}>{desc}</p>}
      </div>
      <button onClick={() => toggle(k)} style={{ width: '48px', height: '26px', borderRadius: '13px', border: 'none', position: 'relative', background: settings[k] ? '#c9a84c' : 'rgba(255,255,255,0.1)', transition: 'background 0.2s' }}>
        <span style={{ position: 'absolute', top: '3px', left: settings[k] ? '25px' : '3px', width: '20px', height: '20px', borderRadius: '50%', background: 'white', transition: 'left 0.2s' }} />
      </button>
    </div>
  )

  const card = (title, children) => (
    <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(201,168,76,0.1)', borderRadius: '12px', padding: '1.5rem', marginBottom: '1.5rem' }}>
      <h4 style={{ color: '#c9a84c', fontSize: '13px', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '1rem' }}>{title}</h4>
      {children}
    </div>
  )

  const inputStyle = { background: 'rgba(201,168,76,0.05)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: '8px', padding: '10px', color: '#f5e6c8', fontFamily: 'DM Sans', fontSize: '14px', width: '100%' }

  return (
    <div style={{ maxWidth: '640px' }}>
      <h3 style={{ fontFamily: 'Cormorant Garamond', fontSize: '24px', color: '#f5e6c8', marginBottom: '2rem' }}>Settings</h3>

      {/* ── DISCOUNT SECTION ── */}
      {card('Discounts', <>
        <p style={{ color: '#c8b89a', fontSize: '13px', marginBottom: '1.2rem', lineHeight: 1.6 }}>
          Set discount % per menu. Customers see the original price struck through with the discounted price. 
          Discount label shows in the animated banner on the website.
        </p>

        {/* Global discount */}
        <div style={{ background: 'rgba(201,168,76,0.06)', borderRadius: '8px', padding: '1rem', marginBottom: '1rem', border: '1px solid rgba(201,168,76,0.15)' }}>
          <p style={{ color: '#f5e6c8', fontSize: '13px', fontWeight: 600, marginBottom: '0.75rem' }}>🌟 Global (both menus)</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '0.75rem' }}>
            <div>
              <p style={{ color: '#c8b89a', fontSize: '11px', marginBottom: '5px' }}>Discount %</p>
              <input type="number" min="0" max="80" value={settings.global_discount_pct || 0} onChange={e => set('global_discount_pct', parseInt(e.target.value) || 0)} style={inputStyle} placeholder="0" />
            </div>
            <div>
              <p style={{ color: '#c8b89a', fontSize: '11px', marginBottom: '5px' }}>Label (shown in banner)</p>
              <input value={settings.global_discount_label || ''} onChange={e => set('global_discount_label', e.target.value)} style={inputStyle} placeholder="e.g. Weekend Special" />
            </div>
          </div>
        </div>

        {/* Thali discount */}
        <div style={{ background: 'rgba(180,100,0,0.08)', borderRadius: '8px', padding: '1rem', marginBottom: '1rem', border: '1px solid rgba(180,100,0,0.2)' }}>
          <p style={{ color: '#f5e6c8', fontSize: '13px', fontWeight: 600, marginBottom: '0.75rem' }}>🍛 Maa Ki Thali only</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '0.75rem' }}>
            <div>
              <p style={{ color: '#c8b89a', fontSize: '11px', marginBottom: '5px' }}>Discount %</p>
              <input type="number" min="0" max="80" value={settings.thali_discount_pct || 0} onChange={e => set('thali_discount_pct', parseInt(e.target.value) || 0)} style={inputStyle} placeholder="0" />
            </div>
            <div>
              <p style={{ color: '#c8b89a', fontSize: '11px', marginBottom: '5px' }}>Label</p>
              <input value={settings.thali_discount_label || ''} onChange={e => set('thali_discount_label', e.target.value)} style={inputStyle} placeholder="e.g. Thali Tuesday" />
            </div>
          </div>
        </div>

        {/* Chinese discount */}
        <div style={{ background: 'rgba(0,100,150,0.08)', borderRadius: '8px', padding: '1rem', border: '1px solid rgba(0,100,150,0.2)' }}>
          <p style={{ color: '#f5e6c8', fontSize: '13px', fontWeight: 600, marginBottom: '0.75rem' }}>🥡 Chinese & More only</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '0.75rem' }}>
            <div>
              <p style={{ color: '#c8b89a', fontSize: '11px', marginBottom: '5px' }}>Discount %</p>
              <input type="number" min="0" max="80" value={settings.chinese_discount_pct || 0} onChange={e => set('chinese_discount_pct', parseInt(e.target.value) || 0)} style={inputStyle} placeholder="0" />
            </div>
            <div>
              <p style={{ color: '#c8b89a', fontSize: '11px', marginBottom: '5px' }}>Label</p>
              <input value={settings.chinese_discount_label || ''} onChange={e => set('chinese_discount_label', e.target.value)} style={inputStyle} placeholder="e.g. Chinese Fest" />
            </div>
          </div>
        </div>

        {(settings.thali_discount_pct > 0 || settings.chinese_discount_pct > 0 || settings.global_discount_pct > 0) && (
          <p style={{ color: '#27ae60', fontSize: '12px', marginTop: '0.75rem' }}>
            ✅ Active discounts will show as strikethrough prices on the website in real time.
          </p>
        )}
      </>)}

      {/* ── BANNER ── */}
      {card('Announcement Banner', <>
        <Toggle label="Show Banner" k="banner_active" desc="Animated banner at top of website" />
        <div style={{ marginTop: '1rem', display: 'grid', gap: '0.75rem' }}>
          <div>
            <p style={{ color: '#c8b89a', fontSize: '11px', marginBottom: '5px' }}>Banner Text</p>
            <input value={settings.banner_text || ''} onChange={e => set('banner_text', e.target.value)} style={inputStyle} placeholder="e.g. 🎉 20% off all thalis today only! Use code FEAST20" />
          </div>
          <div>
            <p style={{ color: '#c8b89a', fontSize: '11px', marginBottom: '5px' }}>Marquee Text (replaces default strip)</p>
            <input value={settings.announcement || ''} onChange={e => set('announcement', e.target.value)} style={inputStyle} placeholder="e.g. Free delivery today on all orders above ₹199!" />
          </div>
        </div>
      </>)}

      {/* ── OPERATIONS ── */}
      {card('Operations', <>
        <Toggle label="Accept Orders" k="accept_orders" desc="Toggle off to pause all incoming orders" />
        <Toggle label="Show Maa Ki Thali Menu" k="show_thali_menu" />
        <Toggle label="Show Chinese Menu" k="show_chinese_menu" />
        <Toggle label="COD Enabled" k="cod_enabled" />
        <Toggle label="Free Delivery (All Orders)" k="free_delivery" />
      </>)}

      {/* ── DELIVERY PRICING ── */}
      {card('Delivery Pricing', (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          {[['Delivery Charge (₹)', 'delivery_charge'], ['Free Delivery Above (₹)', 'free_delivery_threshold']].map(([label, key]) => (
            <div key={key}>
              <p style={{ color: '#c8b89a', fontSize: '11px', marginBottom: '5px' }}>{label}</p>
              <input type="number" value={settings[key] || ''} onChange={e => set(key, parseInt(e.target.value))} style={inputStyle} />
            </div>
          ))}
        </div>
      ))}

      {/* ── TIMINGS ── */}
      {card('Timings', (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          {[['Opening Time', 'opening_time'], ['Closing Time', 'closing_time']].map(([label, key]) => (
            <div key={key}>
              <p style={{ color: '#c8b89a', fontSize: '11px', marginBottom: '5px' }}>{label}</p>
              <input type="time" value={settings[key] || ''} onChange={e => set(key, e.target.value)} style={inputStyle} />
            </div>
          ))}
        </div>
      ))}

      {/* ── CONTACT ── */}
      {card('Contact Details', (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {[['Primary WhatsApp', 'whatsapp_primary'], ['Secondary Phone', 'whatsapp_secondary'], ['Contact Email', 'contact_email']].map(([label, key]) => (
            <div key={key}>
              <p style={{ color: '#c8b89a', fontSize: '11px', marginBottom: '5px' }}>{label}</p>
              <input value={settings[key] || ''} onChange={e => set(key, e.target.value)} style={inputStyle} />
            </div>
          ))}
        </div>
      ))}

      <button onClick={save} disabled={saving} style={{ background: '#c9a84c', border: 'none', borderRadius: '10px', padding: '14px 48px', color: '#0a0500', fontWeight: 700, fontSize: '16px', fontFamily: 'DM Sans', opacity: saving ? 0.7 : 1, animation: saving ? 'none' : 'goldPulse 2s ease-in-out infinite' }}>
        {saving ? 'Saving...' : 'Save All Settings'}
      </button>
    </div>
  )
}
