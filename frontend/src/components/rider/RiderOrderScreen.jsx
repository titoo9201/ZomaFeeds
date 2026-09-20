import { useState } from 'react'
import { distanceMeters, ARRIVAL_THRESHOLD_METERS } from '../../config/geo'
import '../../styles/rider-flow.css'

const Collapsible = ({ title, children, defaultOpen = false }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  return <div className="flow-collapsible">
    <button type="button" className="flow-collapsible-header" onClick={() => setIsOpen(previous => !previous)}>
      <span>{title}</span><span aria-hidden="true">{isOpen ? '⌃' : '⌄'}</span>
    </button>
    {isOpen && <div className="flow-collapsible-body">{children}</div>}
  </div>
}

const RiderOrderScreen = ({ order, riderPos, mode, onConfirm, isConfirming }) => {
  const isPick = mode === 'pick'
  const mapsUrl = order.address && order.dropLocation?.lat != null ? `https://www.google.com/maps/dir/?api=1&destination=${order.dropLocation.lat},${order.dropLocation.lng}` : null

  const hasArrived = isPick || distanceMeters(riderPos, order.dropLocation) <= ARRIVAL_THRESHOLD_METERS
  const waitingForCash = !isPick && order.paymentMethod === 'cod' && order.paymentStatus !== 'paid'
  const canConfirm = hasArrived && !waitingForCash

  const buttonLabel = isConfirming ? 'Updating...'
    : isPick ? 'Picked order'
      : waitingForCash ? 'Waiting for cash confirmation'
        : !hasArrived ? 'Get to the customer'
          : 'Order delivered'

  return <div className="rider-flow-overlay">
    <div className="flow-screen">
      <div className="flow-header">⌄ {isPick ? 'Pick order' : 'Drop order'}</div>

      <div className="flow-sheet" style={{ marginTop: 0 }}>
        <div className="flow-sheet-handle" aria-hidden="true" />

        {isPick
          ? <>
            <span className="flow-order-id">Order ID<strong>{String(order._id).slice(-10).toUpperCase()}</strong></span>
            <Collapsible title={`Order details — ${order.food?.foodPartner?.name || 'Restaurant'}`} defaultOpen>
              <span>{order.quantity} × {order.food?.name}</span>
            </Collapsible>
            <Collapsible title="Restaurant details">
              <span>{order.food?.foodPartner?.name}</span>
              <span>{order.food?.foodPartner?.address}</span>
              {order.food?.foodPartner?.phone && <a href={`tel:${order.food.foodPartner.phone}`}>📞 {order.food.foodPartner.phone}</a>}
            </Collapsible>
            <Collapsible title="Customer details">
              <span>{order.user?.fullName || 'Customer'}</span>
              <span>{order.address}</span>
            </Collapsible>
          </>
          : <>
            <span className="flow-badge">
              {order.paymentMethod === 'cod' ? (order.paymentStatus === 'paid' ? '✓ Cash confirmed' : '⏳ Cash on delivery — awaiting confirmation') : '✓ Paid online'}
            </span>
            <div>
              <h3 className="flow-contact-name">{order.user?.fullName || 'Customer'}</h3>
              <p className="flow-contact-address">{order.address}</p>
            </div>
            <div className="flow-contact-actions">
              {order.user?.phone ? <a href={`tel:${order.user.phone}`}>📞 Call</a> : <span />}
              {mapsUrl && <a className="is-primary" href={mapsUrl} target="_blank" rel="noopener noreferrer">📍 Go to map</a>}
            </div>
            <Collapsible title={`Order details — ${order.food?.foodPartner?.name || 'Restaurant'}`}>
              <span>{order.quantity} × {order.food?.name}</span>
              <span>Grand total: ₹{order.total}</span>
            </Collapsible>
          </>}

        <button type="button" className="flow-action-btn" onClick={onConfirm} disabled={isConfirming || !canConfirm}>{buttonLabel}</button>
      </div>
    </div>
  </div>
}

export default RiderOrderScreen
