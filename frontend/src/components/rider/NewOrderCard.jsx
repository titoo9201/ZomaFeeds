import { useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { RESTAURANT_ICON, CUSTOMER_ICON } from '../../config/mapIcons'
import { distanceMeters } from '../../config/geo'
import SwipeToConfirm from './SwipeToConfirm'
import '../../styles/rider-flow.css'

const AVG_SPEED_KMH = 20

const FitBounds = ({ points }) => {
  const map = useMap()
  useEffect(() => { if (points.length > 1) map.fitBounds(points, { padding: [20, 20] }) }, [points, map])
  return null
}

const NewOrderCard = ({ order, riderPos, onAccept, onDeny, isAccepting }) => {
  const pickup = order.pickupLocation
  const drop = order.dropLocation
  const pickupDistanceKm = riderPos && pickup?.lat ? Number((distanceMeters(riderPos, pickup) / 1000).toFixed(1)) : null
  const dropDistanceKm = order.distanceKm ?? null
  const tripDistanceKm = pickupDistanceKm != null && dropDistanceKm != null ? Number((pickupDistanceKm + dropDistanceKm).toFixed(1)) : dropDistanceKm
  const etaMinutes = pickupDistanceKm != null ? Math.max(1, Math.round((pickupDistanceKm / AVG_SPEED_KMH) * 60)) : null

  const points = pickup?.lat && drop?.lat ? [[pickup.lat, pickup.lng], [drop.lat, drop.lng]] : null

  return <div className="rider-flow-overlay">
    <div className="new-order-card">
      <div className="new-order-top">
        <button type="button" className="new-order-deny" onClick={onDeny} disabled={isAccepting}>✕ Deny</button>
      </div>

      {points && <div className="new-order-map-wrap">
        <MapContainer center={points[0]} zoom={13} zoomControl={false} attributionControl={false} dragging={false} scrollWheelZoom={false} doubleClickZoom={false} className="new-order-map">
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <FitBounds points={points} />
          <Marker position={points[0]} icon={RESTAURANT_ICON} />
          <Marker position={points[1]} icon={CUSTOMER_ICON} />
          <Polyline positions={points} color="#3d6de0" weight={3} />
        </MapContainer>
      </div>}

      <h2 className="new-order-title">New order!</h2>

      <div className="new-order-distance-card">
        <div className="new-order-distance-row"><span>Trip distance</span><strong>{tripDistanceKm != null ? `${tripDistanceKm} km` : '—'}</strong></div>
        <div className="new-order-distance-split">
          <span>Pickup: <strong>{pickupDistanceKm != null ? `${pickupDistanceKm} kms` : '—'}</strong></span>
          <span>Drop: <strong>{dropDistanceKm != null ? `${dropDistanceKm} kms` : '—'}</strong></span>
        </div>
      </div>

      <div className="new-order-pickup-card">
        <p className="new-order-pickup-label">Pickup from</p>
        <p className="new-order-pickup-name">{order.food?.foodPartner?.name || 'Restaurant'}</p>
        <p className="new-order-pickup-address">{order.food?.foodPartner?.address}</p>
        {etaMinutes != null && <p className="new-order-eta">🕒 {etaMinutes} min{etaMinutes > 1 ? 's' : ''} away</p>}
      </div>

      <SwipeToConfirm label="Swipe to accept order" confirmingLabel="Accepting..." onConfirm={onAccept} isConfirming={isAccepting} />
    </div>
  </div>
}

export default NewOrderCard
