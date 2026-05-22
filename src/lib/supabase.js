import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://lqaasxstgsrrvdwlimdy.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxxYWFzeHN0Z3NycnZkd2xpbWR5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkwOTMzNjIsImV4cCI6MjA5NDY2OTM2Mn0.XPOU0bE8u7gjL_svbaScCqd1pA4Vxh-K0wmT3yepqMA'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  realtime: { params: { eventsPerSecond: 10 } },
  auth: { persistSession: true, autoRefreshToken: true }
})

export const CLOUDINARY = {
  cloud: 'dnd4tnx2a',
  video1: 'https://res.cloudinary.com/dnd4tnx2a/video/upload/v1779093582/WhatsApp_Video_2026-05-13_at_13.50.24_zge563.mp4',
  video2: 'https://res.cloudinary.com/dnd4tnx2a/video/upload/v1779093582/WhatsApp_Video_2026-05-13_at_13.50.24_1_bjlpuk.mp4'
}

// SINGLE OUTLET — FeastWala Malviya Nagar only
export const OUTLETS = [
  {
    name: 'FeastWala',
    area: 'our outlet',
    lat: 28.530679,
    lng: 77.207624,
    address: 'New Delhi',
    whatsapp: '919711386962',
    maxDeliveryKm: 10
  }
]

export const CONFIG = {
  whatsapp: '919711386962',
  email: 'feastwala3@gmail.com',
  razorpayKey: 'rzp_test_Sr9OtBXtzzgTFE',
  sheetWebhook: 'REPLACE_WITH_YOUR_APPS_SCRIPT_URL',
  googleMapsKey: 'AIzaSyDZs3QHtvnZVjXgOiQEfwOSZcEdRv5lmwE',
  resendKey: 're_aoWmRZbq_K1w8pFJzRKxRaxwL99hBJvHe',
  siteUrl: 'https://feastwala-website.vercel.app',
  prepTimeMins: 30,
  bufferMins: 5
}

export function getDistance(lat1, lng1, lat2, lng2) {
  const R = 6371, toR = d => d * Math.PI / 180
  const dLat = toR(lat2 - lat1), dLng = toR(lng2 - lng1)
  const a = Math.sin(dLat/2)**2 + Math.cos(toR(lat1))*Math.cos(toR(lat2))*Math.sin(dLng/2)**2
  return R * 2 * Math.asin(Math.sqrt(a))
}

export function checkDeliveryZone(lat, lng) {
  const outlet = OUTLETS[0]
  const dist = getDistance(lat, lng, outlet.lat, outlet.lng)
  return {
    outlet,
    distance: Math.round(dist * 10) / 10,
    canDeliver: dist <= outlet.maxDeliveryKm
  }
}

export function applyDiscount(price, pct) {
  if (!pct || pct <= 0) return price
  return Math.round(price * (1 - pct / 100))
}

// Generate username: first 6 letters of name + @feastwala
export function makeUsername(name) {
  const clean = name.toLowerCase().replace(/[^a-z]/g, '')
  const prefix = clean.slice(0, 6) || 'staff'
  return `${prefix}@feastwala`
}
