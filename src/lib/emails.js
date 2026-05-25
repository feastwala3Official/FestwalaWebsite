// ── FeastWala Email Service (Resend) ──
// For MVP this calls Resend directly from frontend.
// Later move to a Supabase Edge Function to fully hide the key.

import { CONFIG } from './supabase'

const RESEND_KEY = CONFIG.resendKey
const FROM = 'FeastWala <onboarding@resend.dev>'
const RESTAURANT_EMAIL = 'feastwala3@gmail.com'

async function sendEmail({ to, subject, html }) {
  if (!RESEND_KEY || RESEND_KEY.startsWith('REPLACE')) {
    console.log('Resend not configured')
    return
  }
  // Resend sandbox: can only send to verified address (feastwala3@gmail.com)
  // Until custom domain is set up, route all emails to restaurant
  const safeTo = Array.isArray(to) ? to : [to]
  const finalTo = safeTo.map(addr => {
    if (addr === RESTAURANT_EMAIL) return addr
    // sandbox restriction — send to restaurant with customer address in subject
    return RESTAURANT_EMAIL
  })
  const dedupedTo = [...new Set(finalTo)]
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: FROM, to: dedupedTo, subject, html })
    })
    const result = await res.json()
    if (!res.ok) {
      console.error('Email failed:', result)
    } else {
      console.log('Email sent:', result.id, '→', dedupedTo)
    }
  } catch (e) { console.error('Email error:', e) }
}

const wrap = (inner) => `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0a0500; padding: 32px; border-radius: 12px;">
  <div style="text-align: center; margin-bottom: 24px;">
    <h1 style="color: #c9a84c; font-size: 28px; margin: 0;">FeastWala</h1>
    <p style="color: #c8b89a; font-size: 13px; margin: 4px 0 0;">Fresh. Never Frozen.</p>
  </div>
  ${inner}
  <div style="border-top: 1px solid rgba(201,168,76,0.2); margin-top: 24px; padding-top: 16px; text-align: center;">
    <p style="color: #8a7a65; font-size: 12px;">FeastWala &middot; New Delhi &middot; +91 9711386962</p>
  </div>
</div>`

const itemRows = (items) => (items || []).map(i =>
  `<tr><td style="color:#c8b89a;padding:4px 0;">${i.name} &times; ${i.qty}</td><td style="color:#f5e6c8;text-align:right;">&#8377;${i.price * i.qty}</td></tr>`
).join('')

export async function emailOrderToRestaurant(order) {
  const html = wrap(`
    <div style="background: rgba(201,168,76,0.08); border-radius: 8px; padding: 16px; margin-bottom: 16px;">
      <h2 style="color: #f5e6c8; font-size: 18px; margin: 0 0 12px;">New Order #${order.order_id}</h2>
      <table style="width: 100%; font-size: 14px;">
        <tr><td style="color:#8a7a65;">Customer</td><td style="color:#f5e6c8;text-align:right;">${order.customer_name}</td></tr>
        <tr><td style="color:#8a7a65;">Phone</td><td style="color:#f5e6c8;text-align:right;">${order.phone}</td></tr>
        <tr><td style="color:#8a7a65;">Type</td><td style="color:#f5e6c8;text-align:right;">${order.order_type}</td></tr>
        <tr><td style="color:#8a7a65;">Address</td><td style="color:#f5e6c8;text-align:right;">${order.address}</td></tr>
        <tr><td style="color:#8a7a65;">Payment</td><td style="color:#f5e6c8;text-align:right;">${order.payment_mode}${order.payment_id ? ' (Paid)' : ''}</td></tr>
        <tr><td style="color:#8a7a65;">Est. Time</td><td style="color:#f5e6c8;text-align:right;">${order.estimated_time}</td></tr>
      </table>
    </div>
    <table style="width: 100%; font-size: 14px;">
      ${itemRows(order.items)}
      <tr><td style="color:#c9a84c;font-weight:bold;padding-top:8px;border-top:1px solid rgba(201,168,76,0.2);">Total</td><td style="color:#c9a84c;font-weight:bold;text-align:right;padding-top:8px;border-top:1px solid rgba(201,168,76,0.2);">&#8377;${order.total}</td></tr>
    </table>
  `)
  await sendEmail({ to: RESTAURANT_EMAIL, subject: `New Order #${order.order_id} from ${order.customer_name}`, html })
}

export async function emailOrderToCustomer(order, customerEmail, trackUrl) {
  if (!customerEmail) return
  const html = wrap(`
    <div style="background: rgba(39,174,96,0.1); border-radius: 8px; padding: 16px; margin-bottom: 16px; text-align: center;">
      <div style="font-size: 36px;">&#9989;</div>
      <h2 style="color: #f5e6c8; font-size: 20px; margin: 8px 0;">Order Confirmed!</h2>
      <p style="color: #c8b89a; font-size: 14px;">Thank you ${order.customer_name}, we've received your order.</p>
    </div>
    <table style="width: 100%; font-size: 14px; margin-bottom: 16px;">
      <tr><td style="color:#8a7a65;">Order ID</td><td style="color:#f5e6c8;text-align:right;">${order.order_id}</td></tr>
      <tr><td style="color:#8a7a65;">Total</td><td style="color:#f5e6c8;text-align:right;">&#8377;${order.total}</td></tr>
      <tr><td style="color:#8a7a65;">Payment</td><td style="color:#f5e6c8;text-align:right;">${order.payment_mode}</td></tr>
      <tr><td style="color:#8a7a65;">Est. Delivery</td><td style="color:#c9a84c;text-align:right;font-weight:bold;">${order.estimated_time}</td></tr>
    </table>
    <table style="width: 100%; font-size: 14px; margin-bottom: 20px;">${itemRows(order.items)}</table>
    <div style="text-align: center;">
      <a href="${trackUrl}" style="display: inline-block; background: #c9a84c; color: #0a0500; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-weight: bold; font-size: 15px;">Track Your Order &rarr;</a>
    </div>
    <p style="color: #8a7a65; font-size: 13px; text-align: center; margin-top: 16px;">We prepare everything fresh to order, never frozen. That's why it takes a little longer, but it's worth it!</p>
  `)
  await sendEmail({ to: customerEmail, subject: `Order Confirmed #${order.order_id} - FeastWala`, html })
}

export async function emailDeliveredToCustomer(order, customerEmail, reviewUrl) {
  if (!customerEmail) return
  const html = wrap(`
    <div style="text-align: center; margin-bottom: 16px;">
      <div style="font-size: 36px;">&#127881;</div>
      <h2 style="color: #f5e6c8; font-size: 20px; margin: 8px 0;">Your order has been delivered!</h2>
      <p style="color: #c8b89a; font-size: 14px;">We hope you enjoyed your meal, ${order.customer_name}.</p>
    </div>
    <div style="text-align: center; margin: 24px 0;">
      <p style="color: #c8b89a; font-size: 14px; margin-bottom: 12px;">How was everything? We'd love your feedback!</p>
      <a href="${reviewUrl}" style="display: inline-block; background: #c9a84c; color: #0a0500; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-weight: bold; font-size: 15px;">Leave a Review</a>
    </div>
    <p style="color: #8a7a65; font-size: 13px; text-align: center;">Thank you for choosing FeastWala. See you again soon!</p>
  `)
  await sendEmail({ to: customerEmail, subject: `How was your FeastWala order?`, html })
}

export async function emailManagerCredentials(staffEmail, name, username, password) {
  const html = wrap(`
    <h2 style="color: #f5e6c8; font-size: 18px;">Welcome to the FeastWala team, ${name}!</h2>
    <p style="color: #c8b89a; font-size: 14px;">An admin account has been created for you. Here are your login details:</p>
    <div style="background: rgba(201,168,76,0.08); border-radius: 8px; padding: 16px; margin: 16px 0;">
      <table style="width: 100%; font-size: 14px;">
        <tr><td style="color:#8a7a65;">Username/Email</td><td style="color:#f5e6c8;text-align:right;font-family:monospace;">${username}</td></tr>
        <tr><td style="color:#8a7a65;">Password</td><td style="color:#f5e6c8;text-align:right;font-family:monospace;">${password}</td></tr>
      </table>
    </div>
    <p style="color: #c8b89a; font-size: 13px;">Please log in and change your password soon.</p>
    <div style="text-align: center; margin-top: 20px;">
      <a href="https://feastwala-website.vercel.app/admin" style="display: inline-block; background: #c9a84c; color: #0a0500; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-weight: bold;">Login to Admin &rarr;</a>
    </div>
  `)
  await sendEmail({ to: staffEmail, subject: `Your FeastWala Admin Account`, html })
}

export async function emailReviewNotification(review) {
  const stars = '★'.repeat(review.rating) + '☆'.repeat(5 - review.rating)
  const html = wrap(`
    <div style="background: rgba(201,168,76,0.08); border-radius: 8px; padding: 16px; margin-bottom: 16px;">
      <h2 style="color: #f5e6c8; font-size: 18px; margin: 0 0 8px;">New Review Received</h2>
      <p style="color: #c9a84c; font-size: 22px; margin: 0 0 12px;">${stars}</p>
      <table style="width: 100%; font-size: 14px;">
        <tr><td style="color:#8a7a65;">Customer</td><td style="color:#f5e6c8;text-align:right;">${review.customer_name}</td></tr>
        <tr><td style="color:#8a7a65;">Phone</td><td style="color:#f5e6c8;text-align:right;">${review.phone}</td></tr>
        <tr><td style="color:#8a7a65;">Order ID</td><td style="color:#f5e6c8;text-align:right;">${review.order_id || 'N/A'}</td></tr>
        <tr><td style="color:#8a7a65;">Rating</td><td style="color:#c9a84c;text-align:right;font-weight:bold;">${review.rating} / 5</td></tr>
      </table>
    </div>
    <div style="background: rgba(255,255,255,0.03); border-left: 3px solid #c9a84c; padding: 12px 16px; border-radius: 4px;">
      <p style="color: #c8b89a; font-size: 14px; line-height: 1.7; margin: 0; font-style: italic;">"${review.text}"</p>
    </div>
    <p style="color: #8a7a65; font-size: 12px; text-align: center; margin-top: 16px;">Log in to admin to show/hide this review on the website.</p>
  `)
  await sendEmail({ to: RESTAURANT_EMAIL, subject: `New ${review.rating}★ Review from ${review.customer_name}`, html })
}
