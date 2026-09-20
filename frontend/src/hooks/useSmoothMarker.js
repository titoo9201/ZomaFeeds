import { useEffect, useRef, useState } from 'react'
import { bearingBetween } from '../config/geo'

const DEFAULT_DURATION_MS = 1500

// Tweens a lat/lng position smoothly toward each new fix instead of snapping,
// and tracks the compass bearing of travel so a marker icon can be rotated to face it.
export function useSmoothMarker(targetPosition, durationMs = DEFAULT_DURATION_MS) {
  const [position, setPosition] = useState(targetPosition)
  const [bearing, setBearing] = useState(0)
  const frameRef = useRef(null)
  const currentRef = useRef(targetPosition)

  useEffect(() => {
    if (!targetPosition?.lat) return
    const from = currentRef.current?.lat ? currentRef.current : targetPosition
    const to = targetPosition
    if (from.lat === to.lat && from.lng === to.lng) return

    const nextBearing = bearingBetween(from, to)
    if (nextBearing != null) setBearing(nextBearing)

    if (frameRef.current) cancelAnimationFrame(frameRef.current)
    const startTime = performance.now()

    const step = now => {
      const t = Math.min(1, (now - startTime) / durationMs)
      const interpolated = { lat: from.lat + (to.lat - from.lat) * t, lng: from.lng + (to.lng - from.lng) * t }
      currentRef.current = interpolated
      setPosition(interpolated)
      if (t < 1) frameRef.current = requestAnimationFrame(step)
    }
    frameRef.current = requestAnimationFrame(step)

    return () => { if (frameRef.current) cancelAnimationFrame(frameRef.current) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetPosition?.lat, targetPosition?.lng, durationMs])

  return { position, bearing }
}
