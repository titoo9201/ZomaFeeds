import { useRef, useState } from 'react'
import { MapContainer, TileLayer, Marker } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import MapRecenter from './MapRecenter'
import '../styles/pinConfirmMap.css'

const PIN_ICON = L.divIcon({
  html: '<span class="pin-confirm-marker">📍</span>',
  className: 'pin-confirm-marker-wrap',
  iconSize: [32, 32],
  iconAnchor: [16, 32]
})

// Many smaller Indian localities have little/no street-name coverage in OpenStreetMap — satellite
// imagery lets people recognise their own house/street by shape instead of relying on text labels.
// "Satellite" stacks Esri's imagery with its road/place-name reference overlay on top (a "hybrid"
// view, closer to what people expect from Google Maps) instead of a bare, unlabelled photo.
const TILE_LAYERS = {
  street: [{ url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', attribution: '&copy; OpenStreetMap contributors' }],
  satellite: [
    { url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', attribution: '&copy; Esri' },
    { url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}' }
  ]
}

// Shows the geocoder's best guess as a draggable pin; the caller only trusts the coordinates
// once the user has had a chance to drag it to the exact spot (geocoding Indian addresses by
// text alone can land several km off — see PinConfirmMap's callers for why this exists).
const PinConfirmMap = ({ position, onDragEnd }) => {
  const markerRef = useRef(null)
  const [layer, setLayer] = useState('satellite')

  if (!position) return null

  const handleDragEnd = () => {
    const marker = markerRef.current
    if (!marker) return
    const { lat, lng } = marker.getLatLng()
    onDragEnd({ lat, lng })
  }

  return <div className="pin-confirm-map-wrap">
    <div className="pin-confirm-layer-toggle">
      <button type="button" className={layer === 'street' ? 'is-active' : ''} onClick={() => setLayer('street')}>Map</button>
      <button type="button" className={layer === 'satellite' ? 'is-active' : ''} onClick={() => setLayer('satellite')}>Satellite</button>
    </div>
    <MapContainer center={[position.lat, position.lng]} zoom={16} scrollWheelZoom className="pin-confirm-map">
      {TILE_LAYERS[layer].map(tile => <TileLayer key={tile.url} attribution={tile.attribution} url={tile.url} />)}
      <MapRecenter position={position} />
      <Marker position={[position.lat, position.lng]} icon={PIN_ICON} draggable eventHandlers={{ dragend: handleDragEnd }} ref={markerRef} />
    </MapContainer>
    <p className="small-note">Drag the pin to your exact spot. Zoom out first if you're not sure where you are, then zoom back in on your house.</p>
  </div>
}

export default PinConfirmMap
