import { useState, useEffect } from 'react'
import { supabase, makeUsername } from '../../lib/supabase'
import { emailManagerCredentials } from '../../lib/emails'
import toast from 'react-hot-toast'

export default function AdminUsers() {
  const [staff, setStaff] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', email: '' })
  const [creating, setCreating] = useState(false)

  async function load() {
    const { data } = await supabase.from('staff_roles').select('*').order('created_at', { ascending: false })
    if (data) setStaff(data)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function createManager(e) {
    e.preventDefault()
    if (!form.name.trim()) return toast.error('Enter the staff name')
    if (!form.email.trim() || !form.email.includes('@')) return toast.error('Enter a valid email')

    setCreating(true)
    const username = makeUsername(form.name)
    const password = username // default password = username

    try {
      // Create auth user via signUp
      const { data: authData, error: authErr } = await supabase.auth.signUp({
        email: form.email.trim(),
        password: password,
        options: { data: { name: form.name, username } }
      })

      if (authErr) {
        toast.error(authErr.message)
        setCreating(false)
        return
      }

      // Insert role record
      const { error: roleErr } = await supabase.from('staff_roles').insert({
        user_id: authData.user?.id,
        email: form.email.trim(),
        name: form.name.trim(),
        username,
        role: 'manager'
      })

      if (roleErr) {
        toast.error('Could not save role: ' + roleErr.message)
        setCreating(false)
        return
      }

      // Email credentials
      await emailManagerCredentials(form.email.trim(), form.name.trim(), form.email.trim(), password)

      toast.success(`Manager created! Login: ${form.email} / ${password}`, { duration: 8000 })
      setForm({ name: '', email: '' })
      setShowForm(false)
      load()
    } catch (err) {
      toast.error('Something went wrong')
    }
    setCreating(false)
  }

  async function removeStaff(id, role) {
    if (role === 'super_admin') return toast.error('Cannot remove super admin')
    if (!confirm('Remove this manager? They will lose admin access.')) return
    const { error } = await supabase.from('staff_roles').delete().eq('id', id)
    if (!error) { toast.success('Manager removed'); load() }
    else toast.error('Could not remove')
  }

  const iStyle = {
    background: 'rgba(201,168,76,0.05)', border: '1px solid rgba(201,168,76,0.2)',
    borderRadius: '8px', padding: '11px 14px', color: '#f5e6c8', fontSize: '14px',
    fontFamily: 'DM Sans', width: '100%', outline: 'none'
  }

  if (loading) return <div style={{ color: '#c8b89a', padding: '2rem' }}>Loading...</div>

  return (
    <div style={{ maxWidth: '640px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h3 style={{ fontFamily: 'Cormorant Garamond', fontSize: '24px', color: '#f5e6c8' }}>Staff & Access</h3>
        <button onClick={() => setShowForm(!showForm)} style={{ background: '#c9a84c', border: 'none', borderRadius: '8px', padding: '10px 20px', color: '#0a0500', fontWeight: 700, fontSize: '13px', fontFamily: 'DM Sans' }}>
          {showForm ? 'Cancel' : '+ Add Manager'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={createManager} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(201,168,76,0.15)', borderRadius: '12px', padding: '1.5rem', marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <p style={{ color: '#c8b89a', fontSize: '12px', marginBottom: '6px' }}>Manager Name</p>
            <input style={iStyle} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Rahul Sharma" />
            {form.name && <p style={{ color: '#8a7a65', fontSize: '11px', marginTop: '4px' }}>Username will be: <span style={{ color: '#c9a84c' }}>{makeUsername(form.name)}</span></p>}
          </div>
          <div>
            <p style={{ color: '#c8b89a', fontSize: '12px', marginBottom: '6px' }}>Email (they receive login here)</p>
            <input type="email" style={iStyle} value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="rahul@example.com" />
          </div>
          <div style={{ background: 'rgba(201,168,76,0.06)', borderRadius: '8px', padding: '10px 14px' }}>
            <p style={{ color: '#c8b89a', fontSize: '12px', lineHeight: 1.6 }}>
              Manager can: view orders, update status, change item prices, add menu items.<br />
              Manager cannot: change discounts, banner, settings, or create users.
            </p>
          </div>
          <button type="submit" disabled={creating} style={{ background: '#c9a84c', border: 'none', borderRadius: '8px', padding: '12px', color: '#0a0500', fontWeight: 700, fontSize: '14px', fontFamily: 'DM Sans' }}>
            {creating ? 'Creating...' : 'Create Manager Account'}
          </button>
        </form>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {staff.map(s => (
          <div key={s.id} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(201,168,76,0.1)', borderRadius: '12px', padding: '1.2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ color: '#f5e6c8', fontSize: '15px', fontWeight: 600 }}>{s.name}</p>
              <p style={{ color: '#8a7a65', fontSize: '12px', marginTop: '2px' }}>{s.email}</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <span style={{
                background: s.role === 'super_admin' ? 'rgba(201,168,76,0.15)' : 'rgba(52,152,219,0.15)',
                color: s.role === 'super_admin' ? '#c9a84c' : '#3498db',
                padding: '4px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 600
              }}>
                {s.role === 'super_admin' ? '👑 Super Admin' : '👤 Manager'}
              </span>
              {s.role !== 'super_admin' && (
                <button onClick={() => removeStaff(s.id, s.role)} style={{ background: 'none', border: '1px solid rgba(192,57,43,0.3)', color: '#c0392b', borderRadius: '6px', padding: '5px 10px', fontSize: '12px', fontFamily: 'DM Sans' }}>Remove</button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
