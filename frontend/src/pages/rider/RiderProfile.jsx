import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../config/api'
import '../../styles/profile.css'
import '../../styles/edit-profile.css'
import '../../styles/dashboard.css'
import LoadingState from '../../components/LoadingState'
import PageNav from '../../components/PageNav'

const StatCard = ({ label, stats }) => <div className="order-stat-card">
  <span className="order-stat-label">{label}</span>
  <strong>{stats?.deliveries ?? 0}</strong>
  <span className="order-stat-sub">deliveries</span>
  <span className="order-stat-revenue">₹{stats?.earnings ?? 0} earned</span>
</div>

const RiderProfile = () => {
  const [profile, setProfile] = useState(null)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editFields, setEditFields] = useState({ name: '', phone: '', vehicleNumber: '', email: '' })
  const [editPicture, setEditPicture] = useState(null)
  const [editPreview, setEditPreview] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [editError, setEditError] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    api.get('/api/rider/me').then(({ data }) => setProfile(data.rider)).catch(() => setError('Unable to load your profile.')).finally(() => setIsLoading(false))
  }, [])

  useEffect(() => {
    if (!editPicture) { setEditPreview(''); return }
    const url = URL.createObjectURL(editPicture)
    setEditPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [editPicture])

  const logout = async () => {
    try { setIsLoggingOut(true); await api.get('/api/rider/logout'); navigate('/', { replace: true }) } catch { setError('Unable to log out right now.'); setIsLoggingOut(false) }
  }

  const startEditing = () => {
    setEditFields({ name: profile?.name || '', phone: profile?.phone || '', vehicleNumber: profile?.vehicleNumber || '', email: profile?.email || '' })
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
      if (editPicture) formData.append('profilePicture', editPicture)
      const { data } = await api.patch('/api/rider/me', formData)
      setProfile(data.rider)
      setIsEditing(false)
      setEditPicture(null)
    } catch (requestError) {
      setEditError(requestError.response?.data?.message || 'Could not save changes.')
    } finally {
      setIsSaving(false)
    }
  }

  return <main className="profile-page"><PageNav homePath="/rider/dashboard" />{isLoading ? <LoadingState label="Loading your profile..." /> : <>
    <header className="profile-header">
      <div className="profile-meta">
        {profile?.profilePicture ? <img className="profile-avatar" src={profile.profilePicture} alt={`${profile.name} profile`} /> : <div className="profile-avatar profile-avatar-fallback">{profile?.name?.slice(0, 1) || 'R'}</div>}
        <div className="profile-info"><h1>{profile?.name || 'Your profile'}</h1><p>{profile?.email}</p></div>
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
        <div className="field-group"><label htmlFor="editName">Full name</label><input id="editName" type="text" value={editFields.name} onChange={event => updateField('name', event.target.value)} required /></div>
        <div className="field-group"><label htmlFor="editEmail">Email</label><input id="editEmail" type="email" value={editFields.email} onChange={event => updateField('email', event.target.value)} required /></div>
      </div>
      <div className="edit-profile-two-col">
        <div className="field-group"><label htmlFor="editPhone">Phone</label><input id="editPhone" type="tel" value={editFields.phone} onChange={event => updateField('phone', event.target.value)} required /></div>
        <div className="field-group"><label htmlFor="editVehicle">Vehicle number</label><input id="editVehicle" type="text" value={editFields.vehicleNumber} onChange={event => updateField('vehicleNumber', event.target.value)} required /></div>
      </div>
      {editError && <p className="error-text" role="alert">{editError}</p>}
      <div className="form-actions">
        <button className="btn-primary" type="submit" disabled={isSaving}>{isSaving ? 'Saving...' : 'Save changes'}</button>
        <button type="button" className="btn-ghost" onClick={cancelEditing} disabled={isSaving}>Cancel</button>
      </div>
    </form>}

    {error && <p className="error-text" role="alert">{error}</p>}

    <div className="order-stats-grid">
      <StatCard label="Today" stats={profile?.stats?.today} />
      <StatCard label="Yesterday" stats={profile?.stats?.yesterday} />
      <StatCard label="Past 30 days" stats={profile?.stats?.past} />
    </div>

    <section className="partner-stats">
      <div><strong>{profile?.deliveriesCompleted ?? 0}</strong><span>Lifetime deliveries</span></div>
      <div><strong>₹{profile?.totalRevenue ?? 0}</strong><span>Lifetime earnings</span></div>
      <div><strong>{profile?.vehicleNumber || '—'}</strong><span>Vehicle number</span></div>
    </section>
  </>}</main>
}

export default RiderProfile
