import { useEffect, useRef, useState } from 'react'
import '../../styles/rider-flow.css'

const THRESHOLD_RATIO = 0.82

// A drag-to-confirm slider for the rider's critical actions (accept, reached, delivered) —
// a deliberate swipe gesture is much harder to trigger by an accidental tap than a plain button,
// which matters here since these actions can't be undone (claiming an order, marking delivered).
const SwipeToConfirm = ({ label, confirmingLabel = 'Updating...', onConfirm, disabled = false, isConfirming = false }) => {
  const trackRef = useRef(null)
  const thumbRef = useRef(null)
  const maxXRef = useRef(0)
  const dragStartRef = useRef(0)
  const [dragX, setDragX] = useState(0)
  const [isDragging, setIsDragging] = useState(false)

  const measure = () => {
    if (trackRef.current && thumbRef.current) {
      maxXRef.current = Math.max(0, trackRef.current.clientWidth - thumbRef.current.clientWidth)
    }
  }

  useEffect(() => {
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [])

  // Springs back to the start once a request finishes — covers both a failed attempt (stays
  // mounted, ready to retry) and a successful one (component unmounts almost immediately after).
  useEffect(() => {
    if (!isConfirming) setDragX(0)
  }, [isConfirming])

  const isLocked = disabled || isConfirming

  const handlePointerDown = event => {
    if (isLocked) return
    measure()
    dragStartRef.current = event.clientX - dragX
    setIsDragging(true)
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const handlePointerMove = event => {
    if (!isDragging) return
    const next = Math.min(Math.max(0, event.clientX - dragStartRef.current), maxXRef.current)
    setDragX(next)
  }

  const handlePointerUp = () => {
    if (!isDragging) return
    setIsDragging(false)
    if (maxXRef.current > 0 && dragX / maxXRef.current >= THRESHOLD_RATIO) {
      setDragX(maxXRef.current)
      onConfirm()
    } else {
      setDragX(0)
    }
  }

  const thumbX = isConfirming ? maxXRef.current : dragX
  const progress = maxXRef.current > 0 ? thumbX / maxXRef.current : 0

  return <div ref={trackRef} className={`swipe-confirm${isLocked ? ' is-locked' : ''}${disabled ? ' is-disabled' : ''}`}>
    <div className="swipe-confirm-fill" style={{ width: `${thumbX + 30}px` }} />
    <span className="swipe-confirm-label" style={{ opacity: Math.max(0, 1 - progress * 1.6) }}>{isConfirming ? confirmingLabel : label}</span>
    <div
      ref={thumbRef}
      className="swipe-confirm-thumb"
      style={{ transform: `translateX(${thumbX}px)`, transition: isDragging ? 'none' : 'transform .25s ease' }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {isConfirming ? '…' : '→'}
    </div>
  </div>
}

export default SwipeToConfirm
