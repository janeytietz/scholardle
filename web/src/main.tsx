import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { Maintenance } from './Maintenance.tsx'
import { MAINTENANCE } from './config.ts'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {MAINTENANCE ? <Maintenance /> : <App />}
  </StrictMode>,
)
