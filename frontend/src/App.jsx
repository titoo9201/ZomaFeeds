import React from 'react'

import './styles/theme.css'
import AppRoutes from './routes/AppRoutes'
import ThemeToggle from './components/ThemeToggle'
import CookieConsent from './components/CookieConsent'

function App() {


  return (
    <>
      <ThemeToggle />
      <AppRoutes />
      <CookieConsent />
    </>
  )
}

export default App
