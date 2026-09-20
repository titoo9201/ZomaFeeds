import { useState } from 'react'
import api from '../config/api'

const StarRow = ({ value, onChange, disabled }) => <div className="order-modal-stars">
  {[1, 2, 3, 4, 5].map(star => <button key={star} type="button" className={star <= value ? 'is-filled' : ''} onClick={() => onChange(star)} disabled={disabled} aria-label={`${star} star${star > 1 ? 's' : ''}`}>★</button>)}
</div>

const OrderConfirmModal = ({ order, onDone, heading = 'Order confirmed!', message }) => {
  const [rating, setRating] = useState(0)
  const [text, setText] = useState('')
  const [foodPartnerRating, setFoodPartnerRating] = useState(0)
  const [riderRating, setRiderRating] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const foodName = order.food?.name || 'your food'
  const restaurantName = order.food?.foodPartner?.name || 'The restaurant'
  const bodyMessage = message ?? `${restaurantName} has accepted your order and started preparing ${foodName}.${order.paymentMethod === 'cod' ? ` Keep ₹${order.total} ready in cash for the delivery partner.` : ` Payment received via ${order.paymentMethod?.toUpperCase()}.`}`

  const submitReview = async event => {
    event.preventDefault()
    if (!rating) return
    try {
      setIsSubmitting(true)
      setError('')
      await Promise.all([
        api.post('/api/reviews', { food: order.food._id, rating, text }),
        (foodPartnerRating || riderRating)
          ? api.patch(`/api/orders/${order._id}/rate`, {
            ...(foodPartnerRating ? { foodPartnerRating } : {}),
            ...(riderRating ? { riderRating } : {})
          })
          : Promise.resolve()
      ])
      setSubmitted(true)
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not save your review.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return <div className="order-modal-backdrop" role="dialog" aria-modal="true" aria-label="Order confirmation">
    <div className="order-modal">
      <div className="order-modal-icon" aria-hidden="true">✓</div>
      <h2>{heading}</h2>
      <p>{bodyMessage}</p>

      {!submitted && <form className="order-modal-review" onSubmit={submitReview}>
        <h3>Rate {foodName}</h3>
        <StarRow value={rating} onChange={setRating} disabled={isSubmitting} />
        <textarea value={text} onChange={event => setText(event.target.value)} placeholder="Tell us what you thought (optional) — the restaurant will see this" />

        <h3>Rate {restaurantName}</h3>
        <StarRow value={foodPartnerRating} onChange={setFoodPartnerRating} disabled={isSubmitting} />

        {order.rider && <>
          <h3>Rate your delivery partner{order.rider.name ? `, ${order.rider.name}` : ''}</h3>
          <StarRow value={riderRating} onChange={setRiderRating} disabled={isSubmitting} />
        </>}

        {error && <p className="error-text" role="alert">{error}</p>}
        <div className="order-modal-actions">
          <button type="button" className="order-modal-ghost" onClick={onDone}>Skip for now</button>
          <button type="submit" className="order-modal-primary" disabled={!rating || isSubmitting}>{isSubmitting ? 'Saving...' : 'Submit review'}</button>
        </div>
      </form>}

      {submitted && <div className="order-modal-review">
        <h3>Thanks for the feedback!</h3>
        <button type="button" className="order-modal-primary" onClick={onDone}>Done</button>
      </div>}
    </div>
  </div>
}

export default OrderConfirmModal
