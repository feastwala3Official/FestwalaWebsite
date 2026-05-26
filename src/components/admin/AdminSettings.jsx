import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'

// ── Sub-components defined OUTSIDE AdminSettings ──
// This is the fix — defining them inside causes remount on every keystroke

const iStyle = {
  background: 'rgba(201,168,76,0.05)', border: '1px solid rgba(201,168,76,0.2)',
  borderRadius: '8px', padding: '10px 12px', color: '#f5e6c8',
  fontFamily: 'DM Sans', fontSize: '14px', width: '100%', outline: 'none'
}

function Toggle({ label, k, desc, value, onToggle }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.9rem 0', borderBottom: '1px solid rgba(201,168,76,0.08)' }}>
      <div>
        <p style={{ color: '#f5e6c8', fontSize: '14px' }}>{label}</p>
        {desc && <p style={{ color: '#8a7a65', fontSize: '12px', marginTop: '2px' }}>{desc}</p>}
      </div>
      <button onClick={() => onToggle(k)} style={{
        width: '48px', height: '26px', borderRadius: '13px', border: 'none',
        position: 'relative', background: value ? '#c9a84c' : 'rgba(255,255,255,0.1)',
        transition: 'background 0.2s', flexShrink: 0, cursor: 'pointer'
      }}>
        <span style={{ position: 'absolute', top: '3px', left: value ? '25px' : '3px', width: '20px', height: '20px', borderRadius: '50%', background: 'white', transition: 'left 0.2s' }} />
      </button>
    </div>
  )
}

function Card({ title, children }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(201,168,76,0.1)', borderRadius: '12px', padding: '1.5rem', marginBottom: '1.5rem' }}>
      <h4 style={{ color: '#c9a84c', fontSize: '12px', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '1.2rem' }}>{title}</h4>
      {children}
    </div>
  )
}

function DiscountField({ label, pctKey, labelKey, labelPlaceholder, pct, rawValue, labelValue, onDiscountChange, onDiscountBlur, onLabelChange }) {
  const isHigh = pct > 70
  const isMid = pct > 40 && pct <= 70
  const barColor = isHigh ? '#c0392b' : isMid ? '#e67e22' : '#27ae60'
  return (
    <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '10px', padding: '1rem', marginBottom: '0.75rem', border: '1px solid rgba(201,168,76,0.1)' }}>
      <p style={{ color: '#f5e6c8', fontSize: '13px', fontWeight: 600, marginBottom: '0.75rem' }}>{label}</p>
      <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '0.75rem', alignItems: 'start' }}>
        <div>
          <p style={{ color: '#c8b89a', fontSize: '11px', marginBottom: '5px' }}>Discount (0-98%)</p>
          <div style={{ position: 'relative' }}>
            <input type="number" min="0" max="98"
              value={rawValue}
              onChange={e => onDiscountChange(pctKey, e.target.value)}
              onBlur={e => onDiscountBlur(pctKey, e.target.value)}
              style={{ ...iStyle, paddingRight: '28px', border: `1px solid ${isHigh ? '#c0392b' : 'rgba(201,168,76,0.2)'}`, color: isHigh ? '#c0392b' : '#f5e6c8' }}
            />
            <span style={{ position: 'absolute', right: '9px', top: '50%', transform: 'translateY(-50%)', color: '#8a7a65', fontSize: '12px', fontWeight: 600 }}>%</span>
          </div>
          <div style={{ marginTop: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', height: '4px', overflow: 'hidden' }}>
            <div style={{ background: barColor, height: '100%', width: `${pct}%`, transition: 'width 0.3s, background 0.3s', borderRadius: '4px' }} />
          </div>
          {pct > 0 && <p style={{ color: barColor, fontSize: '10px', marginTop: '3px', fontWeight: 600 }}>{pct}% off applied</p>}
          {isHigh && <p style={{ color: '#c0392b', fontSize: '10px', marginTop: '2px' }}>Very high discount</p>}
        </div>
        <div>
          <p style={{ color: '#c8b89a', fontSize: '11px', marginBottom: '5px' }}>Label (shown in banner)</p>
          <input value={labelValue} onChange={e => onLabelChange(labelKey, e.target.value)}
            style={iStyle} placeholder={labelPlaceholder} maxLength={60} />
          <p style={{ color: '#8a7a65', fontSize: '10px', marginTop: '3px' }}>{labelValue.length}/60</p>
        </div>
      </div>
    </div>
  )
}

export default function AdminSettings() {
  const [settings, setSettings] = useState(null)
  const [saving, setSaving] = useState(false)
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
    setDiscountRaw(r => ({ ...r, [key]: raw }))
    const num = parseInt(raw, 10)
    if (!isNaN(num)) setSettings(s => ({ ...s, [key]: Math.min(Math.max(num, 0), 98) }))
  }

  function handleDiscountBlur(key, raw) {
    const num = parseInt(raw, 10)
    const safe = isNaN(num) ? 0 : Math.min(Math.max(num, 0), 98)
    setDiscountRaw(r => ({ ...r, [key]: String(safe) }))
    setSettings(s => ({ ...s, [key]: safe }))
  }

  function setNumber(key, raw, min = 0, max = 99999) {
    const num = parseInt(raw, 10)
    setSettings(s => ({ ...s, [key]: isNaN(num) ? min : Math.min(Math.max(num, min), max) }))
  }

  const toggle = k => setSettings(s => ({ ...s, [k]: !s[k] }))
  const set = (k, v) => setSettings(s => ({ ...s, [k]: v }))

  async function save() {
    if ((settings.global_discount_pct || 0) > 98) return toast.error('Global discount max is 98%')
    if ((settings.thali_discount_pct || 0) > 98) return toast.error('Thali discount max is 98%')
    if ((settings.chinese_discount_pct || 0) > 98) return toast.error('Chinese discount max is 98%')
    setSaving(true)
    const { error } = await supabase.from('settings').update(settings).eq('id', 1)
    setSaving(false)
    if (!error) toast.success('Settings saved!')
    else toast.error('Failed to save. Try again.')
  }

  if (!settings) return (
    <div style={{ color: '#c8b89a', padding: '2rem', textAlign: 'center' }}>
      <div style={{ animation: 'pulse 1.5s ease infinite', fontSize: '2rem', marginBottom: '0.5rem' }}>⚙️</div>
      Loading settings...
    </div>
  )

  return (
    <div style={{ maxWidth: '660px' }}>
      <h3 style={{ fontFamily: 'Cormorant Garamond', fontSize: '24px', color: '#f5e6c8', marginBottom: '2rem' }}>Settings</h3>

      <Card title="Discounts">
        <div style={{ background: 'rgba(201,168,76,0.06)', borderRadius: '8px', padding: '10px 14px', marginBottom: '1.2rem', fontSize: '13px', color: '#c8b89a', lineHeight: 1.6 }}>
          Discounts show as strikethrough prices on the website. Max 98%. Set to 0 to disable.
        </div>
        {[
          { label: '🌟 Global (both menus)', pctKey: 'global_discount_pct', labelKey: 'global_discount_label', ph: 'e.g. Weekend Special' },
          { label: '🍛 Maa Ki Thali only', pctKey: 'thali_discount_pct', labelKey: 'thali_discount_label', ph: 'e.g. Thali Tuesday' },
          { label: '🥡 Chinese & More only', pctKey: 'chinese_discount_pct', labelKey: 'chinese_discount_label', ph: 'e.g. Chinese Fest' }
        ].map(f => (
          <DiscountField key={f.pctKey} label={f.label} pctKey={f.pctKey} labelKey={f.labelKey}
            labelPlaceholder={f.ph} pct={settings[f.pctKey] || 0}
            rawValue={discountRaw[f.pctKey]} labelValue={settings[f.labelKey] || ''}
            onDiscountChange={handleDiscountChange} onDiscountBlur={handleDiscountBlur} onLabelChange={set} />
        ))}
        {(settings.global_discount_pct > 0 || settings.thali_discount_pct > 0 || settings.chinese_discount_pct > 0) && (
          <p style={{ color: '#27ae60', fontSize: '12px', marginTop: '0.5rem' }}>Active discount — visible to customers now</p>
        )}
      </Card>

      <Card title="Announcement Banner">
        <Toggle label="Show Banner" k="banner_active" desc="Animated gold banner at top of website" value={!!settings.banner_active} onToggle={toggle} />
        <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div>
            <p style={{ color: '#c8b89a', fontSize: '11px', marginBottom: '5px' }}>Banner Text</p>
            <input value={settings.banner_text || ''} onChange={e => set('banner_text', e.target.value)} style={iStyle} placeholder="e.g. 20% off all thalis today!" maxLength={120} />
          </div>
          <div>
            <p style={{ color: '#c8b89a', fontSize: '11px', marginBottom: '5px' }}>Marquee Strip Text</p>
            <input value={settings.announcement || ''} onChange={e => set('announcement', e.target.value)} style={iStyle} placeholder="Leave empty to show default strip" maxLength={200} />
          </div>
        </div>
      </Card>

      <Card title="Operations">
        <Toggle label="Accept Orders" k="accept_orders" desc="Turn off to pause all incoming orders" value={!!settings.accept_orders} onToggle={toggle} />
        <Toggle label="Show Maa Ki Thali Menu" k="show_thali_menu" value={!!settings.show_thali_menu} onToggle={toggle} />
        <Toggle label="Show Chinese Menu" k="show_chinese_menu" value={!!settings.show_chinese_menu} onToggle={toggle} />
        <Toggle label="COD Enabled" k="cod_enabled" value={!!settings.cod_enabled} onToggle={toggle} />
        <Toggle label="Free Delivery (All Orders)" k="free_delivery" desc="Overrides the threshold" value={!!settings.free_delivery} onToggle={toggle} />
      </Card>

      <Card title="Delivery Pricing">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            <p style={{ color: '#c8b89a', fontSize: '11px', marginBottom: '5px' }}>Delivery Charge (Rs)</p>
            <input type="number" min="0" max="500" value={settings.delivery_charge || 0}
              onChange={e => setNumber('delivery_charge', e.target.value, 0, 500)} style={iStyle} />
          </div>
          <div>
            <p style={{ color: '#c8b89a', fontSize: '11px', marginBottom: '5px' }}>Free Delivery Above (Rs)</p>
            <input type="number" min="0" max="9999" value={settings.free_delivery_threshold || 269}
              onChange={e => setNumber('free_delivery_threshold', e.target.value, 0, 9999)} style={iStyle} />
          </div>
        </div>
      </Card>

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

      <Card title="Contact Details">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {[
            ['Primary WhatsApp', 'whatsapp_primary', '919711386962'],
            ['Secondary Phone', 'whatsapp_secondary', '919217291488'],
            ['Contact Email', 'contact_email', 'feastwala3@gmail.com']
          ].map(([label, key, ph]) => (
            <div key={key}>
              <p style={{ color: '#c8b89a', fontSize: '11px', marginBottom: '5px' }}>{label}</p>
              <input value={settings[key] || ''} onChange={e => set(key, e.target.value)} style={iStyle} placeholder={ph} />
            </div>
          ))}
        </div>
      </Card>

      <button onClick={save} disabled={saving} style={{
        background: saving ? 'rgba(201,168,76,0.4)' : '#c9a84c', border: 'none', borderRadius: '10px',
        padding: '14px 48px', color: '#0a0500', fontWeight: 700, fontSize: '16px',
        fontFamily: 'DM Sans', opacity: saving ? 0.7 : 1
      }}>
        {saving ? 'Saving...' : 'Save All Settings'}
      </button>
    </div>
  )
}
