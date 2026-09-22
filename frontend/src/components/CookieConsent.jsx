import { useState } from 'react'
import '../styles/cookie-consent.css'

const CONSENT_KEY = 'zomafeeds_cookie_consent'

const hasConsented = () => {
  try { return window.localStorage.getItem(CONSENT_KEY) === 'true' } catch { return false }
}

const CookieConsent = () => {
  const [isVisible, setIsVisible] = useState(() => !hasConsented())

  const accept = () => {
    try { window.localStorage.setItem(CONSENT_KEY, 'true') } catch (err) { void err }
    setIsVisible(false)
  }

  if (!isVisible) return null

  return <div className="cookie-consent" role="dialog" aria-label="Cookie consent">
    <p className="cookie-consent-text">We use cookies to improve your experience and keep you logged in.</p>
    <button type="button" className="cookie-consent-accept" onClick={accept}>Accept</button>
  </div>
}

export default CookieConsent
