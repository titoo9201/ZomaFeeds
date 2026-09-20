import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import api from '../../config/api'
import '../../styles/checkout.css'
import LoadingState from '../../components/LoadingState'
import PageNav from '../../components/PageNav'
import OrderConfirmModal from '../../components/OrderConfirmModal'
import { setCartItem, clearCartItem } from '../../config/cart'

const PAYMENT_METHODS = [
  { id: 'upi', icon: '📲', label: 'UPI', hint: 'Pay instantly with any UPI app' },
  { id: 'card', icon: '💳', label: 'Card', hint: 'Credit or debit card' },
  { id: 'cod', icon: '💵', label: 'Cash on delivery', hint: 'Pay when the delivery partner arrives' }
]

const PaymentPage = () => {
  const { orderId } = useParams()
  const [order, setOrder] = useState(null)
  const [paymentMethod, setPaymentMethod] = useState('upi')
  const [message, setMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isPaying, setIsPaying] = useState(false)
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

  const pay = async () => {
    try {
      setIsPaying(true)
      const { data } = await api.patch(`/api/orders/${orderId}/pay`, { paymentMethod })
      setOrder(data.order)
    } catch {
      setMessage('Payment could not be completed.')
    } finally {
      setIsPaying(false)
    }
  }

  const isAccepted = order?.status === 'preparing'
  const isRejected = order?.status === 'cancelled'

  useEffect(() => {
    if (!order) return
    if (isAccepted || isRejected) clearCartItem()
    else setCartItem({ foodId: order.food?._id, orderId: order._id, name: order.food?.name })
  }, [order, isAccepted, isRejected])

  return <div className="checkout-page">
    <PageNav homePath="/home" />
    {isLoading ? <LoadingState label="Loading order..." /> : !order ? <p className="error-text" role="alert">{message || 'Order not found.'}</p> : <>
      <header className="checkout-header">
        <h1>{isAwaitingRestaurant ? 'Order placed' : 'Choose how to pay'}</h1>
        <p className="checkout-eta">Order for <strong>{order.food?.name || 'your food'}</strong></p>
      </header>

      {!order.paymentMethod && <div className="checkout-grid">
        <div className="checkout-col">
          <section className="checkout-card">
            <h2 className="checkout-card-title">Payment method</h2>
            <div className="payment-methods">
              {PAYMENT_METHODS.map(method => <button key={method.id} type="button" className={`payment-method ${paymentMethod === method.id ? 'is-selected' : ''}`} onClick={() => setPaymentMethod(method.id)}>
                <span className="payment-method-icon" aria-hidden="true">{method.icon}</span>
                <span className="payment-method-copy"><strong>{method.label}</strong><span>{method.hint}</span></span>
                <span className="payment-method-radio" aria-hidden="true" />
              </button>)}
            </div>
          </section>
        </div>

        <div className="checkout-col">
          <section className="checkout-card">
            <h2 className="checkout-card-title">Bill summary</h2>
            <div className="checkout-bill-row"><span>{order.food?.name}</span><span>{order.quantity} item(s)</span></div>
            <div className="checkout-bill-row"><span>Delivery address</span></div>
            <p className="checkout-note">{order.address}</p>
            <div className="checkout-bill-row checkout-bill-total"><span>To pay</span><span>₹{order.total}</span></div>
          </section>
        </div>

        {message && <p className="error-text" role="alert">{message}</p>}

        <div className="checkout-footer">
          <div className="checkout-footer-inner">
            <div className="checkout-footer-total"><strong>₹{order.total}</strong><span>Total</span></div>
            <button className="checkout-cta" type="button" onClick={pay} disabled={isPaying}>
              {isPaying ? 'Processing...' : paymentMethod === 'cod' ? 'Place order' : `Pay ₹${order.total} now`}
            </button>
          </div>
        </div>
      </div>}

      {isAwaitingRestaurant && <section className="checkout-card checkout-waiting">
        <div className="checkout-waiting-spinner" aria-hidden="true" />
        <h2 className="checkout-card-title">Waiting for {order.food?.foodPartner?.name || 'the restaurant'} to confirm...</h2>
        <p className="checkout-note">{order.paymentMethod === 'cod' ? `You'll pay ₹${order.total} in cash once this is accepted.` : 'Your payment is complete — this screen updates automatically.'}</p>
      </section>}
    </>}
    {isAccepted && <OrderConfirmModal order={order} onDone={() => navigate('/reels')} />}
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
