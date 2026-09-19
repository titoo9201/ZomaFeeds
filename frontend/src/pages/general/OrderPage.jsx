import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import api from '../../config/api'
import '../../styles/checkout.css'
import LoadingState from '../../components/LoadingState'
import PageNav from '../../components/PageNav'
import { setCartItem, clearCartItem } from '../../config/cart'

const OrderPage = () => {
  const { foodId } = useParams()
  const [food, setFood] = useState(null)
  const [quantity, setQuantity] = useState(1)
  const [address, setAddress] = useState('')
  const [message, setMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isNotifyRequested, setIsNotifyRequested] = useState(false)
  const navigate = useNavigate()

  useEffect(() => { api.get('/api/food').then(({ data }) => setFood(data.foodItems.find(item => item._id === foodId))).catch(() => setMessage('Unable to load this food.')).finally(() => setIsLoading(false)) }, [foodId])

  useEffect(() => { if (food) setCartItem({ foodId: food._id, name: food.name }) }, [food])

  const unitPrice = food?.price ?? 1
  const isClosed = food?.foodPartner?.isOpen === false
  const isUnavailable = food?.isAvailable === false
  const canOrder = !isClosed && !isUnavailable

  const submit = async event => {
    event.preventDefault()
    if (!address.trim() || !canOrder) return
    try {
      setIsSubmitting(true)
      const { data } = await api.post('/api/orders', { food: foodId, quantity, address })
      navigate(`/payment/${data.order._id}`)
    } catch (error) { setMessage(error.response?.data?.message || 'Could not place order.') } finally { setIsSubmitting(false) }
  }

  const notifyMe = async () => {
    try { await api.post(`/api/food-partner/${food.foodPartner._id}/notify-me`); setIsNotifyRequested(true) } catch { setMessage('Could not save your request. Please try again.') }
  }

  const itemTotal = quantity * unitPrice

  const decreaseOrRemove = () => {
    if (quantity <= 1) { clearCartItem(); navigate(-1); return }
    setQuantity(q => q - 1)
  }

  return <div className="checkout-page">
    <PageNav homePath="/home" />
    {isLoading ? <LoadingState label="Loading food details..." /> : !food ? <p className="error-text" role="alert">{message || 'Food not found.'}</p> : <>
      <header className="checkout-header">
        <h1>{food.foodPartner?.name || 'Restaurant'}</h1>
        <p className="checkout-eta"><span className="checkout-eta-badge">⚡ 30-40 mins</span> to your address</p>
        <span className="checkout-rating-pill"><span className="star">★</span> {food.foodPartner?.averageRating || 0} <span>({food.foodPartner?.reviewCount || 0} restaurant reviews)</span></span>
      </header>

      {!canOrder && <section className="checkout-card">
        <h2 className="checkout-card-title">{isClosed ? 'This restaurant is currently closed' : 'This item is currently unavailable'}</h2>
        {isClosed && <p className="checkout-note">{food.foodPartner?.openingTime && food.foodPartner?.closingTime ? `Usually open ${food.foodPartner.openingTime} – ${food.foodPartner.closingTime}.` : ''} We'll let you know as soon as it opens.</p>}
        {isClosed && (isNotifyRequested ? <p className="small-note">We'll notify you when this restaurant opens.</p> : <button type="button" className="checkout-cta" onClick={notifyMe}>Notify me when open</button>)}
      </section>}

      <form className="checkout-grid" onSubmit={submit}>
        <div className="checkout-col">
          <section className="checkout-card">
            <div className="checkout-item">
              <video className="checkout-item-thumb" src={food.video} muted loop playsInline preload="metadata" />
              <div className="checkout-item-info">
                <strong>{food.name}</strong>
                <span className="checkout-item-price">₹{unitPrice} each</span>
                <span className="checkout-rating-pill checkout-item-rating"><span className="star">★</span> {food.averageRating || 0} <span>({food.reviewCount || 0} reviews)</span></span>
              </div>
              <div className="checkout-stepper">
                <button type="button" onClick={decreaseOrRemove} aria-label={quantity <= 1 ? 'Remove from cart' : 'Decrease quantity'}>{quantity <= 1 ? '🗑' : '−'}</button>
                <span>{quantity}</span>
                <button type="button" onClick={() => setQuantity(q => Math.min(50, q + 1))} disabled={quantity >= 50} aria-label="Increase quantity">+</button>
              </div>
            </div>
          </section>
        </div>

        <div className="checkout-col">
          <section className="checkout-card">
            <h2 className="checkout-card-title">Delivery address</h2>
            <textarea required value={address} onChange={event => setAddress(event.target.value)} placeholder="Apartment, street, city" />
          </section>

          <section className="checkout-card">
            <h2 className="checkout-card-title">Bill summary</h2>
            <div className="checkout-bill-row"><span>Item total ({quantity} × ₹{unitPrice})</span><span>₹{itemTotal}</span></div>
            <div className="checkout-bill-row"><span>Delivery fee</span><span className="checkout-free">FREE (test mode)</span></div>
            <div className="checkout-bill-row checkout-bill-total"><span>To pay</span><span>₹{itemTotal}</span></div>
            <p className="checkout-note">No real money is ever charged — this is a dummy checkout for testing.</p>
          </section>
        </div>

        {message && <p className="error-text" role="alert">{message}</p>}

        <div className="checkout-footer">
          <div className="checkout-footer-inner">
            <div className="checkout-footer-total"><strong>₹{itemTotal}</strong><span>Total</span></div>
            <button className="checkout-cta" type="submit" disabled={isSubmitting || !address.trim() || !canOrder}>{isSubmitting ? 'Placing order...' : 'Proceed to payment'}</button>
          </div>
        </div>
      </form>
    </>}
  </div>
}
export default OrderPage
