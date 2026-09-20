import { useEffect, useMemo, useState } from 'react'
import { MapContainer, TileLayer, Marker, Polyline } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import api from '../../config/api'
import MapRecenter from '../MapRecenter'
import { RESTAURANT_ICON, makeRiderIcon, CUSTOMER_ICON } from '../../config/mapIcons'
import { useSmoothMarker } from '../../hooks/useSmoothMarker'
import '../../styles/rider-flow.css'

const RiderReachScreen = ({ order, riderPos: riderFix, mode, onReached }) => {
  const [route, setRoute] = useState(null)
  const [eta, setEta] = useState(null)
  const { position: riderPos, bearing } = useSmoothMarker(riderFix)
  const riderIcon = useMemo(() => makeRiderIcon(bearing), [bearing])

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

  const isPickup = mode === 'pickup'
  const destination = isPickup ? order.pickupLocation : order.dropLocation
  const destinationIcon = isPickup ? RESTAURANT_ICON : CUSTOMER_ICON
  const contactName = isPickup ? (order.food?.foodPartner?.name || 'Restaurant') : (order.user?.fullName || 'Customer')
  const contactAddress = isPickup ? order.food?.foodPartner?.address : order.address
  const contactPhone = isPickup ? order.food?.foodPartner?.phone : order.user?.phone
  const mapsUrl = destination?.lat != null ? `https://www.google.com/maps/dir/?api=1&destination=${destination.lat},${destination.lng}` : null

  return <div className="rider-flow-overlay">
    <div className="flow-screen">
      <div className="flow-header">⌄ Reach {isPickup ? 'pickup' : 'drop'}</div>

      <div className="flow-map">
        {riderPos && <MapContainer center={[riderPos.lat, riderPos.lng]} zoom={14} zoomControl={false} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}>
          <TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <MapRecenter position={riderFix} />
          <Marker position={[riderPos.lat, riderPos.lng]} icon={riderIcon} />
          {destination?.lat != null && <Marker position={[destination.lat, destination.lng]} icon={destinationIcon} />}
          {route && <Polyline positions={route} color="#E23744" weight={4} />}
        </MapContainer>}
      </div>

      <div className="flow-sheet">
        <div className="flow-sheet-handle" aria-hidden="true" />
        {eta != null && <span className="flow-eta-badge">🕒 {eta} min away</span>}
        <div>
          <h3 className="flow-contact-name">{contactName}</h3>
          <p className="flow-contact-address">{contactAddress}</p>
        </div>
        <div className="flow-contact-actions">
          {contactPhone ? <a href={`tel:${contactPhone}`}>📞 Call</a> : <span />}
          {mapsUrl && <a className="is-primary" href={mapsUrl} target="_blank" rel="noopener noreferrer">📍 Go to map</a>}
        </div>
        <div className="flow-meta-row">
          <span>Order: {String(order._id).slice(-10)}</span>
          {isPickup ? <span>· Customer: {order.user?.fullName || 'Customer'}</span> : <span>· Pickup: {order.food?.foodPartner?.name}</span>}
        </div>
        <button type="button" className="flow-action-btn" onClick={onReached}>Reached {isPickup ? 'pickup' : 'drop'} location</button>
      </div>
    </div>
  </div>
}

export default RiderReachScreen
