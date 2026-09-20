import L from 'leaflet'

const makePinIcon = (emoji, className) => L.divIcon({
  html: `<span class="rider-map-pin ${className}">${emoji}</span>`,
  className: 'rider-map-pin-wrap',
  iconSize: [32, 32],
  iconAnchor: [16, 16]
})

export const RESTAURANT_ICON = makePinIcon('🍽️', 'rider-map-pin--restaurant')
export const CUSTOMER_ICON = makePinIcon('📍', 'rider-map-pin--customer')

// The rider marker is a bare bike icon (no pin/badge background), per product requirement,
// rotated to face the direction of travel (bearing in degrees, 0 = north).
export const makeRiderIcon = (bearing = 0) => L.divIcon({
  html: `<span class="rider-bike-icon" style="transform: rotate(${bearing}deg);">🛵</span>`,
  className: 'rider-bike-icon-wrap',
  iconSize: [34, 34],
  iconAnchor: [17, 20]
})
