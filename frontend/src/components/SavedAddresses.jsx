import { useEffect, useState } from 'react'
import api from '../config/api'
import AddressFields from './AddressFields'
import { EMPTY_ADDRESS, ADDRESS_LABELS } from '../config/address'
import '../styles/saved-addresses.css'
import '../styles/edit-profile.css'

const labelText = item => item.label === 'Other' ? (item.customLabel || 'Other') : item.label

const SavedAddresses = ({ selectable = false, onSelect, showDelete = false }) => {
  const [addresses, setAddresses] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [label, setLabel] = useState('Home')
  const [customLabel, setCustomLabel] = useState('')
  const [addressFields, setAddressFields] = useState(EMPTY_ADDRESS)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get('/api/user/addresses').then(({ data }) => setAddresses(data.addresses)).catch(() => {}).finally(() => setIsLoading(false))
  }, [])

  const startEditing = item => {
    setEditingId(item._id)
    setLabel(item.label)
    setCustomLabel(item.customLabel || '')
    setAddressFields({ lat: item.lat ?? null, lng: item.lng ?? null, address: item.address || '' })
    setError('')
    setIsAdding(true)
  }

  const cancelForm = () => {
    setIsAdding(false)
    setEditingId(null)
    setAddressFields(EMPTY_ADDRESS)
    setLabel('Home')
    setCustomLabel('')
  }

  const saveAddress = async event => {
    event.preventDefault()
    if (!Number.isFinite(addressFields.lat) || !Number.isFinite(addressFields.lng)) {
      setError('Use GPS or paste a Google Maps link to set your exact location.')
      return
    }
    try {
      setIsSaving(true)
      setError('')
      const { data } = editingId
        ? await api.patch(`/api/user/addresses/${editingId}`, { label, customLabel, ...addressFields })
        : await api.post('/api/user/addresses', { label, customLabel, ...addressFields })
      setAddresses(data.addresses)
      const savedItem = editingId ? data.addresses.find(item => item._id === editingId) : data.addresses[data.addresses.length - 1]
      cancelForm()
      if (selectable && savedItem) onSelect(savedItem)
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not save this address.')
    } finally {
      setIsSaving(false)
    }
  }

  const deleteAddress = async id => {
    try {
      const { data } = await api.delete(`/api/user/addresses/${id}`)
      setAddresses(data.addresses)
    } catch {
      setError('Could not remove this address.')
    }
  }

  if (isLoading) return null

  return <div className="saved-addresses">
    {addresses.length > 0 && <div className="saved-addresses-list">
      {addresses.map(item => <div className="saved-address-card" key={item._id}>
        <div><strong>{labelText(item)}</strong><p>{item.address}</p></div>
        <div className="saved-address-actions">
          {selectable && <button type="button" className="btn-primary" onClick={() => onSelect(item)}>Deliver here</button>}
          {showDelete && <button type="button" className="btn-ghost" onClick={() => startEditing(item)}>Edit</button>}
          {showDelete && <button type="button" className="btn-ghost" onClick={() => deleteAddress(item._id)}>Remove</button>}
        </div>
      </div>)}
    </div>}

    {error && <p className="error-text" role="alert">{error}</p>}

    {!isAdding
      ? <button type="button" className="saved-address-add-btn" onClick={() => setIsAdding(true)}>+ Add {addresses.length > 0 ? 'another' : 'an'} address</button>
      : <form className="edit-profile-form" onSubmit={saveAddress}>
        <div className="field-group">
          <label htmlFor="saved-addr-label">Whose address is this?</label>
          <select id="saved-addr-label" value={label} onChange={event => setLabel(event.target.value)}>
            {ADDRESS_LABELS.map(item => <option key={item} value={item}>{item}</option>)}
          </select>
        </div>
        {label === 'Other' && <div className="field-group">
          <label htmlFor="saved-addr-custom">Label</label>
          <input id="saved-addr-custom" value={customLabel} onChange={event => setCustomLabel(event.target.value)} placeholder="e.g. Office" required />
        </div>}
        <AddressFields value={addressFields} onChange={setAddressFields} idPrefix="saved-addr" />
        {error && <p className="error-text" role="alert">{error}</p>}
        <div className="form-actions">
          <button className="btn-primary" type="submit" disabled={isSaving}>{isSaving ? 'Saving...' : editingId ? 'Update address' : 'Save address'}</button>
          <button type="button" className="btn-ghost" onClick={cancelForm} disabled={isSaving}>Cancel</button>
        </div>
      </form>}
  </div>
}

export default SavedAddresses
