import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import api from '../../config/api'
import '../../styles/profile.css'
import '../../styles/edit-profile.css'
import '../../styles/locationPrompt.css'
import LoadingState from '../../components/LoadingState'
import PageNav from '../../components/PageNav'
import { clearCartItem } from '../../config/cart'
import AddressFields from '../../components/AddressFields'
import { EMPTY_ADDRESS, formatAddress } from '../../config/address'

const Profile = () => {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const [profile, setProfile] = useState(null)
  const [videos, setVideos] = useState([])
  const [menuSearch, setMenuSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [isLoading, setIsLoading] = useState(true)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [error, setError] = useState('')
  const [isNotifyRequested, setIsNotifyRequested] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editFields, setEditFields] = useState({ name: '', contactName: '', phone: '', email: '', restaurantType: 'Both', serviceRadiusKm: 5, packagingCharge: 0 })
  const [addressFields, setAddressFields] = useState(EMPTY_ADDRESS)
  const [editPicture, setEditPicture] = useState(null)
  const [editPreview, setEditPreview] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [editError, setEditError] = useState('')
  const menuRef = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    const request = id ? api.get(`/api/food-partner/${id}`) : api.get('/api/food-partner/me')
    request.then(({ data }) => {
      const partner = data.foodPartner
      setProfile(partner)
      setVideos(partner.foodItems || [])
      const selectedFood = searchParams.get('food')
      if (selectedFood) window.setTimeout(() => menuRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150)
    }).catch(() => setError('Unable to load this profile.')).finally(() => setIsLoading(false))
  }, [id, searchParams])

  useEffect(() => {
    if (!editPicture) { setEditPreview(''); return }
    const url = URL.createObjectURL(editPicture)
    setEditPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [editPicture])

  const filteredVideos = useMemo(() => {
    const query = menuSearch.trim().toLowerCase()
    return videos.filter(video => (selectedCategory === 'All' || video.category === selectedCategory) && `${video.name} ${video.description || ''}`.toLowerCase().includes(query))
  }, [menuSearch, selectedCategory, videos])

  const logout = async () => {
    try { setIsLoggingOut(true); await api.get('/api/auth/food-partner/logout'); clearCartItem(); navigate('/', { replace: true }) } catch { setError('Unable to log out right now.'); setIsLoggingOut(false) }
  }
  const focusMenu = () => menuRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  const notifyMe = async () => {
    try { await api.post(`/api/food-partner/${id}/notify-me`); setIsNotifyRequested(true) } catch { setError('Could not save your request. Please try again.') }
  }

  const startEditing = () => {
    setEditFields({ name: profile?.name || '', contactName: profile?.contactName || '', phone: profile?.phone || '', email: profile?.email || '', restaurantType: profile?.restaurantType || 'Both', serviceRadiusKm: profile?.serviceRadiusKm || 5, packagingCharge: profile?.packagingCharge || 0 })
    setAddressFields(EMPTY_ADDRESS)
    setEditPicture(null)
    setEditError('')
    setIsEditing(true)
  }
  const cancelEditing = () => { setIsEditing(false); setEditPicture(null); setEditError('') }
  const updateField = (field, value) => setEditFields(previous => ({ ...previous, [field]: value }))

  const saveProfile = async event => {
    event.preventDefault()
    try {
      setIsSaving(true)
      setEditError('')
      const formData = new FormData()
      Object.entries(editFields).forEach(([key, value]) => formData.append(key, value))
      const address = formatAddress(addressFields)
      if (address) formData.append('address', address)
      if (editPicture) formData.append('profilePicture', editPicture)
      const { data } = await api.patch('/api/food-partner/me', formData)
      setProfile(previous => ({ ...previous, ...data.foodPartner }))
      setIsEditing(false)
      setEditPicture(null)
    } catch (requestError) {
      setEditError(requestError.response?.data?.message || 'Could not save changes.')
    } finally {
      setIsSaving(false)
    }
  }

  const isClosed = Boolean(id) && profile && profile.isOpen === false

  return <main className="profile-page">{id && <PageNav homePath="/home" />}{!id && <PageNav homePath="/dashboard" />}{isLoading ? <LoadingState label="Loading restaurant profile..." /> : error && !profile ? <p className="error-text" role="alert">{error}</p> : <>
    <header className="profile-header"><div className="profile-meta">{profile?.profilePicture ? <img className="profile-avatar" src={profile.profilePicture} alt={`${profile.name} profile`} /> : <div className="profile-avatar profile-avatar-fallback">{profile?.name?.slice(0, 1) || 'P'}</div>}<div className="profile-info"><span className="eyebrow">Restaurant profile</span><h1>{profile?.name || 'Partner profile'} <span className={`restaurant-badge ${profile?.restaurantType?.toLowerCase()}`}>{profile?.restaurantType || 'Both'}</span></h1><p>{profile?.address}</p></div></div><div className="profile-header-actions">{!id && !isEditing && <button className="profile-logout" onClick={startEditing}>Edit profile</button>}{!id && <button className="profile-logout" onClick={logout} disabled={isLoggingOut}>{isLoggingOut ? 'Logging out...' : 'Log out'}</button>}{id && <button className="menu-button" onClick={focusMenu}>Menu</button>}</div></header>

    {isEditing && <form className="edit-profile-form" onSubmit={saveProfile}>
      <div className="edit-profile-avatar-row">
        <img className="edit-profile-avatar-preview" src={editPreview || profile?.profilePicture || ''} alt="Profile preview" style={!editPreview && !profile?.profilePicture ? { display: 'none' } : undefined} />
        <div className="field-group">
          <label htmlFor="editPicture">Profile picture</label>
          <input id="editPicture" type="file" accept="image/*" onChange={event => setEditPicture(event.target.files?.[0] || null)} />
        </div>
      </div>
      <div className="edit-profile-two-col">
        <div className="field-group"><label htmlFor="editBizName">Business name</label><input id="editBizName" type="text" value={editFields.name} onChange={event => updateField('name', event.target.value)} required /></div>
        <div className="field-group"><label htmlFor="editContactName">Contact name</label><input id="editContactName" type="text" value={editFields.contactName} onChange={event => updateField('contactName', event.target.value)} required /></div>
      </div>
      <div className="edit-profile-two-col">
        <div className="field-group"><label htmlFor="editPhone">Phone</label><input id="editPhone" type="tel" value={editFields.phone} onChange={event => updateField('phone', event.target.value)} required /></div>
        <div className="field-group"><label htmlFor="editEmail">Email</label><input id="editEmail" type="email" value={editFields.email} onChange={event => updateField('email', event.target.value)} required /></div>
      </div>
      <div className="field-group">
        <label>Address</label>
        <p className="small-note">Currently saved: {profile?.address || 'not set'}</p>
        <AddressFields value={addressFields} onChange={setAddressFields} idPrefix="edit-address" required={false} />
        <p className="small-note">Fill this in only if you want to update your address — saving it updates your map location automatically.</p>
      </div>
      <div className="edit-profile-two-col">
        <div className="field-group">
          <label htmlFor="editRestaurantType">Restaurant type</label>
          <select id="editRestaurantType" value={editFields.restaurantType} onChange={event => updateField('restaurantType', event.target.value)}>
            <option value="Veg">Veg</option>
            <option value="Non-Veg">Non-Veg</option>
            <option value="Both">Both</option>
          </select>
        </div>
        <div className="field-group">
          <label htmlFor="editServiceRadius">Service radius (km)</label>
          <input id="editServiceRadius" type="number" min="0.5" max="50" step="0.5" value={editFields.serviceRadiusKm} onChange={event => updateField('serviceRadiusKm', event.target.value)} required />
        </div>
      </div>
      <div className="field-group">
        <label htmlFor="editPackagingCharge">Packaging charge (₹, optional)</label>
        <input id="editPackagingCharge" type="number" min="0" step="1" value={editFields.packagingCharge} onChange={event => updateField('packagingCharge', event.target.value)} />
        <p className="small-note">Added to every order's bill as a separate line item. Leave at 0 if you don't charge for packaging.</p>
      </div>
      {editError && <p className="error-text" role="alert">{editError}</p>}
      <div className="form-actions">
        <button className="btn-primary" type="submit" disabled={isSaving}>{isSaving ? 'Saving...' : 'Save changes'}</button>
        <button type="button" className="btn-ghost" onClick={cancelEditing} disabled={isSaving}>Cancel</button>
      </div>
    </form>}

    {error && <p className="error-text" role="alert">{error}</p>}

    {!id && !isEditing && profile && !profile.location && <div className="location-reminder-banner">
      <span>Your restaurant isn't geolocated yet — nearby customers won't see you in their feed.</span>
      <button type="button" className="profile-logout" onClick={startEditing}>Set address now</button>
    </div>}

    {isClosed && <section className="profile-header" style={{ borderColor: 'var(--color-danger)' }}>
      <strong>This restaurant is currently closed.</strong>
      <p>{profile?.openingTime && profile?.closingTime ? `Usually open ${profile.openingTime} – ${profile.closingTime}.` : "It's not accepting orders right now."} We'll let you know as soon as it's back open.</p>
      {isNotifyRequested ? <p className="small-note">We'll notify you when this restaurant opens.</p> : <button className="menu-button" onClick={notifyMe}>Notify me when open</button>}
    </section>}

    <section className="partner-stats"><div><strong>{profile?.customersServed || 0}</strong><span>Customers Served</span></div><div><strong>{profile?.foodItemsServed ?? videos.length}</strong><span>Food Items Served</span></div><div><strong>★ {profile?.averageRating || 0}</strong><span>{profile?.reviewCount || 0} Reviews</span></div></section>

    {id && <section className="menu-section" ref={menuRef}><div className="menu-heading"><div><span className="eyebrow">From the kitchen</span><h2>Menu</h2></div><span>{filteredVideos.length} reels</span></div><div className="category-pills"><button className={selectedCategory === 'All' ? 'is-selected' : ''} onClick={() => setSelectedCategory('All')}>All</button>{['Starters', 'Main Course - Veg', 'Main Course - Non Veg', 'Breads / Indian Breads', 'Rice & Biryani', 'Fast Food / Quick Bites', 'Soups & Salads', 'Desserts / Sweets (Meetha)', 'Beverages / Drinks'].map(category => <button key={category} className={selectedCategory === category ? 'is-selected' : ''} onClick={() => setSelectedCategory(category)}>{category}</button>)}</div><div className="menu-search"><span aria-hidden="true">⌕</span><input value={menuSearch} onChange={event => setMenuSearch(event.target.value)} placeholder="Search this menu by reel name" aria-label="Search this menu by reel name" /></div>{filteredVideos.length > 0 ? <div className="profile-grid">{filteredVideos.map(video => <MenuGridItem key={video._id} video={video} canOrder={!isClosed} />)}</div> : <p className="empty-copy">No menu reel matches this filter.</p>}</section>}
  </>}</main>
}

const MenuGridItem = ({ video, canOrder }) => {
  const rating = <span className="reel-rating-badge">★ {video.averageRating || 0} <span>({video.reviewCount || 0})</span></span>
  const isOrderable = canOrder && video.isAvailable !== false
  const thumb = video.mediaType === 'image' ? <img className="profile-grid-video" src={video.video} alt={video.name} /> : <video className="profile-grid-video" src={video.video} muted playsInline preload="metadata" />
  if (isOrderable) return <Link className="profile-grid-item profile-grid-item--orderable" to={`/order/${video._id}`}>
    {thumb}
    {rating}
    <div className="profile-video-meta"><div><strong>{video.name}</strong><small>₹{video.price ?? 1} · {video.category}</small></div><span className="reel-btn profile-grid-order">Order now</span></div>
  </Link>
  return <article className="profile-grid-item">
    {thumb}
    {rating}
    <div className="profile-video-meta"><div><strong>{video.name}</strong><small>₹{video.price ?? 1} · {video.category}</small></div><span className="small-note">{video.isAvailable === false ? 'Unavailable' : 'Closed'}</span></div>
  </article>
}

export default Profile
