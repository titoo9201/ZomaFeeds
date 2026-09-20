import { NavLink } from 'react-router-dom'
import '../styles/bottom-nav.css'

const DashboardIcon = () => <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="8" height="8" rx="1.5" /><rect x="13" y="3" width="8" height="5" rx="1.5" /><rect x="13" y="10" width="8" height="11" rx="1.5" /><rect x="3" y="13" width="8" height="8" rx="1.5" /></svg>
const ProfileIcon = () => <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" /></svg>

const RiderBottomNav = () => (
  <nav className="bottom-nav" aria-label="Rider navigation">
    <div className="bottom-nav__inner">
      <NavLink to="/rider/dashboard" end className={({ isActive }) => `bottom-nav__item ${isActive ? 'is-active' : ''}`}>
        <span className="bottom-nav__icon"><DashboardIcon /></span>
        <span className="bottom-nav__label">Dashboard</span>
      </NavLink>
      <NavLink to="/rider/profile" className={({ isActive }) => `bottom-nav__item ${isActive ? 'is-active' : ''}`}>
        <span className="bottom-nav__icon"><ProfileIcon /></span>
        <span className="bottom-nav__label">Profile</span>
      </NavLink>
    </div>
  </nav>
)

export default RiderBottomNav
