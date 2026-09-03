import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { getInitData } from './admin/api'

// Capture and cache Telegram session immediately before React boots
try {
  getInitData();
} catch {}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
