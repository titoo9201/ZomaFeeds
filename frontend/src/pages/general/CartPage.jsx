import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../config/api'
import '../../styles/checkout.css'
import LoadingState from '../../components/LoadingState'
import PageNav from '../../components/PageNav'
import AddressPickerSheet from '../../components/AddressPickerSheet'
import PaymentMethodSheet from '../../components/PaymentMethodSheet'
import { getCart, updateCartItemQuantity, clearCart, setActiveOrderId, CART_EVENT } from '../../config/cart'
import { PAYMENT_OPTIONS } from '../../config/paymentOptions'
import { PLATFORM_FEE } from '../../config/pricing'

const addressLabelOf = item => item.label === 'Other' ? (item.customLabel || 'Other') : item.label

const CartPage = () => {
  const [cart, setCart] = useState(getCart)
  const [foodPartner, setFoodPartner] = useState(null)
  const [selectedAddress, setSelectedAddress] = useState(null)
  const [selectedPayment, setSelectedPayment] = useState(PAYMENT_OPTIONS[0])
  const [activeSheet, setActiveSheet] = useState(null)
  const [message, setMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [deliveryQuote, setDeliveryQuote] = useState(null)
  const [isQuoting, setIsQuoting] = useState(false)
  const [quoteError, setQuoteError] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    const sync = () => setCart(getCart())
    window.addEventListener(CART_EVENT, sync)
    return () => window.removeEventListener(CART_EVENT, sync)
  }, [])

  useEffect(() => {
    if (!cart.foodPartnerId) { setIsLoading(false); return }
    api.get(`/api/food-partner/${cart.foodPartnerId}`).then(({ data }) => setFoodPartner(data.foodPartner)).catch(() => setMessage('Unable to load restaurant details.')).finally(() => setIsLoading(false))
  }, [cart.foodPartnerId])

  const items = cart.items
  const itemsTotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const isClosed = foodPartner?.isOpen === false
  const canOrder = Boolean(foodPartner) && !isClosed && items.length > 0
  const itemsKey = items.map(item => `${item.foodId}:${item.quantity}`).join(',')

  useEffect(() => {
    if (!selectedAddress || items.length === 0) { setDeliveryQuote(null); return }
    let cancelled = false
    setIsQuoting(true)
    setQuoteError('')
    api.post('/api/orders/quote', {
      items: items.map(item => ({ food: item.foodId, quantity: item.quantity })),
      address: selectedAddress.address, lat: selectedAddress.lat, lng: selectedAddress.lng, paymentMethod: selectedPayment.method
    }).then(({ data }) => {
      if (cancelled) return
      setDeliveryQuote(data.bill)
    }).catch(error => {
      if (cancelled) return
      setDeliveryQuote(null)
      setQuoteError(error.response?.data?.message || 'Could not calculate the delivery fee for this address.')
    }).finally(() => { if (!cancelled) setIsQuoting(false) })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAddress, itemsKey, selectedPayment.method])

  const bill = deliveryQuote

  const placeOrder = async () => {
    if (!selectedAddress || !canOrder || !bill) return
    try {
      setIsSubmitting(true)
      setMessage('')
      const { data } = await api.post('/api/orders', {
        items: items.map(item => ({ food: item.foodId, quantity: item.quantity })),
        address: selectedAddress.address, lat: selectedAddress.lat, lng: selectedAddress.lng
      })
      const newOrderId = data.order._id
      await api.patch(`/api/orders/${newOrderId}/pay`, { paymentMethod: selectedPayment.method })
      clearCart()
      setActiveOrderId(newOrderId)
      navigate(`/payment/${newOrderId}`)
    } catch (error) {
      setMessage(error.response?.data?.message || 'Could not place order.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isLoading && items.length === 0) return <div className="checkout-page-v2">
    <PageNav homePath="/home" />
    <p className="empty-copy">Your cart is empty. Browse restaurants and add something tasty!</p>
  </div>

  return <div className="checkout-page-v2">
    <PageNav homePath="/home" />
    {isLoading ? <LoadingState label="Loading cart..." /> : <>
      <header className="checkout-header">
        <h1>{foodPartner?.name || cart.foodPartnerName || 'Restaurant'}</h1>
        <p className="checkout-eta"><span className="checkout-eta-badge">⚡ 30-40 mins</span> to your address</p>
      </header>

      {isClosed && <section className="checkout-card">
        <h2 className="checkout-card-title">This restaurant is currently closed</h2>
        <p className="checkout-note">Your items are saved — you can place this order once they reopen.</p>
      </section>}

      <section className="checkout-card">
        {items.map(item => <div className="checkout-item" key={item.foodId}>
          <div className="checkout-item-info">
            <strong>{item.name}</strong>
            <span className="checkout-item-price">₹{item.price} each</span>
          </div>
          <div className="checkout-stepper">
            <button type="button" onClick={() => updateCartItemQuantity(item.foodId, item.quantity - 1)} aria-label={item.quantity <= 1 ? 'Remove from cart' : 'Decrease quantity'}>{item.quantity <= 1 ? '🗑' : '−'}</button>
            <span>{item.quantity}</span>
            <button type="button" onClick={() => updateCartItemQuantity(item.foodId, Math.min(50, item.quantity + 1))} disabled={item.quantity >= 50} aria-label="Increase quantity">+</button>
          </div>
        </div>)}
        {cart.foodPartnerId && <button type="button" className="checkout-cta" onClick={() => navigate(`/food-partner/${cart.foodPartnerId}`)} style={{ marginTop: 12 }}>+ Add more items from this restaurant</button>}
      </section>

      <section className="checkout-card">
        <h2 className="checkout-card-title">Bill summary</h2>
        <div className="checkout-bill-row"><span>Item total</span><span>₹{itemsTotal}</span></div>
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

    {!isLoading && items.length > 0 && !isClosed && <div className="checkout-sticky-bar">
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

export default CartPage
