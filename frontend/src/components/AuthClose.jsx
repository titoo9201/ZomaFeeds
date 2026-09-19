import { useNavigate } from 'react-router-dom'
import '../styles/page-nav.css'

const AuthClose = () => {
  const navigate = useNavigate()
  return <div className="page-nav">
    <button className="page-nav__btn" type="button" onClick={() => navigate('/', { replace: true })} aria-label="Close">
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
    </button>
  </div>
}

export default AuthClose
