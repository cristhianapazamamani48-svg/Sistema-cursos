import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import CertificadoDemo from './CertificadoDemo.tsx'

const isCertificadoDemo =
  window.location.pathname === '/certificado-demo' ||
  window.location.pathname.startsWith('/certificado-demo') ||
  window.location.pathname === '/verificar-certificado' ||
  window.location.pathname.startsWith('/verificar-certificado') ||
  window.location.pathname === '/validar-certificado';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isCertificadoDemo ? <CertificadoDemo /> : <App />}
  </StrictMode>,
)

