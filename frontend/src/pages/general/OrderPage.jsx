import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import api from '../../config/api'
import '../../styles/checkout.css'
import LoadingState from '../../components/LoadingState'
import PageNav from '../../components/PageNav'
import { addToCart } from '../../config/cart'

// This page is just the entry point from a "Order now" tap while browsing — it adds the tapped
// dish to the cart (warning first if that would replace a different restaurant's cart) and hands
// off straight to /cart, which is the real multi-item checkout screen.
const OrderPage = () => {
  const { foodId } = useParams()
  const navigate = useNavigate()
  const [message, setMessage] = useState('')
  const [conflict, setConflict] = useState(null)

  const cartItemOf = food => ({
    foodId: food._id,
    name: food.name,
    price: food.price ?? 1,
    quantity: 1,
    foodPartnerId: food.foodPartner?._id,
    foodPartnerName: food.foodPartner?.name || 'Restaurant'
  })

  const tryAdd = (food, force = false) => {
    const result = addToCart(cartItemOf(food), { force })
    if (result.needsConfirmation) { setConflict({ food, previousRestaurantName: result.previousRestaurantName }); return }
    navigate('/cart', { replace: true })
  }

  useEffect(() => {
    let cancelled = false
    api.get('/api/food').then(({ data }) => {
      if (cancelled) return
      const food = data.foodItems.find(item => item._id === foodId)
      if (!food) { setMessage('Food not found.'); return }
      if (food.foodPartner?.isOpen === false) { setMessage('This restaurant is currently closed.'); return }
      if (food.isAvailable === false) { setMessage('This item is currently unavailable.'); return }
      tryAdd(food)
    }).catch(() => setMessage('Unable to load this food.'))
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [foodId])

  return <div className="checkout-page-v2">
    <PageNav homePath="/home" />
    {message
      ? <p className="error-text" role="alert">{message}</p>
      : !conflict && <LoadingState label="Adding to cart..." />}

    {conflict && <div className="order-modal-backdrop" role="dialog" aria-modal="true" aria-label="Replace cart">
      <div className="order-modal">
        <div className="order-modal-icon order-modal-icon--danger" aria-hidden="true">⚠</div>
        <h2>Start a new cart?</h2>
        <p>Your cart has items from <strong>{conflict.previousRestaurantName}</strong>. Adding something from <strong>{conflict.food.foodPartner?.name || 'this restaurant'}</strong> will remove them — you can only order from one restaurant at a time.</p>
        <div className="order-modal-actions">
          <button type="button" className="order-modal-ghost" onClick={() => navigate(-1)}>Cancel</button>
          <button type="button" className="order-modal-primary" onClick={() => tryAdd(conflict.food, true)}>Yes, replace cart</button>
        </div>
      </div>
    </div>}
  </div>
}

export default OrderPage
