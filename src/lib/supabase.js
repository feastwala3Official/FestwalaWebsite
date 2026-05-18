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

export const CONFIG = {
  whatsapp: '919711386962',
  whatsapp2: '919217291488',
  outletLat: 28.5355,
  outletLng: 77.2100,
  maxDeliveryKm: 15,
  razorpayKey: 'rzp_test_REPLACE_WITH_YOUR_KEY',
  sheetWebhook: 'REPLACE_WITH_YOUR_APPS_SCRIPT_URL'
}
