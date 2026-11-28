import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './net/debug'
import { measuring } from './settings'
import './styles.css'

// ?measure starts with the page, before the 3d view (which might never start)
if (measuring) void import('./net/measure').then((m) => m.startMeasuring())

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
