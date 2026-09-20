import { useEffect } from 'react'
import { useMap } from 'react-leaflet'

const MapRecenter = ({ position }) => {
  const map = useMap()
  useEffect(() => { if (position) map.setView([position.lat, position.lng], map.getZoom()) }, [position, map])
  return null
}

export default MapRecenter
