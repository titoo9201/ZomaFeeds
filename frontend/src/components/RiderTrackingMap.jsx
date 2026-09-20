import { useEffect, useMemo, useState } from 'react'
import { MapContainer, TileLayer, Marker, Polyline } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import api from '../config/api'
import socket from '../config/socket'
import MapRecenter from './MapRecenter'
import { RESTAURANT_ICON, makeRiderIcon, CUSTOMER_ICON } from '../config/mapIcons'
import { distanceMeters, ARRIVAL_THRESHOLD_METERS } from '../config/geo'
import { useSmoothMarker } from '../hooks/useSmoothMarker'
import '../styles/riderMap.css'

const RiderTrackingMap = ({ order, onConfirmCash, isConfirmingCash }) => {
  const [riderFix, setRiderFix] = useState(order.rider?.currentLocation || null)
  const [route, setRoute] = useState(null)
  const [eta, setEta] = useState(null)
  const { position: riderPos, bearing } = useSmoothMarker(riderFix)
  const riderIcon = useMemo(() => makeRiderIcon(bearing), [bearing])

  useEffect(() => { setRiderFix(order.rider?.currentLocation || null) }, [order.rider?.currentLocation])

  useEffect(() => {
    if (!socket.connected) socket.connect()
    socket.emit('join_order', order._id)
    const onLocation = data => setRiderFix({ lat: data.lat, lng: data.lng })
    socket.on('rider:location', onLocation)
    return () => {
      socket.off('rider:location', onLocation)
      socket.emit('leave_order', order._id)
    }
  }, [order._id])

  useEffect(() => {
    let cancelled = false
    const loadRoute = () => api.get(`/api/orders/${order._id}/route`).then(({ data }) => {
      if (cancelled) return
      setRoute(data.route.geometry.map(point => [point.lat, point.lng]))
      setEta(Math.round(data.route.duration / 60))
    }).catch(() => {})
    loadRoute()
    const interval = window.setInterval(loadRoute, 15000)
    return () => { cancelled = true; window.clearInterval(interval) }
  }, [order._id, riderFix])

  if (!riderPos) return <div className="rider-map-empty">Waiting for your delivery partner's location...</div>

  const destination = order.riderStatus === 'assigned' ? order.pickupLocation : order.dropLocation
  const destinationIcon = order.riderStatus === 'assigned' ? RESTAURANT_ICON : CUSTOMER_ICON
  const canConfirmCash = order.paymentMethod === 'cod' && order.paymentStatus !== 'paid' && order.riderStatus === 'out_for_delivery' && distanceMeters(riderFix, order.dropLocation) <= ARRIVAL_THRESHOLD_METERS

  return <div className="rider-map-wrap">
    <MapContainer center={[riderPos.lat, riderPos.lng]} zoom={14} scrollWheelZoom={false} className="rider-map">
      <TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <MapRecenter position={riderFix} />
      <Marker position={[riderPos.lat, riderPos.lng]} icon={riderIcon} />
      {destination?.lat != null && <Marker position={[destination.lat, destination.lng]} icon={destinationIcon} />}
      {route && <Polyline positions={route} color="#E23744" weight={4} />}
    </MapContainer>
    {eta != null && <p className="rider-map-eta">Estimated arrival: <strong>{eta} min</strong></p>}
    {canConfirmCash && <button type="button" className="rider-action-btn" onClick={onConfirmCash} disabled={isConfirmingCash}>{isConfirmingCash ? 'Confirming...' : `I've paid ₹${order.total} in cash`}</button>}
  </div>
}

export default RiderTrackingMap
