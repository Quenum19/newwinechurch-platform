/**
 * ==============================================================
 *  NEW WINE CHURCH — Point d'entrée React
 *  - Bootstrap StrictMode + RouterProvider
 *  - QueryClientProvider partagé pour toute l'app
 *  - i18next initialisé avant le premier render
 *  - Toaster global pour les notifications UI
 * ==============================================================
 */
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { Toaster } from 'react-hot-toast'

// Bootstrap i18n (DOIT être importé avant <App />).
import './i18n'

import { queryClient } from './queryClient'
import App from './App.jsx'
import './styles/globals.css'

// Service Worker PWA (uniquement en production pour ne pas gêner HMR Vite).
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  })
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>

      {/* Notifications globales — apparaissent en haut au centre. */}
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#1A1A1A',
            color: '#fff',
            border: '1px solid rgba(201, 168, 76, 0.2)',
          },
          success: { iconTheme: { primary: '#C9A84C', secondary: '#080808' } },
          error: { iconTheme: { primary: '#B22240', secondary: '#fff' } },
        }}
      />

      {/* Devtools React Query (visible uniquement en dev). */}
      {import.meta.env.DEV && <ReactQueryDevtools buttonPosition="bottom-right" />}
    </QueryClientProvider>
  </StrictMode>
)
