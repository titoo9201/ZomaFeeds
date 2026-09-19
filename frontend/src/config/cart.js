const CART_KEY = 'zomafeeds-cart'
export const CART_EVENT = 'zomafeeds-cart-updated'

export const getCartItem = () => {
  try {
    const raw = window.localStorage.getItem(CART_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export const setCartItem = item => {
  try { window.localStorage.setItem(CART_KEY, JSON.stringify(item)) } catch { /* storage unavailable */ }
  window.dispatchEvent(new Event(CART_EVENT))
}

export const clearCartItem = () => {
  try { window.localStorage.removeItem(CART_KEY) } catch { /* storage unavailable */ }
  window.dispatchEvent(new Event(CART_EVENT))
}
