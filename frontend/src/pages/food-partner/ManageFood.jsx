import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import api from '../../config/api'
import '../../styles/create-food.css'
import '../../styles/manage-food.css'
import '../../styles/dashboard.css'
import LoadingState from '../../components/LoadingState'
import PageNav from '../../components/PageNav'
import SongPicker from '../../components/SongPicker'

const CATEGORIES = ['Starters', 'Main Course - Veg', 'Main Course - Non Veg', 'Breads / Indian Breads', 'Rice & Biryani', 'Fast Food / Quick Bites', 'Soups & Salads', 'Desserts / Sweets (Meetha)', 'Beverages / Drinks']

const ManageFood = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [food, setFood] = useState(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState(1)
  const [category, setCategory] = useState('')
  const [isAvailable, setIsAvailable] = useState(true)
  const [song, setSong] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    api.get('/api/food-partner/me').then(({ data }) => {
      const item = (data.foodPartner.foodItems || []).find(video => video._id === id)
      if (!item) { setMessage('Item not found.'); return }
      setFood(item)
      setName(item.name)
      setDescription(item.description || '')
      setPrice(item.price ?? 1)
      setCategory(item.category)
      setIsAvailable(item.isAvailable !== false)
      setSong(item.song || null)
    }).catch(() => setMessage('Unable to load this item.')).finally(() => setIsLoading(false))
  }, [id])

  const save = async event => {
    event.preventDefault()
    try {
      setIsSaving(true)
      setMessage('')
      const body = { name, description, price, category, isAvailable, removeSong: !song }
      if (song) body.song = song
      await api.patch(`/api/food/${id}`, body)
      navigate('/dashboard')
    } catch (requestError) {
      setMessage(requestError.response?.data?.message || 'Could not save changes.')
    } finally {
      setIsSaving(false)
    }
  }

  const remove = async () => {
    try {
      setIsDeleting(true)
      await api.delete(`/api/food/${id}`)
      navigate('/dashboard')
    } catch (requestError) {
      setMessage(requestError.response?.data?.message || 'Could not delete this item.')
      setIsDeleting(false)
    }
  }

  return <div className="create-food-page">
    <PageNav homePath="/dashboard" />
    <div className="create-food-card">
      {isLoading ? <LoadingState label="Loading item..." /> : !food ? <p className="error-text" role="alert">{message}</p> : <>
        <header className="create-food-header">
          <h1 className="create-food-title">Manage item</h1>
          <p className="create-food-subtitle">Update details, price, and availability for this reel.</p>
        </header>

        <div className="manage-food-preview"><video src={food.video} muted controls /></div>

        <form className="create-food-form" onSubmit={save}>
          <div className="field-group">
            <label htmlFor="foodName">Name</label>
            <input id="foodName" type="text" value={name} onChange={event => setName(event.target.value)} required />
          </div>

          <div className="field-group">
            <label htmlFor="foodDesc">Description</label>
            <textarea id="foodDesc" rows={4} value={description} onChange={event => setDescription(event.target.value)} />
          </div>

          <div className="field-group">
            <label htmlFor="foodPrice">Price (₹)</label>
            <input id="foodPrice" type="number" min="0" step="1" value={price} onChange={event => setPrice(event.target.value)} required />
          </div>

          <div className="field-group">
            <label>Song</label>
            <SongPicker selectedSong={song} onSelect={setSong} onRemove={() => setSong(null)} />
          </div>

          <div className="field-group">
            <label htmlFor="foodCategory">Category</label>
            <select id="foodCategory" value={category} onChange={event => setCategory(event.target.value)} required>
              {CATEGORIES.map(item => <option key={item}>{item}</option>)}
            </select>
          </div>

          <div className="availability-toggle">
            <div className="availability-toggle-label">
              <strong>{isAvailable ? 'Currently available' : 'Currently not available'}</strong>
              <span>{isAvailable ? 'Customers can order this item' : 'Hidden from ordering until you turn it back on'}</span>
            </div>
            <button type="button" className={`open-switch ${isAvailable ? 'is-on' : ''}`} onClick={() => setIsAvailable(current => !current)} role="switch" aria-checked={isAvailable} aria-label="Toggle item availability" />
          </div>

          {message && <p className="error-text" role="alert">{message}</p>}

          <div className="form-actions">
            <button className="btn-primary" type="submit" disabled={isSaving}>{isSaving ? 'Saving...' : 'Save changes'}</button>
          </div>

          <div className="danger-zone">
            <span className="small-note">Removing this item deletes it permanently, along with its likes and saves.</span>
            <button type="button" className="btn-danger" onClick={remove} disabled={isDeleting}>{isDeleting ? 'Deleting...' : 'Delete item'}</button>
          </div>
        </form>
      </>}
    </div>
  </div>
}

export default ManageFood
