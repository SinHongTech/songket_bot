import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { getTelegramWebApp, getInitData } from './admin/api'

// Initialize Telegram WebApp bridge immediately before React boots
try {
  const tg = getTelegramWebApp();
  if (tg) {
    tg.ready();
    tg.expand();
  }
  getInitData();
} catch {}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
