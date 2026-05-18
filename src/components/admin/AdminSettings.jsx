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
    if (!error) toast.success('Settings saved') 
      else toast.error('Failed to save')
  }

  if (!settings) return <div style={{ color: '#c8b89a', padding: '2rem' }}>Loading...</div>

  const toggle = (key) => setSettings(s => ({ ...s, [key]: !s[key] }))
  const set = (key, val) => setSettings(s => ({ ...s, [key]: val }))

  const Toggle = ({ label, k, desc }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 0', borderBottom: '1px solid rgba(201,168,76,0.08)' }}>
      <div>
        <p style={{ color: '#f5e6c8', fontSize: '14px' }}>{label}</p>
        {desc && <p style={{ color: '#8a7a65', fontSize: '12px', marginTop: '2px' }}>{desc}</p>}
      </div>
      <button onClick={() => toggle(k)} style={{
        width: '48px', height: '26px', borderRadius: '13px', border: 'none', position: 'relative',
        background: settings[k] ? '#c9a84c' : 'rgba(255,255,255,0.1)', transition: 'background 0.2s'
      }}>
        <span style={{ position: 'absolute', top: '3px', left: settings[k] ? '25px' : '3px', width: '20px', height: '20px', borderRadius: '50%', background: 'white', transition: 'left 0.2s' }} />
      </button>
    </div>
  )

  return (
    <div style={{ maxWidth: '600px' }}>
      <h3 style={{ fontFamily: 'Cormorant Garamond', fontSize: '24px', color: '#f5e6c8', marginBottom: '2rem' }}>Settings</h3>

      <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(201,168,76,0.1)', borderRadius: '12px', padding: '1.5rem', marginBottom: '1.5rem' }}>
        <h4 style={{ color: '#c9a84c', fontSize: '14px', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Operations</h4>
        <Toggle label="Accept Orders" k="accept_orders" desc="Toggle to stop taking new orders" />
        <Toggle label="Show Maa Ki Thali Menu" k="show_thali_menu" />
        <Toggle label="Show Chinese Menu" k="show_chinese_menu" />
        <Toggle label="COD Enabled" k="cod_enabled" />
        <Toggle label="Free Delivery (All Orders)" k="free_delivery" />
      </div>

      <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(201,168,76,0.1)', borderRadius: '12px', padding: '1.5rem', marginBottom: '1.5rem' }}>
        <h4 style={{ color: '#c9a84c', fontSize: '14px', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '1rem' }}>Delivery Pricing</h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          {[['Delivery Charge (₹)', 'delivery_charge'], ['Free Delivery Above (₹)', 'free_delivery_threshold']].map(([label, key]) => (
            <div key={key}>
              <p style={{ color: '#c8b89a', fontSize: '12px', marginBottom: '6px' }}>{label}</p>
              <input type="number" value={settings[key] || ''} onChange={e => set(key, parseInt(e.target.value))}
                style={{ background: 'rgba(201,168,76,0.05)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: '8px', padding: '10px', color: '#f5e6c8', fontFamily: 'DM Sans', fontSize: '14px', width: '100%' }} />
            </div>
          ))}
        </div>
      </div>

      <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(201,168,76,0.1)', borderRadius: '12px', padding: '1.5rem', marginBottom: '1.5rem' }}>
        <h4 style={{ color: '#c9a84c', fontSize: '14px', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '1rem' }}>Timings</h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          {[['Opening Time', 'opening_time'], ['Closing Time', 'closing_time']].map(([label, key]) => (
            <div key={key}>
              <p style={{ color: '#c8b89a', fontSize: '12px', marginBottom: '6px' }}>{label}</p>
              <input type="time" value={settings[key] || ''} onChange={e => set(key, e.target.value)}
                style={{ background: 'rgba(201,168,76,0.05)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: '8px', padding: '10px', color: '#f5e6c8', fontFamily: 'DM Sans', fontSize: '14px', width: '100%' }} />
            </div>
          ))}
        </div>
      </div>

      <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(201,168,76,0.1)', borderRadius: '12px', padding: '1.5rem', marginBottom: '1.5rem' }}>
        <h4 style={{ color: '#c9a84c', fontSize: '14px', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '1rem' }}>Contact Numbers</h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {[['Primary WhatsApp', 'whatsapp_primary'], ['Secondary Phone', 'whatsapp_secondary']].map(([label, key]) => (
            <div key={key}>
              <p style={{ color: '#c8b89a', fontSize: '12px', marginBottom: '6px' }}>{label}</p>
              <input value={settings[key] || ''} onChange={e => set(key, e.target.value)}
                style={{ background: 'rgba(201,168,76,0.05)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: '8px', padding: '10px', color: '#f5e6c8', fontFamily: 'DM Sans', fontSize: '14px', width: '100%' }} />
            </div>
          ))}
        </div>
      </div>

      <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(201,168,76,0.1)', borderRadius: '12px', padding: '1.5rem', marginBottom: '2rem' }}>
        <h4 style={{ color: '#c9a84c', fontSize: '14px', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>Announcement Banner</h4>
        <input placeholder="e.g. Closed on 26th January" value={settings.announcement || ''} onChange={e => set('announcement', e.target.value)}
          style={{ background: 'rgba(201,168,76,0.05)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: '8px', padding: '10px', color: '#f5e6c8', fontFamily: 'DM Sans', fontSize: '14px', width: '100%' }} />
      </div>

      <button onClick={save} disabled={saving} style={{ background: '#c9a84c', border: 'none', borderRadius: '10px', padding: '14px 40px', color: '#0a0500', fontWeight: 700, fontSize: '16px', fontFamily: 'DM Sans', opacity: saving ? 0.7 : 1 }}>
        {saving ? 'Saving...' : 'Save Settings'}
      </button>
    </div>
  )
}
