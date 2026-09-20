import { useCallback, useEffect, useRef, useState } from 'react'
import api from '../../config/api'
import socket from '../../config/socket'
import '../../styles/dashboard.css'
import '../../styles/riderMap.css'
import LoadingState from '../../components/LoadingState'
import NewOrderCard from '../../components/rider/NewOrderCard'
import RiderReachScreen from '../../components/rider/RiderReachScreen'
import RiderOrderScreen from '../../components/rider/RiderOrderScreen'

const RiderDashboard = () => {
  const [profile, setProfile] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [isTogglingOnline, setIsTogglingOnline] = useState(false)
  const [availableOrders, setAvailableOrders] = useState([])
  const [deniedIds, setDeniedIds] = useState([])
  const [activeOrder, setActiveOrder] = useState(null)
  const [acceptingId, setAcceptingId] = useState('')
  const [isUpdatingDelivery, setIsUpdatingDelivery] = useState(false)
  const [reachedPickup, setReachedPickup] = useState(false)
  const [reachedDrop, setReachedDrop] = useState(false)
  const [riderPos, setRiderPos] = useState(null)
  const [locationError, setLocationError] = useState('')
  const watchIdRef = useRef(null)
  const riderPosRef = useRef(null)
  const hasSentInitialLocationRef = useRef(false)

  const loadProfile = useCallback(() => api.get('/api/rider/me').then(({ data }) => setProfile(data.rider)).catch(() => setError('Unable to load your profile.')).finally(() => setIsLoading(false)), [])
  useEffect(() => { loadProfile() }, [loadProfile])

  const loadAvailable = useCallback(() => api.get('/api/orders/rider/available').then(({ data }) => setAvailableOrders(data.orders)).catch(() => {}), [])
  const loadActive = useCallback(() => api.get('/api/orders/rider/active').then(({ data }) => setActiveOrder(data.order)).catch(() => {}), [])

  useEffect(() => { loadAvailable(); loadActive() }, [loadAvailable, loadActive])

  useEffect(() => {
    const interval = window.setInterval(() => { loadAvailable(); loadActive() }, 10000)
    return () => window.clearInterval(interval)
  }, [loadAvailable, loadActive])

  useEffect(() => {
    if (!socket.connected) socket.connect()
    const onNew = order => setAvailableOrders(previous => previous.some(item => item._id === order._id) ? previous : [order, ...previous])
    const onAssigned = ({ orderId }) => setAvailableOrders(previous => previous.filter(item => item._id !== orderId))
    socket.on('order:new', onNew)
    socket.on('order:assigned', onAssigned)
    return () => { socket.off('order:new', onNew); socket.off('order:assigned', onAssigned) }
  }, [])

  useEffect(() => { riderPosRef.current = riderPos }, [riderPos])

  useEffect(() => {
    setReachedPickup(false)
    setReachedDrop(false)
  }, [activeOrder?._id])

  useEffect(() => {
    if (!profile?.isOnline) { hasSentInitialLocationRef.current = false; return }
    if (!navigator.geolocation) { setLocationError('Your browser does not support location sharing.'); return }
    watchIdRef.current = navigator.geolocation.watchPosition(position => {
      const lat = position.coords.latitude
      const lng = position.coords.longitude
      setLocationError('')
      setRiderPos({ lat, lng })
      if (socket.connected) socket.emit('rider:location', { orderId: activeOrder?._id, lat, lng })
      if (!hasSentInitialLocationRef.current) {
        hasSentInitialLocationRef.current = true
        api.patch('/api/rider/location', { lat, lng }).catch(() => {})
      }
    }, geoError => {
      if (geoError.code === geoError.PERMISSION_DENIED) setLocationError('Location permission denied. Please allow location access for this site in your browser settings.')
      else if (geoError.code === geoError.POSITION_UNAVAILABLE) setLocationError('Could not detect your location. Please check your device location/GPS settings.')
      else setLocationError('Location request timed out. Please check your connection and location settings.')
    }, { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 })
    return () => { if (watchIdRef.current != null) navigator.geolocation.clearWatch(watchIdRef.current) }
  }, [profile?.isOnline, activeOrder?._id])

  useEffect(() => {
    if (!profile?.isOnline) return
    const interval = window.setInterval(() => {
      if (riderPosRef.current) api.patch('/api/rider/location', riderPosRef.current).catch(() => {})
    }, 15000)
    return () => window.clearInterval(interval)
  }, [profile?.isOnline])

  const toggleOnline = async () => {
    try {
      setIsTogglingOnline(true)
      const { data } = await api.patch('/api/rider/status', { isOnline: !profile.isOnline })
      setProfile(previous => ({ ...previous, ...data.rider }))
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not update your status.')
    } finally {
      setIsTogglingOnline(false)
    }
  }

  const acceptOrder = async orderId => {
    try {
      setAcceptingId(orderId)
      const { data } = await api.patch(`/api/orders/${orderId}/accept-delivery`)
      setActiveOrder(data.order)
      setAvailableOrders(previous => previous.filter(item => item._id !== orderId))
      socket.emit('join_order', orderId)
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'This order was already claimed.')
      loadAvailable()
    } finally {
      setAcceptingId('')
    }
  }

  const denyOrder = orderId => setDeniedIds(previous => [...previous, orderId])

  const confirmPickedOrder = async () => {
    try {
      setIsUpdatingDelivery(true)
      await api.patch(`/api/orders/${activeOrder._id}/pickup`)
      const { data } = await api.patch(`/api/orders/${activeOrder._id}/start-delivery`)
      setActiveOrder(data.order)
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not update this delivery.')
    } finally {
      setIsUpdatingDelivery(false)
    }
  }

  const markDelivered = async () => {
    try {
      setIsUpdatingDelivery(true)
      await api.patch(`/api/orders/${activeOrder._id}/deliver`)
      socket.emit('leave_order', activeOrder._id)
      setActiveOrder(null)
      loadAvailable()
      loadProfile()
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not update this delivery.')
    } finally {
      setIsUpdatingDelivery(false)
    }
  }

  const nextAvailableOrder = availableOrders.find(item => !deniedIds.includes(item._id))

  return <div className="dashboard-page">
    {isLoading ? <LoadingState label="Loading your dashboard..." /> : <>
      {error && <p className="error-text" role="alert">{error}</p>}

      <section className="hours-card">
        <div className="hours-status">
          <button type="button" className={`open-switch ${profile?.isOnline ? 'is-on' : ''}`} onClick={toggleOnline} disabled={isTogglingOnline} role="switch" aria-checked={Boolean(profile?.isOnline)} aria-label="Toggle online status" />
          <div className="hours-status-label">
            <strong>{profile?.isOnline ? 'Online' : 'Offline'}</strong>
            <span>{profile?.isOnline ? 'You can receive delivery requests' : 'Go online to start receiving orders'}</span>
          </div>
        </div>
      </section>

      <section className="partner-stats"><div><strong>{profile?.deliveriesCompleted ?? 0}</strong><span>Deliveries completed</span></div><div><strong>₹{profile?.totalRevenue ?? 0}</strong><span>Total earnings</span></div></section>

      {locationError && profile?.isOnline && <p className="error-text" role="alert">{locationError}</p>}

      {!activeOrder && (!profile?.isOnline ? <p className="empty-copy">Go online to see delivery requests.</p> : !nextAvailableOrder && <p className="empty-copy">No deliveries available right now.</p>)}
    </>}

    {activeOrder && activeOrder.riderStatus === 'assigned' && !reachedPickup &&
      <RiderReachScreen order={activeOrder} riderPos={riderPos} mode="pickup" onReached={() => setReachedPickup(true)} />}

    {activeOrder && activeOrder.riderStatus === 'assigned' && reachedPickup &&
      <RiderOrderScreen order={activeOrder} riderPos={riderPos} mode="pick" onConfirm={confirmPickedOrder} isConfirming={isUpdatingDelivery} />}

    {activeOrder && activeOrder.riderStatus === 'out_for_delivery' && !reachedDrop &&
      <RiderReachScreen order={activeOrder} riderPos={riderPos} mode="drop" onReached={() => setReachedDrop(true)} />}

    {activeOrder && activeOrder.riderStatus === 'out_for_delivery' && reachedDrop &&
      <RiderOrderScreen order={activeOrder} riderPos={riderPos} mode="drop" onConfirm={markDelivered} isConfirming={isUpdatingDelivery} />}

    {!activeOrder && profile?.isOnline && nextAvailableOrder &&
      <NewOrderCard order={nextAvailableOrder} riderPos={riderPos} onAccept={() => acceptOrder(nextAvailableOrder._id)} onDeny={() => denyOrder(nextAvailableOrder._id)} isAccepting={Boolean(acceptingId)} />}
  </div>
}

export default RiderDashboard
