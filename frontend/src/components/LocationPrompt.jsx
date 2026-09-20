import { useEffect, useState } from 'react'
import api from '../config/api'
import AddressFields from './AddressFields'
import { EMPTY_ADDRESS, ADDRESS_LABELS } from '../config/address'
import '../styles/locationPrompt.css'
import '../styles/saved-addresses.css'
import '../styles/edit-profile.css'

const labelText = item => item.label === 'Other' ? (item.customLabel || 'Other') : item.label

// Sets the home-feed location (User.location, drives the 15km radius feed query) either from
// an existing saved delivery address (User.savedAddresses) or from a freshly GPS/Maps-link
// confirmed pin — the same AddressFields + PinConfirmMap used everywhere else in the app, never
// a separate/parallel text-address flow. A brand new location can optionally be saved into the
// address book afterward, under an existing label (overwriting it) or a new one.
const LocationPrompt = ({ onLocationSet, onSkip }) => {
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(true)
  const [savedAddresses, setSavedAddresses] = useState([])
  const [view, setView] = useState('new') // 'pick' | 'new' | 'save-choice'
  const [newLocation, setNewLocation] = useState(EMPTY_ADDRESS)
  const [selectedSavedId, setSelectedSavedId] = useState('')
  const [confirmedCoords, setConfirmedCoords] = useState(null)
  const [confirmedUser, setConfirmedUser] = useState(null)
  const [saveMode, setSaveMode] = useState('existing') // 'existing' | 'new'
  const [overwriteId, setOverwriteId] = useState('')
  const [newLabel, setNewLabel] = useState('Home')
  const [newCustomLabel, setNewCustomLabel] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get('/api/user/addresses').then(({ data }) => {
      setSavedAddresses(data.addresses)
      if (data.addresses.length) {
        setView('pick')
        setSelectedSavedId(data.addresses[0]._id)
        setSaveMode('existing')
        setOverwriteId(data.addresses[0]._id)
      } else {
        setSaveMode('new')
      }
    }).catch(() => {}).finally(() => setIsLoadingAddresses(false))
  }, [])

  const useSavedAddress = async () => {
    const item = savedAddresses.find(saved => saved._id === selectedSavedId)
    if (!item) return
    try {
      setIsSubmitting(true)
      setError('')
      const { data } = await api.patch('/api/user/location', { lat: item.lat, lng: item.lng })
      onLocationSet(data.user)
    } catch {
      setError('Could not set this as your location. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const hasNewPin = Number.isFinite(newLocation.lat) && Number.isFinite(newLocation.lng)

  const confirmNewLocation = async () => {
    if (!hasNewPin) return
    try {
      setIsSubmitting(true)
      setError('')
      const { data } = await api.patch('/api/user/location', { lat: newLocation.lat, lng: newLocation.lng })
      setConfirmedUser(data.user)
      setConfirmedCoords({ lat: newLocation.lat, lng: newLocation.lng })
      setView('save-choice')
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not set your location. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const skipSaving = () => onLocationSet(confirmedUser)

  const saveAddress = async () => {
    setError('')
    if (saveMode === 'new' && newLabel === 'Other' && !newCustomLabel.trim()) {
      setError('Enter a label for this address.')
      return
    }
    try {
      setIsSubmitting(true)
      const { lat, lng } = confirmedCoords
      if (saveMode === 'existing') {
        const target = savedAddresses.find(item => item._id === overwriteId)
        await api.patch(`/api/user/addresses/${overwriteId}`, {
          label: target.label, customLabel: target.customLabel, lat, lng, landmark: newLocation.landmark
        })
      } else {
        await api.post('/api/user/addresses', { label: newLabel, customLabel: newCustomLabel, lat, lng, landmark: newLocation.landmark })
      }
      onLocationSet(confirmedUser)
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not save this address. You can still skip saving.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoadingAddresses) return null

  return <section className="location-prompt location-prompt--panel">
    <div className="location-prompt-text">
      <strong>See restaurants near you</strong>
      <span>Share your location to get a feed sorted by what's close and highly rated.</span>
    </div>

    {view === 'pick' && <div className="location-prompt-panel-body">
      <div className="field-group">
        <label htmlFor="location-prompt-saved">Use a saved address</label>
        <select id="location-prompt-saved" value={selectedSavedId} onChange={event => setSelectedSavedId(event.target.value)}>
          {savedAddresses.map(item => <option key={item._id} value={item._id}>{labelText(item)} — {item.address}</option>)}
        </select>
      </div>
      <div className="location-prompt-actions">
        <button type="button" className="location-prompt-btn" onClick={useSavedAddress} disabled={isSubmitting}>{isSubmitting ? 'Setting...' : `Use this address`}</button>
        <button type="button" className="location-prompt-link" onClick={() => setView('new')}>Set a different location</button>
        {onSkip && <button type="button" className="location-prompt-link" onClick={onSkip}>Maybe later</button>}
      </div>
    </div>}

    {view === 'new' && <div className="location-prompt-panel-body">
      <AddressFields value={newLocation} onChange={setNewLocation} idPrefix="home-location" />
      <div className="location-prompt-actions">
        <button type="button" className="location-prompt-btn" onClick={confirmNewLocation} disabled={isSubmitting || !hasNewPin}>{isSubmitting ? 'Setting...' : 'Use this location'}</button>
        {savedAddresses.length > 0 && <button type="button" className="location-prompt-link" onClick={() => setView('pick')}>Back to saved addresses</button>}
        {onSkip && <button type="button" className="location-prompt-link" onClick={onSkip}>Maybe later</button>}
      </div>
    </div>}

    {view === 'save-choice' && <div className="location-prompt-panel-body">
      <p className="small-note">Your location is set. Save this address for later?</p>
      {savedAddresses.length > 0 && <label className="location-prompt-radio">
        <input type="radio" name="save-mode" checked={saveMode === 'existing'} onChange={() => setSaveMode('existing')} />
        Update an existing address
      </label>}
      {saveMode === 'existing' && savedAddresses.length > 0 && <div className="field-group">
        <select value={overwriteId} onChange={event => setOverwriteId(event.target.value)}>
          {savedAddresses.map(item => <option key={item._id} value={item._id}>{labelText(item)} — {item.address}</option>)}
        </select>
      </div>}
      <label className="location-prompt-radio">
        <input type="radio" name="save-mode" checked={saveMode === 'new'} onChange={() => setSaveMode('new')} />
        Save as a new address
      </label>
      {saveMode === 'new' && <div className="edit-profile-two-col">
        <div className="field-group">
          <select value={newLabel} onChange={event => setNewLabel(event.target.value)}>
            {ADDRESS_LABELS.map(item => <option key={item} value={item}>{item}</option>)}
          </select>
        </div>
        {newLabel === 'Other' && <div className="field-group">
          <input value={newCustomLabel} onChange={event => setNewCustomLabel(event.target.value)} placeholder="e.g. Office" />
        </div>}
      </div>}
      {error && <p className="error-text" role="alert">{error}</p>}
      <div className="form-actions">
        <button type="button" className="btn-primary" onClick={saveAddress} disabled={isSubmitting}>{isSubmitting ? 'Saving...' : 'Save address'}</button>
        <button type="button" className="btn-ghost" onClick={skipSaving} disabled={isSubmitting}>Just use it this once</button>
      </div>
    </div>}

    {error && view !== 'save-choice' && <p className="error-text" role="alert">{error}</p>}
  </section>
}

export default LocationPrompt
