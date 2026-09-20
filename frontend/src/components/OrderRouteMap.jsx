import { useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { RESTAURANT_ICON, CUSTOMER_ICON } from '../config/mapIcons'
import '../styles/riderMap.css'

const FitBounds = ({ points }) => {
  const map = useMap()
  useEffect(() => { if (points.length > 1) map.fitBounds(points, { padding: [32, 32] }) }, [points, map])
  return null
}

const OrderRouteMap = ({ pickupLocation, dropLocation }) => {
  if (!pickupLocation?.lat || !dropLocation?.lat) return <div className="rider-map-empty">Preparing your order...</div>

  const points = [[pickupLocation.lat, pickupLocation.lng], [dropLocation.lat, dropLocation.lng]]

  return <div className="rider-map-wrap">
    <MapContainer center={points[0]} zoom={13} scrollWheelZoom={false} className="rider-map">
      <TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <FitBounds points={points} />
      <Marker position={points[0]} icon={RESTAURANT_ICON} />
      <Marker position={points[1]} icon={CUSTOMER_ICON} />
      <Polyline positions={points} color="#E23744" weight={3} dashArray="6 8" />
    </MapContainer>
    <p className="rider-map-eta">Your delivery partner will pick this up once assigned</p>
  </div>
}

export default OrderRouteMap
