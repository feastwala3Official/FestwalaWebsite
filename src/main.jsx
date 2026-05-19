import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { CartProvider } from './context/CartContext'
import Website from './pages/Website'
import Admin from './pages/Admin'
import ReviewPage from './pages/ReviewPage'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <CartProvider>
        <Toaster position="top-center" toastOptions={{
          style: { background: '#1a0a00', color: '#f5e6c8', border: '1px solid #c9a84c' }
        }} />
        <Routes>
          <Route path="/" element={<Website />} />
          <Route path="/admin" element={<Admin />} />
          {/* <Route path="/admin.html" element={<Admin />} /> */}
          <Route path="/review" element={<ReviewPage />} />
        </Routes>
      </CartProvider>
    </BrowserRouter>
  </React.StrictMode>
)
