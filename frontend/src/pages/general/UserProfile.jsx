import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../config/api'
import '../../styles/profile.css'
import '../../styles/edit-profile.css'
import LoadingState from '../../components/LoadingState'
import PageNav from '../../components/PageNav'
import { clearCartItem } from '../../config/cart'

const ORDER_STATUS_LABEL = { pending: 'Pending', preparing: 'Preparing', out_for_delivery: 'Out for delivery', delivered: 'Delivered', cancelled: 'Cancelled' }

const UserProfile = () => {
  const [profile, setProfile] = useState(null)
  const [orders, setOrders] = useState([])
  const [notifications, setNotifications] = useState([])
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editPicture, setEditPicture] = useState(null)
  const [editPreview, setEditPreview] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [editError, setEditError] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    Promise.all([api.get('/api/auth/user/profile'), api.get('/api/orders/my'), api.get('/api/notifications/my')])
      .then(([profileResponse, ordersResponse, notificationsResponse]) => {
        setProfile(profileResponse.data.user)
        setOrders(ordersResponse.data.orders)
        setNotifications(notificationsResponse.data.notifications)
      })
      .catch(() => setError('Unable to load your profile.'))
      .finally(() => setIsLoading(false))
  }, [])

  useEffect(() => {
    if (!editPicture) { setEditPreview(''); return }
    const url = URL.createObjectURL(editPicture)
    setEditPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [editPicture])

  const logout = async () => {
    try { setIsLoggingOut(true); await api.get('/api/auth/user/logout'); clearCartItem(); navigate('/', { replace: true }) } catch { setError('Unable to log out right now.'); setIsLoggingOut(false) }
  }

  const markNotificationRead = async notificationId => {
    setNotifications(previous => previous.map(item => item._id === notificationId ? { ...item, read: true } : item))
    try { await api.patch(`/api/notifications/${notificationId}/read`) } catch (err) { void err }
  }

  const startEditing = () => {
    setEditName(profile?.fullName || '')
    setEditEmail(profile?.email || '')
    setEditPicture(null)
    setEditError('')
    setIsEditing(true)
  }

  const cancelEditing = () => {
    setIsEditing(false)
    setEditPicture(null)
    setEditError('')
  }

  const saveProfile = async event => {
    event.preventDefault()
    try {
      setIsSaving(true)
      setEditError('')
      const formData = new FormData()
      formData.append('fullName', editName)
      formData.append('email', editEmail)
      if (editPicture) formData.append('profilePicture', editPicture)
      const { data } = await api.patch('/api/auth/user/profile', formData)
      setProfile(data.user)
      setIsEditing(false)
      setEditPicture(null)
    } catch (requestError) {
      setEditError(requestError.response?.data?.message || 'Could not save changes.')
    } finally {
      setIsSaving(false)
    }
  }

  const unreadNotifications = notifications.filter(item => !item.read)

  return <main className="profile-page"><PageNav homePath="/home" />{isLoading ? <LoadingState label="Loading your profile..." /> : <>
    <header className="profile-header">
      <div className="profile-meta">
        {profile?.profilePicture ? <img className="profile-avatar" src={profile.profilePicture} alt={`${profile.fullName} profile`} /> : <div className="profile-avatar profile-avatar-fallback">{profile?.fullName?.slice(0, 1) || 'U'}</div>}
        <div className="profile-info"><h1>{profile?.fullName || 'Your profile'}</h1><p>{profile?.email}</p></div>
      </div>
      <div className="profile-header-actions">
        {!isEditing && <button className="profile-logout" onClick={startEditing}>Edit profile</button>}
        <button className="profile-logout" onClick={logout} disabled={isLoggingOut}>{isLoggingOut ? 'Logging out...' : 'Log out'}</button>
      </div>
    </header>

    {isEditing && <form className="edit-profile-form" onSubmit={saveProfile}>
      <div className="edit-profile-avatar-row">
        <img className="edit-profile-avatar-preview" src={editPreview || profile?.profilePicture || ''} alt="Profile preview" style={!editPreview && !profile?.profilePicture ? { display: 'none' } : undefined} />
        <div className="field-group">
          <label htmlFor="editPicture">Profile picture</label>
          <input id="editPicture" type="file" accept="image/*" onChange={event => setEditPicture(event.target.files?.[0] || null)} />
        </div>
      </div>
      <div className="edit-profile-two-col">
        <div className="field-group">
          <label htmlFor="editName">Full name</label>
          <input id="editName" type="text" value={editName} onChange={event => setEditName(event.target.value)} required />
        </div>
        <div className="field-group">
          <label htmlFor="editEmail">Email</label>
          <input id="editEmail" type="email" value={editEmail} onChange={event => setEditEmail(event.target.value)} required />
        </div>
      </div>
      {editError && <p className="error-text" role="alert">{editError}</p>}
      <div className="form-actions">
        <button className="btn-primary" type="submit" disabled={isSaving}>{isSaving ? 'Saving...' : 'Save changes'}</button>
        <button type="button" className="btn-ghost" onClick={cancelEditing} disabled={isSaving}>Cancel</button>
      </div>
    </form>}

    {error && <p className="error-text">{error}</p>}
    {unreadNotifications.length > 0 && <section className="profile-orders">
      <div className="section-heading"><h2>Notifications</h2><span>{unreadNotifications.length} new</span></div>
      {unreadNotifications.map(item => <article className="order-row" key={item._id}>
        <div><p>{item.message}</p></div>
        <button className="profile-logout" onClick={() => markNotificationRead(item._id)}>Mark read</button>
      </article>)}
    </section>}
    <section className="profile-orders">
      <div className="section-heading"><h2>Order history</h2><span>{orders.length} orders</span></div>
      {orders.length === 0 ? <p className="empty-copy">Your completed orders will appear here.</p> : orders.map(order => <article className="order-row" key={order._id}>
        <div><strong>{order.food?.name || 'Food order'}</strong><p>{order.address}</p>{order.status === 'cancelled' && order.cancellationReason && <p className="error-text">Rejected: {order.cancellationReason}</p>}</div>
        <div className="order-status"><span>{order.paymentStatus}{order.paymentMethod ? ` · ${order.paymentMethod.toUpperCase()}` : ''}</span><small>{ORDER_STATUS_LABEL[order.status] || order.status}</small></div>
      </article>)}
    </section>
  </>}</main>
}

export default UserProfile
