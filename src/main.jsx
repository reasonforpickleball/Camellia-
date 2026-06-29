import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'
import { initAmplitude } from '@/lib/analytics'

// Initialize Amplitude (best-effort; analytics.js uses the CDN-loaded sdk)
initAmplitude()

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)
