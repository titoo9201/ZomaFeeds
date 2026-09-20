import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Heart, MessageCircle } from 'lucide-react'
import api from '../../config/api'
import '../../styles/dashboard.css'
import '../../styles/profile.css'
import '../../styles/locationPrompt.css'
import LoadingState from '../../components/LoadingState'

const EMPTY_STATS = { served: 0, revenue: 0 }

const Dashboard = () => {
  const [profile, setProfile] = useState(null)
  const [videos, setVideos] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [orderData, setOrderData] = useState({ today: [], yesterday: [], past: [], stats: { today: EMPTY_STATS, yesterday: EMPTY_STATS, last30Days: EMPTY_STATS } })
  const [historyDays, setHistoryDays] = useState(30)
  const [respondingId, setRespondingId] = useState('')
  const [rejectDraftId, setRejectDraftId] = useState('')
  const [rejectReason, setRejectReason] = useState('')
  const [isSavingHours, setIsSavingHours] = useState(false)
  const [openingDraft, setOpeningDraft] = useState('09:00')
  const [closingDraft, setClosingDraft] = useState('22:00')
  const [activeComments, setActiveComments] = useState(null)
  const [comments, setComments] = useState([])
  const [isCommentsLoading, setIsCommentsLoading] = useState(false)
  const [commentsError, setCommentsError] = useState('')

  const loadProfile = useCallback(() => api.get('/api/food-partner/me').then(({ data }) => {
    setProfile(data.foodPartner)
    setVideos(data.foodPartner.foodItems || [])
    setOpeningDraft(data.foodPartner.openingTime || '09:00')
    setClosingDraft(data.foodPartner.closingTime || '22:00')
  }).catch(() => setError('Unable to load your dashboard.')).finally(() => setIsLoading(false)), [])

  useEffect(() => { loadProfile() }, [loadProfile])

  const reloadIncoming = useCallback(() => api.get(`/api/orders/partner/incoming?days=${historyDays}`).then(({ data }) => setOrderData(data)).catch(() => {}), [historyDays])

  useEffect(() => {
    reloadIncoming()
    const interval = window.setInterval(reloadIncoming, 10000)
    return () => window.clearInterval(interval)
  }, [reloadIncoming])

  const respondToOrder = async (orderId, decision, reason) => {
    try {
      setRespondingId(orderId)
      await api.patch(`/api/orders/${orderId}/respond`, { decision, reason })
      setRejectDraftId('')
      setRejectReason('')
      reloadIncoming()
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not update this order.')
    } finally {
      setRespondingId('')
    }
  }

  const advanceOrder = async orderId => {
    try {
      setRespondingId(orderId)
      await api.patch(`/api/orders/${orderId}/advance`)
      reloadIncoming()
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not update this order.')
    } finally {
      setRespondingId('')
    }
  }

  const toggleOpen = async () => {
    try {
      setIsSavingHours(true)
      const { data } = await api.patch('/api/food-partner/me/hours', { isOpen: !profile.isOpen })
      setProfile(previous => ({ ...previous, ...data.foodPartner }))
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not update restaurant status.')
    } finally {
      setIsSavingHours(false)
    }
  }

  const saveHours = async event => {
    event.preventDefault()
    try {
      setIsSavingHours(true)
      const { data } = await api.patch('/api/food-partner/me/hours', { openingTime: openingDraft, closingTime: closingDraft })
      setProfile(previous => ({ ...previous, ...data.foodPartner }))
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not update hours.')
    } finally {
      setIsSavingHours(false)
    }
  }

  const openComments = async video => {
    setActiveComments(video)
    setCommentsError('')
    setIsCommentsLoading(true)
    try {
      const { data } = await api.get(`/api/comments/${video._id}`)
      setComments(data.comments)
    } catch (requestError) {
      setCommentsError(requestError.response?.data?.message || 'Could not load comments.')
    } finally {
      setIsCommentsLoading(false)
    }
  }

  return <div className="dashboard-page">
    {isLoading ? <LoadingState label="Loading your dashboard..." /> : <>
      {error && <p className="error-text" role="alert">{error}</p>}

      {profile && !profile.location && <div className="location-reminder-banner">
        <span>Your restaurant isn't geolocated yet — nearby customers won't see you in their feed.</span>
        <Link className="profile-logout" to="/profile">Set address now</Link>
      </div>}

      <section className="hours-card">
        <div className="hours-status">
          <button type="button" className={`open-switch ${profile?.isOpen ? 'is-on' : ''}`} onClick={toggleOpen} disabled={isSavingHours} role="switch" aria-checked={Boolean(profile?.isOpen)} aria-label="Toggle restaurant open status" />
          <div className="hours-status-label">
            <strong>{profile?.isOpen ? 'Open for orders' : 'Closed'}</strong>
            <span>{profile?.isOpen ? 'Customers can order right now' : 'Customers will be told to check back later'}</span>
          </div>
        </div>
        <form className="hours-fields" onSubmit={saveHours}>
          <label>Opens<input type="time" value={openingDraft} onChange={event => setOpeningDraft(event.target.value)} /></label>
          <label>Closes<input type="time" value={closingDraft} onChange={event => setClosingDraft(event.target.value)} /></label>
          <button className="hours-save" type="submit" disabled={isSavingHours}>{isSavingHours ? 'Saving...' : 'Save hours'}</button>
        </form>
      </section>

      <section className="incoming-orders">
        <div className="section-heading"><h2>Incoming orders</h2></div>

        <div className="order-stats-grid">
          <StatCard label="Today" stats={orderData.stats.today} />
          <StatCard label="Yesterday" stats={orderData.stats.yesterday} />
          <StatCard label="Last 30 days" stats={orderData.stats.last30Days} />
        </div>

        <div className="order-buckets">
          <OrderBucket title="Today" orders={orderData.today} emptyText="No orders yet today.">
            {order => <IncomingOrderCard key={order._id} order={order} respondingId={respondingId} rejectDraftId={rejectDraftId} rejectReason={rejectReason} onSetRejectReason={setRejectReason} onStartReject={() => setRejectDraftId(order._id)} onCancelReject={() => { setRejectDraftId(''); setRejectReason('') }} onRespond={respondToOrder} onAdvance={advanceOrder} />}
          </OrderBucket>

          <OrderBucket title="Yesterday" orders={orderData.yesterday} emptyText="No orders yesterday.">
            {order => <IncomingOrderCard key={order._id} order={order} respondingId={respondingId} rejectDraftId={rejectDraftId} rejectReason={rejectReason} onSetRejectReason={setRejectReason} onStartReject={() => setRejectDraftId(order._id)} onCancelReject={() => { setRejectDraftId(''); setRejectReason('') }} onRespond={respondToOrder} onAdvance={advanceOrder} />}
          </OrderBucket>

          <OrderBucket
            title="Past"
            orders={orderData.past}
            emptyText="No orders in this range."
            headerExtra={<label className="order-history-picker">
              <span aria-hidden="true">🕘</span>
              <select value={historyDays} onChange={event => {
                const value = event.target.value
                if (value === 'contact') { window.location.href = buildHistoryRequestMailto(profile); return }
                setHistoryDays(Number(value))
              }} aria-label="Choose order history range">
                <option value={30}>Last 30 days</option>
                <option value={180}>Last 6 months</option>
                <option value="contact">Up to 1 year — email us</option>
              </select>
            </label>}
            footer={<p className="checkout-note">Need history older than 1 year? Email {SUPPORT_EMAIL} directly.</p>}
          >
            {order => <IncomingOrderCard key={order._id} order={order} respondingId={respondingId} rejectDraftId={rejectDraftId} rejectReason={rejectReason} onSetRejectReason={setRejectReason} onStartReject={() => setRejectDraftId(order._id)} onCancelReject={() => { setRejectDraftId(''); setRejectReason('') }} onRespond={respondToOrder} onAdvance={advanceOrder} />}
          </OrderBucket>
        </div>
      </section>

      <div className="dashboard-section-header">
        <h2>Your menu</h2>
        <Link className="new-item-btn" to="/create-food">+ New item</Link>
      </div>
      {videos.length > 0 ? <div className="profile-grid">{videos.map(video => <DashboardMenuItem key={video._id} video={video} onViewComments={openComments} />)}</div> : <p className="empty-copy">No menu reels yet — add your first item.</p>}

      {activeComments && <aside className="dash-comments-panel">
        <div className="dash-comments-header"><h2>Comments · {activeComments.name}</h2><button className="dash-comments-close" onClick={() => setActiveComments(null)} aria-label="Close comments">×</button></div>
        <div className="dash-comments-list">
          {isCommentsLoading ? <p>Loading comments...</p> : commentsError ? <p className="error-text" role="alert">{commentsError}</p> : comments.length === 0 ? <p className="empty-copy">No comments yet.</p> : comments.map(comment => <div className="dash-comment" key={comment._id}>
            {comment.user?.profilePicture ? <img className="dash-comment-avatar" src={comment.user.profilePicture} alt="" /> : <div className="dash-comment-avatar dash-comment-avatar-fallback">{comment.user?.fullName?.slice(0, 1) || 'U'}</div>}
            <div className="dash-comment-body"><strong>{comment.user?.fullName}</strong><span>{comment.text}</span></div>
          </div>)}
        </div>
        <p className="dash-comments-note">Read-only — only customers can post comments.</p>
      </aside>}
    </>}
  </div>
}

const SUPPORT_EMAIL = 'zomafeeds@gmail.com'

const buildHistoryRequestMailto = profile => {
  const subject = `Order history request (up to 1 year) — ${profile?.name || 'Restaurant'}`
  const body = [
    'Hi ZomaFeeds team,',
    '',
    'We would like to request order history older than 6 months (up to 1 year) for our account.',
    '',
    `Restaurant name: ${profile?.name || ''}`,
    `Partner ID: ${profile?._id || ''}`,
    `Registered email: ${profile?.email || ''}`,
    `Contact person: ${profile?.contactName || ''}`,
    `Phone: ${profile?.phone || ''}`,
    `Address: ${profile?.address || ''}`,
    '',
    'Thank you.'
  ].join('\n')
  return `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}

const StatCard = ({ label, stats }) => <div className="order-stat-card">
  <span className="order-stat-label">{label}</span>
  <strong>{stats.served}</strong>
  <span className="order-stat-sub">orders served</span>
  <span className="order-stat-revenue">₹{stats.revenue} revenue</span>
</div>

const OrderBucket = ({ title, orders, emptyText, headerExtra, footer, children }) => <div className="order-bucket">
  <div className="order-bucket-header"><h3>{title}</h3><div className="order-bucket-header-actions">{headerExtra}<span className="order-bucket-count">{orders.length}</span></div></div>
  <div className="order-bucket-list">{orders.length === 0 ? <p className="empty-copy">{emptyText}</p> : orders.map(children)}</div>
  {footer}
</div>

const ORDER_PILL_LABEL = { preparing: 'Preparing', out_for_delivery: 'Out for delivery', delivered: 'Delivered', cancelled: 'Rejected' }

const IncomingOrderCard = ({ order, respondingId, rejectDraftId, rejectReason, onSetRejectReason, onStartReject, onCancelReject, onRespond, onAdvance }) => {
  const isBusy = respondingId === order._id
  return <article className="incoming-order">
    <div className="incoming-order-main"><strong>{order.food?.name}</strong><span>{order.quantity} item(s) · {order.user?.fullName || 'Customer'}</span><small>{order.address}</small></div>
    {order.status === 'pending' ? (
      rejectDraftId === order._id ? <div className="incoming-order-reject">
        <input value={rejectReason} onChange={event => onSetRejectReason(event.target.value)} placeholder="Reason for rejecting" />
        <div className="incoming-order-reject-actions">
          <button type="button" onClick={onCancelReject} disabled={isBusy}>Cancel</button>
          <button type="button" className="is-reject" onClick={() => onRespond(order._id, 'reject', rejectReason)} disabled={isBusy || !rejectReason.trim()}>{isBusy ? 'Sending...' : 'Confirm reject'}</button>
        </div>
      </div>
        : <div className="incoming-order-actions">
          <button type="button" className="is-accept" onClick={() => onRespond(order._id, 'accept')} disabled={Boolean(respondingId)}>{isBusy ? 'Accepting...' : 'Accept'}</button>
          <button type="button" className="is-reject" onClick={onStartReject} disabled={Boolean(respondingId)}>Reject</button>
        </div>
    ) : order.status === 'preparing' || order.status === 'out_for_delivery' ? <div className="incoming-order-actions">
      <span className={`order-pill order-pill--${order.status}`}>{ORDER_PILL_LABEL[order.status]}</span>
      {order.rider
        ? <span className="order-pill order-pill--out_for_delivery">{order.riderStatus === 'assigned' ? `Rider ${order.rider.name} is heading here for pickup` : `Out for delivery with ${order.rider.name}`}</span>
        : <button type="button" className="is-accept" onClick={() => onAdvance(order._id)} disabled={Boolean(respondingId)}>{isBusy ? 'Updating...' : order.status === 'preparing' ? 'Mark out for delivery' : 'Mark delivered'}</button>}
    </div>
      : <span className={`order-pill order-pill--${order.status}`}>{ORDER_PILL_LABEL[order.status] || order.status}</span>}
  </article>
}

const DashboardMenuItem = ({ video, onViewComments }) => <Link className="profile-grid-item" to={`/manage-food/${video._id}`}>
  {video.mediaType === 'image' ? <img className="profile-grid-video" src={video.video} alt={video.name} /> : <video className="profile-grid-video" src={video.video} muted playsInline preload="metadata" />}
  {!video.isAvailable && <span className="availability-badge">Unavailable</span>}
  <span className="reel-rating-badge">★ {video.averageRating || 0} <span>({video.reviewCount || 0})</span></span>
  <div className="profile-video-meta">
    <div><strong>{video.name}</strong><small>₹{video.price ?? 1} · {video.category}</small></div>
    <div className="dash-menu-item-stats">
      <span className="dash-stat-pill" aria-label={`${video.likeCount || 0} likes`}><Heart size={13} fill="currentColor" /> {video.likeCount || 0}</span>
      <button type="button" className="dash-stat-pill dash-stat-pill--btn" aria-label="View comments" onClick={event => { event.preventDefault(); event.stopPropagation(); onViewComments(video) }}><MessageCircle size={13} /> {video.commentsCount || 0}</button>
    </div>
  </div>
</Link>

export default Dashboard
