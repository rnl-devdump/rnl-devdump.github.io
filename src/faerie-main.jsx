import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import FaerieApp from './faerie/FaerieApp.jsx'
import './index.css'
import './faerie/faerie.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <FaerieApp />
  </StrictMode>,
)
