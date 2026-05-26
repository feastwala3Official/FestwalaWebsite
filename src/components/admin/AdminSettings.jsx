import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'

export default function AdminSettings() {
  const [settings, setSettings] = useState(null)
  const [saving, setSaving] = useState(false)

  // Must be declared BEFORE the useEffect that calls setDiscountRaw
  const [discountRaw, setDiscountRaw] = useState({
    global_discount_pct: '0',
    thali_discount_pct: '0',
    chinese_discount_pct: '0'
  })

  useEffect(() => {
    supabase.from('settings').select('*').single()
      .then(({ data }) => {
        if (data) {
          setSettings(data)
          setDiscountRaw({
            global_discount_pct: String(data.global_discount_pct || 0),
            thali_discount_pct: String(data.thali_discount_pct || 0),
            chinese_discount_pct: String(data.chinese_discount_pct || 0)
          })
        }
      })
  }, [])

  function handleDiscountChange(key, raw) {
    // Allow free typing — just update the raw string
    setDiscountRaw(r => ({ ...r, [key]: raw }))
    // Update settings with parsed value (allow empty while typing)
    const num = parseInt(raw, 10)
    if (!isNaN(num)) {
      const clamped = Math.min(Math.max(num, 0), 98)
      setSettings(s => ({ ...s, [key]: clamped }))
    }
  }

  function handleDiscountBlur(key, raw) {
    // On blur — clamp and clean up
    const num = parseInt(raw, 10)
    const safe = isNaN(num) ? 0 : Math.min(Math.max(num, 0), 98)
    setDiscountRaw(r => ({ ...r, [key]: String(safe) }))
    setSettings(s => ({ ...s, [key]: safe }))
  }

  function setNumber(key, raw, min = 0, max = 99999) {
    const num = parseInt(raw, 10)
    const safe = isNaN(num) ? min : Math.min(Math.max(num, min), max)
    setSettings(s => ({ ...s, [key]: safe }))
  }

  async function save() {
    const s = settings
    // Final safety checks before saving
    if ((s.global_discount_pct || 0) > 98) return toast.error('Global discount max is 98%')
    if ((s.thali_discount_pct || 0) > 98) return toast.error('Thali discount max is 98%')
    if ((s.chinese_discount_pct || 0) > 98) return toast.error('Chinese discount max is 98%')
    if ((s.delivery_charge || 0) < 0) return toast.error('Delivery charge cannot be negative')
    if ((s.free_delivery_threshold || 0) < 0) return toast.error('Free delivery threshold cannot be negative')

    setSaving(true)
    const { error } = await supabase.from('settings').update(settings).eq('id', 1)
    setSaving(false)
    if (!error) toast.success('Settings saved — live immediately!')
    else toast.error('Failed to save. Try again.')
  }

  if (!settings) return (
    <div style={{ color: '#c8b89a', padding: '2rem', textAlign: 'center' }}>
      <div style={{ animation: 'pulse 1.5s ease infinite', fontSize: '2rem', marginBottom: '0.5rem' }}>⚙️</div>
      Loading settings...
    </div>
  )

  const toggle = k => setSettings(s => ({ ...s, [k]: !s[k] }))
  const set = (k, v) => setSettings(s => ({ ...s, [k]: v }))

  const iStyle = {
    background: 'rgba(201,168,76,0.05)', border: '1px solid rgba(201,168,76,0.2)',
    borderRadius: '8px', padding: '10px 12px', color: '#f5e6c8',
    fontFamily: 'DM Sans', fontSize: '14px', width: '100%', outline: 'none'
  }

  const Toggle = ({ label, k, desc }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.9rem 0', borderBottom: '1px solid rgba(201,168,76,0.08)' }}>
      <div>
        <p style={{ color: '#f5e6c8', fontSize: '14px' }}>{label}</p>
        {desc && <p style={{ color: '#8a7a65', fontSize: '12px', marginTop: '2px' }}>{desc}</p>}
      </div>
      <button onClick={() => toggle(k)} style={{
        width: '48px', height: '26px', borderRadius: '13px', border: 'none',
        position: 'relative', background: settings[k] ? '#c9a84c' : 'rgba(255,255,255,0.1)',
        transition: 'background 0.2s', flexShrink: 0
      }}>
        <span style={{ position: 'absolute', top: '3px', left: settings[k] ? '25px' : '3px', width: '20px', height: '20px', borderRadius: '50%', background: 'white', transition: 'left 0.2s' }} />
      </button>
    </div>
  )

  const Card = ({ title, children }) => (
    <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(201,168,76,0.1)', borderRadius: '12px', padding: '1.5rem', marginBottom: '1.5rem' }}>
      <h4 style={{ color: '#c9a84c', fontSize: '12px', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '1.2rem' }}>{title}</h4>
      {children}
    </div>
  )

  // Discount input with live preview and color feedback
  const DiscountField = ({ label, pctKey, labelKey, labelPlaceholder }) => {
    const pct = settings[pctKey] || 0
    const isHigh = pct > 70
    const isMid = pct > 40 && pct <= 70
    const barColor = isHigh ? '#c0392b' : isMid ? '#e67e22' : '#27ae60'
    const barWidth = `${pct}%`
    return (
      <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '10px', padding: '1rem', marginBottom: '0.75rem', border: '1px solid rgba(201,168,76,0.1)' }}>
        <p style={{ color: '#f5e6c8', fontSize: '13px', fontWeight: 600, marginBottom: '0.75rem' }}>{label}</p>
        <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '0.75rem', alignItems: 'start' }}>
          <div>
            <p style={{ color: '#c8b89a', fontSize: '11px', marginBottom: '5px' }}>Discount (0–98%)</p>
            <div style={{ position: 'relative' }}>
              <input
                type="number" min="0" max="98"
                value={discountRaw[pctKey] ?? pct}
                onChange={e => handleDiscountChange(pctKey, e.target.value)}
                onBlur={e => handleDiscountBlur(pctKey, e.target.value)}
                style={{ ...iStyle, paddingRight: '28px', border: `1px solid ${isHigh ? '#c0392b' : 'rgba(201,168,76,0.2)'}`, color: isHigh ? '#c0392b' : '#f5e6c8' }}
              />
              <span style={{ position: 'absolute', right: '9px', top: '50%', transform: 'translateY(-50%)', color: '#8a7a65', fontSize: '12px', fontWeight: 600 }}>%</span>
            </div>
            {/* Visual bar */}
            <div style={{ marginTop: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', height: '4px', overflow: 'hidden' }}>
              <div style={{ background: barColor, height: '100%', width: barWidth, transition: 'width 0.3s, background 0.3s', borderRadius: '4px' }} />
            </div>
            {pct > 0 && <p style={{ color: barColor, fontSize: '10px', marginTop: '3px', fontWeight: 600 }}>{pct}% off applied</p>}
            {isHigh && <p style={{ color: '#c0392b', fontSize: '10px', marginTop: '2px' }}>⚠️ Very high discount</p>}
          </div>
          <div>
            <p style={{ color: '#c8b89a', fontSize: '11px', marginBottom: '5px' }}>Label (shown in banner)</p>
            <input
              value={settings[labelKey] || ''}
              onChange={e => set(labelKey, e.target.value)}
              style={iStyle}
              placeholder={labelPlaceholder}
              maxLength={60}
            />
            <p style={{ color: '#8a7a65', fontSize: '10px', marginTop: '3px' }}>{(settings[labelKey] || '').length}/60</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: '660px' }}>
      <h3 style={{ fontFamily: 'Cormorant Garamond', fontSize: '24px', color: '#f5e6c8', marginBottom: '2rem' }}>Settings</h3>

      {/* ── DISCOUNTS ── */}
      <Card title="Discounts">
        <div style={{ background: 'rgba(201,168,76,0.06)', borderRadius: '8px', padding: '10px 14px', marginBottom: '1.2rem', fontSize: '13px', color: '#c8b89a', lineHeight: 1.6 }}>
          ℹ️ Discounts show as <strong style={{ color: '#c9a84c' }}>strikethrough prices</strong> on the website in real time. Max <strong style={{ color: '#c9a84c' }}>98%</strong>. Set to 0 to disable.
        </div>
        <DiscountField label="🌟 Global (both menus)" pctKey="global_discount_pct" labelKey="global_discount_label" labelPlaceholder="e.g. Weekend Special" />
        <DiscountField label="🍛 Maa Ki Thali only" pctKey="thali_discount_pct" labelKey="thali_discount_label" labelPlaceholder="e.g. Thali Tuesday" />
        <DiscountField label="🥡 Chinese & More only" pctKey="chinese_discount_pct" labelKey="chinese_discount_label" labelPlaceholder="e.g. Chinese Fest" />
        {(settings.global_discount_pct > 0 || settings.thali_discount_pct > 0 || settings.chinese_discount_pct > 0) && (
          <p style={{ color: '#27ae60', fontSize: '12px', marginTop: '0.5rem' }}>✅ Active discount — visible to customers now</p>
        )}
      </Card>

      {/* ── BANNER ── */}
      <Card title="Announcement Banner">
        <Toggle label="Show Banner" k="banner_active" desc="Animated gold banner at top of website" />
        <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div>
            <p style={{ color: '#c8b89a', fontSize: '11px', marginBottom: '5px' }}>Banner Text</p>
            <input value={settings.banner_text || ''} onChange={e => set('banner_text', e.target.value)} style={iStyle} placeholder="e.g. 🎉 20% off all thalis today only!" maxLength={120} />
          </div>
          <div>
            <p style={{ color: '#c8b89a', fontSize: '11px', marginBottom: '5px' }}>Marquee Strip Text (replaces default strip)</p>
            <input value={settings.announcement || ''} onChange={e => set('announcement', e.target.value)} style={iStyle} placeholder="Leave empty to show default strip" maxLength={200} />
          </div>
        </div>
      </Card>

      {/* ── OPERATIONS ── */}
      <Card title="Operations">
        <Toggle label="Accept Orders" k="accept_orders" desc="Turn off to pause all incoming orders" />
        <Toggle label="Show Maa Ki Thali Menu" k="show_thali_menu" />
        <Toggle label="Show Chinese Menu" k="show_chinese_menu" />
        <Toggle label="COD Enabled" k="cod_enabled" />
        <Toggle label="Free Delivery (All Orders)" k="free_delivery" desc="Overrides the threshold — all orders free" />
      </Card>

      {/* ── DELIVERY PRICING ── */}
      <Card title="Delivery Pricing">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            <p style={{ color: '#c8b89a', fontSize: '11px', marginBottom: '5px' }}>Delivery Charge (₹)</p>
            <input type="number" min="0" max="500" value={settings.delivery_charge || 0}
              onChange={e => setNumber('delivery_charge', e.target.value, 0, 500)} style={iStyle} />
          </div>
          <div>
            <p style={{ color: '#c8b89a', fontSize: '11px', marginBottom: '5px' }}>Free Delivery Above (₹)</p>
            <input type="number" min="0" max="9999" value={settings.free_delivery_threshold || 269}
              onChange={e => setNumber('free_delivery_threshold', e.target.value, 0, 9999)} style={iStyle} />
          </div>
        </div>
      </Card>

      {/* ── TIMINGS ── */}
      <Card title="Timings">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          {[['Opening Time', 'opening_time'], ['Closing Time', 'closing_time']].map(([label, key]) => (
            <div key={key}>
              <p style={{ color: '#c8b89a', fontSize: '11px', marginBottom: '5px' }}>{label}</p>
              <input type="time" value={settings[key] || ''} onChange={e => set(key, e.target.value)} style={iStyle} />
            </div>
          ))}
        </div>
      </Card>

      {/* ── CONTACT ── */}
      <Card title="Contact Details">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {[['Primary WhatsApp (with country code)', 'whatsapp_primary', '919711386962'], ['Secondary Phone', 'whatsapp_secondary', '919217291488'], ['Contact Email', 'contact_email', 'feastwala3@gmail.com']].map(([label, key, ph]) => (
            <div key={key}>
              <p style={{ color: '#c8b89a', fontSize: '11px', marginBottom: '5px' }}>{label}</p>
              <input value={settings[key] || ''} onChange={e => set(key, e.target.value)} style={iStyle} placeholder={ph} />
            </div>
          ))}
        </div>
      </Card>

      <button onClick={save} disabled={saving} style={{
        background: saving ? 'rgba(201,168,76,0.4)' : '#c9a84c',
        border: 'none', borderRadius: '10px', padding: '14px 48px',
        color: '#0a0500', fontWeight: 700, fontSize: '16px',
        fontFamily: 'DM Sans', transition: 'opacity 0.2s',
        opacity: saving ? 0.7 : 1
      }}>
        {saving ? 'Saving...' : 'Save All Settings'}
      </button>
    </div>
  )
}
