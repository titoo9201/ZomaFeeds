import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import api from '../../config/api'
import socket from '../../config/socket'
import '../../styles/checkout.css'
import LoadingState from '../../components/LoadingState'
import PageNav from '../../components/PageNav'
import OrderConfirmModal from '../../components/OrderConfirmModal'
import RiderTrackingMap from '../../components/RiderTrackingMap'
import OrderRouteMap from '../../components/OrderRouteMap'
import { setCartItem, clearCartItem } from '../../config/cart'

const PaymentPage = () => {
  const { orderId } = useParams()
  const [order, setOrder] = useState(null)
  const [message, setMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [showReviewPrompt, setShowReviewPrompt] = useState(true)
  const navigate = useNavigate()

  useEffect(() => { api.get(`/api/orders/${orderId}`).then(({ data }) => setOrder(data.order)).catch(() => setMessage('Order not found.')).finally(() => setIsLoading(false)) }, [orderId])

  const isAwaitingRestaurant = Boolean(order?.paymentMethod) && order?.status === 'pending'

  useEffect(() => {
    if (!isAwaitingRestaurant) return
    const interval = window.setInterval(() => {
      api.get(`/api/orders/${orderId}`).then(({ data }) => setOrder(data.order)).catch(() => {})
    }, 3000)
    return () => window.clearInterval(interval)
  }, [isAwaitingRestaurant, orderId])

  useEffect(() => {
    if (!order?._id) return
    if (!socket.connected) socket.connect()
    socket.emit('join_order', order._id)
    const onUpdate = updatedOrder => setOrder(updatedOrder)
    // Purpose-built event fired the instant the rider marks the order delivered — reacted to
    // separately from the generic order:updated so the transition off the live map into the
    // rating screen happens immediately, not on the next incidental status refresh.
    const onDelivered = updatedOrder => setOrder(updatedOrder)
    socket.on('order:updated', onUpdate)
    socket.on('order:delivered', onDelivered)
    return () => {
      socket.off('order:updated', onUpdate)
      socket.off('order:delivered', onDelivered)
      socket.emit('leave_order', order._id)
    }
  }, [order?._id])

  const isRejected = order?.status === 'cancelled'
  const isDelivered = order?.status === 'delivered'
  const isActive = Boolean(order) && !isRejected && !isDelivered
  const hasRiderAssigned = Boolean(order?.rider) && ['assigned', 'picked_up', 'out_for_delivery'].includes(order?.riderStatus)

  useEffect(() => {
    if (!order) return
    if (isDelivered || isRejected) clearCartItem()
    else setCartItem({ foodId: order.food?._id, orderId: order._id, name: order.food?.name })
  }, [order, isDelivered, isRejected])

  const statusLabel = isDelivered ? 'Delivered'
    : isRejected ? 'Order rejected'
      : isAwaitingRestaurant ? 'Order placed'
        : order?.riderStatus === 'out_for_delivery' ? 'Out for delivery'
          : order?.riderStatus === 'picked_up' ? 'Picked up — starting delivery'
            : order?.riderStatus === 'assigned' ? 'Delivery partner assigned'
              : 'Preparing your order'

  const statusNote = isDelivered ? 'Enjoy your meal — thanks for ordering with ZomaFeeds.'
    : isRejected ? null
      : isAwaitingRestaurant ? (order?.paymentMethod === 'cod' ? `You'll pay ₹${order?.total} in cash once this is accepted.` : 'Your payment is complete — this screen updates automatically.')
        : `${order?.food?.foodPartner?.name || 'The restaurant'} · ${order?.food?.name || 'your order'}`

  return <div className="checkout-page">
    <PageNav homePath="/home" />
    {isLoading ? <LoadingState label="Loading order..." /> : !order ? <p className="error-text" role="alert">{message || 'Order not found.'}</p> : <>
      <header className="checkout-header">
        <h1>{statusLabel}</h1>
        {statusNote && <p className="checkout-eta">{statusNote}</p>}
      </header>

      {message && <p className="error-text" role="alert">{message}</p>}

      {isActive && <section className="checkout-card">
        {hasRiderAssigned
          ? <RiderTrackingMap order={order} />
          : <OrderRouteMap pickupLocation={order.pickupLocation} dropLocation={order.dropLocation} />}
      </section>}

      {isActive && hasRiderAssigned && order.rider && <section className="checkout-card">
        <h2 className="checkout-card-title">Your delivery partner</h2>
        <div className="tracking-contact">
          {order.rider.profilePicture ? <img className="tracking-contact-avatar" src={order.rider.profilePicture} alt={order.rider.name} /> : <span className="tracking-contact-icon" aria-hidden="true">🛵</span>}
          <div className="tracking-contact-info"><strong>{order.rider.name}</strong><span>{order.rider.vehicleNumber}</span></div>
          {order.rider.phone && <a className="tracking-call-btn" href={`tel:${order.rider.phone}`} aria-label="Call delivery partner">📞</a>}
        </div>
      </section>}

      {isActive && <section className="checkout-card">
        <h2 className="checkout-card-title">Restaurant</h2>
        <div className="tracking-contact">
          <span className="tracking-contact-icon" aria-hidden="true">🍽️</span>
          <div className="tracking-contact-info"><strong>{order.food?.foodPartner?.name || 'Restaurant'}</strong><span>{order.food?.foodPartner?.address}</span></div>
          {order.food?.foodPartner?.phone && <a className="tracking-call-btn" href={`tel:${order.food.foodPartner.phone}`} aria-label="Call restaurant">📞</a>}
        </div>
      </section>}

      {order && <section className="checkout-card">
        <h2 className="checkout-card-title">Order details</h2>
        <div className="tracking-order-row"><span>{order.food?.name}</span><span>{order.quantity} item(s)</span></div>
        <div className="tracking-order-row"><span>Delivery address</span><span>{order.address}</span></div>
        <div className="tracking-order-row"><span>Payment</span><span>{order.paymentMethod?.toUpperCase()} · {order.paymentStatus}</span></div>
        <div className="tracking-order-row"><span>Grand total</span><span>₹{order.total}</span></div>
      </section>}
    </>}
    {isDelivered && showReviewPrompt && <OrderConfirmModal order={order} onDone={() => setShowReviewPrompt(false)} heading="Order delivered!" message="Your order has been delivered. How was it?" />}
    {isRejected && <div className="order-modal-backdrop" role="dialog" aria-modal="true" aria-label="Order rejected">
      <div className="order-modal">
        <div className="order-modal-icon order-modal-icon--danger" aria-hidden="true">✕</div>
        <h2>Order rejected</h2>
        <p>{order.food?.foodPartner?.name || 'The restaurant'} couldn't take this order: “{order.cancellationReason}”</p>
        {order.paymentStatus === 'refunded' && <p>Your ₹{order.total} has been refunded.</p>}
        <div className="order-modal-actions"><button type="button" className="order-modal-primary" onClick={() => navigate('/reels')}>Back to Reels</button></div>
      </div>
    </div>}
  </div>
}
export default PaymentPage
