import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Self-hosted display/body typefaces (DESIGN.md Typography) — no Google
// Fonts CDN, weights limited to what the app actually uses.
import '@fontsource/fredoka/500.css'
import '@fontsource/fredoka/600.css'
import '@fontsource/fredoka/700.css'
import '@fontsource/atkinson-hyperlegible/400.css'
import '@fontsource/atkinson-hyperlegible/700.css'
import './index.css'
import './app/i18n'
import App from './App.tsx'
import { ErrorBoundary } from './app/ErrorBoundary.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
