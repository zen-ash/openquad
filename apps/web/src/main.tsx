import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './net/debug'
import './styles.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
