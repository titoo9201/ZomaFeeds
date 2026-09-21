import { useState } from 'react'
import { distanceMeters, ARRIVAL_THRESHOLD_METERS } from '../../config/geo'
import SwipeToConfirm from './SwipeToConfirm'
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

const buildMapsUrl = location => location?.lat != null ? `https://www.google.com/maps/dir/?api=1&destination=${location.lat},${location.lng}&travelmode=driving` : null

const RiderOrderScreen = ({ order, riderPos, mode, onConfirm, isConfirming }) => {
  const isPick = mode === 'pick'
  const restaurant = order.items?.[0]?.food?.foodPartner
  const pickupMapsUrl = buildMapsUrl(order.pickupLocation)
  const dropMapsUrl = buildMapsUrl(order.dropLocation)

  const hasArrived = isPick || distanceMeters(riderPos, order.dropLocation) <= ARRIVAL_THRESHOLD_METERS
  // The rider confirms cash collection directly now (Zomato/Swiggy pattern) — one tap both
  // completes the delivery and settles the payment, instead of waiting on the customer.
  const isCod = !isPick && order.paymentMethod === 'cod' && order.paymentStatus !== 'paid'
  const canConfirm = hasArrived

  const swipeLabel = isPick ? 'Swipe — picked order'
    : !hasArrived ? 'Get to the customer'
      : isCod ? 'Swipe — cash collected & delivered'
        : 'Swipe to mark delivered'

  return <div className="rider-flow-overlay">
    <div className="flow-screen">
      <div className="flow-header">⌄ {isPick ? 'Pick order' : 'Drop order'}</div>

      <div className="flow-sheet" style={{ marginTop: 0 }}>
        <div className="flow-sheet-handle" aria-hidden="true" />

        {isPick
          ? <>
            <span className="flow-order-id">Order ID<strong>{String(order._id).slice(-10).toUpperCase()}</strong></span>
            <div>
              <h3 className="flow-contact-name">{restaurant?.name || 'Restaurant'}</h3>
              <p className="flow-contact-address"><strong>Pickup address:</strong> {restaurant?.address}</p>
            </div>
            <div className="flow-contact-actions">
              {restaurant?.phone ? <a href={`tel:${restaurant.phone}`}>📞 Call</a> : <span />}
              {pickupMapsUrl && <a className="is-primary" href={pickupMapsUrl} target="_blank" rel="noopener noreferrer">🧭 Navigate to Restaurant</a>}
            </div>
            <Collapsible title="Order details" defaultOpen>
              {order.items?.map(item => <span key={item.food?._id}>{item.quantity} × {item.food?.name}</span>)}
            </Collapsible>
            <Collapsible title="Customer details">
              <span>{order.user?.fullName || 'Customer'}</span>
              <p><strong>Delivery address:</strong> {order.address}</p>
            </Collapsible>
          </>
          : <>
            {isCod
              ? <div className="flow-cod-banner"><span>Collect from customer</span><strong>₹{order.total}</strong></div>
              : <span className="flow-badge">✓ Paid online</span>}
            <div>
              <h3 className="flow-contact-name">{order.user?.fullName || 'Customer'}</h3>
              <p className="flow-contact-address"><strong>Delivery address:</strong> {order.address}</p>
            </div>
            <div className="flow-contact-actions">
              {order.user?.phone ? <a href={`tel:${order.user.phone}`}>📞 Call</a> : <span />}
              {dropMapsUrl && <a className="is-primary" href={dropMapsUrl} target="_blank" rel="noopener noreferrer">🧭 Navigate to Customer</a>}
            </div>
            <Collapsible title={`Order details — ${restaurant?.name || 'Restaurant'}`}>
              {order.items?.map(item => <span key={item.food?._id}>{item.quantity} × {item.food?.name}</span>)}
              <span>Grand total: ₹{order.total}</span>
            </Collapsible>
          </>}

        <SwipeToConfirm label={swipeLabel} confirmingLabel="Updating..." onConfirm={onConfirm} disabled={!canConfirm} isConfirming={isConfirming} />
      </div>
    </div>
  </div>
}

export default RiderOrderScreen
