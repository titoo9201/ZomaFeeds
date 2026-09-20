import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import api from '../../config/api'
import '../../styles/checkout.css'
import LoadingState from '../../components/LoadingState'
import PageNav from '../../components/PageNav'
import AddressPickerSheet from '../../components/AddressPickerSheet'
import PaymentMethodSheet from '../../components/PaymentMethodSheet'
import { setCartItem, clearCartItem } from '../../config/cart'
import { PAYMENT_OPTIONS } from '../../config/paymentOptions'
import { PLATFORM_FEE, RESTAURANT_GST_RATE, SERVICE_GST_RATE } from '../../config/pricing'

const addressLabelOf = item => item.label === 'Other' ? (item.customLabel || 'Other') : item.label

const OrderPage = () => {
  const { foodId } = useParams()
  const [food, setFood] = useState(null)
  const [quantity, setQuantity] = useState(1)
  const [selectedAddress, setSelectedAddress] = useState(null)
  const [selectedPayment, setSelectedPayment] = useState(PAYMENT_OPTIONS[0])
  const [activeSheet, setActiveSheet] = useState(null)
  const [orderId, setOrderId] = useState(null)
  const [message, setMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isNotifyRequested, setIsNotifyRequested] = useState(false)
  const [deliveryQuote, setDeliveryQuote] = useState(null)
  const [isQuoting, setIsQuoting] = useState(false)
  const [quoteError, setQuoteError] = useState('')
  const navigate = useNavigate()

  useEffect(() => { api.get('/api/food').then(({ data }) => setFood(data.foodItems.find(item => item._id === foodId))).catch(() => setMessage('Unable to load this food.')).finally(() => setIsLoading(false)) }, [foodId])

  useEffect(() => { if (food) setCartItem({ foodId: food._id, name: food.name }) }, [food])

  useEffect(() => {
    if (!selectedAddress || !food) { setDeliveryQuote(null); return }
    let cancelled = false
    setIsQuoting(true)
    setQuoteError('')
    api.post('/api/orders/quote', { food: foodId, quantity: 1, address: selectedAddress.address, lat: selectedAddress.lat, lng: selectedAddress.lng, paymentMethod: selectedPayment.method }).then(({ data }) => {
      if (cancelled) return
      setDeliveryQuote({ deliveryFee: data.bill.deliveryFee, distanceKm: data.bill.distanceKm, packagingCharge: data.bill.packagingCharge || 0 })
    }).catch(error => {
      if (cancelled) return
      setDeliveryQuote(null)
      setQuoteError(error.response?.data?.message || 'Could not calculate the delivery fee for this address.')
    }).finally(() => { if (!cancelled) setIsQuoting(false) })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAddress, foodId, food])

  const unitPrice = food?.price ?? 1
  const isClosed = food?.foodPartner?.isOpen === false
  const isUnavailable = food?.isAvailable === false
  const canOrder = !isClosed && !isUnavailable
  const itemsTotal = quantity * unitPrice
  const bill = deliveryQuote ? (() => {
    const { deliveryFee, distanceKm, packagingCharge } = deliveryQuote
    const restaurantGST = Number((itemsTotal * RESTAURANT_GST_RATE).toFixed(2))
    const serviceGST = Number(((deliveryFee + PLATFORM_FEE) * SERVICE_GST_RATE).toFixed(2))
    const preciseTotal = Number((itemsTotal + restaurantGST + packagingCharge + deliveryFee + PLATFORM_FEE + serviceGST).toFixed(2))
    // Cash on delivery is settled in physical currency — round to a whole rupee so the amount
    // the customer actually hands over is a number they can pay, matching what the server
    // stores once payment is confirmed. UPI/Card keep the precise decimal total.
    const isCod = selectedPayment.method === 'cod'
    const grandTotal = isCod ? Math.round(preciseTotal) : preciseTotal
    const roundOff = isCod ? Number((grandTotal - preciseTotal).toFixed(2)) : 0
    return { itemsTotal, restaurantGST, packagingCharge, deliveryFee, distanceKm, platformFee: PLATFORM_FEE, serviceGST, roundOff, grandTotal }
  })() : null

  const placeOrder = async () => {
    if (!selectedAddress || !canOrder || !bill) return
    try {
      setIsSubmitting(true)
      setMessage('')
      let currentOrderId = orderId
      if (!currentOrderId) {
        const { data } = await api.post('/api/orders', { food: foodId, quantity, address: selectedAddress.address, lat: selectedAddress.lat, lng: selectedAddress.lng })
        currentOrderId = data.order._id
        setOrderId(currentOrderId)
      }
      await api.patch(`/api/orders/${currentOrderId}/pay`, { paymentMethod: selectedPayment.method })
      navigate(`/payment/${currentOrderId}`)
    } catch (error) {
      setMessage(error.response?.data?.message || 'Could not place order.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const notifyMe = async () => {
    try { await api.post(`/api/food-partner/${food.foodPartner._id}/notify-me`); setIsNotifyRequested(true) } catch { setMessage('Could not save your request. Please try again.') }
  }

  const decreaseOrRemove = () => {
    if (quantity <= 1) { clearCartItem(); navigate(-1); return }
    setQuantity(q => q - 1)
  }

  return <div className="checkout-page-v2">
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

      <section className="checkout-card">
        <div className="checkout-item">
          {food.mediaType === 'image' ? <img className="checkout-item-thumb" src={food.video} alt={food.name} /> : <video className="checkout-item-thumb" src={food.video} muted loop playsInline preload="metadata" />}
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

      <section className="checkout-card">
        <h2 className="checkout-card-title">Bill summary</h2>
        <div className="checkout-bill-row"><span>Item total ({quantity} × ₹{unitPrice})</span><span>₹{itemsTotal}</span></div>
        {bill && <div className="checkout-bill-row"><span>Restaurant GST</span><span>₹{bill.restaurantGST}</span></div>}
        {bill && bill.packagingCharge > 0 && <div className="checkout-bill-row"><span>Packaging charge</span><span>₹{bill.packagingCharge}</span></div>}
        {!selectedAddress
          ? <div className="checkout-bill-row"><span>Delivery fee</span><span>Select an address</span></div>
          : isQuoting
            ? <div className="checkout-bill-row"><span>Delivery fee</span><span>Calculating...</span></div>
            : quoteError
              ? <p className="error-text" role="alert">{quoteError}</p>
              : bill && <div className="checkout-bill-row"><span>Delivery fee{bill.distanceKm != null ? ` (${bill.distanceKm} km)` : ''}</span><span>₹{bill.deliveryFee}</span></div>}
        <div className="checkout-bill-row"><span>Platform fee</span><span>₹{PLATFORM_FEE}</span></div>
        {bill && <div className="checkout-bill-row"><span>GST on fees</span><span>₹{bill.serviceGST}</span></div>}
        {bill && bill.roundOff !== 0 && <div className="checkout-bill-row"><span>Round off (cash on delivery)</span><span>{bill.roundOff > 0 ? '+' : ''}₹{bill.roundOff}</span></div>}
        <div className="checkout-bill-row checkout-bill-total"><span>Grand total</span><span>₹{bill ? bill.grandTotal : '—'}</span></div>
        <p className="checkout-note">No real money is ever charged — this is a dummy checkout for testing.</p>
      </section>

      {message && <p className="error-text" role="alert">{message}</p>}
    </>}

    {food && canOrder && <div className="checkout-sticky-bar">
      <div className="checkout-sticky-inner">
        <button type="button" className="checkout-sticky-address" onClick={() => setActiveSheet('address')}>
          <span className="checkout-sticky-pin" aria-hidden="true">📍</span>
          <span className="checkout-sticky-address-text">
            {selectedAddress
              ? <><strong>Delivery at {addressLabelOf(selectedAddress)}</strong><small>{selectedAddress.address}</small></>
              : <strong>Select delivery address</strong>}
          </span>
          <span className="checkout-sticky-change">Change</span>
        </button>
        <div className="checkout-sticky-pay">
          <button type="button" className="checkout-sticky-method" onClick={() => setActiveSheet('payment')}>
            <span aria-hidden="true">{selectedPayment.icon}</span> {selectedPayment.label}
          </button>
          <button type="button" className="checkout-place-order" onClick={placeOrder} disabled={isSubmitting || !selectedAddress || !bill || isQuoting}>
            <span className="checkout-place-order-total">₹{bill ? bill.grandTotal : itemsTotal}<small>Total</small></span>
            <span>{isSubmitting ? 'Placing...' : 'Place Order ›'}</span>
          </button>
        </div>
      </div>
    </div>}

    {activeSheet === 'address' && <AddressPickerSheet onSelect={setSelectedAddress} onClose={() => setActiveSheet(null)} />}
    {activeSheet === 'payment' && <PaymentMethodSheet selected={selectedPayment} onSelect={setSelectedPayment} onClose={() => setActiveSheet(null)} />}
  </div>
}
export default OrderPage
