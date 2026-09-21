const CART_KEY = 'zomafeeds-cart'
const ACTIVE_ORDER_KEY = 'zomafeeds-active-order'
export const CART_EVENT = 'zomafeeds-cart-updated'

const EMPTY_CART = { foodPartnerId: null, foodPartnerName: '', items: [] }

const notify = () => window.dispatchEvent(new Event(CART_EVENT))

export const getCart = () => {
  try {
    const raw = window.localStorage.getItem(CART_KEY)
    return raw ? JSON.parse(raw) : EMPTY_CART
  } catch {
    return EMPTY_CART
  }
}

const writeCart = cart => {
  try {
    if (cart && cart.items.length > 0) window.localStorage.setItem(CART_KEY, JSON.stringify(cart))
    else window.localStorage.removeItem(CART_KEY)
  } catch (err) { void err }
  notify()
}

export const getCartItemCount = () => getCart().items.reduce((sum, item) => sum + item.quantity, 0)

// A cart can only hold items from one restaurant at a time. Adding an item from a different
// restaurant than what's already in the cart needs the caller to warn the user first — this
// returns { needsConfirmation: true } instead of silently wiping their existing cart, and only
// actually replaces it once called again with force: true.
export const addToCart = (item, { force = false } = {}) => {
  const cart = getCart()
  const isDifferentRestaurant = cart.items.length > 0 && cart.foodPartnerId !== item.foodPartnerId
  if (isDifferentRestaurant && !force) return { needsConfirmation: true, previousRestaurantName: cart.foodPartnerName }

  const items = isDifferentRestaurant ? [] : [...cart.items]
  const existing = items.find(i => i.foodId === item.foodId)
  if (existing) existing.quantity += item.quantity
  else items.push({ foodId: item.foodId, name: item.name, price: item.price, quantity: item.quantity })

  writeCart({ foodPartnerId: item.foodPartnerId, foodPartnerName: item.foodPartnerName, items })
  return { needsConfirmation: false }
}

export const updateCartItemQuantity = (foodId, quantity) => {
  const cart = getCart()
  const items = quantity <= 0
    ? cart.items.filter(i => i.foodId !== foodId)
    : cart.items.map(i => i.foodId === foodId ? { ...i, quantity } : i)
  writeCart({ ...cart, items })
}

export const clearCart = () => writeCart(null)

export const getActiveOrderId = () => {
  try { return window.localStorage.getItem(ACTIVE_ORDER_KEY) || null } catch { return null }
}

export const setActiveOrderId = orderId => {
  try { window.localStorage.setItem(ACTIVE_ORDER_KEY, orderId) } catch (err) { void err }
  notify()
}

export const clearActiveOrderId = () => {
  try { window.localStorage.removeItem(ACTIVE_ORDER_KEY) } catch (err) { void err }
  notify()
}
