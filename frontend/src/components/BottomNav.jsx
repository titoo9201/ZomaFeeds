import { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import '../styles/bottom-nav.css'
import { getCartItemCount, getActiveOrderId, CART_EVENT } from '../config/cart'

const HomeIcon = () => <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 10.5 12 3l9 7.5" /><path d="M5 10v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V10" /></svg>
const ReelIcon = () => <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="3" width="16" height="18" rx="2" /><path d="m9 3 2 4m4-4 2 4M9 11l6 3-6 3z" /></svg>
const SaveIcon = () => <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v17l-6-3-6 3z" /></svg>
const ProfileIcon = () => <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3.5" /><path d="M5 21a7 7 0 0 1 14 0" /></svg>
const CartIcon = () => <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="20" r="1.3" /><circle cx="17" cy="20" r="1.3" /><path d="M3 4h2l2 11h10l2-8H6" /></svg>
const TrackIcon = () => <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12h4l2-7 4 14 2-7h6" /></svg>

const baseItems = [
  { to: '/home', label: 'Home', Icon: HomeIcon, end: true },
  { to: '/reels', label: 'Reels', Icon: ReelIcon },
  { to: '/saved', label: 'Saved', Icon: SaveIcon },
  { to: '/user-profile', label: 'Profile', Icon: ProfileIcon },
]

const BottomNav = () => {
  const [cartCount, setCartCount] = useState(getCartItemCount)
  const [activeOrderId, setActiveOrderId] = useState(getActiveOrderId)

  useEffect(() => {
    const sync = () => { setCartCount(getCartItemCount()); setActiveOrderId(getActiveOrderId()) }
    window.addEventListener(CART_EVENT, sync)
    window.addEventListener('storage', sync)
    return () => { window.removeEventListener(CART_EVENT, sync); window.removeEventListener('storage', sync) }
  }, [])

  // An in-progress order being tracked takes priority over the shopping cart in the nav slot —
  // once an order is placed the cart itself is already cleared, so these never overlap anyway.
  const items = activeOrderId
    ? [...baseItems.slice(0, 3), { to: `/payment/${activeOrderId}`, label: 'Track', Icon: TrackIcon }, baseItems[3]]
    : cartCount > 0
      ? [...baseItems.slice(0, 3), { to: '/cart', label: 'Cart', Icon: CartIcon, badge: cartCount }, baseItems[3]]
      : baseItems

  return <nav className="bottom-nav" aria-label="Primary navigation">
    <div className="bottom-nav__inner">
      {items.map(item => {
        const IconComponent = item.Icon
        return <NavLink key={item.label} to={item.to} end={item.end} className={({ isActive }) => `bottom-nav__item ${isActive ? 'is-active' : ''}`}>
          <span className="bottom-nav__icon">
            <IconComponent />
            {item.badge > 0 && <span className="bottom-nav__badge">{item.badge}</span>}
          </span>
          <span className="bottom-nav__label">{item.label}</span>
        </NavLink>
      })}
    </div>
  </nav>
}

export default BottomNav
