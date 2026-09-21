import { useState } from 'react'
import api from '../config/api'
import PinConfirmMap from './PinConfirmMap'
import '../styles/address-fields.css'

// Location capture is GPS-or-Maps-link only — no free-text address is ever geocoded. Both
// methods just produce a starting {lat, lng} guess; PinConfirmMap is the single choke point
// where the user actually confirms (or drags to fix) the exact point that gets saved. The
// address text field is separate and purely cosmetic: pre-filled from Google's own text when a
// Maps link resolves to one, but always freely editable — whatever it holds at save time is
// trusted as-is, never re-geocoded.
const AddressFields = ({ value, onChange, idPrefix = 'addr' }) => {
  const [isLocating, setIsLocating] = useState(false)
  const [gpsError, setGpsError] = useState('')
  const [showLinkInput, setShowLinkInput] = useState(false)
  const [mapsLink, setMapsLink] = useState('')
  const [isParsingLink, setIsParsingLink] = useState(false)
  const [linkError, setLinkError] = useState('')

  const useMyLocation = () => {
    if (!navigator.geolocation) { setGpsError('Your browser does not support location sharing.'); return }
    setGpsError('')
    setIsLocating(true)
    navigator.geolocation.getCurrentPosition(position => {
      setIsLocating(false)
      onChange({ ...value, lat: position.coords.latitude, lng: position.coords.longitude })
    }, geoError => {
      setIsLocating(false)
      if (geoError.code === geoError.PERMISSION_DENIED) setGpsError('Location permission denied. Please allow location access, or paste a Google Maps link instead.')
      else if (geoError.code === geoError.POSITION_UNAVAILABLE) setGpsError('Could not detect your location. Please check that Location/GPS is turned on, or paste a Google Maps link instead.')
      else setGpsError('Location request timed out. Please try again, or paste a Google Maps link instead.')
    }, { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 })
  }

  const useMapsLink = async () => {
    if (!mapsLink.trim()) return
    setLinkError('')
    setIsParsingLink(true)
    try {
      const { data } = await api.post('/api/geo/parse-maps-link', { url: mapsLink.trim() })
      // A shared-business link carries Google's own readable address — pre-fill the editable
      // address field with it. Doesn't clobber existing text when the link has no address of
      // its own (e.g. a dropped-pin/"your location" link only carries coordinates).
      onChange({ ...value, lat: data.location.lat, lng: data.location.lng, address: data.placeAddress || value.address })
      setShowLinkInput(false)
      setMapsLink('')
    } catch (requestError) {
      setLinkError(requestError.response?.data?.message || 'Could not read a location from this link.')
    } finally {
      setIsParsingLink(false)
    }
  }

  const hasPin = Number.isFinite(value.lat) && Number.isFinite(value.lng)

  return <div className="address-fields">
    <div className="address-method-row">
      <button type="button" className="address-locate-btn" onClick={useMyLocation} disabled={isLocating}>
        <span aria-hidden="true">📍</span> {isLocating ? 'Locating...' : 'Use my current location'}
      </button>
      <button type="button" className="address-locate-btn address-locate-btn--secondary" onClick={() => setShowLinkInput(show => !show)}>
        <span aria-hidden="true">🔗</span> Paste Google Maps location link
      </button>
    </div>
    {gpsError && <p className="error-text" role="alert">{gpsError}</p>}

    {showLinkInput && <div className="field-group">
      <label htmlFor={`${idPrefix}-maps-link`}>Google Maps link</label>
      <input
        id={`${idPrefix}-maps-link`}
        value={mapsLink}
        onChange={event => setMapsLink(event.target.value)}
        placeholder="Paste a Google Maps link (share → copy link)"
      />
      <button type="button" className="btn-primary" onClick={useMapsLink} disabled={isParsingLink || !mapsLink.trim()} style={{ marginTop: 8 }}>
        {isParsingLink ? 'Reading link...' : 'Use this link'}
      </button>
      {linkError && <p className="error-text" role="alert">{linkError}</p>}
    </div>}

    <div className="field-group">
      <label htmlFor={`${idPrefix}-address`}>Address (optional)</label>
      <input
        id={`${idPrefix}-address`}
        value={value.address}
        onChange={event => onChange({ ...value, address: event.target.value })}
        placeholder="e.g. Flat 201, ABC Apartments, Near Shivalik Hospital"
      />
      <p className="small-note">Auto-filled when possible, but maps data for smaller streets is often just the city/pincode — add your house/shop no. and locality name yourself so the rider can actually recognise it. Shown to the rider/restaurant only; not used to find your location, which always comes from the pin above.</p>
    </div>

    {hasPin
      ? <PinConfirmMap position={{ lat: value.lat, lng: value.lng }} onDragEnd={({ lat, lng }) => onChange({ ...value, lat, lng })} />
      : <p className="small-note">Use GPS or paste a Maps link above to set your exact location.</p>}
  </div>
}

export default AddressFields
