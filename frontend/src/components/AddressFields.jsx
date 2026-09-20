import { useState } from 'react'
import api from '../config/api'
import '../styles/address-fields.css'

const AddressFields = ({ value, onChange, idPrefix = 'addr', required = true }) => {
  const [isLocating, setIsLocating] = useState(false)
  const [error, setError] = useState('')

  const update = (field, fieldValue) => onChange({ ...value, [field]: fieldValue })

  const useMyLocation = () => {
    if (!navigator.geolocation) { setError('Your browser does not support location sharing.'); return }
    setError('')
    setIsLocating(true)
    navigator.geolocation.getCurrentPosition(async position => {
      try {
        const { data } = await api.get('/api/geo/reverse', { params: { lat: position.coords.latitude, lng: position.coords.longitude } })
        onChange({ ...value, ...data.address })
      } catch {
        setError('Could not detect your address. Please fill it in manually.')
      } finally {
        setIsLocating(false)
      }
    }, geoError => {
      setIsLocating(false)
      if (geoError.code === geoError.PERMISSION_DENIED) setError('Location permission denied. Please allow location access, or fill the address in manually.')
      else if (geoError.code === geoError.POSITION_UNAVAILABLE) setError('Could not detect your location. Please check that Location/GPS is turned on for this device, or fill the address in manually.')
      else setError('Location request timed out. Please fill the address in manually.')
    }, { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 })
  }

  return <div className="address-fields">
    <button type="button" className="address-locate-btn" onClick={useMyLocation} disabled={isLocating}>
      <span aria-hidden="true">📍</span> {isLocating ? 'Locating...' : 'Use my current location'}
    </button>
    {error && <p className="error-text" role="alert">{error}</p>}
    <div className="two-col">
      <div className="field-group">
        <label htmlFor={`${idPrefix}-houseNo`}>House / Building no.</label>
        <input id={`${idPrefix}-houseNo`} value={value.houseNo} onChange={event => update('houseNo', event.target.value)} placeholder="e.g. 151" required={required} />
      </div>
      <div className="field-group">
        <label htmlFor={`${idPrefix}-street`}>Street / Locality</label>
        <input id={`${idPrefix}-street`} value={value.street} onChange={event => update('street', event.target.value)} placeholder="e.g. Shastri Nagar" required={required} />
      </div>
    </div>
    <div className="two-col">
      <div className="field-group">
        <label htmlFor={`${idPrefix}-city`}>City</label>
        <input id={`${idPrefix}-city`} value={value.city} onChange={event => update('city', event.target.value)} placeholder="e.g. Ghaziabad" required={required} />
      </div>
      <div className="field-group">
        <label htmlFor={`${idPrefix}-state`}>State</label>
        <input id={`${idPrefix}-state`} value={value.state} onChange={event => update('state', event.target.value)} placeholder="e.g. Uttar Pradesh" required={required} />
      </div>
    </div>
    <div className="field-group">
      <label htmlFor={`${idPrefix}-pincode`}>Pincode</label>
      <input id={`${idPrefix}-pincode`} value={value.pincode} onChange={event => update('pincode', event.target.value)} placeholder="e.g. 201002" required={required} />
    </div>
  </div>
}

export default AddressFields
