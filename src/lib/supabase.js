import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://lqaasxstgsrrvdwlimdy.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxxYWFzeHN0Z3NycnZkd2xpbWR5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkwOTMzNjIsImV4cCI6MjA5NDY2OTM2Mn0.XPOU0bE8u7gjL_svbaScCqd1pA4Vxh-K0wmT3yepqMA'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  realtime: { params: { eventsPerSecond: 10 } }
})

export const CLOUDINARY = {
  cloud: 'dnd4tnx2a',
  video1: 'https://res.cloudinary.com/dnd4tnx2a/video/upload/v1779093582/WhatsApp_Video_2026-05-13_at_13.50.24_zge563.mp4',
  video2: 'https://res.cloudinary.com/dnd4tnx2a/video/upload/v1779093582/WhatsApp_Video_2026-05-13_at_13.50.24_1_bjlpuk.mp4'
}

export const OUTLETS = [
  {
    name: 'FeastWala',
    area: 'Malviya Nagar',
    lat: 28.530679,
    lng: 77.207624,
    address: 'Malviya Nagar, New Delhi',
    whatsapp: '919711386962',
    maxDeliveryKm: 10
  },
  {
    name: 'Maa Ki Thali',
    area: 'Kishangarh',
    lat: 28.522287,
    lng: 77.169902,
    address: 'Kishangarh, New Delhi',
    whatsapp: '919217291488',
    maxDeliveryKm: 10
  }
]

export const CONFIG = {
  whatsapp: '919711386962',
  whatsapp2: '919217291488',
  email: 'feastwala3@gmail.com',
  razorpayKey: 'rzp_test_Sr9OtBXtzzgTFE',
  sheetWebhook: 'REPLACE_WITH_YOUR_APPS_SCRIPT_URL',
  googleMapsKey: 'AIzaSyDZs3QHtvnZVjXgOiQEfwOSZcEdRv5lmwE'
}

export function getDistance(lat1, lng1, lat2, lng2) {
  const R = 6371, toR = d => d * Math.PI / 180
  const dLat = toR(lat2 - lat1), dLng = toR(lng2 - lng1)
  const a = Math.sin(dLat/2)**2 + Math.cos(toR(lat1))*Math.cos(toR(lat2))*Math.sin(dLng/2)**2
  return R * 2 * Math.asin(Math.sqrt(a))
}

export function checkDeliveryZone(lat, lng) {
  let nearest = null, minDist = Infinity
  for (const outlet of OUTLETS) {
    const dist = getDistance(lat, lng, outlet.lat, outlet.lng)
    if (dist < minDist) { minDist = dist; nearest = outlet }
  }
  return {
    outlet: nearest,
    distance: Math.round(minDist * 10) / 10,
    canDeliver: minDist <= nearest.maxDeliveryKm
  }
}

export function applyDiscount(price, pct) {
  if (!pct || pct <= 0) return price
  return Math.round(price * (1 - pct / 100))
}
