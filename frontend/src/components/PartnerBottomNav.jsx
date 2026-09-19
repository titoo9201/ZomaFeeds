import { NavLink } from 'react-router-dom'
import '../styles/bottom-nav.css'

const DashboardIcon = () => <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="8" height="8" rx="1.5" /><rect x="13" y="3" width="8" height="5" rx="1.5" /><rect x="13" y="10" width="8" height="11" rx="1.5" /><rect x="3" y="13" width="8" height="8" rx="1.5" /></svg>
const ProfileIcon = () => <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3.5" /><path d="M5 21a7 7 0 0 1 14 0" /></svg>

const items = [
  { to: '/dashboard', label: 'Dashboard', Icon: DashboardIcon, end: true },
  { to: '/profile', label: 'Profile', Icon: ProfileIcon },
]

const PartnerBottomNav = () => (
  <nav className="bottom-nav" aria-label="Partner navigation">
    <div className="bottom-nav__inner">
      {items.map(item => {
        const IconComponent = item.Icon
        return <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => `bottom-nav__item ${isActive ? 'is-active' : ''}`}>
          <span className="bottom-nav__icon"><IconComponent /></span>
          <span className="bottom-nav__label">{item.label}</span>
        </NavLink>
      })}
    </div>
  </nav>
)

export default PartnerBottomNav
