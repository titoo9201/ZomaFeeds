import { useState } from 'react'
import api from '../config/api'
import '../styles/locationPrompt.css'

const LocationPrompt = ({ onLocationSet, onSkip }) => {
  const [mode, setMode] = useState('idle')
  const [address, setAddress] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Sharing your location here also drops a "Home" entry into the saved-address book (if you
  // don't already have one), so it's ready to pick at checkout without retyping it there too.
  const saveAsHomeAddress = async (lat, lng) => {
    try {
      const { data: existing } = await api.get('/api/user/addresses')
      if (existing.addresses.some(item => item.label === 'Home')) return
      const { data: reverse } = await api.get('/api/geo/reverse', { params: { lat, lng } })
      if (!reverse.address?.city) return
      await api.post('/api/user/addresses', { label: 'Home', ...reverse.address })
    } catch (err) { void err }
  }

  const useMyLocation = () => {
    if (!navigator.geolocation) { setMode('manual'); return }
    setError('')
    setMode('requesting')
    navigator.geolocation.getCurrentPosition(
      async position => {
        try {
          setIsSubmitting(true)
          const lat = position.coords.latitude
          const lng = position.coords.longitude
          const { data } = await api.patch('/api/user/location', { lat, lng })
          saveAsHomeAddress(lat, lng)
          onLocationSet(data.user)
        } catch {
          setError('Could not save your location. Please try again.')
          setMode('manual')
        } finally {
          setIsSubmitting(false)
        }
      },
      geoError => {
        if (geoError.code === geoError.PERMISSION_DENIED) setError('Location permission denied. Please allow location access, or enter your address manually.')
        else if (geoError.code === geoError.POSITION_UNAVAILABLE) setError('Could not detect your location. Please check that Location/GPS is turned on for this device, or enter your address manually.')
        else setError('Location request timed out. Please enter your address manually.')
        setMode('manual')
      },
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 }
    )
  }

  const submitAddress = async event => {
    event.preventDefault()
    if (!address.trim()) return
    try {
      setIsSubmitting(true)
      setError('')
      const { data } = await api.patch('/api/user/location', { address: address.trim() })
      onLocationSet(data.user)
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not find that address.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return <section className="location-prompt">
    <div className="location-prompt-text">
      <strong>See restaurants near you</strong>
      <span>Share your location to get a feed sorted by what's close and highly rated.</span>
    </div>
    <div className="location-prompt-actions">
      {mode === 'manual' ? <form className="location-prompt-form" onSubmit={submitAddress}>
        <input value={address} onChange={event => setAddress(event.target.value)} placeholder="Enter your delivery address" required />
        <button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Saving...' : 'Save'}</button>
      </form> : <button type="button" className="location-prompt-btn" onClick={useMyLocation} disabled={mode === 'requesting' || isSubmitting}>{mode === 'requesting' ? 'Requesting...' : 'Use my current location'}</button>}
      {mode !== 'manual' && <button type="button" className="location-prompt-link" onClick={() => setMode('manual')}>Enter address manually</button>}
      {onSkip && <button type="button" className="location-prompt-link" onClick={onSkip}>Maybe later</button>}
    </div>
    {error && <p className="error-text" role="alert">{error}</p>}
  </section>
}

export default LocationPrompt
