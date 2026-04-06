import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'
import { initializeData } from '@/lib/celulosaData'

// Initialize celulosa data
initializeData()

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)
